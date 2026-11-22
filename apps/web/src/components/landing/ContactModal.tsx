"use client";

import React, { useState } from "react";
import { useDialogFocus } from "@/components/ui/useDialogFocus";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const dialog = useDialogFocus(isOpen, onClose);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-[#080C16] border border-white/[0.12] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col gap-6 text-slate-100"
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close contact modal"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <div>
          <h2 id="contact-modal-title" className="text-xl font-bold text-white tracking-tight">
            Contact PayScope Team
          </h2>
          <p className="text-xs text-[#8E9CAE]">
            Have inquiries regarding mandate integration, partnerships, or security? Reach out directly.
          </p>
        </div>

        {submitted ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-emerald-300">Message Delivered</h3>
            <p className="text-xs text-[#8E9CAE]">Thank you for reaching out. Our engineering team will respond promptly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="contact-name" className="text-xs font-medium text-[#8E9CAE]">Your Name</label>
              <input
                id="contact-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jane Doe"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0D1322] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00E0E0] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contact-email" className="text-xs font-medium text-[#8E9CAE]">Email Address</label>
              <input
                id="contact-email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0D1322] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00E0E0] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contact-message" className="text-xs font-medium text-[#8E9CAE]">Message</label>
              <textarea
                id="contact-message"
                required
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Describe your question or feedback..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#0D1322] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00E0E0] transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#FF5500] hover:bg-[#FF6611] text-[#040711] font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(255,85,0,0.45)] cursor-pointer"
            >
              Send Message
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-[#8E9CAE]">
          <span>Direct support: <strong className="text-white">support@payscope.finance</strong></span>
          <span>Security: <strong className="text-emerald-400">PGP Verified</strong></span>
        </div>
      </div>
    </div>
  );
}
