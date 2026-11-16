"use client";

import React, { useState } from "react";

export interface MerchantLogoProps {
  name: string;
  merchantId?: string | null;
  domain?: string | null;
  logoUrl?: string | null;
  category?: string | null;
  size?: number;
  className?: string;
  alt?: string;
  fallbackMark?: string;
}

/**
 * Validate that a URL is a safe HTTPS URL or an approved local static logo asset.
 * Rejects javascript:, data:, file:, and other unsafe schemes.
 */
function isSafeLogoUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();

  // Local verified static assets
  if (trimmed.startsWith("/merchant-logos/") && /\.(svg|png|jpg|webp)$/i.test(trimmed)) {
    return true;
  }

  // Must be HTTPS scheme
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || !hostname.includes(".")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Single shared, accessible, dynamic MerchantLogo component.
 *
 * Renders verified merchant logo / favicon if metadata is available.
 * Gracefully falls back to a neutral, generic storefront icon when:
 * - Merchant is unknown/unverified
 * - Metadata is null or invalid
 * - Image request fails (404/broken link)
 *
 * No fake brand marks, generated initials, or guessed domains.
 */
export function MerchantLogo({
  name,
  domain,
  logoUrl,
  size = 36,
  className = "",
  alt,
}: MerchantLogoProps) {
  const [imgError, setImgError] = useState(false);

  const cleanName = (name || "").trim() || "Merchant";

  // Derive candidate image URL:
  // 1. Explicit verified logo URL from API
  // 2. Verified official domain favicon
  let candidateUrl: string | null = null;
  if (logoUrl && isSafeLogoUrl(logoUrl)) {
    candidateUrl = logoUrl;
  } else if (domain && typeof domain === "string") {
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (cleanDomain && cleanDomain.includes(".") && !cleanDomain.includes(" ")) {
      candidateUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=128`;
    }
  }

  const shouldRenderImage = Boolean(candidateUrl && !imgError);

  return (
    <div
      role="img"
      aria-label={`${cleanName} logo`}
      title={cleanName}
      data-merchant-logo="true"
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
      }}
      className={`relative rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-[#1E293B] bg-[#0D1322] ${className}`}
    >
      {shouldRenderImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={candidateUrl!}
          alt={alt || `${cleanName} logo`}
          width={Math.round(size * 0.7)}
          height={Math.round(size * 0.7)}
          className="w-full h-full object-contain p-1 rounded-lg"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            // Guard against render loops: set state once on failure
            setImgError(true);
          }}
        />
      ) : (
        // Neutral generic merchant/storefront icon
        <svg
          data-icon="store-fallback"
          width={Math.max(16, Math.round(size * 0.5))}
          height={Math.max(16, Math.round(size * 0.5))}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#8E9CAE]"
          aria-hidden="true"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )}
    </div>
  );
}

export default MerchantLogo;
