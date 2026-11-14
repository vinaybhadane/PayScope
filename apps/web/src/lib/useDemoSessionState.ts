"use client";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/** Keep only illustrative workspace preferences for the current browser tab. */
export function useDemoSessionState<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
    try {
      const stored = sessionStorage.getItem(`payscope_demo_${key}`);
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch {
      /* A restricted browser can still use the in-memory demo. */
    }
    setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(`payscope_demo_${key}`, JSON.stringify(value));
    } catch {
      /* Storage is optional. */
    }
  }, [key, ready, value]);
  return [value, setValue];
}
