export function getApiBaseUrl(): string {
  // 1. Explicit env variables (supports NEXT_PUBLIC_API_URL, NEXT_PUBLIC_API_BASE_URL, and API_BASE_URL)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, "");
  }
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL.replace(/\/+$/, "");
  }

  // 2. Production browser runtime fallback (deployed on Vercel or Render)
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return "https://payscope-api-08he.onrender.com";
    }
  } else if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    // 3. Server runtime in production
    return "https://payscope-api-08he.onrender.com";
  }

  // 4. Local development fallback (uses same-origin proxy or local API)
  return "";
}
