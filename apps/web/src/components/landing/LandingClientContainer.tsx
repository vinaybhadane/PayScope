"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PayScopeLandingHeader } from "@/components/landing/PayScopeLandingHeader";
import { useAuth } from "@/context/AuthContext";

interface LandingClientContainerProps {
  apiConnected: boolean;
}

export function LandingClientContainer({}: LandingClientContainerProps) {
  const ambientVideoRef = useRef<HTMLVideoElement | null>(null);
  const router = useRouter();
  const { user, openAuthModal } = useAuth();

  // Enforce seamless ambient video playback
  useEffect(() => {
    const video = ambientVideoRef.current;
    if (!video) return;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy fallback: video remains muted & loopable
      });
    }
  }, []);

  const handleGetStarted = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      openAuthModal();
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#040711] text-slate-100 overflow-x-hidden selection:bg-[#FF5500] selection:text-white">
      {/* 1. FULL-PAGE AMBIENT BACKGROUND VIDEO - payscope-picker-intro.mp4 */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Full-bleed Ambient Video Layer (High clarity and contrast matching the 3D visual) */}
        <div className="absolute inset-0 opacity-95 md:opacity-100 brightness-105 contrast-110 transition-opacity duration-700">
          <video
            id="ambient-hero-video"
            ref={ambientVideoRef}
            src="/videos/payscope-picker-intro.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="w-full h-full object-cover object-center pointer-events-none"
          />
        </div>

        {/* Refined Semi-Translucent Vignette Overlays: Keeps video vividly visible on the right while protecting text contrast on the left */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#040711]/90 via-[#040711]/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#040711]/80 via-transparent to-[#040711]/30" />

        {/* Atmospheric soft radial glows */}
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-[#FF5500]/10 blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-[450px] h-[450px] rounded-full bg-[#00B8C7]/12 blur-[120px] pointer-events-none" />
      </div>

      {/* 2. FLOATING ISLAND HEADER */}
      <PayScopeLandingHeader />

      {/* 3. HERO SECTION: Clean Left-Aligned Asymmetric Layout */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-28 flex flex-col justify-center items-start text-left">
        <div className="max-w-2xl flex flex-col items-start space-y-7 drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
            Unlock clarity{" "}
            <span className="block mt-1 text-white">
              with every
            </span>
            <span className="block mt-1 text-white">
              payment
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[#C5D2E0] font-normal leading-relaxed max-w-xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            Detect hidden commitments, understand recurring costs, and automate mechanism-aware cancellations without connecting live bank credentials.
          </p>

          {/* Dual Action Buttons: [Get started] [Go to Dashboard ->] */}
          <div className="flex flex-wrap items-center gap-4 pt-2 w-full sm:w-auto">
            <button
              onClick={handleGetStarted}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#FF6611] text-white font-bold text-sm tracking-wide transition-all shadow-[0_0_30px_rgba(255,85,0,0.45)] hover:shadow-[0_0_45px_rgba(255,85,0,0.65)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-center"
            >
              Get started
            </button>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#0D1322]/85 hover:bg-[#151D33] border border-white/[0.15] hover:border-white/[0.3] text-white font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] text-center flex items-center justify-center gap-2 backdrop-blur-md shadow-lg"
            >
              <span>Go to Dashboard</span>
              <svg className="w-4 h-4 text-[#00E0E0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </main>

      {/* 4. MINIMALIST FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#040711]/85 backdrop-blur-md py-6 text-xs text-[#8E9CAE]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} PayScope. All rights reserved.</span>
          <div className="flex items-center gap-6 text-xs">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/about" className="hover:text-white transition-colors">
              About Us
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingClientContainer;
