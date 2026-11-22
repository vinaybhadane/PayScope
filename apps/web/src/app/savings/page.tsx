"use client";
import { authFetch } from "@/lib/authFetch";
import { useWorkspaceRevision } from "@/lib/useWorkspaceResource";

import { getApiBaseUrl } from "@/lib/api";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";

import { formatMoney } from "@/lib/formatMoney";
import AppHeader from "@/components/navigation/AppHeader";
import { MerchantLogo } from "@/components/brand/MerchantLogo";

interface SavingsOpportunity {
  id: string;
  opportunity_type: string;
  classification: string;
  commitment_id: string;
  commitment_name: string;
  merchant_id?: string | null;
  merchant_name: string;
  merchant_domain?: string | null;
  merchant_logo_url?: string | null;
  logo_source?: string | null;
  category: string;
  current_monthly_cost: number;
  current_annual_cost: number;
  potential_monthly_saving: number;
  potential_annual_saving: number;
  evidence_summary: string;
  insight_id: string | null;
  price_event_id: string | null;
  usage_coverage_id: string | null;
  details: Record<string, unknown>;
}

interface SavingsSummary {
  currency: string;
  total_potential_annual_savings: number;
  total_potential_monthly_savings: number;
  price_increase_savings: number;
  unused_commitment_savings: number;
  duplicate_service_savings: number;
  opportunities_count: number;
  opportunities: SavingsOpportunity[];
}

interface ProjectionResult {
  currency: string;
  baseline_annual_cost: number;
  selected_annual_savings: number;
  selected_monthly_savings: number;
  projected_annual_cost: number;
  projected_monthly_cost: number;
  percentage_reduction: number;
  selected_count: number;
  safeguards_applied: string[];
}

interface SavedScenario {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  selected_opportunity_ids: string[];
  selected_commitment_ids: string[];
  baseline_annual_cost: number;
  projected_annual_cost: number;
  annual_savings: number;
  monthly_savings: number;
  percentage_reduction: number;
  created_at: string;
}

export default function SavingsPage() {
  const [summary, setSummary] = useState<SavingsSummary | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [projection, setProjection] = useState<ProjectionResult | null>(null);
  const [calculationError, setCalculationError] = useState("");
  const [retryCalculation, setRetryCalculation] = useState(0);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter: all, price_increase, unused, duplicate
  const [filterType, setFilterType] = useState<string>("ALL");

  // Request sequence and abort controller guards against stale asynchronous responses
  const latestCalcRequestId = useRef<number>(0);
  const activeAbortController = useRef<AbortController | null>(null);

  // Save Scenario Modal / Form state
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDesc, setScenarioDesc] = useState("");
  const [savingScenario, setSavingScenario] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const apiBase = getApiBaseUrl();
  const workspaceRevision = useWorkspaceRevision();

  // 1. Initial Load of Opportunities & Saved Scenarios
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [sumRes, scenRes] = await Promise.all([
          authFetch(`${apiBase}/api/v1/savings/summary`),
          authFetch(`${apiBase}/api/v1/savings/scenarios`),
        ]);

        if (!sumRes.ok) throw new Error("Failed to load savings summary.");

        const sumData: SavingsSummary = await sumRes.json();
        const scenData: SavedScenario[] = scenRes.ok ? await scenRes.json() : [];

        if (!ignore) {
          setSummary(sumData);
          setSavedScenarios(scenData);
          const available = new Set(sumData.opportunities.map((o) => o.id));
          setSelectedIds((selection) => selection.filter((id) => available.has(id)));
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Error connecting to savings service.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [apiBase, workspaceRevision]);

  // Filtered opportunities preserved during filter changes
  const filteredOpportunities = (summary?.opportunities || []).filter((opp) => {
    if (filterType === "ALL") return true;
    return opp.opportunity_type === filterType;
  });

  // 2. Recompute Projection whenever selectedIds change (guarded against stale async responses)
  useEffect(() => {
    if (activeAbortController.current) {
      activeAbortController.current.abort();
    }
    const controller = new AbortController();
    activeAbortController.current = controller;
    const currentRequestId = ++latestCalcRequestId.current;

    async function recomputeProjection() {
      setCalculating(true);
      setCalculationError("");
      try {
        const res = await authFetch(`${apiBase}/api/v1/savings/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selected_opportunity_ids: selectedIds }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Could not update the savings estimate.");
        if (currentRequestId === latestCalcRequestId.current) {
          const data: ProjectionResult = await res.json();
          setProjection(data);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (currentRequestId === latestCalcRequestId.current) {
          setCalculationError(err instanceof Error ? err.message : "Could not update the savings estimate.");
          setProjection(null);
        }
      } finally {
        if (currentRequestId === latestCalcRequestId.current) {
          setCalculating(false);
        }
      }
    }

    recomputeProjection();

    return () => {
      controller.abort();
    };
  }, [selectedIds, apiBase, retryCalculation]);

  // Toggle opportunity selection (single clean state update path)
  const toggleOpportunity = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all visible opportunities (consistent and preserves selections across filters)
  const selectAll = () => {
    const visibleIds = filteredOpportunities.map((o) => o.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  // Deselect all visible opportunities
  const clearSelection = () => {
    const visibleIds = new Set(filteredOpportunities.map((o) => o.id));
    setSelectedIds((prev) => prev.filter((id) => !visibleIds.has(id)));
  };

  // Save Plan to Backend
  const handleSaveScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenarioName.trim()) return;

    setSavingScenario(true);
    setSaveSuccessMessage(null);

    try {
      const res = await authFetch(`${apiBase}/api/v1/savings/scenarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scenarioName.trim(),
          description: scenarioDesc.trim() || undefined,
          selected_opportunity_ids: selectedIds,
        }),
      });

      if (!res.ok) throw new Error("Failed to save plan.");

      const created: SavedScenario = await res.json();
      setSavedScenarios((prev) => [created, ...prev]);
      setScenarioName("");
      setScenarioDesc("");
      setSaveSuccessMessage(`Plan "${created.name}" saved successfully!`);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error saving plan.");
    } finally {
      setSavingScenario(false);
    }
  };

  // Delete Saved Plan
  const handleDeleteScenario = async (id: string) => {
    if (!confirm("Are you sure you want to delete this saved plan?")) return;

    try {
      const res = await authFetch(`${apiBase}/api/v1/savings/scenarios/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const formatOpportunityLabel = (type: string) => {
    switch (type) {
      case "PRICE_INCREASE":
        return "Price Went Up";
      case "POTENTIALLY_UNUSED":
        return "Rarely Used";
      case "DUPLICATE_SERVICE":
        return "Duplicate Service";
      case "FULL_CANCELLATION":
        return "Full cancellation scenario";
      default:
        return type.replace(/_/g, " ");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#040711] text-[#8E9CAE] antialiased selection:bg-teal-500 selection:text-slate-950">
      {/* Platform Header */}
      <AppHeader />

      {/* Main Container */}
      <main id="workspace-content" tabIndex={-1} className="workspace-content flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F7FB] flex items-center gap-3">
              Savings simulator
            </h1>
            <p className="text-sm text-[#8E9CAE] mt-1">
              Select one or more subscriptions to model what you could save if those charges stop.
            </p>
          </div>

        </div>

        {/* Friendly Information Notice */}
        <div className="rounded-xl border border-teal-500/20 bg-teal-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-teal-400 mt-1 flex-shrink-0 animate-pulse" />
            <div>
              <span className="font-semibold text-teal-300 block text-sm">
                How Your Savings Are Calculated
              </span>
              <p className="text-[#8E9CAE] mt-0.5 leading-relaxed">
                Estimates use successful INR charges and observed billing frequency. Select a subscription to preview savings. Use the cancellation centre to record an actual cancellation.
              </p>
            </div>
          </div>
        </div>

        {/* Loading and Error */}
        {loading && (
          <div className="p-12 text-center rounded-xl border border-[#1E293B] bg-[#0D1322]/40">
            <div className="w-8 h-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin mx-auto mb-3" />
            <span className="text-sm text-[#8E9CAE] font-mono">Finding subscriptions you can save money on...</span>
          </div>
        )}

        {error && (
          <div className="p-6 rounded-xl border border-rose-900/50 bg-rose-950/20 text-rose-300 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && summary && (
          <>
            {/* Top Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-label="Savings overview">
              <div className="rounded-xl border border-cyan-500/30 bg-[#0D1322] p-5 shadow-sm">
                <span className="text-xs font-medium text-[#8E9CAE]">If You Cancel Everything Suggested</span>
                <strong className="block mt-2 text-3xl font-bold font-mono text-cyan-300">
                  {formatMoney(summary.total_potential_annual_savings)}
                  <span className="text-sm font-normal text-[#8E9CAE] font-sans"> / year</span>
                </strong>
                <p className="mt-3 text-xs text-[#8E9CAE]">
                  Total amount you can save each year across all {summary.opportunities_count} recommendations.
                </p>
              </div>

              <div className="rounded-xl border border-teal-500/30 bg-[#0D1322] p-5 shadow-sm">
                <span className="text-xs font-medium text-[#8E9CAE]">Monthly Savings Equivalent</span>
                <strong className="block mt-2 text-3xl font-bold font-mono text-[#F4F7FB]">
                  {formatMoney(summary.total_potential_monthly_savings)}
                  <span className="text-sm font-normal text-[#8E9CAE] font-sans"> / month</span>
                </strong>
                <p className="mt-3 text-xs text-[#8E9CAE]">
                  Extra money left in your bank account every month once cancelled.
                </p>
              </div>
            </section>

            {/* Interactive Live Simulation Bar */}
            {calculationError && <div className="dash-notice" role="alert">{calculationError} <button type="button" onClick={() => setRetryCalculation((value) => value + 1)}>Retry</button></div>}
            {projection && (
              <section className="rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 p-6 shadow-[0_0_30px_rgba(6,182,212,0.12)]">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold block">
                      Live Calculator
                    </span>
                    <h2 className="text-xl font-bold text-[#F4F7FB] mt-1 flex items-center">
                      Estimated annual cost after cancellation
                      {calculating && (
                        <span className="ml-2 text-xs font-mono text-cyan-400 font-normal animate-pulse">
                          (Updating...)
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-[#8E9CAE] mt-1 max-w-xl leading-relaxed">
                      Select any combination below. The estimate updates with your selection.
                    </p>
                  </div>

                  {/* Comparison Figures */}
                  <div className="flex flex-wrap items-center gap-6 font-mono">
                    <div className="text-right">
                      <span className="text-[11px] text-[#8E9CAE] block font-sans">Current Spending</span>
                      <span className="text-xl font-bold text-[#8E9CAE]">
                        {formatMoney(projection.baseline_annual_cost)}
                      </span>
                    </div>

                    <div className="text-center font-sans text-xl text-cyan-400 font-light">&minus;</div>

                    <div className="text-right">
                      <span className="text-[11px] text-teal-400 block font-sans">Total You Save ({projection.selected_count} selected)</span>
                      <span className="text-xl font-bold text-teal-300">
                        {formatMoney(projection.selected_annual_savings)}
                      </span>
                    </div>

                    <div className="text-center font-sans text-xl text-cyan-400 font-light">=</div>

                    <div className="text-right p-3.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 shadow-inner">
                      <span className="text-[11px] text-cyan-300 font-bold block font-sans">Your New Lower Bill</span>
                      <span className="text-2xl font-black text-cyan-200">
                        {formatMoney(projection.projected_annual_cost)}
                      </span>
                      <span className="text-[10px] text-teal-300 font-sans block mt-0.5 font-semibold">
                        &darr; {projection.percentage_reduction}% Less To Pay Each Year
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1E293B]/80 flex items-center gap-2 text-[11px] text-[#8E9CAE]">
                  <span>Estimated monthly savings: {formatMoney(projection.selected_monthly_savings)}</span>
                </div>
              </section>
            )}

            {/* Split View: Left (Subscriptions List) & Right (Save Plan Form & Saved Plans) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Subscriptions to Cancel */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-[#F4F7FB]">Subscriptions You Can Cancel</h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0D1322] text-cyan-300 border border-[#1E293B] font-medium">
                      {filteredOpportunities.length} Available
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAll}
                      className="px-2.5 py-1 rounded-md text-xs text-cyan-400 hover:bg-cyan-950/40 border border-cyan-800/40 transition-colors font-medium cursor-pointer"
                    >
                      {filterType === "ALL" ? "Select All" : "Select All Visible"}
                    </button>
                    <button
                      onClick={clearSelection}
                      className="px-2.5 py-1 rounded-md text-xs text-[#8E9CAE] hover:bg-[#0D1322] border border-[#1E293B] transition-colors cursor-pointer"
                    >
                      {filterType === "ALL" ? "Deselect All" : "Deselect All Visible"}
                    </button>

                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-2.5 py-1 rounded-md bg-[#0D1322] border border-[#1E293B] text-xs text-[#8E9CAE] focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="ALL">All Suggestions</option>
                      <option value="PRICE_INCREASE">Price Increases</option>
                      <option value="POTENTIALLY_UNUSED">Rarely Used</option>
                      <option value="FULL_CANCELLATION">Full cancellation scenario</option>
                    </select>
                  </div>
                </div>

                {/* Opportunities Cards */}
                <div className="space-y-3">
                  {filteredOpportunities.map((opp) => {
                    const isChecked = selectedIds.includes(opp.id);
                    const inputId = `opp-checkbox-${opp.id}`;
                    return (
                      <div
                        key={opp.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isChecked
                            ? "bg-[#040711]/90 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            : "bg-[#0D1322]/40 border-[#1E293B]/80 opacity-75 hover:opacity-100 hover:border-[#1E293B]"
                        }`}
                      >
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <input
                            id={inputId}
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleOpportunity(opp.id)}
                            aria-labelledby={`opp-title-${opp.id}`}
                            className="mt-1 w-4 h-4 rounded text-cyan-500 focus:ring-2 focus:ring-cyan-400 focus:outline-none border-[#1E293B] bg-[#040711] cursor-pointer"
                          />

                          {/* Company Logo */}
                          <MerchantLogo
                            name={opp.merchant_name || opp.commitment_name}
                            merchantId={opp.merchant_id}
                            domain={opp.merchant_domain}
                            logoUrl={opp.merchant_logo_url}
                            category={opp.category}
                            size={40}
                            className="shadow-sm ring-1 ring-white/10 shrink-0"
                          />

                          <div className="flex-1 min-w-0">
                            <label htmlFor={inputId} className="cursor-pointer block select-none">
                              <div className="flex flex-wrap items-center gap-2">
                                <span id={`opp-title-${opp.id}`} className="font-semibold text-[#F4F7FB] text-sm hover:text-cyan-300 transition-colors">
                                  {opp.commitment_name}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                    opp.opportunity_type === "PRICE_INCREASE"
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                      : opp.opportunity_type === "POTENTIALLY_UNUSED"
                                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                                      : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                                  }`}
                                >
                                  {formatOpportunityLabel(opp.opportunity_type)}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0D1322] text-[#8E9CAE]">
                                  {opp.category}
                                </span>
                              </div>

                              <p className="text-xs text-[#8E9CAE] mt-1.5 max-w-lg leading-relaxed">
                                {opp.evidence_summary}
                              </p>
                            </label>

                            <div className="flex items-center gap-3 mt-2 text-[11px] text-[#8E9CAE]">
                              <span>Company: <strong className="text-[#F4F7FB]">{opp.merchant_name}</strong></span>
                              {opp.insight_id && (
                                <Link
                                  href={`/insights/${opp.insight_id}`}
                                  className="text-cyan-400 hover:underline"
                                >
                                  View Insights &rarr;
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Cost & Savings Figures */}
                        <div className="text-right font-mono flex-shrink-0 self-end sm:self-center">
                          <span className="text-sm font-bold text-teal-400 block">
                            Save {formatMoney(opp.potential_annual_saving)}/year
                          </span>
                          <span className="text-xs text-cyan-300 block">
                            {formatMoney(opp.potential_monthly_saving)}/month
                          </span>
                          <span className="text-[10px] text-[#8E9CAE] block mt-1 font-sans">
                            Currently costs {formatMoney(opp.current_annual_cost)}/year
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {filteredOpportunities.length === 0 && (
                    <div className="p-8 text-center rounded-xl border border-[#1E293B] text-[#8E9CAE] text-xs">
                      No savings opportunities matching this filter.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Save Plan Form & Saved Plans List */}
              <div className="flex flex-col gap-6">
                {/* Save Plan Form Card */}
                <div className="rounded-xl border border-[#1E293B] bg-[#0D1322]/50 p-5 flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#F4F7FB]">Save This Plan</h3>
                    <p className="text-xs text-[#8E9CAE] mt-0.5">
                      Save your current selection of {selectedIds.length} subscriptions to review or act on later.
                    </p>
                  </div>

                  {saveSuccessMessage && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-medium">
                      {saveSuccessMessage}
                    </div>
                  )}

                  <form onSubmit={handleSaveScenario} className="space-y-3">
                    <div>
                      <label className="text-[11px] text-[#8E9CAE] font-medium block mb-1">
                        Plan Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 2026 Subscription Cuts"
                        value={scenarioName}
                        onChange={(e) => setScenarioName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#040711] border border-[#1E293B] text-xs text-[#F4F7FB] placeholder:text-[#8E9CAE] focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-[#8E9CAE] font-medium block mb-1">
                        Notes (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Cancelling streaming apps I don't use often..."
                        value={scenarioDesc}
                        onChange={(e) => setScenarioDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#040711] border border-[#1E293B] text-xs text-[#F4F7FB] placeholder:text-[#8E9CAE] focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingScenario || selectedIds.length === 0}
                      className="w-full py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-[0_0_15px_rgba(20,184,166,0.2)]"
                    >
                      {savingScenario ? "Saving Plan..." : "Save This Plan"}
                    </button>
                  </form>
                </div>

                {/* Saved Plans List */}
                <div className="rounded-xl border border-[#1E293B] bg-[#0D1322]/50 p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#F4F7FB]">Your Saved Plans</h3>
                    <span className="text-xs text-[#8E9CAE] font-mono px-2 py-0.5 rounded bg-[#040711] border border-[#1E293B]">
                      {savedScenarios.length}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {savedScenarios.map((scen) => (
                      <div
                        key={scen.id}
                        className="p-3 rounded-xl bg-[#040711]/80 border border-[#1E293B] text-xs flex flex-col gap-2 hover:border-cyan-500/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-[#F4F7FB] block text-sm">{scen.name}</span>
                            {scen.description && (
                              <p className="text-[11px] text-[#8E9CAE] mt-0.5">{scen.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteScenario(scen.id)}
                            className="text-[#8E9CAE] hover:text-rose-400 text-sm font-mono transition-colors p-1"
                            title="Delete plan"
                          >
                            &times;
                          </button>
                        </div>

                        <div className="pt-2 border-t border-[#1E293B]/60 flex items-center justify-between text-[11px] font-mono">
                          <span className="text-teal-400 font-bold">
                            Save {formatMoney(scen.annual_savings)}/year
                          </span>
                          <span className="text-cyan-300 font-semibold font-sans">
                            &darr; {scen.percentage_reduction}% less
                          </span>
                        </div>
                      </div>
                    ))}

                    {savedScenarios.length === 0 && (
                      <p className="text-xs text-[#8E9CAE] text-center py-4">
                        No saved plans yet. Pick subscriptions and click &ldquo;Save This Plan&rdquo;.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
