"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AIWorkspacePanel } from "@/components/workspace/AIWorkspacePanel";
import AppHeader from "@/components/navigation/AppHeader";
import { Icon } from "@/components/ui/Icon";
import { MerchantLogo } from "@/components/brand/MerchantLogo";
import { formatMoney as inr } from "@/lib/formatMoney";
import { formatPeriod } from "@/lib/formatPeriod";
import { type DashboardData } from "@/lib/workspace-data";
import { MonthlyPaymentChart } from "@/components/dashboard/MonthlyPaymentChart";
import { useWorkspaceResource } from "@/lib/useWorkspaceResource";
const RelationshipExplorer = dynamic(
  () => import("@/components/relationships/RelationshipExplorer"),
  {
    loading: () => (
      <div className="dash-graph-placeholder">Preparing relationship view…</div>
    ),
  },
);
const WorkspaceNotes = dynamic(() =>
  import("@/components/common/TextStoreWidget").then((m) => m.TextStoreWidget),
);

function DeferredRelationships() {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "180px" },
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={container} className="dashboard-relationship-slot">
      {visible ? (
        <RelationshipExplorer compact />
      ) : (
        <div className="dash-graph-placeholder">
          <Icon name="network" />
          Your connected payment picture
        </div>
      )}
    </div>
  );
}
function CategoryCard({ data }: { data: DashboardData }) {
  const categories = Object.entries(data.category_distribution).sort(
    (a, b) => Number(b[1]) - Number(a[1]),
  );
  const total = categories.reduce((sum, [, value]) => sum + Number(value), 0);
  const colors = ["#FF5500", "#00E0E0", "#00B8C7", "#9333EA", "#F59E0B", "#10B981", "#3B82F6", "#EC4899"];
  const slices = categories.map(([, value], i) => {
    const start = total ? categories.slice(0, i).reduce((sum, [, amount]) => sum + Number(amount), 0) / total * 100 : 0;
    const angle = start + (total ? Number(value) / total * 100 : 0);
    return `${colors[i % colors.length]} ${start}% ${angle}%`;
  });
  return (
    <section className="dash-panel dash-category">
      <div className="dash-panel-heading">
        <div>
          <h2>Where it all goes</h2>
          <p>Every commitment, accounted for.</p>
        </div>
        <Icon name="chart" size={17} />
      </div>
      <div
        className="dashboard-donut"
        style={{
          background: slices.length
            ? `conic-gradient(${slices.join(",")})`
            : "#1E293B",
        }}
      >
        <div>
          <small>MONTHLY TOTAL</small>
          <strong>{inr(total)}</strong>
          <span>{categories.length} categories</span>
        </div>
      </div>
      <div className="dashboard-category-list">
        {categories.slice(0, 5).map(([name, value], i) => (
          <div key={name}>
            <i style={{ background: colors[i] }} />
            <span>{name}</span>
            <strong>{inr(value)}</strong>
            <small>
              {Math.round(total ? (Number(value) / total) * 100 : 0)}%
            </small>
          </div>
        ))}
      </div>
      <Link href="/savings" className="dash-category-cta">
        <Icon name="spark" size={16} />
        <span>What could you keep a little more of?</span>
        <Icon name="arrow" size={15} />
      </Link>
    </section>
  );
}
export default function DashboardClient() {
  const resource = useWorkspaceResource<DashboardData>(
    "/api/v1/dashboard/summary",
  );
  const [search, setSearch] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const data = resource.data;
  const list =
    data?.top_commitments.filter((c) =>
      `${c.display_name} ${c.category}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) || [];
  const exportReport = () => {
    if (!data) return;
    const csv =
      "Subscription,Category,Monthly INR,Status\n" +
      data.top_commitments
        .map((c) =>
          [c.display_name, c.category, c.monthly_cost, c.status]
            .map((v) => {
              const value = String(v);
              const safe = /^\s*[=+\-@\t\r\n]/.test(value) ? `'${value}` : value;
              return `"${safe.replaceAll('"', '""')}"`;
            })
            .join(","),
        )
        .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "payscope-overview.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="dashboard-v2">
      <AppHeader />
      <main id="workspace-content" tabIndex={-1} className="dashboard-main">
        <header className="dashboard-title">
          <div>

            <h1>
              Overview<span>.</span>
            </h1>
            <p>
              Cash flow and recurring charges from your uploaded statements.
            </p>
          </div>
          <div className="dashboard-title-tools">
            <span className="dashboard-perspective"><Icon name="calendar" size={14} />Your recurring picture <span>INR</span></span>
            <div className="dashboard-actions">
            <button
              className="icon-button"
              aria-label="Refresh dashboard"
              disabled={resource.refreshing}
              onClick={() => void resource.refresh()}
            >
              <Icon
                name="repeat"
                size={17}
                className={resource.refreshing ? "is-refreshing" : ""}
              />
            </button>
            <button
              className="button button-subtle"
              onClick={exportReport}
              disabled={!data}
            >
              <Icon name="download" size={16} />
              Export overview
            </button>
            <Link href="/upload" className="button button-primary">
              <Icon name="plus" size={17} />
              Import statement
            </Link>

            </div>
          </div>
        </header>
        <div className="dashboard-status">
          <span
            className={`data-source source-${resource.error ? "offline" : "live"}`}
          >
            <i />
            {resource.error && data
                ? "Saved snapshot"
                : resource.refreshing && data
                  ? "Refreshing in background"
                  : data
                    ? "Live workspace"
                    : "Connecting"}
          </span>
          <span>
            {resource.updatedAt
                ? `Updated ${new Date(resource.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Loading your workspace…"}
          </span>
          <Link href="/relationships">
            <Icon name="network" size={14} />
            Explore relationships <Icon name="arrow" size={13} />
          </Link>
        </div>
        {resource.error && (
          <div className="dash-notice" role="alert">
            <Icon name="clock" size={17} />
            <span>
              {resource.error}
              {data ? " Your last snapshot is still shown." : ""}
            </span>
            <button onClick={() => void resource.refresh()}>Retry</button>
          </div>
        )}
        {!!data?.statement_review_count && <div className="dash-notice" role="alert">
          <span>{data.statement_review_count} extracted rows need review and are excluded from payment totals.</span>
          <Link href="/merchant-review">Review import issues</Link>
        </div>}
        {!data ? (
          <div
            className="dashboard-skeleton"
            aria-label="Loading dashboard"
            aria-busy={!resource.error}
          >
            <div />
            <div />
            <div />
            <div />
            <section />
            <section />
          </div>
        ) : (
          <>
            <section
              className="dashboard-metrics"
              aria-label="Financial summary"
            >
              {[
                {
                  label: "Monthly recurring spend",
                  value: inr(data.kpis.monthly_recurring_spend),
                  icon: "wallet",
                  note: `Across ${data.kpis.active_commitments_count} active commitments`,
                  href: "/financial-impact",
                  featured: true,
                },
                {
                  label: "Annual commitment",
                  value: inr(data.kpis.annualized_recurring_spend),
                  icon: "chart",
                  note: "At your current recurring rates",
                  href: "/financial-impact",
                },
                {
                  label: "Potential annual savings",
                  value: inr(data.kpis.potential_annual_savings),
                  icon: "spark",
                  note: "Opportunities to review",
                  href: "/savings",
                  positive: true,
                },
                {
                  label: "Insights to explore",
                  value: String(data.kpis.open_insights_count).padStart(2, "0"),
                  icon: "bell",
                  note: data.kpis.open_insights_count
                    ? "Small changes worth a second look"
                    : "You’re all caught up",
                  href: "/insights",
                },
              ].map((s, i) => (
                <Link
                  href={s.href}
                  className={`dashboard-metric ${s.featured ? "metric-featured" : ""}`}
                  key={s.label}
                >
                  <div>
                    <span>{s.label}</span>
                    <span className="metric-icon"><Icon name={s.icon} size={19} /></span>
                  </div>
                  <strong>{s.value}</strong>
                  <footer>
                    <span className={s.positive ? "trend-positive" : ""}>
                      {s.positive && <Icon name="trend" size={13} />} {s.note}
                    </span>
                    <Icon name="arrow" size={14} />
                  </footer>
                  {i === 0 && (
                    <svg
                      className="metric-sparkline"
                      viewBox="0 0 120 35"
                      aria-hidden="true"
                    >
                      <path
                        d={data.financial_overview.historical_amounts
                          .slice(-12)
                          .map(
                            (amount, index, values) =>
                              `${index ? "L" : "M"}${(index * 120) / Math.max(values.length - 1, 1)},${32 - (Number(amount) / Math.max(...values.map(Number), 1)) * 27}`,
                          )
                          .join(" ")}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  )}
                </Link>
              ))}
            </section>
            <div className="dashboard-analysis-grid">
              <MonthlyPaymentChart activity={data.financial_overview.monthly_activity ?? []} overview />
              <CategoryCard data={data} />
            </div>
            <DeferredRelationships />
            <div className="dashboard-bottom-grid">
              <section className="dash-panel dashboard-subscription-panel">
                <div className="dash-panel-heading">
                  <div>
                    <h2>Your recurring commitments</h2>
                    <p>Largest recurring costs based on observed payments.</p>
                  </div>
                  <Link href="/commitments" className="text-link">
                    View all <Icon name="arrow" size={14} />
                  </Link>
                </div>
                <label className="dashboard-search">
                  <Icon name="search" size={16} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Find a subscription…"
                    aria-label="Search dashboard subscriptions"
                  />
                  <span>{data.top_commitments.length} shown</span>
                </label>
                <div className="table-scroll">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>SUBSCRIPTION</th>
                        <th>MONTHLY COST</th>
                        <th>STATUS</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <MerchantLogo
                              name={c.merchant_name || c.display_name}
                              merchantId={c.merchant_id}
                              domain={c.merchant_domain}
                              logoUrl={c.merchant_logo_url}
                              className="dashboard-merchant"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span>{c.display_name}</span>
                                {c.payment_rail && c.payment_rail !== "Unknown" && <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 font-mono font-medium">{c.payment_rail}</span>}
                              </div>
                              <small>
                                {c.category} · {formatPeriod(c.cadence)}
                              </small>
                            </div>
                          </td>
                          <td>{inr(c.monthly_cost)}</td>
                          <td>
                            <span className="status-pill">
                              {c.status.replaceAll("_", " ")}
                            </span>
                          </td>
                          <td>
                            <Link
                              href={`/commitments/${c.id}`}
                              aria-label={`Review ${c.display_name}`}
                            >
                              <Icon name="chevron" size={16} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!list.length && (
                    <div className="empty-state">
                      {data.top_commitments.length
                        ? "No subscriptions match your search."
                        : "Import a statement to discover recurring commitments."}
                    </div>
                  )}
                </div>
              </section>
              <section className="dash-panel dashboard-insights">
                <div className="dash-panel-heading">
                  <div>
                    <h2>Recent payment alerts</h2>
                  </div>
                  <span className="insight-count">
                    {data.kpis.open_insights_count}
                  </span>
                </div>
                {data.recent_insights.slice(0, 3).map((ins, i) => (
                  <Link
                    className="dashboard-insight"
                    key={ins.id}
                    href={`/insights/${ins.id}`}
                  >
                    <span className="insight-symbol">
                      <Icon
                        name={i === 0 ? "trend" : i === 1 ? "clock" : "repeat"}
                        size={17}
                      />
                    </span>
                    <div>
                      <small>{ins.commitment_name}</small>
                      <h3>{ins.title}</h3>
                      <p>{ins.summary}</p>
                      <span>
                        Take a closer look <Icon name="arrow" size={13} />
                      </span>
                    </div>
                  </Link>
                ))}
                {!data.recent_insights.length && (
                  <div className="empty-state">
                    <Icon name="check" />
                    No open payment insights.
                  </div>
                )}
                <Link className="insights-view-all" href="/insights">
                  View all payment insights <Icon name="arrow" size={15} />
                </Link>
              </section>
            </div>

          </>
        )}
          <AIWorkspacePanel controls />
          <details
            className="dashboard-notes"
            onToggle={(e) => setNotesOpen(e.currentTarget.open)}
          >
            <summary>Workspace notes</summary>
            {notesOpen && (
              <WorkspaceNotes
                title="Workspace notes"
                placeholder="Keep a reminder, a merchant note, or a cancellation reference…"
              />
            )}
          </details>
        <footer className="dashboard-footer">
          <span>PayScope · Find the money leaving quietly.</span>
          <Link href="/privacy">
            <Icon name="shield" size={13} />
            Your data. Your control.
          </Link>
        </footer>
      </main>
    </div>
  );
}
