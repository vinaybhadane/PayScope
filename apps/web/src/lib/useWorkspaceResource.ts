"use client";
import { authFetch } from "@/lib/authFetch";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl } from "./api";

const snapshots = new Map<string, { value: unknown; at: number }>();
const pending = new Map<string, Promise<unknown>>();
const FRESH_MS = 15_000;
let revision = 0;
const listeners = new Set<() => void>();
const subscribe = (notify: () => void) => { listeners.add(notify); return () => { listeners.delete(notify); }; };
export function invalidateWorkspaceResources() {
  revision += 1;
  snapshots.clear();
  listeners.forEach((notify) => notify());
}
async function request(key: string, endpoint: string) {
  if (pending.has(key)) return pending.get(key)!;
  const operation = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await authFetch(`${getApiBaseUrl()}${endpoint}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(
          "Your workspace couldn’t be refreshed. Please try again.",
        );
      const value = await response.json();
      if (value.data_status === "unavailable")
        throw new Error("Your workspace is temporarily unavailable.");
      snapshots.delete(key);
      snapshots.set(key, { value, at: Date.now() });
      if (snapshots.size > 24) snapshots.delete(snapshots.keys().next().value!);
      return value;
    } finally {
      clearTimeout(timer);
      pending.delete(key);
    }
  })();
  pending.set(key, operation);
  return operation;
}
/** Memory-only, user-scoped cache. Keep visible data while revalidating; coalesce concurrent requests. */
export function useWorkspaceResource<T>(endpoint: string, sample: T) {
  const { user, loading: authLoading } = useAuth();
  const version = useSyncExternalStore(subscribe, () => revision, () => 0);
  const isDemo = false;
  const key = `${getApiBaseUrl()}:${user?.uid || "anonymous"}:${endpoint}:${version}`;
  const [snapshot, setSnapshot] = useState<{
    key: string;
    value: T;
    at: number;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const cached = snapshots.get(key);
  const data = isDemo
    ? sample
    : snapshot?.key === key
      ? snapshot.value
      : (cached?.value as T | undefined);
  const refresh = useCallback(
    async (force = true) => {
      if (authLoading || !user || isDemo) return;
      const cached = snapshots.get(key);
      if (!force && cached && Date.now() - cached.at < FRESH_MS) {
        setSnapshot({ key, value: cached.value as T, at: cached.at });
        return;
      }
      setRefreshing(true);
      setError("");
      try {
        const value = (await request(key, endpoint)) as T;
        setSnapshot({ key, value, at: Date.now() });
      } catch (e) {
        setError(
          e instanceof Error && e.name === "AbortError"
            ? "This is taking longer than expected. Retry when you’re ready."
            : e instanceof Error
              ? e.message
              : "Couldn’t refresh this view.",
        );
      } finally {
        setRefreshing(false);
      }
    },
    [authLoading, endpoint, isDemo, key, user],
  );
  useEffect(() => {
    const timer = setTimeout(() => void refresh(false), 0);
    const visible = () => {
      if (document.visibilityState === "visible") void refresh(false);
    };
    document.addEventListener("visibilitychange", visible);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", visible); };
  }, [refresh]);
  return {
    data,
    error,
    refreshing,
    isDemo,
    loading: authLoading || (!data && refreshing),
    refresh: () => refresh(true),
    updatedAt: isDemo ? null : snapshot?.at || cached?.at || null,
  };
}
