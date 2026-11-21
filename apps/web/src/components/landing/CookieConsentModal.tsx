"use client";

import React, { useState, useEffect } from "react";

interface CookieConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceOpen?: boolean;
}

export function CookieConsentModal({ isOpen, onClose, forceOpen = false }: CookieConsentModalProps) {
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: true,
    localCache: true,
  });
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("payscope_cookie_consent");
    if (saved) {
      setHasInteracted(true);
    }
  }, []);

  const shouldShow = isOpen || (forceOpen && !hasInteracted);

  if (!shouldShow) return null;

  const handleSave = (all = false) => {
    const choice = all
      ? { essential: true, analytics: true, localCache: true }
      : preferences;
    localStorage.setItem("payscope_cookie_consent", JSON.stringify(choice));
    setHasInteracted(true);
    onClose();
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-md w-full rounded-3xl bg-[#080C16]/95 border border-white/[0.15] p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-slate-100 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Cookie Policy &amp; Consent</h3>
            <span className="text-[10px] text-emerald-400 font-mono">Zero Third-Party Advertising Trackers</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg"
          aria-label="Close cookie banner"
        >
          ✕
        </button>
      </div>

      <p className="mt-3 text-xs text-[#8E9CAE] leading-relaxed">
        PayScope uses local storage and strictly essential cookies to remember your workspace session and optimize local statement processing. We do not sell or monetize personal browsing data.
      </p>

      {/* Preferences checklist */}
      <div className="mt-3.5 space-y-2 p-3 rounded-xl bg-[#0D1322] border border-white/[0.06] text-xs">
        <div className="flex items-center justify-between">
          <span className="text-white font-medium">Essential Session Token</span>
          <span className="text-[10px] font-mono text-emerald-400">Required</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Local Statement Cache</span>
          <input
            type="checkbox"
            checked={preferences.localCache}
            onChange={(e) => setPreferences({ ...preferences, localCache: e.target.checked })}
            className="accent-[#FF5500] rounded"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Telemetry &amp; Audit Logs</span>
          <input
            type="checkbox"
            checked={preferences.analytics}
            onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
            className="accent-[#FF5500] rounded"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-4 flex items-center gap-2.5">
        <button
          onClick={() => handleSave(true)}
          className="flex-1 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#FF6611] text-white font-bold text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer"
        >
          Accept All
        </button>
        <button
          onClick={() => handleSave(false)}
          className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-semibold transition-all cursor-pointer"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}
