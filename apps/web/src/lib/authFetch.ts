import { auth } from "./firebase";
import { getApiBaseUrl } from "./apiBase";

export const DEMO_VERSION = "subscriptions-v2";
let guestRequest: Promise<void> | null = null;
let guestReady = false;
let firebaseSessionToken: string | null = null;
let firebaseRequest: Promise<void> | null = null;

export async function ensureGuestSession(): Promise<void> {
  if (guestReady) return;
  if (!guestRequest) {
    guestRequest = (async () => {
      const current = await globalThis.fetch(`${getApiBaseUrl()}/api/v1/auth/me`, {
        credentials: "include", cache: "no-store",
      });
      if (current.ok && (await current.json()).is_demo) {
        guestReady = true;
        return;
      }
      if (!current.ok && current.status !== 401) throw new Error("Could not check your demo session. Please retry.");
      const response = await globalThis.fetch(`${getApiBaseUrl()}/api/v1/auth/guest`, {
        method: "POST", credentials: "include", cache: "no-store",
      });
      if (!response.ok) throw new Error("Demo access is temporarily unavailable. Please retry.");
      guestReady = true;
    })().finally(() => { guestRequest = null; });
  }
  return guestRequest;
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.origin);
  if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/v1/")) return globalThis.fetch(input, init);
  if (auth) await auth.authStateReady();
  if (localStorage.getItem("payscope_demo_user")) {
    await ensureGuestSession();
  } else if (auth?.currentUser) {
    await establishFirebaseSession();
  }
  return globalThis.fetch(input, { ...init, credentials: "include", cache: "no-store" });
}

export async function clearApiSession(): Promise<void> {
  const response = await globalThis.fetch(`${getApiBaseUrl()}/api/v1/auth/logout`, {
    method: "POST", credentials: "include", cache: "no-store",
  });
  if (!response.ok && response.status !== 401) throw new Error("Could not close your session. Please retry.");
  guestReady = false;
  firebaseSessionToken = null;
}

export async function establishFirebaseSession(): Promise<void> {
  if (!auth?.currentUser) return;
  const token = await auth.currentUser.getIdToken();
  if (firebaseSessionToken === token) return;
  if (!firebaseRequest) {
    firebaseRequest = (async () => {
      const response = await globalThis.fetch(`${getApiBaseUrl()}/api/v1/auth/session`, {
        method: "POST", credentials: "include", cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Could not establish your session. Please sign in again.");
      // In-memory only. API requests use the HttpOnly cookie.
      firebaseSessionToken = token;
      guestReady = false;
    })().finally(() => { firebaseRequest = null; });
  }
  return firebaseRequest;
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
