export function getApiBaseUrl(): string {
  // Same-origin proxy keeps HttpOnly, Secure, SameSite=Strict cookies usable
  // when frontend and backend are hosted on different sites.
  return "";
}
