"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { PayScopeLogo } from "@/components/brand/PayScopeLogo";
import { Modal } from "@/components/ui/Modal";

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithGoogle,
    signInAsGuest,
    isConfigured,
  } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const close = useCallback(() => closeAuthModal(), [closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const google = async () => {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch {
      setError(
        "Google sign-in couldn’t be completed. Please try again or explore the sample workspace."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = async () => {
    setError("");
    setBusy(true);
    try {
      await signInAsGuest();
      router.push("/dashboard");
    } catch {
      setError("Could not open your demo session. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal close={close} label="Welcome to PayScope" className="auth-dialog">
      <div className="flex flex-col items-start w-full text-left">
        {/* Brand Logo with ambient glow */}
        <div className="relative mb-3">
          <div className="absolute -inset-2 bg-gradient-to-r from-[#FF5500]/20 to-[#00E0E0]/20 rounded-full blur-md pointer-events-none" />
          <div className="relative">
            <PayScopeLogo size={36} />
          </div>
        </div>

        {/* Title & Subtitle */}
        <h2 className="text-2xl sm:text-[25px] font-bold tracking-tight text-white leading-tight mb-1.5">
          A clearer picture
          <span className="block text-white">starts here.</span>
        </h2>
        <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed mb-5">
          Get to know your recurring payments. Make more room for what matters.
        </p>

        {/* Error Notification */}
        {error && (
          <div className="w-full mb-3.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-300" role="alert">
            <svg className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Action 1: Official Google SSO Button (High contrast, authentic 4-color Google G) */}
        {isConfigured && (
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs sm:text-sm tracking-wide transition-all shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:shadow-[0_6px_22px_rgba(255,255,255,0.2)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer border border-transparent"
            onClick={google}
            disabled={busy}
          >
            {busy ? (
              <svg className="w-4 h-4 animate-spin text-slate-700" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15Z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
              </svg>
            )}
            <span>{busy ? "Connecting to Google…" : "Continue with Google"}</span>
          </button>
        )}

        {/* Divider with seamless transparent flex lines */}
        <div className="w-full flex items-center gap-3 my-4">
          <div className="flex-1 border-t border-white/[0.08]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] select-none">
            {isConfigured ? "or take a look around" : "no account needed"}
          </span>
          <div className="flex-1 border-t border-white/[0.08]" />
        </div>

        {/* Action 2: Secondary Free Demo Button (PayScope theme) */}
        <button
          type="button"
          disabled={busy}
          onClick={handleGuest}
          className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-[#FF5500]/40 text-white font-medium text-xs sm:text-sm transition-all group cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_20px_rgba(255,85,0,0.15)] active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#FF5500]/15 flex items-center justify-center text-[#FF5500] group-hover:scale-105 transition-transform">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-100 group-hover:text-white transition-colors">
              Explore the free demo
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#8E9CAE] group-hover:text-[#FF5500] transition-colors">
            <span>Instant</span>
            <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Trust & Security Signals */}
        <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-white/[0.08] text-[11px] text-[#8E9CAE]">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="truncate">Local statement parsing</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <svg className="w-3.5 h-3.5 text-[#00E0E0] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="truncate">No bank login required</span>
          </div>
        </div>

        {/* Footnote */}
        <p className="w-full text-center text-[11px] text-[#64748B] mt-3 leading-relaxed">
          The demo uses sample data. By continuing, you agree to our{" "}
          <Link href="/privacy" onClick={close} className="text-[#8E9CAE] hover:text-white underline underline-offset-2 transition-colors">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </Modal>
  );
}
export default AuthModal;
