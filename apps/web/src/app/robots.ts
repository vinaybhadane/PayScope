import type { MetadataRoute } from "next";
import { publicSite } from "@/lib/public-site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Workspace pages send X-Robots-Tag so crawlers can discover the noindex directive.
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${publicSite}/sitemap.xml`,
  };
}
