import type { NextConfig } from "next";
import { publicSite } from "./src/lib/public-site";

const productionHost = new URL(publicSite).hostname;
const workspacePaths = ["api", "dashboard", "payments", "commitments", "insights", "financial-impact",
  "savings", "cancellations", "relationships", "upload", "merchants", "merchant-review"];

function origin(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
      return url.origin;
    }
  } catch {
    // An unset or malformed optional setting contributes no CSP source.
  }
}

export const securityHeaders: NonNullable<NextConfig["headers"]> = async () => {
  const isProduction = process.env.NODE_ENV === "production";
  const appHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const firebaseAuth = origin(appHost ? `https://${appHost}` : project ? `https://${project}.firebaseapp.com` : undefined);
  const connections = [...new Set([
    origin(process.env.NEXT_PUBLIC_API_URL), origin(process.env.NEXT_PUBLIC_API_BASE_URL), firebaseAuth,
    "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com",
    "https://firestore.googleapis.com", "https://www.googleapis.com",
    "https://apis.google.com", "https://accounts.google.com",
  ].filter(Boolean))].join(" ");
  const frames = [firebaseAuth, "https://accounts.google.com"].filter(Boolean).join(" ");

  const rules: Awaited<ReturnType<NonNullable<NextConfig["headers"]>>> = [
    { source: "/:path*", headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=()" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ] },
    { source: `/:section(${workspacePaths.join("|")})/:path*`, headers: [
      { key: "X-Robots-Tag", value: "noindex" },
    ] },
  ];

  if (isProduction) {
    rules.push({ source: "/:path((?!api(?:/|$)).*)", headers: [{
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        "base-uri 'none'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        // Static Next.js documents contain inline bootstrap scripts. Keep prerendering and
        // prohibit inline event attributes and eval while restricting external script hosts.
        "script-src 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com https://www.gstatic.com",
        "script-src-attr 'none'",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self'",
        // Merchant image URLs can come from the configured merchant directory.
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob:",
        "worker-src 'self' blob:",
        `connect-src 'self' ${connections}`,
        `frame-src ${frames}`,
      ].join("; "),
    }] });
  }

  return isProduction ? [...rules, {
    source: "/:path*", has: [{ type: "host", value: productionHost.replaceAll(".", "\\.") }],
    headers: [{ key: "Strict-Transport-Security", value: "max-age=63072000" }],
  }] : rules;
};
