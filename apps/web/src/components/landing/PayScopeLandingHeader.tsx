"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { PayScopeLogo } from "@/components/brand/PayScopeLogo";
import { useAuth } from "@/context/AuthContext";
import { DownloadAppModal } from "./DownloadAppModal";
import { TermsModal } from "./TermsModal";
import { ContactModal } from "./ContactModal";

interface PayScopeLandingHeaderProps {
  apiConnected?: boolean;
  headerLogoRef?: React.RefObject<HTMLDivElement | null>;
  showFinalLogo?: boolean;
}

export function PayScopeLandingHeader({
  headerLogoRef,
  showFinalLogo = true,
}: PayScopeLandingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const { user, openAuthModal, signOut } = useAuth();

  const handleDashboard = () => {
    router.push("/dashboard");
  };

  const handleAuthAction = async () => {
    setLogoutFailed(false);
    if (user) {
      setLogoutFailed(!(await signOut()));
    } else {
      openAuthModal();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full px-4 sm:px-8 py-2.5 sm:py-3 transition-all bg-[#040711]/60 backdrop-blur-xl border-b border-white/[0.06] shrink-0">
        {logoutFailed && (
          <p role="alert" className="text-center text-xs text-rose-400 mb-2">
            Sign-out failed. Please try again.
          </p>
        )}

        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* LEFT: PayScope Brand Logo */}
          <div
            ref={headerLogoRef}
            id="header-target-logo"
            className="flex items-center transition-opacity duration-300 shrink-0"
            style={{ opacity: showFinalLogo ? 1 : 0 }}
          >
            <Link
              href="/"
              className="flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#00E0E0] rounded-xl p-0.5 group"
            >
              <PayScopeLogo variant="navbar" size={30} />
            </Link>
          </div>

          {/* CENTER: Clean, Professional Navigation Links (Cookie removed) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <Link
              href="/"
              className={`px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-medium transition-all ${
                pathname === "/"
                  ? "text-white bg-white/[0.1] font-semibold"
                  : "text-[#8E9CAE] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              Home
            </Link>

            <Link
              href="/about"
              className={`px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-medium transition-all ${
                pathname === "/about"
                  ? "text-white bg-white/[0.1] font-semibold"
                  : "text-[#8E9CAE] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              About Us
            </Link>

            <Link
              href="/privacy"
              className={`px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-medium transition-all ${
                pathname === "/privacy"
                  ? "text-white bg-white/[0.1] font-semibold"
                  : "text-[#8E9CAE] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              Privacy Policy
            </Link>

            <button
              onClick={() => setTermsModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-medium text-[#8E9CAE] hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              Terms and Conditions
            </button>

            <button
              onClick={() => setContactModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-medium text-[#8E9CAE] hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              Contact us
            </button>
          </nav>

          {/* RIGHT: Two Buttons [Download App] and [Sign In] */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* 1. Download App Button */}
            <button
              onClick={() => setDownloadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-[#00E0E0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download App</span>
            </button>

            {/* 2. Sign In Button */}
            <button
              onClick={handleAuthAction}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold text-white bg-[#FF5500] hover:bg-[#FF6611] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-[0_0_20px_rgba(255,85,0,0.35)]"
            >
              <span>{user ? "Sign Out" : "Sign In"}</span>
            </button>

            {/* Quick Dashboard shortcut if logged in */}
            {user && (
              <button
                onClick={handleDashboard}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-[#00E0E0] bg-[#00E0E0]/10 hover:bg-[#00E0E0]/20 border border-[#00E0E0]/20 transition-all cursor-pointer"
                title="Go to Dashboard"
              >
                <span>App</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            )}

            {/* User Avatar if logged in */}
            {user && (
              <div className="flex items-center pl-0.5">
                {user?.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || "User avatar"}
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-full border border-[#00E0E0]/40 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00E0E0]/40 to-[#0070F3]/40 border border-[#00E0E0]/30 text-white flex items-center justify-center text-[10px] font-bold">
                    {user?.displayName?.[0] || user?.email?.[0] || "PS"}
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[#8E9CAE] hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-white/20 ml-1"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 max-w-7xl mx-auto rounded-2xl bg-[#080C16]/95 border border-white/[0.12] backdrop-blur-2xl p-4 flex flex-col gap-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/[0.06]"
            >
              Home
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/[0.06]"
            >
              About Us
            </Link>
            <Link
              href="/privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/[0.06]"
            >
              Privacy Policy
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setTermsModalOpen(true);
              }}
              className="text-left px-4 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/[0.06]"
            >
              Terms and Conditions
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setContactModalOpen(true);
              }}
              className="text-left px-4 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/[0.06]"
            >
              Contact us
            </button>
            <div className="pt-2 border-t border-white/[0.08] flex items-center gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setDownloadModalOpen(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.08] text-white font-semibold text-xs text-center"
              >
                Download App
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleAuthAction();
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#FF5500] text-white font-bold text-xs text-center"
              >
                {user ? "Sign Out" : "Sign In"}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Global Landing Modals */}
      <DownloadAppModal isOpen={downloadModalOpen} onClose={() => setDownloadModalOpen(false)} />
      <TermsModal isOpen={termsModalOpen} onClose={() => setTermsModalOpen(false)} />
      <ContactModal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} />
    </>
  );
}

export default PayScopeLandingHeader;
