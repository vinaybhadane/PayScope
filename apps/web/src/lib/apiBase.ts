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

  // 2. Production Vercel environment detection (both client-side and server-side)
  if (process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV === "production") {
    return "https://payscope-api.onrender.com";
  }

  // 3. Production browser runtime fallback (e.g. deployed on Vercel)
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return "https://payscope-api.onrender.com";
    }
  }

  // 4. Local development fallback
  return "http://127.0.0.1:8000";
}
