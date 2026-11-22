"use client";
import { authFetch } from "@/lib/authFetch";
import { useWorkspaceRevision } from "@/lib/useWorkspaceResource";

import { getApiBaseUrl } from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";

import { MonthlyPaymentChart, type MonthlyActivity } from "@/components/dashboard/MonthlyPaymentChart";
import { formatMoney } from "@/lib/formatMoney";
import AppHeader from "@/components/navigation/AppHeader";
import { MerchantLogo } from "@/components/brand/MerchantLogo";
import { formatPeriod } from "@/lib/formatPeriod";

interface FinancialSummary {
  currency: string;
  monthly_recurring_spend: number;
  annualized_recurring_spend: number;
  total_confirmed_commitments: number;
  potential_candidate_annual_cost: number;
  total_candidate_commitments: number;
  estimated_annual_total: number;
  unpriced_commitments_count: number;
  historical_spend_12m: number;
  upcoming_30d_expected_spend: number;
  potential_annual_savings: number;
  calculation_timestamp: string;
}

interface CommitmentCostItem {
  commitment_id: string;
  merchant_id: string | null;
  merchant_name: string;
  merchant_domain?: string | null;
  merchant_logo_url?: string | null;
  logo_source?: string | null;
  display_name: string;
  commitment_type: string;
  cadence: string;
  amount_pattern: string;
  representative_amount: number;
  currency: string;
  normalized_monthly_cost: number;
  annualized_cost: number;
  calculation_method: string;
  confidence_band: string;
  status: string;
  is_confirmed: boolean;
  is_candidate: boolean;
  next_expected_date: string | null;
  transaction_count: number;
}

interface CategoryBreakdown {
  category: string;
  category_label: string;
  monthly_cost: number;
  annualized_cost: number;
  historical_spend_12m: number;
  percentage_of_recurring: number;
  commitment_count: number;
}

interface MerchantRanking {
  merchant_id: string | null;
  merchant_name: string;
  merchant_domain?: string | null;
  merchant_logo_url?: string | null;
  logo_source?: string | null;
  category: string;
  monthly_cost: number;
  annualized_cost: number;
  historical_spend_12m: number;
  percentage_of_total: number;
  commitment_count: number;
  aliases: string[];
}

interface UpcomingItem {
  commitment_id: string;
  merchant_id?: string | null;
  merchant_name: string;
  merchant_domain?: string | null;
  merchant_logo_url?: string | null;
  logo_source?: string | null;
  display_name: string;
  expected_date: string;
  estimated_amount: number;
  currency: string;
  cadence: string;
  estimation_basis: string;
  is_confirmed: boolean;
}

interface UpcomingResponse {
  currency: string;
  total_upcoming_30d: number;
  total_upcoming_60d: number;
  items: UpcomingItem[];
}

interface HistoricalSpend {
  monthly_timeline: MonthlyActivity[];
  periods: { period: string; period_label: string; gross_debit_amount: string; total_credits: string; net_spend: string; transaction_count: number }[];
}

export default function FinancialImpactPage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [commitments, setCommitments] = useState<CommitmentCostItem[]>([]);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [merchants, setMerchants] = useState<MerchantRanking[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingResponse | null>(null);
  const [history, setHistory] = useState<HistoricalSpend | null>(null);
  const [windowKey, setWindowKey] = useState("90d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab filter: all, confirmed, candidates
  const [activeTab, setActiveTab] = useState<"all" | "confirmed" | "candidates">("confirmed");
  const [searchQuery, setSearchQuery] = useState("");

  const apiBase = getApiBaseUrl();
  const workspaceRevision = useWorkspaceRevision();

  useEffect(() => {
    let ignore = false;

    async function loadFinancialData() {
      setLoading(true);
      setError(null);

      try {
        const [sumRes, comRes, catRes, merRes, upRes, historyRes] = await Promise.all([
          authFetch(`${apiBase}/api/v1/financial-impact/summary`),
          authFetch(`${apiBase}/api/v1/financial-impact/commitments`),
          authFetch(`${apiBase}/api/v1/financial-impact/categories`),
          authFetch(`${apiBase}/api/v1/financial-impact/merchants`),
          authFetch(`${apiBase}/api/v1/financial-impact/upcoming`),
          authFetch(`${apiBase}/api/v1/financial-impact/history`),
        ]);

        if (![sumRes, comRes, catRes, merRes, upRes, historyRes].every((response) => response.ok)) {
          throw new Error("Failed to load spending analysis calculations.");
        }

        const [sumData, comData, catData, merData, upData, historyData] = await Promise.all([
          sumRes.json(),
          comRes.json(),
          catRes.ok ? catRes.json() : [],
          merRes.ok ? merRes.json() : [],
          upRes.ok ? upRes.json() : null,
          historyRes.json(),
        ]);

        if (!ignore) {
          setSummary(sumData);
          setCommitments(comData);
          setCategories(catData);
          setMerchants(merData);
          setUpcoming(upData);
          setHistory(historyData);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Error connecting to backend API.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadFinancialData();
    return () => {
      ignore = true;
    };
  }, [apiBase, workspaceRevision]);

  const window = history?.periods.find((period) => period.period === windowKey);

  const filteredCommitments = commitments.filter((item) => {
    if (activeTab === "confirmed" && !item.is_confirmed) return false;
    if (activeTab === "candidates" && !item.is_candidate) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.display_name.toLowerCase().includes(q) ||
        item.merchant_name.toLowerCase().includes(q) ||
        item.commitment_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#040711] text-[#8E9CAE] antialiased selection:bg-cyan-500 selection:text-slate-950">
      {/* Platform Header */}
      <AppHeader />

      {/* Main Container */}
      <main id="workspace-content" tabIndex={-1} className="workspace-content flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">

        {/* Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F7FB] flex items-center gap-3">
              Spending Analysis
            </h1>
            <p className="text-sm text-[#8E9CAE] mt-1">
              See clearly how much you spend every month and year, what subscriptions cost you the most, and what payments are coming up.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/savings"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-[0_0_15px_rgba(20,184,166,0.3)] flex items-center gap-2"
            >
              <span>Explore Savings Calculator &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="p-12 text-center rounded-xl border border-[#1E293B] bg-[#0D1322]/40">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto mb-3" />
            <span className="text-sm text-[#8E9CAE] font-mono">Loading your spending analysis...</span>
          </div>
        )}

        {error && (
          <div className="p-6 rounded-xl border border-rose-900/50 bg-rose-950/20 text-rose-300 text-sm">
            <strong>Error loading spending data:</strong> {error}
          </div>
        )}

        {!loading && history && window && <>
          <section className="comparison-panel" aria-label="Recorded cash flow">
            <header className="comparison-header">
              <div><h2>Recorded cash flow</h2><p>Completed INR payments through today.</p></div>
              <div className="history-window" aria-label="Spending period">
                {history.periods.map((period) => <button key={period.period} type="button" aria-pressed={windowKey === period.period}
                  onClick={() => setWindowKey(period.period)}>{period.period === "all" ? "All time" : period.period}</button>)}
              </div>
            </header>
            <div className="comparison-kpis" aria-live="polite">
              <div className="comparison-kpi outflow"><span>Outflow</span><strong>{formatMoney(window.gross_debit_amount)}</strong></div>
              <div className="comparison-kpi inflow"><span>Inflow</span><strong>{formatMoney(window.total_credits)}</strong></div>
              <div className="comparison-kpi"><span>Net cash flow</span><strong>{formatMoney(window.net_spend.startsWith("-") ? window.net_spend.slice(1) : window.net_spend === "0.00" ? "0.00" : `-${window.net_spend}`)}</strong></div>
            </div>
            <p className="comparison-caption">{window.transaction_count} completed payments · {window.period_label}</p>
          </section>
          <MonthlyPaymentChart activity={history.monthly_timeline} />
        </>}

        {!loading && summary && (
          <>
            {/* Top Metrics Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Monthly Recurring Spend */}
              <div className="rounded-xl border border-[#1E293B]/80 bg-[#0D1322]/50 p-5 backdrop-blur-sm flex flex-col justify-between">
                <span className="text-xs font-medium text-[#8E9CAE]">What You Spend Monthly</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl lg:text-3xl font-bold text-[#F4F7FB] font-mono">
                    {formatMoney(summary.monthly_recurring_spend)}
                  </span>
                  <span className="text-xs text-[#8E9CAE] font-normal">/mo</span>
                </div>
                <div className="mt-3 pt-2 border-t border-[#1E293B]/60 flex items-center justify-between text-[11px] text-[#8E9CAE]">
                  <span>{summary.total_confirmed_commitments} Confirmed Subscriptions</span>
                  <span className="text-cyan-400">Regular Bills</span>
                </div>
              </div>

              {/* Estimated Total Annual Commitments */}
              <div className="rounded-xl border border-amber-500/30 bg-slate-900/50 p-5 flex flex-col justify-between">
                <span className="text-xs font-semibold text-amber-300">Expected Total Yearly Spend</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl lg:text-3xl font-bold text-amber-200 font-mono">
                    {formatMoney(summary.estimated_annual_total)}
                  </span>
                  <span className="text-xs text-amber-300/80 font-normal">/yr</span>
                </div>
                <p className="mt-3 text-[11px] text-slate-300 leading-snug">
                  All active subscriptions plus potential candidates. {summary.unpriced_commitments_count > 0 ? `${summary.unpriced_commitments_count} without fixed price yet.` : ""}
                </p>
              </div>

              {/* Confirmed Annual Total */}
              <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-900/50 p-5 backdrop-blur-sm flex flex-col justify-between shadow-[0_0_20px_rgba(6,182,212,0.08)]">
                <span className="text-xs font-semibold text-cyan-300">Yearly Subscriptions Total</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl lg:text-3xl font-bold text-cyan-300 font-mono">
                    {formatMoney(summary.annualized_recurring_spend)}
                  </span>
                  <span className="text-xs text-cyan-400/70 font-normal">/yr</span>
                </div>
                <div className="mt-3 pt-2 border-t border-cyan-900/40 flex items-center justify-between text-[11px] text-[#8E9CAE]">
                  <span>Confirmed Services</span>
                  <span className="text-cyan-300">Active</span>
                </div>
              </div>

              {/* Historical 12M Spend */}
              <div className="rounded-xl border border-[#1E293B]/80 bg-[#0D1322]/50 p-5 backdrop-blur-sm flex flex-col justify-between">
                <span className="text-xs font-medium text-[#8E9CAE]">Past 12 Months Total Spent</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl lg:text-3xl font-bold text-[#8E9CAE] font-mono">
                    {formatMoney(summary.historical_spend_12m)}
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-[#1E293B]/60 flex items-center justify-between text-[11px] text-[#8E9CAE]">
                  <span>Bank Statement Debits</span>
                  <span className="text-emerald-400">Completed Payments</span>
                </div>
              </div>

              {/* Upcoming 30D Expected */}
              <div className="rounded-xl border border-[#1E293B]/80 bg-[#0D1322]/50 p-5 backdrop-blur-sm flex flex-col justify-between">
                <span className="text-xs font-medium text-[#8E9CAE]">Coming Due in Next 30 Days</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl lg:text-3xl font-bold text-amber-300 font-mono">
                    {formatMoney(summary.upcoming_30d_expected_spend)}
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-[#1E293B]/60 flex items-center justify-between text-[11px] text-[#8E9CAE]">
                  <span>Next 30 Days Due</span>
                  <span className="text-amber-400/80 font-medium">Scheduled</span>
                </div>
              </div>
            </section>

            {/* Potential Savings Quick Banner */}
            {summary.potential_annual_savings > 0 && (
              <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-400 mt-1 flex-shrink-0 animate-pulse" />
                  <div>
                    <h4 className="text-sm font-semibold text-teal-300">
                      You could save up to {formatMoney(summary.potential_annual_savings)} every year
                    </h4>
                    <p className="text-xs text-[#8E9CAE] mt-0.5">
                      We identified recurring subscriptions you may not be using or whose prices recently increased.
                    </p>
                  </div>
                </div>
                <Link
                  href="/savings"
                  className="px-3.5 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-200 text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  Try Savings Calculator &rarr;
                </Link>
              </div>
            )}

            {/* Candidate Obligations Banner */}
            {summary.total_candidate_commitments > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-1 flex-shrink-0 animate-pulse" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-300">
                      {summary.total_candidate_commitments} Potential Subscriptions to Review ({formatMoney(summary.potential_candidate_annual_cost)}/yr)
                    </h4>
                    <p className="text-xs text-[#8E9CAE] mt-0.5">
                      These are single annual payments or irregular charges (such as insurance or annual memberships). Check them to confirm or ignore.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("candidates")}
                  className="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-medium whitespace-nowrap transition-colors"
                >
                  Review Potential Subscriptions
                </button>
              </div>
            )}

            {/* Visual Analytics Grid: Category Distribution & Merchant Rankings */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="rounded-xl border border-[#1E293B] bg-[#0D1322]/50 p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#F4F7FB]">Where Your Money Goes by Category</h3>
                    <p className="text-xs text-[#8E9CAE] mt-0.5">Distribution of your yearly subscription expenses</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#040711] border border-[#1E293B] text-[#8E9CAE]">
                    {categories.length} Categories
                  </span>
                </div>

                <div className="space-y-4 pt-2">
                  {categories.map((cat) => (
                    <div key={cat.category} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#F4F7FB] font-medium">{cat.category_label}</span>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-[#8E9CAE] font-sans">{cat.commitment_count} service{cat.commitment_count === 1 ? "" : "s"}</span>
                          <span className="text-cyan-300 font-bold">
                            {formatMoney(cat.annualized_cost)}/yr
                          </span>
                          <span className="text-[#8E9CAE] text-[11px] w-12 text-right">({cat.percentage_of_recurring}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#0D1322] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, cat.percentage_of_recurring))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <span className="text-xs text-[#8E9CAE]">No confirmed subscriptions categorized yet.</span>
                  )}
                </div>
              </div>

              {/* Top Merchants by Recurring Outflow with Brand Logos */}
              <div className="rounded-xl border border-[#1E293B] bg-[#0D1322]/50 p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#F4F7FB]">Top Companies by Total Spend</h3>
                    <p className="text-xs text-[#8E9CAE] mt-0.5">The services taking the largest share of your budget</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#040711] border border-[#1E293B] text-[#8E9CAE]">
                    Top {Math.min(5, merchants.length)}
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  {merchants.slice(0, 5).map((m, idx) => (
                    <div
                      key={m.merchant_id || idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#040711]/60 border border-[#1E293B]/80 hover:border-cyan-500/30 transition-all text-xs"
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Company / Merchant Logo */}
                        <MerchantLogo
                          name={m.merchant_name}
                          merchantId={m.merchant_id}
                          domain={m.merchant_domain}
                          logoUrl={m.merchant_logo_url}
                          category={m.category}
                          size={40}
                          className="shadow-sm ring-1 ring-white/10 shrink-0"
                        />

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#F4F7FB] block text-sm">{m.merchant_name}</span>
                            <span className="w-4 h-4 rounded-full bg-[#0D1322] text-[#8E9CAE] flex items-center justify-center font-mono text-[9px] font-bold border border-[#1E293B]">
                              #{idx + 1}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#8E9CAE] mt-0.5 block">
                            {m.commitment_count} subscription{m.commitment_count === 1 ? "" : "s"} &bull; {m.category}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-cyan-300 font-bold block text-sm">
                          {formatMoney(m.annualized_cost)}/yr
                        </span>
                        <span className="text-[11px] text-[#8E9CAE]">
                          {formatMoney(m.monthly_cost)}/mo
                        </span>
                      </div>
                    </div>
                  ))}
                  {merchants.length === 0 && (
                    <span className="text-xs text-[#8E9CAE]">No company spend rankings available yet.</span>
                  )}
                </div>
              </div>
            </section>

            {/* Upcoming Payments Due */}
            {upcoming && upcoming.items.length > 0 && (
              <section className="rounded-xl border border-[#1E293B] bg-[#0D1322]/50 p-6 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[#F4F7FB]">Upcoming Payments Due (Next 60 Days)</h3>
                    <p className="text-xs text-[#8E9CAE] mt-0.5">
                      Expected payment dates based on your regular billing periods.
                    </p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-[#040711] border border-[#1E293B] text-amber-300 font-semibold self-start sm:self-auto">
                    Next 60 Days Total: {formatMoney(upcoming.total_upcoming_60d)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  {upcoming.items.slice(0, 8).map((up, idx) => (
                    <div
                      key={`${up.commitment_id}-${up.expected_date}-${idx}`}
                      className="p-3.5 rounded-xl bg-[#040711]/70 border border-[#1E293B] hover:border-cyan-500/30 flex flex-col justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <MerchantLogo
                          name={up.merchant_name || up.display_name}
                          merchantId={up.merchant_id}
                          domain={up.merchant_domain}
                          logoUrl={up.merchant_logo_url}
                          size={30}
                          className="shrink-0"
                        />
                        <div className="overflow-hidden flex-1">
                          <span className="font-semibold text-[#F4F7FB] truncate block text-xs">{up.display_name}</span>
                          <span className="text-[10px] text-cyan-400 capitalize font-medium">
                            {formatPeriod(up.cadence)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#1E293B]/60 flex justify-between items-baseline font-mono">
                        <span className="text-amber-400 font-bold text-sm">
                          {formatMoney(up.estimated_amount)}
                        </span>
                        <span className="text-[11px] text-[#8E9CAE] font-sans">{up.expected_date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Commitment Cost Table */}
            <section className="rounded-xl border border-[#1E293B] bg-[#0D1322]/50 p-6 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-[#F4F7FB]">All Subscriptions & Bills</h3>
                  <p className="text-xs text-[#8E9CAE] mt-0.5">
                    Every recurring service with its billing period and normalized monthly and yearly cost.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-lg bg-[#040711] border border-[#1E293B] p-0.5 text-xs font-medium">
                    <button
                      onClick={() => setActiveTab("confirmed")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        activeTab === "confirmed"
                          ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                          : "text-[#8E9CAE] hover:text-[#F4F7FB]"
                      }`}
                    >
                      Confirmed ({commitments.filter((c) => c.is_confirmed).length})
                    </button>
                    <button
                      onClick={() => setActiveTab("candidates")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        activeTab === "candidates"
                          ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                          : "text-[#8E9CAE] hover:text-[#F4F7FB]"
                      }`}
                    >
                      Potential ({commitments.filter((c) => c.is_candidate).length})
                    </button>
                    <button
                      onClick={() => setActiveTab("all")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        activeTab === "all"
                          ? "bg-[#0D1322] text-[#F4F7FB] font-bold"
                          : "text-[#8E9CAE] hover:text-[#F4F7FB]"
                      }`}
                    >
                      All ({commitments.length})
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Search by company or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#040711] border border-[#1E293B] text-xs text-[#F4F7FB] placeholder:text-[#8E9CAE] focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-[#1E293B]/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#040711]/80 border-b border-[#1E293B] text-[#8E9CAE] uppercase text-[11px] font-mono">
                    <tr>
                      <th className="py-3 px-4">Company & Subscription</th>
                      <th className="py-3 px-4">Billing Period</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Monthly Cost</th>
                      <th className="py-3 px-4">Yearly Cost</th>
                      <th className="py-3 px-4">Certainty</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/60">
                    {filteredCommitments.map((c) => (
                      <tr key={c.commitment_id} className="hover:bg-[#0D1322]/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <MerchantLogo
                              name={c.merchant_name || c.display_name}
                              merchantId={c.merchant_id}
                              domain={c.merchant_domain}
                              logoUrl={c.merchant_logo_url}
                              category={c.commitment_type}
                              size={32}
                              className="shrink-0"
                            />
                            <div>
                              <Link
                                href={`/commitments/${c.commitment_id}`}
                                className="font-medium text-[#F4F7FB] hover:text-cyan-400 transition-colors block text-sm"
                              >
                                {c.display_name}
                              </Link>
                              <span className="text-[11px] text-[#8E9CAE] block">
                                {c.merchant_name} &bull; <span className="capitalize">{c.commitment_type.replace("_", " ")}</span>
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-sans capitalize text-[#F4F7FB]">
                          {formatPeriod(c.cadence)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#F4F7FB]">
                          {formatMoney(c.representative_amount)}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-cyan-300">
                          {formatMoney(c.normalized_monthly_cost)}/mo
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#F4F7FB]">
                          {formatMoney(c.annualized_cost)}/yr
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              c.confidence_band === "high"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : c.confidence_band === "medium"
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {c.confidence_band === "high" ? "High" : c.confidence_band === "medium" ? "Medium" : "Low"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono capitalize ${
                              c.is_confirmed
                                ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                                : "bg-amber-950/40 text-amber-300 border border-amber-800/40"
                            }`}
                          >
                            {c.is_confirmed ? "Confirmed" : "Needs Review"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredCommitments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-[#8E9CAE] text-xs">
                          No subscriptions match the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
