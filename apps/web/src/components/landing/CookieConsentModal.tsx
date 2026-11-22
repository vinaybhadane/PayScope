"use client";

import React, { useState, useEffect } from "react";

interface CookieConsentModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function CookieConsentModal({ isOpen = false, onClose }: CookieConsentModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem("payscope_cookie_consent");
    if (!consent) {
      // First time visitor: show automatically after slight delay for smooth entrance
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Allow external trigger if passed isOpen=true
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible) return null;

  const handleChoice = (acceptedAll: boolean) => {
    localStorage.setItem(
      "payscope_cookie_consent",
      JSON.stringify({
        essential: true,
        analytics: acceptedAll,
        localCache: acceptedAll,
        timestamp: new Date().toISOString(),
      })
    );
    setVisible(false);
    if (onClose) onClose();
  };

  return (
    <aside aria-labelledby="cookie-consent-title" className="fixed bottom-0 left-0 right-0 z-50 w-full bg-[#080C16]/95 border-t border-white/[0.12] backdrop-blur-2xl shadow-[0_-15px_40px_rgba(0,0,0,0.85)] px-4 sm:px-8 py-3.5 sm:py-4 text-slate-100 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-8">
        {/* Left: Info & Description without 'Local-First' badge */}
        <div className="flex items-center gap-3 text-left w-full md:w-auto">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 id="cookie-consent-title" className="text-xs sm:text-sm font-bold text-white tracking-tight">Cookie Policy &amp; Consent</h2>
            <p className="text-xs text-[#8E9CAE] leading-relaxed mt-0.5 max-w-3xl">
              PayScope uses local storage and strictly essential session cookies to authenticate your workspace and run offline statement parsing. We do not track or sell personal browsing data.
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
          <button
            onClick={() => handleChoice(false)}
            className="px-4 py-1.5 sm:py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            Essential Only
          </button>

          <button
            onClick={() => handleChoice(true)}
            className="px-5 sm:px-6 py-1.5 sm:py-2 rounded-full bg-[#FF5500] hover:bg-[#FF6611] text-[#040711] font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(255,85,0,0.4)] hover:scale-[1.02] cursor-pointer"
          >
            Accept All
          </button>

          <button
            onClick={() => {
              setVisible(false);
              if (onClose) onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors ml-1"
            aria-label="Dismiss cookie notice"
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  );
}

export default CookieConsentModal;
