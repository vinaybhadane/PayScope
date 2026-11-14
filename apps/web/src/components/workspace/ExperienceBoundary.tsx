"use client";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import dynamic from "next/dynamic";
import { useWorkspaceMode } from "@/lib/useWorkspaceMode";
const DemoWorkspace = dynamic(() =>
  import("./DemoWorkspace").then((m) => m.DemoWorkspace),
);
const demoRoutes = [
  "/commitments",
  "/insights",
  "/financial-impact",
  "/savings",
  "/cancellations",
  "/merchants",
  "/merchant-review",
];
export function ExperienceBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const mode = useWorkspaceMode();
  if (user?.isDemo && mode === "sample" && demoRoutes.includes(pathname)) return <DemoWorkspace />;
  return <>{children}</>;
}
