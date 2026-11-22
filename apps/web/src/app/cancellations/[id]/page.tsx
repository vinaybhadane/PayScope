"use client";
import { authFetch } from "@/lib/authFetch";
import { invalidateWorkspaceResources } from "@/lib/useWorkspaceResource";

import { getApiBaseUrl } from "@/lib/api";
import React, { useState, useEffect, use } from "react";
import Link from "next/link";

import AppHeader from "@/components/navigation/AppHeader";

interface PlaybookStep {
  id: string;
  step_number: number;
  title: string;
  instruction: string;
  warning?: string | null;
  verification_tip?: string | null;
  is_completed: boolean;
}

interface Playbook {
  playbook_key: string;
  title: string;
  payment_mechanism: string;
  guidance_type: string;
  official_source_url?: string | null;
  source_verification_date?: string | null;
  region: string;
  summary: string;
  important_warnings: string[];
  steps: PlaybookStep[];
  friction_level: string;
  friction_notes?: string | null;
}

interface CancellationCaseDetail {
  id: string;
  commitment_id: string;
  commitment_name: string;
  merchant_id?: string | null;
  merchant_name?: string | null;
  payment_mechanism: string;
  playbook_key: string;
  status: string;
  completed_steps: string[];
  user_notes?: string | null;
  evidence_references?: string | null;
  user_reported_at?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
  created_at: string;
  playbook?: Playbook | null;
}

export default function CancellationCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const caseId = unwrappedParams.id;

  const [caseDetail, setCaseDetail] = useState<CancellationCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal / Inputs
  const [reportingCancelled, setReportingCancelled] = useState(false);
  const [evidenceText, setEvidenceText] = useState("");
  const [reportingNotes, setReportingNotes] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const apiBase = getApiBaseUrl();

  useEffect(() => {
    let ignore = false;
    async function loadCase() {
      try {
        const res = await authFetch(`${apiBase}/api/v1/cancellations/${caseId}`);
        if (!ignore && res.ok) {
          const data = await res.json();
          setCaseDetail(data);
        } else if (!ignore) {
          setError("Failed to locate cancellation case.");
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Network error");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadCase();
    return () => {
      ignore = true;
    };
  }, [apiBase, caseId]);

  const handleStepComplete = async (stepId: string) => {
    try {
      const res = await authFetch(`${apiBase}/api/v1/cancellations/${caseId}/complete-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step_id: stepId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCaseDetail(updated);
        setActionSuccess("Step marked as completed!");
      }
    } catch {
      setError("Failed to update step.");
    }
  };

  const handleReportCancelled = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAction(true);
    setError(null);
    try {
      const res = await authFetch(`${apiBase}/api/v1/cancellations/${caseId}/report-cancelled`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidence_references: evidenceText || undefined,
          user_notes: reportingNotes || undefined,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCaseDetail(updated);
        setReportingCancelled(false);
        setActionSuccess("Cancellation recorded. Future charges can be flagged when you import another statement.");
        invalidateWorkspaceResources();
      } else {
        setError("Could not record the cancellation. Please try again.");
      }
    } catch {
      setError("Failed to record cancellation.");
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040711] flex items-center justify-center text-[#8E9CAE]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#FF5500] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading cancellation playbook...</span>
        </div>
      </div>
    );
  }

  if (!caseDetail) {
    return (
      <div className="min-h-screen bg-[#040711] text-[#F4F7FB] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#0D1322] border border-[#1E293B] text-center flex flex-col gap-4">
          <h2 className="text-lg font-bold text-rose-400">Case Not Found</h2>
          <p className="text-xs text-[#8E9CAE]">{error || "Could not retrieve details."}</p>
          <Link href="/cancellations" className="px-4 py-2 rounded-xl bg-[#040711] border border-[#1E293B] text-xs font-semibold text-[#F4F7FB] hover:border-[#FF5500]">
            ← Return to Cancellation Centre
          </Link>
        </div>
      </div>
    );
  }

  const pb = caseDetail.playbook;
  const completedSteps = caseDetail.completed_steps || [];
  const totalSteps = pb?.steps?.length ?? 0;
  const progressPct = totalSteps ? Math.min(100, Math.round((completedSteps.length / totalSteps) * 100)) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#040711] text-[#8E9CAE] selection:bg-[#FF5500] selection:text-[#F4F7FB]">
      {/* Top Navbar */}
      <AppHeader />

      {/* Main Body */}
      <main id="workspace-content" tabIndex={-1} className="workspace-content flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {error && <p className="dash-notice" role="alert">{error}</p>}
        {/* Banner Messages */}
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200 text-xs font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Case Header Card */}
        <div className="rounded-2xl bg-[#0D1322] border border-[#1E293B] p-6 sm:p-8 flex flex-col gap-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#040711] text-[#8E9CAE] border border-[#1E293B]">
                  {caseDetail.payment_mechanism.replace("_", " ")}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  caseDetail.status === "VERIFIED_CANCELLED" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
                  caseDetail.status === "USER_REPORTED_CANCELLED" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
                  "bg-[#FF5500]/15 text-[#8E9CAE] border border-[#FF5500]/30"
                }`}>
                  {caseDetail.status.replace(/_/g, " ")}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F7FB]">
                {pb?.title || `Cancel ${caseDetail.commitment_name}`}
              </h1>
              <p className="text-sm text-[#8E9CAE] mt-1">
                {pb?.summary}
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              {caseDetail.status !== "USER_REPORTED_CANCELLED" && caseDetail.status !== "VERIFIED_CANCELLED" && (
                <button
                  onClick={() => setReportingCancelled(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#FF5500] hover:brightness-110 text-[#040711] font-bold text-xs transition-all cursor-pointer shadow-lg shadow-[#FF5500]/20"
                >
                  Report Cancellation Completed →
                </button>
              )}
              {caseDetail.user_reported_at && (
                <span className="text-xs text-amber-400 font-mono">
                  Reported: {new Date(caseDetail.user_reported_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 pt-4 border-t border-[#1E293B] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8E9CAE] font-medium">Checklist Progress</span>
              <span className="text-[#F4F7FB] font-mono font-bold">{progressPct}% ({completedSteps.length}/{totalSteps} steps completed)</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#040711] overflow-hidden border border-[#1E293B]">
              <div
                className="h-full bg-gradient-to-r from-[#FF5500] to-[#FF5500] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Source Verification Box */}
        {pb?.official_source_url && (
          <div className="p-4 rounded-xl bg-[#040711] border border-[#1E293B] flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-[#8E9CAE]">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>
                Verified Official Source:{" "}
                <a
                  href={pb.official_source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8E9CAE] underline hover:text-[#F4F7FB]"
                >
                  {pb.official_source_url}
                </a>
              </span>
            </div>
            {pb.source_verification_date && (
              <span className="text-[#8E9CAE] font-mono shrink-0">
                Verified: {pb.source_verification_date}
              </span>
            )}
          </div>
        )}

        {/* Important Warnings */}
        {pb?.important_warnings && pb.important_warnings.length > 0 && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 flex flex-col gap-2">
            <h3 className="text-xs font-bold text-[#8E9CAE] flex items-center gap-1.5 uppercase tracking-wide">
              <span>⚠ Important Procedural Notice</span>
            </h3>
            <ul className="list-disc list-inside text-xs text-[#8E9CAE]/90 space-y-1">
              {pb.important_warnings.map((warn, idx) => (
                <li key={idx}>{warn}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Step-by-Step Checklist */}
        <div className="rounded-2xl bg-[#0D1322] border border-[#1E293B] p-6 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-[#F4F7FB]">Actionable Cancellation Checklist</h2>

          <div className="space-y-4">
            {pb?.steps.map((step) => {
              const isDone = completedSteps.includes(step.id);
              return (
                <div
                  key={step.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isDone
                      ? "bg-[#040711]/60 border-emerald-500/30 opacity-80"
                      : "bg-[#040711] border-[#1E293B] hover:border-[#FF5500]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleStepComplete(step.id)}
                        className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center font-bold text-xs transition-colors cursor-pointer shrink-0 ${
                          isDone
                            ? "bg-emerald-500 text-[#040711] border-emerald-400"
                            : "border-[#1E293B] hover:border-[#FF5500] text-transparent"
                        }`}
                      >
                        ✓
                      </button>
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm font-semibold ${isDone ? "line-through text-[#8E9CAE]" : "text-[#F4F7FB]"}`}>
                          Step {step.step_number}: {step.title}
                        </span>
                        <p className="text-xs text-[#8E9CAE] leading-relaxed">
                          {step.instruction}
                        </p>
                        {step.warning && (
                          <div className="mt-1 text-[11px] text-amber-300 font-medium">
                            Note: {step.warning}
                          </div>
                        )}
                        {step.verification_tip && (
                          <div className="mt-0.5 text-[11px] text-[#8E9CAE]">
                            Tip: {step.verification_tip}
                          </div>
                        )}
                      </div>
                    </div>

                    {!isDone && (
                      <button
                        onClick={() => handleStepComplete(step.id)}
                        className="px-3 py-1 rounded-lg border border-[#1E293B] bg-[#0D1322] text-[11px] font-semibold text-[#8E9CAE] hover:border-[#FF5500] cursor-pointer shrink-0"
                      >
                        Mark Done
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Report Modal */}
        {reportingCancelled && (
          <div className="fixed inset-0 bg-[#040711]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-[#0D1322] border border-[#1E293B] rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#F4F7FB]">Record Cancellation Outcome</h3>
                <button
                  onClick={() => setReportingCancelled(false)}
                  className="text-[#8E9CAE] hover:text-[#F4F7FB] text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-[#8E9CAE]">
                Recording this cancellation tells PayScope to flag any rogue post-cancellation debits on subsequent synthetic statements as anomalies.
              </p>

              <form onSubmit={handleReportCancelled} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="evidence-notes-input" className="text-xs font-semibold text-[#8E9CAE]">Evidence / Confirmation Reference</label>
                  <input
                    id="evidence-notes-input"
                    type="text"
                    placeholder="e.g. Email confirmation ref #88219 or UPI UMN screenshot"
                    value={evidenceText}
                    onChange={(e) => setEvidenceText(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-[#040711] border border-[#1E293B] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="user-notes-input" className="text-xs font-semibold text-[#8E9CAE]">User Notes</label>
                  <textarea
                    id="user-notes-input"
                    rows={3}
                    placeholder="e.g. Cancelled via Google Pay AutoPay section; valid until end of month."
                    value={reportingNotes}
                    onChange={(e) => setReportingNotes(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-[#040711] border border-[#1E293B] text-sm text-[#F4F7FB] focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setReportingCancelled(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8E9CAE] hover:text-[#F4F7FB]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#FF5500] text-[#040711] font-bold text-xs hover:brightness-110 cursor-pointer"
                  >
                    {submittingAction ? "Saving..." : "Confirm Reported Cancellation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
