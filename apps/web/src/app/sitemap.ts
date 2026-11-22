import type { MetadataRoute } from "next";
import { publicPages, publicSite } from "@/lib/public-site";

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.keys(publicPages).map((path) => ({ url: new URL(path, publicSite).href }));
}
