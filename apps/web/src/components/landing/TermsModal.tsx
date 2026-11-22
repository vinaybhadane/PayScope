"use client";

import React from "react";
import { useDialogFocus } from "@/components/ui/useDialogFocus";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
  const dialog = useDialogFocus(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl max-h-[85vh] rounded-3xl bg-[#080C16] border border-white/[0.12] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col gap-5 text-slate-100 overflow-hidden"
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close terms modal"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <div>
          <h2 id="terms-modal-title" className="text-xl font-bold text-white tracking-tight">
            Terms and Conditions
          </h2>
          <p className="text-xs text-[#8E9CAE]">
            Last updated: November 2026 • PayScope Recurring Payment Intelligence
          </p>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto pr-2 space-y-4 text-xs text-[#C5D2E0] leading-relaxed border-y border-white/[0.08] py-4">
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-white">1. Platform Nature &amp; Synthetic Scope</h3>
            <p>
              PayScope is a recurring outflow auditing platform engineered for financial research, trial conversion detection, and payment rail analysis. The platform operates on synthetic statements, anonymized uploads, or simulated notifications.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-white">2. RBI Mandate &amp; Consumer Rights Guidance</h3>
            <p>
              Cancellation playbooks, dispute notices, and mandate revocation instructions provided by PayScope reference regulatory guidelines issued by the Reserve Bank of India (RBI) and National Payments Corporation of India (NPCI) for e-Mandates, UPI AutoPay, and Standing Instructions. PayScope acts as an advisory tool and does not debit, alter, or transfer bank balances directly.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-white">3. Local-First Processing &amp; Zero Bank Logins</h3>
            <p>
              PayScope does NOT request net banking passwords, OTPs, or debit card PINs. All statement parsing (including image OCR and raw text extraction) occurs securely within your browser and local API instance.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-white">4. User Responsibilities &amp; Data Accuracy</h3>
            <p>
              Users confirm that any uploaded statements are either synthetic fixtures or authorized documents for personal expenditure auditing. Users retain full ownership over their data and can purge workspace records at any time.
            </p>
          </section>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            I Understand &amp; Agree
          </button>
        </div>
      </div>
    </div>
  );
}
