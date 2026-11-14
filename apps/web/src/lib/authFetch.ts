import { auth } from "./firebase";
import { getApiBaseUrl } from "./apiBase";

export const GUEST_SESSION_KEY = "payscope_guest_session";
let guestRequest: Promise<string> | null = null;

export async function ensureGuestSession(): Promise<string> {
  const stored = sessionStorage.getItem(GUEST_SESSION_KEY);
  if (stored) {
    try {
      const session = JSON.parse(stored);
      if (session.expiresAt > Date.now()) return session.access_token;
    } catch { sessionStorage.removeItem(GUEST_SESSION_KEY); }
  }
  if (!guestRequest) {
    guestRequest = (async () => {
      const response = await globalThis.fetch(`${getApiBaseUrl()}/api/v1/auth/guest`, { method: "POST" });
      if (!response.ok) throw new Error("Demo access is temporarily unavailable. Please retry.");
      const session = await response.json();
      sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify({ ...session, expiresAt: Date.now() + session.expires_in * 1000 }));
      return session.access_token as string;
    })().finally(() => { guestRequest = null; });
  }
  return guestRequest;
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith(`${getApiBaseUrl()}/api/v1/`)) return globalThis.fetch(input, init);
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
  if (auth) await auth.authStateReady();
  if (localStorage.getItem("payscope_demo_user")) {
    headers.set("Authorization", `Bearer ${await ensureGuestSession()}`);
  } else if (auth?.currentUser) {
    headers.set("Authorization", `Bearer ${await auth.currentUser.getIdToken()}`);
  }
  return globalThis.fetch(input, { ...init, headers });
}
