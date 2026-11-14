import { authFetch } from "@/lib/authFetch";
/**
 * Unified PayScope API client configuration and resilient fetch utilities.
 * Handles Render cold starts, environment variable resolution, and network retries.
 */

export { getApiBaseUrl } from "./apiBase";
import { getApiBaseUrl } from "./apiBase";

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Fetch wrapper with timeout and progressive retry backoff for handling Render free-tier cold starts.
 */
export async function fetchWithRetry(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs = 15000,
    retries = 3,
    retryDelayMs = 2000,
    onRetry,
    ...fetchInit
  } = options;

  const base = getApiBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${base}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await authFetch(url, {
        ...fetchInit,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Retry on 502, 503, 504 (typical Render waking/gateway states)
      if ([502, 503, 504].includes(response.status) && attempt < retries) {
        if (onRetry) onRetry(attempt + 1, new Error(`Server returned status ${response.status}`));
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * Math.pow(1.5, attempt)));
        continue;
      }

      return response;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      lastError = err;

      if (attempt < retries) {
        if (onRetry) onRetry(attempt + 1, err);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * Math.pow(1.5, attempt)));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to connect to PayScope API after retries.");
}
