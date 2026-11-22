"""PayScope FastAPI Application Entry Point."""
from contextlib import asynccontextmanager
import asyncio
from contextlib import suppress
import logging
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.v1.router import api_v1_router
from app.core.rate_limit import UploadRateLimitMiddleware, limiter
from app.core.auth import require_identity
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html

logger = logging.getLogger('app.main')


def run_migrations():
    from pathlib import Path
    from alembic import command
    from alembic.config import Config
    ini = Path(__file__).resolve().parents[1] / "alembic.ini"
    config = Config(str(ini))
    config.set_main_option("script_location", str(ini.parent / "alembic"))
    command.upgrade(config, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Do not accept traffic until migrations complete; failures stop startup."""
    from starlette.concurrency import run_in_threadpool
    if settings.RUN_MIGRATIONS:
        await run_in_threadpool(run_migrations)
    from app.analytics.email_alerts import email_worker
    worker = asyncio.create_task(email_worker()) if settings.EMAIL_WORKER_ENABLED else None
    try:
        yield
    finally:
        if worker:
            worker.cancel()
            with suppress(asyncio.CancelledError):
                await worker
    from app.graph.driver import close_neo4j_driver
    close_neo4j_driver()


def create_application() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=None,
        docs_url=None,
        redoc_url=None,
        lifespan=lifespan,
    )
    application.state.limiter = limiter

    application.add_middleware(UploadRateLimitMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com|http://localhost:\d+|http://127\.0\.0\.1:\d+",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    @application.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception):
        logger.exception("Unhandled request failure: %s", request.url.path, exc_info=exc)
        response = JSONResponse(status_code=500, content={"detail": "An unexpected error occurred. Please try again."})
        from app.core.auth import is_allowed_origin
        if origin and is_allowed_origin(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    # Root status endpoint for cloud health & quick browser checks
    @application.get('/', tags=['Root'])
    def root():
        return {
            'name': settings.PROJECT_NAME,
            'status': 'healthy',
            'version': settings.VERSION,
            'docs': f'{settings.API_V1_STR}/docs',
            'health': f'{settings.API_V1_STR}/health',
        }

    @application.get(f"{settings.API_V1_STR}/openapi.json", include_in_schema=False, dependencies=[Depends(require_identity)])
    def openapi_schema():
        return application.openapi()

    @application.get(f"{settings.API_V1_STR}/docs", include_in_schema=False, dependencies=[Depends(require_identity)])
    def api_docs():
        return get_swagger_ui_html(openapi_url=f"{settings.API_V1_STR}/openapi.json", title=settings.PROJECT_NAME)

    @application.get(f"{settings.API_V1_STR}/redoc", include_in_schema=False, dependencies=[Depends(require_identity)])
    def api_redoc():
        return get_redoc_html(openapi_url=f"{settings.API_V1_STR}/openapi.json", title=settings.PROJECT_NAME)

    # Include API routers
    application.include_router(api_v1_router, prefix=settings.API_V1_STR)

    return application


app = create_application()
