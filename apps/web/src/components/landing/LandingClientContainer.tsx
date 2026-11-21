"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PayScopeLandingHeader } from "@/components/landing/PayScopeLandingHeader";
import { DownloadAppModal } from "@/components/landing/DownloadAppModal";
import { CookieConsentModal } from "@/components/landing/CookieConsentModal";
import { useAuth } from "@/context/AuthContext";

interface LandingClientContainerProps {
  apiConnected: boolean;
}

export function LandingClientContainer({}: LandingClientContainerProps) {
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const router = useRouter();
  const { user, openAuthModal } = useAuth();

  const handleLaunchApp = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      openAuthModal();
    }
  };

  return (
    <div className="relative h-screen max-h-screen flex flex-col justify-between bg-[#040711] text-slate-100 overflow-hidden selection:bg-[#FF5500] selection:text-white">
      {/* 1. Ambient Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft atmospheric gradient mesh */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#00E0E0]/10 blur-[160px]" />
        <div className="absolute top-1/4 right-1/4 w-[700px] h-[700px] rounded-full bg-[#FF5500]/10 blur-[180px]" />
        <div className="absolute bottom-10 left-1/3 w-[500px] h-[500px] rounded-full bg-[#10B981]/08 blur-[150px]" />
        
        {/* Subtle high-tech dot grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.12]" 
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)",
            backgroundSize: "36px 36px"
          }}
        />

        {/* Top & bottom vignettes */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#040711] via-transparent to-[#040711]/60" />
      </div>

      {/* 2. Modern Transparent Header (Fixed Height) */}
      <PayScopeLandingHeader />

      {/* 3. HERO SECTION (100% Fit in Single Screen Viewport, No Scroll) */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-2 lg:py-4 flex items-center justify-center min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full h-full max-h-full">
          
          {/* ================= LEFT COLUMN: Headline & Plan Allocation Card ================= */}
          <div className="lg:col-span-5 flex flex-col items-start justify-center space-y-4 sm:space-y-6 z-20">
            {/* Main Headline (Clean 2-line layout without social proof pill) */}
            <h1 className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-black tracking-tight text-white leading-[1.08] drop-shadow-2xl">
              Automated wealth{" "}
              <span className="block text-white mt-1">allocation</span>
            </h1>

            {/* Action Buttons: [Download app] & [See more] */}
            <div className="flex items-center gap-3.5 pt-0.5">
              <button
                onClick={() => setDownloadModalOpen(true)}
                className="px-6 sm:px-7 py-2.5 sm:py-3 rounded-full bg-[#0D1322] hover:bg-[#151D33] text-white font-bold text-xs sm:text-sm tracking-wide border border-white/[0.18] hover:border-white/[0.3] transition-all shadow-[0_6px_20px_rgba(0,0,0,0.6)] hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
              >
                Download app
              </button>

              <button
                onClick={handleLaunchApp}
                className="px-5 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-semibold text-[#8E9CAE] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>See more</span>
                <svg className="w-3.5 h-3.5 text-[#00E0E0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Floating "Plan Allocation" Card (Compact single-screen design) */}
            <div className="relative w-full max-w-[340px] sm:max-w-[360px] rounded-2xl bg-[#0D1322]/90 border border-white/[0.14] p-4 backdrop-blur-2xl shadow-[0_15px_40px_rgba(0,0,0,0.85)] transition-all hover:border-white/[0.25] group">
              {/* Shiny decorative 4-point star in top-right corner */}
              <div className="absolute -top-3 -right-3 w-7 h-7 flex items-center justify-center pointer-events-none drop-shadow-[0_0_10px_rgba(255,255,255,0.75)]">
                <svg className="w-6 h-6 text-white fill-white animate-pulse" viewBox="0 0 24 24">
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
              </div>

              <div className="space-y-2.5">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Plan Allocation</h3>
                  <p className="text-[11px] text-[#8E9CAE] leading-relaxed mt-0.5">
                    Your monthly contribution is automatically allocated across the selected financial products.
                  </p>
                </div>

                {/* Amount display */}
                <div className="flex items-baseline justify-between pt-0.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">$59.99</span>
                    <span className="text-xs text-[#8E9CAE] font-medium">/ month</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                </div>

                <p className="text-[10px] text-[#8E9CAE]">
                  Next payment will be charged on <strong className="text-slate-300">25th March</strong>
                </p>

                {/* Card preview strip */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#080C16] border border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-400 font-black text-[10px] italic">
                      VISA
                    </span>
                    <span className="text-xs font-mono text-slate-300">•••• •••• 4506</span>
                  </div>
                  <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    Show
                  </span>
                </div>

                {/* Edit annual plan action */}
                <button
                  onClick={handleLaunchApp}
                  className="w-full py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <svg className="w-3 h-3 text-[#00E0E0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Edit annual plan</span>
                </button>
              </div>
            </div>
          </div>

          {/* ================= CENTER & RIGHT: Holding Phone visual ================= */}
          <div className="lg:col-span-7 relative flex items-center justify-center lg:justify-end h-full max-h-full min-h-0">
            {/* Realistic Hand Holding Phone Visual using /holdingPhone.png */}
            <div className="relative z-10 w-full max-w-[360px] sm:max-w-[420px] lg:max-w-[470px] flex items-center justify-center max-h-[62vh]">
              {/* Soft circular aura glow directly behind the phone */}
              <div className="absolute inset-0 m-auto w-60 h-80 rounded-full bg-gradient-to-tr from-[#00E0E0]/20 via-[#0070F3]/15 to-[#FF5500]/15 blur-[90px] pointer-events-none" />

              <Image
                src="/holdingPhone.png"
                alt="PayScope mobile financial dashboard in hand"
                width={470}
                height={674}
                priority
                className="w-auto h-auto max-h-[58vh] object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.9)] select-none pointer-events-none transition-transform duration-500 hover:scale-[1.01]"
              />
            </div>

            {/* Bottom-Right Explanatory Text */}
            <div className="absolute bottom-2 sm:bottom-4 right-0 sm:right-4 z-30 max-w-[200px] text-right hidden md:block">
              <p className="text-xs font-normal text-[#C5D2E0] leading-relaxed drop-shadow-md">
                Your monthly contribution is intelligently distributed across digital assets.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Slim Single-Screen Footer */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#040711]/90 backdrop-blur-md py-2.5 sm:py-3 text-[11px] text-[#8E9CAE] shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">PayScope</span>
            <span>•</span>
            <span>© {new Date().getFullYear()} Autonomous Outflow Intelligence. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/about" className="hover:text-white transition-colors">
              About Us
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/dashboard" className="text-[#00E0E0] hover:underline font-medium">
              Launch Dashboard →
            </Link>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <DownloadAppModal isOpen={downloadModalOpen} onClose={() => setDownloadModalOpen(false)} />
      
      {/* Horizontal bottom cookie popup shown automatically on first visit */}
      <CookieConsentModal />
    </div>
  );
}

export default LandingClientContainer;
