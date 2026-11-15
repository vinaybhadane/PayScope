"use client";
import { useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { getApiBaseUrl } from "@/lib/apiBase";
import { invalidateWorkspaceResources, useWorkspaceResource } from "@/lib/useWorkspaceResource";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";

type ReviewState = { status: string; model: string; generated_at: string | null; error: string | null;
  report: { overview: string; spending_analysis: string; savings_analysis: string; limitations: string[]; transaction_count: number } | null };
type EmailSettings = { recipient: string | null; sender: string; can_email: boolean; reports_enabled: boolean; reminders_enabled: boolean;
  deliveries: { kind: string; status: string; error: string | null; created_at: string }[] };

export function AIWorkspacePanel({ section = "overview", controls = false }: { section?: "overview" | "spending_analysis" | "savings_analysis"; controls?: boolean }) {
  const review = useWorkspaceResource<ReviewState>("/api/v1/workspace/intelligence", { status: "empty", model: "", generated_at: null, error: null, report: null });
  const settings = useWorkspaceResource<EmailSettings>("/api/v1/workspace/email-settings", { recipient: null, sender: "", can_email: false, reports_enabled: false, reminders_enabled: false, deliveries: [] });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showClear, setShowClear] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const state = review.data;
  const email = settings.data;
  const isDemoReport = state?.model === "predefined-demo-v1";
  const sectionTitle = section === "overview" ? "subscription report" : section === "spending_analysis" ? "spending analysis" : "savings review";
  async function action(path: string, init?: RequestInit) {
    setBusy(true); setMessage("");
    try {
      const response = await authFetch(`${getApiBaseUrl()}/api/v1${path}`, init);
      if (!response.ok) { const body = await response.json(); throw new Error(body.detail || "The request could not be completed."); }
      return await response.json();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); return null; }
    finally { setBusy(false); }
  }
  async function download() {
    setBusy(true); setMessage("");
    try {
      const response = await authFetch(`${getApiBaseUrl()}/api/v1/workspace/report.pdf`);
      if (!response.ok) throw new Error("Complete an AI review before downloading the report.");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "payscope-subscription-report.pdf"; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Download failed."); }
    finally { setBusy(false); }
  }
  return <section className="ai-workspace-panel" aria-label="AI review and workspace controls">
    <div className="ai-panel-heading"><div><span className="dash-eyebrow"><Icon name="spark" size={14} />{isDemoReport ? "SAMPLE DATA, REVIEWED" : "YOUR STATEMENT, REVIEWED"}</span>
      <h2>{isDemoReport ? `Sample ${sectionTitle}` : section === "overview" ? "Your AI subscription report" : section === "spending_analysis" ? "AI spending analysis" : "AI savings review"}</h2></div>
      <span className="ai-review-state">{state?.status === "completed" ? isDemoReport ? "Demo analysis ready" : "Review complete" : state?.status === "failed" ? "Review needs attention" : "Awaiting upload"}</span></div>
    {review.error && <p role="alert">{review.error}</p>}
    {state?.error && <p role="alert">{state.error}</p>}
    <p className="ai-analysis-text">{state?.report?.[section] || "Import a statement to generate a report from your own payment records. No sample subscriptions are shown."}</p>
    {state?.generated_at && <small>Based on {state.report?.transaction_count || 0} {isDemoReport ? "synthetic" : "uploaded"} debit records · {new Date(state.generated_at).toLocaleString()} · {isDemoReport ? "Built-in demo rules" : state.model}</small>}
    {!!state?.report?.limitations?.length && <details className="ai-limitations"><summary>Evidence and limitations</summary>{state.report.limitations.map((line, i) => <p key={i}>{line}</p>)}</details>}
    {controls && <div className="ai-panel-actions">
      <button className="button button-subtle" disabled={busy || state?.status !== "completed"} onClick={download}><Icon name="download" size={15} />Download PDF</button>
      <button className="button button-subtle" disabled={busy} onClick={() => setEmailOpen(!emailOpen)}><Icon name="bell" size={15} />Report emails & alerts</button>
      <button className="button button-subtle" disabled={busy} onClick={async () => {
        const result = await action("/workspace/review", { method: "POST" });
        if (result) { invalidateWorkspaceResources(); setMessage(result.message || "AI review completed."); }
      }}>{busy ? "Working…" : isDemoReport ? "Refresh sample analysis" : "Review uploaded records"}</button>
      <button className="button ai-clear-button" onClick={() => setShowClear(true)}>Clear dashboard</button>
    </div>}
    {controls && emailOpen && <div className="ai-email-settings">
      <h3>Report emails & payment reminders</h3>
      {email?.can_email ? <><p>From {email.sender}<br />To {email.recipient} (your verified login email)</p>
        <label><input type="checkbox" checked={email.reports_enabled} disabled={busy} onChange={async e => {
          const result = await action("/workspace/email-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reports_enabled: e.target.checked, reminders_enabled: email.reminders_enabled }) });
          if (result) invalidateWorkspaceResources();
        }} />Email the PDF report after each completed upload review</label>
        <label><input type="checkbox" checked={email.reminders_enabled} disabled={busy} onChange={async e => {
          const result = await action("/workspace/email-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reports_enabled: email.reports_enabled, reminders_enabled: e.target.checked }) });
          if (result) invalidateWorkspaceResources();
        }} />Remind me 5, 3, and 1 day before the estimated payment date</label>
        <button className="button button-subtle" disabled={busy || !email.reports_enabled || state?.status !== "completed"} onClick={async () => {
          const result = await action("/workspace/email-report", { method: "POST" });
          if (result) { setMessage("Report email queued for your login email."); invalidateWorkspaceResources(); }
        }}>Email latest PDF report</button>
        <p className="ai-email-note">Reminders use dates inferred from uploaded payments and run while the backend is online.</p>
        {email.deliveries.map((delivery, i) => <p key={i} className="ai-delivery-status">{delivery.kind === "report" ? "PDF report" : "Payment reminder"}: {delivery.status}{delivery.error ? ` · ${delivery.error}` : ""}</p>)}
      </> : <p>Sign in with Google and a verified email address to receive PDF reports and payment reminders. Guest workspaces can download the PDF.</p>}
    </div>}
    {message && <p role="status" className="ai-action-message">{message}</p>}
    {showClear && <Modal label="Clear complete dashboard" close={() => { if (!busy) setShowClear(false); }} className="ai-clear-dialog">
      <h2>Clear complete dashboard?</h2><p>This removes your uploaded records, subscriptions, insights, savings scenarios, email settings, and queued alerts. This cannot be undone.</p>
      <label>Type CLEAR to continue<input autoComplete="off" aria-label="Type CLEAR to confirm" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
      <div className="ai-panel-actions"><button className="button button-subtle" disabled={busy} onClick={() => setShowClear(false)}>Keep my data</button>
        <button className="button ai-clear-button" disabled={busy || confirmation !== "CLEAR"} onClick={async () => {
          const result = await action("/workspace/clear", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation }) });
          if (result) { invalidateWorkspaceResources(); setShowClear(false); setConfirmation(""); setMessage(result.graph_status === "cleanup_pending" ? "Dashboard cleared. Relationship storage is offline; graph cleanup needs a retry." : "Dashboard cleared. Import a statement to start again."); }
        }}>{busy ? "Clearing…" : "Clear all workspace data"}</button></div>
    </Modal>}
  </section>;
}
