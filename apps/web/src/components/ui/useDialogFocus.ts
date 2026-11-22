"use client";

import { useEffect, useEffectEvent, useRef } from "react";

export function useDialogFocus(open: boolean, close: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  const dismiss = useEffectEvent(close);

  useEffect(() => {
    const dialog = panel.current;
    if (!open || !dialog) return;
    const opener = document.activeElement;
    dialog.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      }
      if (event.key !== "Tab" || !dialog) return;
      const stops = [...dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]',
      )].filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
      if (!stops.length) {
        event.preventDefault();
        return;
      }
      const first = stops[0], last = stops[stops.length - 1];
      const current = document.activeElement;
      if (!stops.some((stop) => stop === current) || current === (event.shiftKey ? first : last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [open]);

  return panel;
}
