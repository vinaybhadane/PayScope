"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { authFetch, DEMO_VERSION } from "@/lib/authFetch";
import { getApiBaseUrl } from "@/lib/apiBase";
import { invalidateWorkspaceResources } from "@/lib/useWorkspaceResource";

export function DemoWorkspaceBootstrap() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.isDemo) return;
    const seedKey = `payscope_demo_seed_${DEMO_VERSION}_${user.uid}`;
    if (sessionStorage.getItem(seedKey) === "ready") return;

    sessionStorage.setItem(seedKey, "pending");
    void authFetch(`${getApiBaseUrl()}/api/v1/demo/seed`, { method: "POST" })
      .then((response) => {
        if (!response.ok) throw new Error("Demo sample setup failed.");
        sessionStorage.setItem(seedKey, "ready");
        invalidateWorkspaceResources();
      })
      .catch(() => {
        sessionStorage.removeItem(seedKey);
      });
  }, [user?.isDemo, user?.uid]);

  return null;
}
