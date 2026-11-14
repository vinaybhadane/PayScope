"use client";
import { authFetch } from "@/lib/authFetch";

import { getApiBaseUrl } from "@/lib/api";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";

import AppHeader from "@/components/navigation/AppHeader";

interface MerchantItem {
  id: string;
  canonical_name: string;
  category: string;
  commitment_type_default?: string | null;
  website_url?: string | null;
  support_url?: string | null;
  is_fictional_demo_merchant: boolean;
  reference_source?: string | null;
  alias_count: number;
  transaction_count: number;
  created_at: string;
}

interface CandidateMatch {
  merchant_id: string;
  canonical_name: string;
  category: string;
  score: number;
  method: string;
  confidence_band: string;
}

interface ResolveResult {
  raw_descriptor: string;
  normalised_descriptor: string;
  status: string;
  merchant_id?: string | null;
  merchant_name?: string | null;
  category?: string | null;
  match_method?: string | null;
  score: number;
  confidence_band: string;
  explanation: string;
  is_ambiguous: boolean;
  candidates: CandidateMatch[];
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Diagnostic match preview state
  const [previewInput, setPreviewInput] = useState<string>("UPI/STREAMPULSE/BILLPAY/982138");
  const [testingMatch, setTestingMatch] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<ResolveResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Reprocessing state
  const [reprocessing, setReprocessing] = useState<boolean>(false);
  const [reprocessResult, setReprocessResult] = useState<{
    examined_count: number;
    matched_count: number;
    review_required_count: number;
    unresolved_count: number;
    skipped_user_confirmed_count: number;
  } | null>(null);

  const apiBase = getApiBaseUrl();

  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      if (selectedCategory) params.append("category", selectedCategory);
      params.append("limit", "100");

      const res = await authFetch(`${apiBase}/api/v1/merchants?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMerchants(data);
      }
    } catch {
      // Ignore background errors
    } finally {
      setLoading(false);
    }
  }, [apiBase, searchQuery, selectedCategory]);

  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.append("q", searchQuery.trim());
        if (selectedCategory) params.append("category", selectedCategory);
        params.append("limit", "100");

        const res = await authFetch(`${apiBase}/api/v1/merchants?${params.toString()}`);
        if (!ignore && res.ok) {
          const data = await res.json();
          setMerchants(data);
        }
      } catch {
        // Ignore
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadInitial();
    return () => {
      ignore = true;
    };
  }, [apiBase, searchQuery, selectedCategory]);

  // Run diagnostic preview test
  const handleTestMatch = async () => {
    if (!previewInput.trim()) return;

    setTestingMatch(true);
    setTestError(null);
    setTestResult(null);

    try {
      const res = await authFetch(`${apiBase}/api/v1/merchants/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_descriptor: previewInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTestError(data.detail || "Resolution failed.");
      } else {
        setTestResult(data);
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Network error");
    } finally {
      setTestingMatch(false);
    }
  };

  // Trigger reprocessing
  const handleReprocess = async () => {
    setReprocessing(true);
    setReprocessResult(null);
    try {
      const res = await authFetch(`${apiBase}/api/v1/merchants/reprocess-unmatched`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force_all: false }),
      });

      const data = await res.json();
      if (res.ok) {
        setReprocessResult(data);
        fetchMerchants();
      }
    } catch {
      // Ignore background error
    } finally {
      setReprocessing(false);
    }
  };

  // Extract unique categories from loaded merchants for dropdown
  const categories = Array.from(new Set(merchants.map((m) => m.category))).filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col bg-[#E5E8CE] text-[#4B6248] antialiased selection:bg-[#789575] selection:text-[#243C2D]">
      {/* Top Header */}
      <AppHeader />

      {/* Main Container */}
      <main id="workspace-content" tabIndex={-1} className="workspace-content flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Title & Introduction */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#243C2D]">
              Merchant Reference Catalogue
            </h1>
            <p className="mt-1 text-sm text-[#4B6248]">
              Curated merchant registry, descriptor alias mapping, and RapidFuzz resolution engine.
            </p>
          </div>

          <button
            onClick={handleReprocess}
            disabled={reprocessing}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[#243C2D] text-xs font-semibold shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            {reprocessing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[#789575]/30 border-t-white rounded-full animate-spin" />
                <span>Reprocessing Transactions...</span>
              </>
            ) : (
              <span>Reprocess Unmatched</span>
            )}
          </button>
        </div>

        {/* Reprocessing Notification Banner */}
        {reprocessResult && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 text-xs text-emerald-300 flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#243C2D]">Reprocessing Completed Successfully</p>
              <p className="text-[#4B6248] mt-0.5">
                Examined: <strong className="text-[#243C2D]">{reprocessResult.examined_count}</strong> | Matched: <strong className="text-emerald-400">{reprocessResult.matched_count}</strong> | Queued for Review: <strong className="text-amber-400">{reprocessResult.review_required_count}</strong> | Skipped User Confirmed: <strong className="text-[#4B6248]">{reprocessResult.skipped_user_confirmed_count}</strong>
              </p>
            </div>
            <button onClick={() => setReprocessResult(null)} className="text-[#4B6248] hover:text-[#243C2D]">✕</button>
          </div>
        )}

        {/* DIAGNOSTIC MATCH PREVIEW CARD */}
        <section className="rounded-xl border border-[#B7C4A6] bg-[#F0F2E3]/50 p-6 flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-[#243C2D] flex items-center gap-2">
              Diagnostic Match Preview & Test Sandbox
            </h3>
            <p className="text-xs text-[#4B6248]">
              Enter any raw bank statement descriptor to test the multi-stage resolution pipeline (exact, regex, RapidFuzz).
            </p>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#4B6248] text-[11px]">Example Descriptors:</span>
            {[
              "UPI/STREAMPULSE/BILLPAY/982138",
              "CLOUDDESKK PRO SUBSCRPTN",
              "POS ZENITH FITNESS INDIRANAGAR",
              "RAZORPAY*MERCH_INTL_4819",
              "BILLDESK*PG-MUMBAI-TXN99281",
              "MYSTERY VENDOR 9942",
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setPreviewInput(chip)}
                className="px-2.5 py-1 rounded-md bg-[#F0F2E3]/80 hover:bg-slate-750 text-[#4B6248] text-[11px] font-mono border border-[#B7C4A6]/60 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={previewInput}
              onChange={(e) => setPreviewInput(e.target.value)}
              placeholder="e.g. UPI/STREAMPULSE/BILLPAY/982138"
              className="flex-1 rounded-lg border border-[#B7C4A6] bg-[#E5E8CE] px-3 py-2 text-xs font-mono text-[#243C2D] placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
            />
            <button
              onClick={handleTestMatch}
              disabled={testingMatch || !previewInput.trim()}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[#243C2D] text-xs font-semibold transition-colors shrink-0"
            >
              {testingMatch ? "Testing..." : "Test Resolution"}
            </button>
          </div>

          {testError && (
            <div className="rounded-lg bg-rose-950/40 border border-rose-800 p-3 text-xs text-rose-300">
              {testError}
            </div>
          )}

          {/* Diagnostic Result Display */}
          {testResult && (
            <div className="rounded-lg bg-[#E5E8CE]/80 border border-[#B7C4A6] p-4 space-y-3 font-mono text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#B7C4A6] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#4B6248]">Status:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase border ${
                      testResult.status.startsWith("MATCHED")
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : testResult.status === "NEEDS_REVIEW"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {testResult.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[#4B6248]">
                  <span>Score: <strong className="text-[#243C2D]">{testResult.score.toFixed(1)}%</strong></span>
                  <span>Confidence: <strong className="text-[#4B6248]">{testResult.confidence_band}</strong></span>
                  <span>Method: <strong className="text-[#4B6248]">{testResult.match_method || "—"}</strong></span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#4B6248]">Raw Descriptor:</span>
                  <span className="text-[#4B6248]">{testResult.raw_descriptor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4B6248]">Normalised Tokens:</span>
                  <span className="text-emerald-400">{testResult.normalised_descriptor || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4B6248]">Resolved Merchant:</span>
                  <span className="text-[#243C2D] font-sans font-semibold">{testResult.merchant_name || "(Unresolved)"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4B6248]">Category:</span>
                  <span className="text-[#4B6248]">{testResult.category || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4B6248]">Explanation:</span>
                  <span className="text-[#4B6248] font-sans text-[11px]">{testResult.explanation}</span>
                </div>
              </div>

              {testResult.candidates.length > 0 && (
                <div className="pt-2 border-t border-[#B7C4A6]/80 space-y-1.5">
                  <span className="text-[11px] text-[#4B6248] uppercase tracking-wider block">
                    Ranked Match Candidates ({testResult.candidates.length})
                  </span>
                  <div className="space-y-1">
                    {testResult.candidates.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-[#F0F2E3] border border-[#B7C4A6] text-[11px]">
                        <span className="text-[#243C2D] font-sans font-medium">{c.canonical_name} ({c.category})</span>
                        <div className="flex items-center gap-3 text-[#4B6248] font-mono">
                          <span>{c.method}</span>
                          <span className="font-bold text-emerald-400">{c.score.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search merchants by name or category..."
            className="flex-1 w-full rounded-lg border border-[#B7C4A6] bg-[#F0F2E3]/60 px-3 py-2 text-xs text-[#243C2D] placeholder-[#4B6248]/60 focus:border-emerald-500 focus:outline-none"
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-56 rounded-lg border border-[#B7C4A6] bg-[#F0F2E3]/60 px-3 py-2 text-xs text-[#4B6248] focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {/* MERCHANT CATALOGUE GRID */}
        {loading ? (
          <div className="py-12 text-center text-xs text-[#4B6248]">
            Loading merchant catalogue...
          </div>
        ) : merchants.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#4B6248] border border-dashed border-[#B7C4A6] rounded-xl">
            No merchants found matching your query.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {merchants.map((m) => (
              <Link
                key={m.id}
                href={`/merchants/${m.id}`}
                className="group rounded-xl border border-[#B7C4A6] bg-[#F0F2E3]/50 hover:bg-[#F0F2E3]/80 hover:border-emerald-500/40 p-5 transition-all flex flex-col justify-between gap-4 shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#F0F2E3] text-[#4B6248] border border-[#B7C4A6]">
                      {m.category.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      Curated Demo
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-[#243C2D] group-hover:text-emerald-300 transition-colors">
                    {m.canonical_name}
                  </h3>

                  {m.commitment_type_default && (
                    <p className="text-[11px] text-[#4B6248]">
                      Default Cadence: <span className="text-[#4B6248] font-mono capitalize">{m.commitment_type_default.replace("_", " ")}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-[#4B6248] pt-3 border-t border-[#B7C4A6]/80 font-mono">
                  <span>Aliases: <strong className="text-[#243C2D]">{m.alias_count}</strong></span>
                  <span>Linked Txns: <strong className="text-emerald-400">{m.transaction_count}</strong></span>
                  <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#E5E8CE]/80 py-6 text-center text-xs text-[#4B6248]">
        PayScope Prototype — Synthetic financial data only. No real banking connectivity.
      </footer>
    </div>
  );
}
