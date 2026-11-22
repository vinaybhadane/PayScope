import { publicPageMetadata } from "@/lib/public-site";

export const metadata = publicPageMetadata("/privacy");

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
