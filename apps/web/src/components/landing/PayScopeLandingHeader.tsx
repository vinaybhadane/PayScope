"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { PayScopeLogo } from "@/components/brand/PayScopeLogo";
import { useAuth } from "@/context/AuthContext";

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
  const pathname = usePathname();
  const router = useRouter();
  const { user, openAuthModal, signOut } = useAuth();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About Us", href: "/about" },
    { name: "Privacy Policy", href: "/privacy" },
  ];

  const handleDashboard = () => {
    router.push("/dashboard");
  };

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      openAuthModal();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full pt-4 sm:pt-6 px-3 sm:px-6 pointer-events-none">
      {/* Floating Island Navbar Capsule (matching uploaded visual) */}
      <div className="max-w-6xl mx-auto rounded-full bg-[#080C16]/85 border border-white/[0.09] backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.75)] px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between pointer-events-auto transition-all">
        {/* LEFT: PayScope Brand Logo */}
        <div
          ref={headerLogoRef}
          id="header-target-logo"
          className="flex items-center transition-opacity duration-300 shrink-0"
          style={{ opacity: showFinalLogo ? 1 : 0 }}
        >
          <Link
            href="/"
            className="flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#00E0E0] rounded-xl p-0.5"
          >
            <PayScopeLogo variant="navbar" size={28} />
          </Link>
        </div>

        {/* CENTER: Clean Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`px-4 py-1.5 rounded-full text-xs lg:text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "text-white bg-white/[0.12] shadow-inner font-semibold"
                    : "text-[#8E9CAE] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* RIGHT: Dashboard Button, Avatar & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dashboard -> Button */}
          <button
            onClick={handleDashboard}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span>Dashboard</span>
            <svg
              className="w-3.5 h-3.5 text-[#00E0E0]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>

          {/* User Profile Avatar */}
          <div className="flex items-center gap-2 pl-1">
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || "User avatar"}
                width={30}
                height={30}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#00E0E0]/30 object-cover"
              />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#00E0E0]/40 to-[#0070F3]/40 border border-[#00E0E0]/30 text-white flex items-center justify-center text-xs font-bold overflow-hidden shadow-sm">
                {user?.displayName?.[0] || user?.email?.[0] || (
                  <span className="text-[10px] text-cyan-200">PS</span>
                )}
              </div>
            )}

            {/* Logout / Login Icon */}
            <button
              onClick={handleAuthAction}
              title={user ? "Sign out" : "Log in"}
              className="p-1.5 text-xs text-[#8E9CAE] hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
              aria-label={user ? "Sign out" : "Log in"}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[#8E9CAE] hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-white/20 ml-1"
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
        <div className="md:hidden mt-2 max-w-6xl mx-auto rounded-2xl bg-[#080C16]/95 border border-white/[0.09] backdrop-blur-2xl p-4 flex flex-col gap-2 pointer-events-auto shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "text-white bg-white/[0.12] font-semibold"
                    : "text-[#8E9CAE] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleDashboard();
              }}
              className="w-full py-2.5 rounded-xl bg-white/[0.08] text-white font-semibold text-sm text-center flex items-center justify-center gap-1.5"
            >
              <span>Dashboard</span>
              <svg className="w-4 h-4 text-[#00E0E0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default PayScopeLandingHeader;
