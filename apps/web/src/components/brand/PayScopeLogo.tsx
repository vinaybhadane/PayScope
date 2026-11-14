import React from "react";
export interface PayScopeLogoProps {
  variant?: "full" | "compact" | "navbar" | "favicon";
  className?: string;
  size?: number;
  showWordmark?: boolean;
}
export function PayScopeLogo({
  variant = "full",
  className = "",
  size = 32,
  showWordmark = true,
}: PayScopeLogoProps) {
  return (
    <span className={`ps-brand ${className}`}>
      <span className="ps-brand-mark" style={{ width: size, height: size }}>
        <svg
          width={size * 0.68}
          height={size * 0.68}
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden="true"
        >
          <path d="M6 23V5h9c5 0 8 2 8 6s-3 6-8 6h-3v6H6Z" fill="#243C2D" />
          <path d="m6 5 12 12h-6L6 11V5Z" fill="#789575" />
          <path
            d="M12 10h3c1.5 0 2.2.4 2.2 1.3S16.5 13 15 13h-3v-3Z"
            fill="#789575"
          />
        </svg>
      </span>
      {showWordmark && variant !== "compact" && variant !== "favicon" && (
        <span className="ps-brand-name">
          PayScope<span className="brand-period">.</span>
        </span>
      )}
    </span>
  );
}
export default PayScopeLogo;
