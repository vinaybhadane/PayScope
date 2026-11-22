import { LandingClientContainer } from "@/components/landing/LandingClientContainer";
import { publicPageMetadata } from "@/lib/public-site";

export const metadata = publicPageMetadata("/");

export default function Home() {
  return <LandingClientContainer apiConnected={false} />;
}
