import { publicPageMetadata } from "@/lib/public-site";

export const metadata = publicPageMetadata("/about");

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
