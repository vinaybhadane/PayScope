import { auth } from "./firebase";
import { getApiBaseUrl } from "./apiBase";

export const DEMO_VERSION = "subscriptions-v2";
let guestRequest: Promise<void> | null = null;
let guestReady = false;
let guestToken: string | null = null;
let firebaseSessionToken: string | null = null;
let firebaseRequest: Promise<void> | null = null;

export async function ensureGuestSession(): Promise<void> {
  if (guestReady && guestToken) return;
  if (typeof window !== "undefined") {
    const cached = sessionStorage.getItem("payscope_guest_token");
    if (cached) {
      guestToken = cached;
      guestReady = true;
      return;
    }
  }
  if (!guestRequest) {
    guestRequest = (async () => {
      const response = await globalThis.fetch(`${getApiBaseUrl()}/api/v1/auth/guest`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Demo access is temporarily unavailable. Please retry.");
      }
      const data = await response.json();
      if (data?.access_token) {
        guestToken = data.access_token;
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("payscope_guest_token", data.access_token);
          } catch {}
        }
      }
      guestReady = true;
    })().finally(() => {
      guestRequest = null;
    });
  }
  return guestRequest;
}

export async function establishFirebaseSession(): Promise<void> {
  if (!auth?.currentUser) return;
  const token = await auth.currentUser.getIdToken();
  if (firebaseSessionToken === token) return;
  if (!firebaseRequest) {
    firebaseRequest = (async () => {
      try {
        await globalThis.fetch(`${getApiBaseUrl()}/api/v1/auth/session`, {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.warn("Session cookie exchange skipped (using Bearer authorization):", err);
      }
      firebaseSessionToken = token;
      guestReady = false;
    })().finally(() => {
      firebaseRequest = null;
    });
  }
  return firebaseRequest;
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let target = input;
  if (typeof input === "string" && input.startsWith("/api/v1/")) {
    target = `${getApiBaseUrl()}${input}`;
  }
  const inputStr = typeof target === "string" ? target : target instanceof URL ? target.href : target.url;
  const isApi = inputStr.includes("/api/v1/");

  if (!isApi) {
    return globalThis.fetch(target, init);
  }

  if (auth) {
    try {
      await auth.authStateReady();
    } catch {}
  }

  let token: string | null = null;

  if (auth?.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
    } catch (err) {
      console.warn("Could not retrieve Firebase token:", err);
    }
    void establishFirebaseSession().catch(() => {});
  } else if (typeof window !== "undefined" && localStorage.getItem("payscope_demo_user")) {
    await ensureGuestSession();
    token = guestToken || (typeof window !== "undefined" ? sessionStorage.getItem("payscope_guest_token") : null);
  }

  const headers = new Headers(init?.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return globalThis.fetch(target, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
}

export async function clearApiSession(): Promise<void> {
  try {
    await globalThis.fetch(`${getApiBaseUrl()}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch (err) {
    console.warn("Logout request failed:", err);
  }
  guestReady = false;
  guestToken = null;
  firebaseSessionToken = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("payscope_guest_token");
    } catch {}
  }
}

/** Resolve both immediate CSV responses and background OCR responses. */
export async function importResponse<T>(response: Response): Promise<T> {
  const data = await readImportJson(response);
  if (!response.ok) throw new Error(data.detail || data.error || "Import failed.");
  if (response.status !== 202) return data as T;
  const deadline = Date.now() + 15 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const status = await authFetch(`${getApiBaseUrl()}/api/v1/imports/jobs/${encodeURIComponent(data.job_id)}`);
    const job = await readImportJson(status);
    if (!status.ok) throw new Error(job.detail || "Could not check import progress.");
    if (job.status === "completed") return job.result as T;
    if (job.status === "failed") throw new Error(job.error || "Import processing failed.");
  }
  throw new Error("Import processing timed out. Check import history before retrying.");
}

async function readImportJson(response: Response) {
  try {
    return await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`The import server returned an error (HTTP ${response.status}). Check import history before retrying.`);
    }
    throw new Error("The import server returned an unreadable response. Check import history before retrying.");
  }
}
