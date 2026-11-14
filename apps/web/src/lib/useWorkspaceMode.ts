"use client";
import { useSyncExternalStore } from "react";
const key = "payscope_workspace_data_mode";
const subscribe = (notify: () => void) => {
  window.addEventListener("payscope:workspace-mode", notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener("payscope:workspace-mode", notify);
    window.removeEventListener("storage", notify);
  };
};
const snapshot = () => {
  try {
    return sessionStorage.getItem(key) === "connected" ? "connected" : "sample";
  } catch {
    return "sample";
  }
};
export function useWorkspaceMode() {
  return useSyncExternalStore(subscribe, snapshot, () => "sample");
}
export function setWorkspaceMode(mode: "sample" | "connected") {
  try {
    sessionStorage.setItem(key, mode);
  } catch {
    return;
  }
  window.dispatchEvent(new Event("payscope:workspace-mode"));
}
