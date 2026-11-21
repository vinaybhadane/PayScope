"use client";
import { useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/navigation/AppHeader";
import { useWorkspaceResource } from "@/lib/useWorkspaceResource";

type Payment = { id: string; date: string; description: string; amount: string; currency: string; direction: string;
  status: string; channel: string; reference: string | null; filename: string | null; source_row: number | null;
  source_page: number | null; source_sheet: string | null };
type Ledger = { total: number; totals: { currency: string; count: number; debits: string; credits: string; net_outflow: string; excluded_count: number }[]; items: Payment[] };
const money = (value: string, currency: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 2 }).format(Number(value));

export default function PaymentsPage() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState("");
  const [offset, setOffset] = useState(0);
  const params = new URLSearchParams({ search, limit: "50", offset: String(offset) });
  if (direction) params.set("direction", direction);
  const resource = useWorkspaceResource<Ledger>(`/api/v1/transactions?${params}`);
  const ledger = resource.data;
  return <div className="dashboard-v2"><AppHeader /><main id="workspace-content" tabIndex={-1} className="dashboard-main">
    <header className="dashboard-title"><div><h1>Payments<span>.</span></h1><p>Every imported debit and credit, with its statement source.</p></div>
      <Link href="/upload" className="button button-primary">Import statement</Link></header>
    {resource.error && <div className="dash-notice" role="alert">{resource.error}<button onClick={() => void resource.refresh()}>Retry</button></div>}
    <form className="dash-panel payment-filters" onSubmit={event => { event.preventDefault(); setSearch(query); setOffset(0); }}>
      <label>Find a payment<input aria-label="Search payments" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search statement description" /></label>
      <label>Direction<select aria-label="Payment direction" value={direction} onChange={event => { setDirection(event.target.value); setOffset(0); }}>
        <option value="">All payments</option><option value="debit">Debits</option><option value="credit">Credits</option></select></label>
      <button className="button button-subtle" type="submit">Search</button>
    </form>
    {!ledger && !resource.error && <p role="status">Loading payments…</p>}
    {ledger && <>
      <div className="payment-totals">{ledger.totals.map(total => <section className="dash-panel" key={total.currency}>
        <h2>{total.currency} · {total.count} payments</h2><dl><dt>Successful debits</dt><dd>{money(total.debits, total.currency)}</dd>
          <dt>Successful credits</dt><dd>{money(total.credits, total.currency)}</dd><dt>Net outflow</dt><dd>{money(total.net_outflow, total.currency)}</dd></dl>
        {total.excluded_count > 0 && <p>{total.excluded_count} failed, pending or reversed entries excluded from totals.</p>}</section>)}</div>
      <section className="dash-panel"><h2>Imported payment ledger</h2><p>{ledger.total} payments match your filters. Amounts keep their original currency. Recurring payments and forecasts are available under Subscriptions.</p>
        <div className="payment-table-wrap"><table className="payment-table"><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Direction</th><th>Status</th><th>Source</th></tr></thead>
          <tbody>{ledger.items.map(payment => <tr key={payment.id}><td>{payment.date.slice(0, 10)}</td><td>{payment.description}
            {payment.reference && <small>Reference: {payment.reference}</small>}</td><td>{money(payment.amount, payment.currency)}</td><td>{payment.direction}</td><td>{payment.status}</td>
            <td>{payment.filename || "Imported record"}<small>{payment.source_sheet ? `Sheet ${payment.source_sheet} · ` : ""}{payment.source_page ? `Page ${payment.source_page} · ` : ""}Row {payment.source_row ?? "unavailable"}</small></td></tr>)}</tbody></table></div>
        {!ledger.items.length && <div className="empty-state">{search || direction ? "No payments match these filters." : "No imported payments yet. Upload a statement to begin."}</div>}
        {ledger.total > 0 && <div className="payment-pagination"><button className="button button-subtle" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous</button>
          <span>{offset + 1}–{Math.min(offset + 50, ledger.total)} of {ledger.total}</span><button className="button button-subtle" disabled={offset + 50 >= ledger.total} onClick={() => setOffset(offset + 50)}>Next</button></div>}
      </section>
    </>}
  </main></div>;
}
