"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { getApiBaseUrl } from "@/lib/api";
import { authFetch } from "@/lib/authFetch";
import { formatMoney } from "@/lib/formatMoney";
import { useWorkspaceResource, useWorkspaceRevision } from "@/lib/useWorkspaceResource";

const endpoint = "/api/v1/insights/statement-comparison";
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateLabel = (value: string) => dateFormat.format(new Date(`${value}T00:00:00Z`));

type Statement = { id: string; filename: string; start: string; end: string; payment_count: number; unreadable_count: number; unlinked_count: number };
type FlowField = "inflow" | "outflow" | "net";
type Totals = Record<FlowField, string> & { count: number };
type CurrencyTotals = { currency: string; previous: Totals; current: Totals; delta: Totals };
const changeLabels = {
  new_subscription: "New subscription", new_candidate: "New recurring candidate",
  price_increase: "Charge increased", price_decrease: "Charge decreased",
  closed: "Closed", closure_recorded: "Cancellation reported",
  payment_not_seen: "Expected payment not seen", charge_after_closure: "Charge after closure",
} as const;
type Change = { kind: keyof typeof changeLabels; commitment_id: string; label: string; currency: string; cadence: string;
  previous_amount: string | null; current_amount: string | null; date: string; evidence: string | null };
type NewFlow = { direction: "debit" | "credit"; label: string; currency: string; amount: string; count: number; transaction_id: string };
type Comparison = { statements: Statement[]; previous: Statement | null; current: Statement | null; totals: CurrencyTotals[];
  changes: Change[]; new_flows: NewFlow[]; shared_payments: number; overlapping_dates: boolean; gemini_configured: boolean };
type Highlight = { kind: FlowField | Change["kind"] | "new_credit" | "new_debit"; index: number; explanation: string };
type GeminiAnswer = { provider: string; highlights: Highlight[] };

const flowLabels: Record<FlowField, string> = { inflow: "Inflow", outflow: "Outflow", net: "Net cash flow" };
const fields = Object.keys(flowLabels) as FlowField[];
const fileLabel = (file: Statement) => `${file.filename} · ${dateLabel(file.start)} – ${dateLabel(file.end)}`;

function isEarlier(file: Statement, current: Statement) {
  return file.id !== current.id && (file.end < current.end || (file.end === current.end && file.start <= current.start));
}

function makeReference(comparison: Comparison, highlight: Highlight) {
  if (highlight.kind === "inflow" || highlight.kind === "outflow" || highlight.kind === "net") {
    const total = comparison.totals[highlight.index];
    if (!total) return null;
    return `${flowLabels[highlight.kind]} · ${formatMoney(total.previous[highlight.kind], total.currency)} → ${formatMoney(total.current[highlight.kind], total.currency)}`;
  }
  if (highlight.kind === "new_credit" || highlight.kind === "new_debit") {
    const flow = comparison.new_flows[highlight.index];
    return flow && `${flow.label} · ${formatMoney(flow.amount, flow.currency)}`;
  }
  const change = comparison.changes[highlight.index];
  return change && `${changeLabels[change.kind]} · ${change.label}`;
}

function GeminiExplanation({ comparison }: { comparison: Comparison }) {
  const [answer, setAnswer] = useState<GeminiAnswer>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!comparison.previous || !comparison.current) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ previous_id: comparison.previous.id, current_id: comparison.current.id });
      const response = await authFetch(`${getApiBaseUrl()}${endpoint}/explain?${params}`, {
        method: "POST", signal: AbortSignal.timeout(30000),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Gemini could not explain this comparison.");
      setAnswer(body);
    } catch (err) {
      setError(err instanceof Error && err.name !== "TimeoutError" ? err.message : "Gemini took too long to respond. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="comparison-gemini" aria-label="Gemini explanation">
      <div className="comparison-section-head">
        <div>
          <h3><Icon name="spark" size={17} /> Gemini highlights</h3>
          <p>{comparison.gemini_configured ? "Get a plain language explanation. Gemini receives totals and change types." : "Gemini is unavailable until the server has an API key."}</p>
        </div>
        {comparison.gemini_configured && <button className="comparison-action" type="button" onClick={generate} disabled={loading}>
          {loading ? "Generating…" : answer ? "Regenerate" : "Explain with Gemini"}
        </button>}
      </div>
      {error && <p className="comparison-warning" role="alert">{error}</p>}
      {answer && <ul className="comparison-gemini-list" aria-live="polite">
        {answer.highlights.map((highlight) => (
          <li key={`${highlight.kind}:${highlight.index}`}>
            <strong>{makeReference(comparison, highlight)}</strong>
            <span>{highlight.explanation}</span>
          </li>
        ))}
      </ul>}
    </section>
  );
}

function CashFlow({ totals }: { totals: CurrencyTotals[] }) {
  if (!totals.length) return <p className="comparison-empty">No completed debit or credit appears in the selected files.</p>;
  return totals.map((total) => (
    <section className="comparison-currency" key={total.currency} aria-label={`${total.currency} cash flow`}>
      <div className="comparison-currency-title">
        <h3>{total.currency} cash flow</h3>
        <span>{total.previous.count} earlier payments · {total.current.count} later payments</span>
      </div>
      <div className="comparison-kpis">
        {fields.map((field) => {
          const delta = Number(total.delta[field]);
          return <div className={`comparison-kpi ${field}`} key={field}>
            <span>{flowLabels[field]}</span>
            <strong>{formatMoney(total.current[field], total.currency)}</strong>
            <div><span>Earlier {formatMoney(total.previous[field], total.currency)}</span>
              <span className="comparison-delta">{delta > 0 ? "+" : ""}{formatMoney(total.delta[field], total.currency)}</span></div>
          </div>;
        })}
      </div>
    </section>
  ));
}

function SubscriptionChanges({ changes }: { changes: Change[] }) {
  return (
    <section className="comparison-evidence">
      <div className="comparison-section-head"><div><h3>Subscription changes</h3><p>Based on linked payments and recorded cancellation evidence.</p></div></div>
      {!changes.length ? <p className="comparison-empty">No subscription changes were found between these statements.</p> : (
        <ul className="comparison-list">
          {changes.map((change) => {
            const price = change.kind === "price_increase" || change.kind === "price_decrease";
            return <li key={`${change.commitment_id}:${change.kind}`}>
              <div><Link href={`/commitments/${change.commitment_id}`}>{change.label}</Link>
                <small>{dateLabel(change.date)}{change.kind === "payment_not_seen" ? " · Check your bank or provider" : ""}</small></div>
              <div><span className={`comparison-chip ${change.kind}`}>{changeLabels[change.kind]}</span>
                {price && <small>{formatMoney(change.previous_amount, change.currency)} → {formatMoney(change.current_amount, change.currency)}</small>}
                {!price && change.current_amount !== null && <small>{formatMoney(change.current_amount, change.currency)}</small>}
              </div>
            </li>;
          })}
        </ul>
      )}
    </section>
  );
}

function FlowList({ flows, direction }: { flows: NewFlow[]; direction: NewFlow["direction"] }) {
  const visible = flows.filter((item) => item.direction === direction);
  const label = direction === "credit" ? "New inflows" : "New outflows";
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="comparison-evidence">
      <div className="comparison-section-head"><div><h3>{label}</h3><p>First seen in the later statement of this pair.</p></div></div>
      {!visible.length ? <p className="comparison-empty">No {label.toLowerCase()} in this comparison.</p> : <ul className="comparison-list">
        {(expanded ? visible : visible.slice(0, 6)).map((flow) => (
          <li key={flow.transaction_id}><div><strong>{flow.label}</strong><small>{flow.count} {flow.count === 1 ? "payment" : "payments"}</small></div>
            <span className="comparison-amount">{formatMoney(flow.amount, flow.currency)}</span></li>
        ))}
      </ul>}
      {visible.length > 6 && <button type="button" className="comparison-action" onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}>{expanded ? "Show fewer" : `Show all ${visible.length}`}</button>}
    </section>
  );
}

export default function StatementComparison() {
  const workspaceRevision = useWorkspaceRevision();
  const defaults = useWorkspaceResource<Comparison>(endpoint);
  const [pair, setPair] = useState<{ current: string; previous: string }>();
  const statements = defaults.data?.statements ?? [];
  const chosenCurrent = statements.find((file) => file.id === pair?.current) ?? defaults.data?.current;
  const earlier = chosenCurrent ? statements.filter((file) => isEarlier(file, chosenCurrent)) : [];
  const chosenPrevious = earlier.find((file) => file.id === pair?.previous) ?? earlier.find((file) => file.id === defaults.data?.previous?.id) ?? earlier[0];
  const customPair = !!(chosenCurrent && chosenPrevious && (chosenCurrent.id !== defaults.data?.current?.id || chosenPrevious.id !== defaults.data?.previous?.id));
  const params = customPair ? new URLSearchParams({ previous_id: chosenPrevious!.id, current_id: chosenCurrent!.id }) : null;
  const selected = useWorkspaceResource<Comparison>(params ? `${endpoint}?${params}` : endpoint);
  const comparison = chosenPrevious && (customPair ? selected.data : defaults.data);
  const hasPair = !!(comparison && comparison.previous && comparison.current);
  const incomplete = comparison && [comparison.previous, comparison.current].some((file) => file && (file.unreadable_count > 0 || file.unlinked_count > 0));
  const error = customPair ? selected.error : defaults.error;

  return (
    <section className="comparison-panel" aria-label="Statement comparison">
      <header className="comparison-header">
        <div><h2>Compare statements</h2><p>See what changed between two uploads, from cash flow to subscription charges.</p></div>
        <Link className="comparison-action" href="/upload"><Icon name="upload" size={16} /> Import statement</Link>
      </header>
      {error && <p role="alert" className="comparison-warning">{error} <button type="button" onClick={() => void (customPair ? selected.refresh() : defaults.refresh())}>Retry</button></p>}
      {!defaults.data && !error && <p className="comparison-empty" role="status">Loading statements…</p>}
      {defaults.data && statements.length < 2 && <p className="comparison-empty">Upload {statements.length ? "one more statement" : "two statements"} to compare payments.</p>}
      {statements.length >= 2 && <div className="comparison-selects">
        <label>Earlier statement<select value={chosenPrevious?.id ?? ""} onChange={(event) => setPair({ current: chosenCurrent?.id ?? "", previous: event.target.value })}>
          {!earlier.length && <option value="">No earlier statement</option>}
          {earlier.map((file) => <option key={file.id} value={file.id}>{fileLabel(file)}</option>)}
        </select></label>
        <label>Later statement<select value={chosenCurrent?.id ?? ""} onChange={(event) => setPair({ current: event.target.value, previous: "" })}>
          {statements.map((file) => <option key={file.id} value={file.id}>{fileLabel(file)}</option>)}
        </select></label>
      </div>}
      {statements.length >= 2 && !chosenPrevious && <p className="comparison-empty">Choose a later file with a statement to compare against.</p>}
      {chosenPrevious && !hasPair && !error && <p className="comparison-empty" role="status">Comparing payments…</p>}
      {hasPair && comparison && <>
        <p className="comparison-caption">Date ranges reflect the transactions we could read. Totals use completed payments in each file.</p>
        {comparison.overlapping_dates && <p className="comparison-warning">These date ranges overlap. {comparison.shared_payments} completed payments appear in both files. The Payments ledger counts each one once.</p>}
        {incomplete && <p className="comparison-warning">One or both files have unreadable or unlinked rows. The comparison covers available payments.</p>}
        <CashFlow totals={comparison.totals} />
        {comparison.totals.length > 0 && <GeminiExplanation key={`${comparison.previous?.id}:${comparison.current?.id}:${workspaceRevision}`} comparison={comparison} />}
        <SubscriptionChanges changes={comparison.changes} />
        <div className="comparison-flows">
          <FlowList flows={comparison.new_flows} direction="credit" />
          <FlowList flows={comparison.new_flows} direction="debit" />
        </div>
      </>}
    </section>
  );
}
