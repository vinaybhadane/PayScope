"use client";
import Image from "next/image";
import { useState } from "react";

type MerchantBrand = {
  src: string;
  color: string;
};

const brands: { matches: string[]; src: string; color: string }[] = [
  { matches: ["chatgpt", "openai"], src: "/merchant-logos/chatgpt.png", color: "#111111" },
  { matches: ["claude", "anthropic"], src: "/merchant-logos/claude.png", color: "#c87958" },
  { matches: ["gemini", "google"], src: "/merchant-logos/gemini.png", color: "#4285f4" },
  { matches: ["netflix"], src: "/merchant-logos/netflix.svg", color: "#e50914" },
  { matches: ["spotify"], src: "/merchant-logos/spotify.svg", color: "#1db954" },
  { matches: ["adobe"], src: "/merchant-logos/adobe.png", color: "#eb1000" },
  { matches: ["notion"], src: "/merchant-logos/notion.svg", color: "#111111" },
  { matches: ["icloud", "apple"], src: "/merchant-logos/icloud.svg", color: "#3693f3" },
  { matches: ["youtube"], src: "/merchant-logos/youtube.svg", color: "#ff0000" },
  { matches: ["figma"], src: "/merchant-logos/figma.svg", color: "#f24e1e" },
  { matches: ["primevideo", "amazonprime", "amazon prime", "prime"], src: "/merchant-logos/prime.png", color: "#00a8e1" },
];

export function getMerchantBrand(name: string): MerchantBrand | null {
  const normalized = name.toLowerCase();
  const brand = brands.find(({ matches }) => matches.some((match) => normalized.includes(match)));
  return brand ? { src: brand.src, color: brand.color } : null;
}

export function MerchantLogo({
  name,
  size = 34,
  className,
  fallbackMark,
}: {
  name: string;
  size?: number;
  className?: string;
  fallbackMark?: string;
}) {
  const brand = getMerchantBrand(name);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        width: size,
        height: size,
        display: "inline-grid",
        flexShrink: 0,
        placeItems: "center",
        overflow: "hidden",
        borderRadius: 9,
        border: "1px solid rgba(15, 23, 42, 0.08)",
        background: "#fff",
        color: brand?.color ?? "#56745b",
        fontWeight: 700,
      }}
    >
      {brand && failedSrc !== brand.src ? (
        <Image src={brand.src} alt="" width={Math.round(size * 0.66)} height={Math.round(size * 0.66)} onError={() => setFailedSrc(brand.src)} />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.48), lineHeight: 1 }}>
          {fallbackMark || name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </span>
  );
}
