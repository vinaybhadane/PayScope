"use client";

import React, { useState } from "react";
import { useDialogFocus } from "@/components/ui/useDialogFocus";

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DownloadAppModal({ isOpen, onClose }: DownloadAppModalProps) {
  const dialog = useDialogFocus(isOpen, onClose);
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!isOpen) return null;

  const handleSimulateDownload = () => {
    setDownloadStarted(true);
    setTimeout(() => setDownloadStarted(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-[#080C16] border border-white/[0.12] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col gap-6 text-slate-100"
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-modal-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close download modal"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF5500] to-[#FF8800] flex items-center justify-center text-white shadow-lg shadow-[#FF5500]/30 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 id="download-modal-title" className="text-xl font-bold text-white tracking-tight">
              Download PayScope App
            </h2>
            <p className="text-xs text-[#8E9CAE]">
              Autonomous recurring payment intelligence on iOS &amp; Android.
            </p>
          </div>
        </div>

        {/* QR Code and App highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#0D1322] border border-white/[0.08] items-center">
          {/* Mock QR Code */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white text-slate-900 shadow-inner">
            <svg className="w-28 h-28" viewBox="0 0 100 100" fill="currentColor">
              <path d="M10 10h30v30H10zm5 5v20h20V15zm45-5h30v30H60zm5 5v20h20V15zM10 60h30v30H10zm5 5v20h20V65zm50 0h10v10H65zm15 0h10v10H80zm-15 15h10v10H65zm15 0h10v10H80zm-40-30h10v10H40zm10 10h10v10H50zm0-20h10v10H50zm-10 0h10v10H40zm20 0h10v10H60zm0 10h10v10H60z" />
            </svg>
            <span className="text-[10px] font-mono font-bold mt-1 text-slate-700">SCAN WITH CAMERA</span>
          </div>

          <div className="space-y-2.5 text-xs text-[#8E9CAE]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-white font-medium">Local-first statement OCR</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00E0E0]" />
              <span className="text-white font-medium">Real-time AutoPay mandate alerts</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF5500]" />
              <span className="text-white font-medium">1-Click cancellation playbooks</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-white font-medium">Zero bank credentials required</span>
            </div>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSimulateDownload}
              className="px-4 py-3 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 flex items-center justify-center gap-2 text-xs font-semibold text-white transition-all cursor-pointer hover:scale-[1.02]"
            >
              <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-2 .6-2.65 1.35-.58.67-1.08 1.74-.95 2.77.99.08 2.05-.52 2.67-1.27z" />
              </svg>
              <span>Apple iOS (PWA)</span>
            </button>

            <button
              onClick={handleSimulateDownload}
              className="px-4 py-3 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 flex items-center justify-center gap-2 text-xs font-semibold text-white transition-all cursor-pointer hover:scale-[1.02]"
            >
              <svg className="w-4 h-4 fill-current text-emerald-400" viewBox="0 0 24 24">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.082 12 8.082s-3.5902.3296-5.1368.8677L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.152 5676l1.9972 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
              </svg>
              <span>Android APK</span>
            </button>
          </div>

          <button
            onClick={handleSimulateDownload}
            className="w-full py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#FF6611] text-[#040711] font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(255,85,0,0.45)] cursor-pointer"
          >
            {downloadStarted ? "Downloading PayScope Client..." : "Direct APK Package Download"}
          </button>
        </div>
      </div>
    </div>
  );
}
