import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    const backend = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL ||
      (process.env.NODE_ENV === "production" ? "https://payscope-api-08he.onrender.com" : "http://127.0.0.1:8000")).replace(/\/+$/, "");
    return [{ source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` }];
  },
  turbopack: {
    rules: {
      // Only the Tailwind entry needs this loader. Rewriting *.module.css
      // as *.css removes CSS Module exports and leaves components unstyled.
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
