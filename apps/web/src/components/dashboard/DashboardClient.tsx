"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AIWorkspacePanel } from "@/components/workspace/AIWorkspacePanel";
import AppHeader from "@/components/navigation/AppHeader";
import { Icon } from "@/components/ui/Icon";
import { MerchantLogo } from "@/components/workspace/MerchantLogo";
import { inr } from "@/lib/demo-data";
import { formatPeriod } from "@/lib/formatPeriod";
import { sampleDashboard, type DashboardData } from "@/lib/workspace-data";
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
function SpendTimeline({ data }: { data: DashboardData }) {
  const [period, setPeriod] = useState(6);
  const [hovered, setHovered] = useState<number | null>(null);
  const gradient = useId().replaceAll(":", "");
  const months = data.financial_overview.historical_months.slice(-period);
  const values = data.financial_overview.historical_amounts
    .slice(-period)
    .map(Number);
  const max = Math.max(...values, 1) * 1.18;
  const points = values.map((v, i) => ({
    x: 52 + (i * 572) / Math.max(values.length - 1, 1),
    y: 184 - (v / max) * 158,
  }));
  const line = points
    .map((p, i) =>
      i === 0
        ? `M${p.x},${p.y}`
        : `C${(points[i - 1].x + p.x) / 2},${points[i - 1].y} ${(points[i - 1].x + p.x) / 2},${p.y} ${p.x},${p.y}`,
    )
    .join(" ");
  const last = hovered === null ? values.length - 1 : hovered;
  const change =
    values.length > 1 && values[values.length - 2]
      ? ((values[values.length - 1] - values[values.length - 2]) /
          values[values.length - 2]) *
        100
      : null;
  return (
    <section className="dash-panel spend-timeline">
      <div className="dash-panel-heading">
        <div>
          <h2>Your spending, in perspective</h2>
          <p>Recurring payments across your statement history.</p>
        </div>
        <div className="segmented-control">
          {[6, 12].map((p) => (
            <button
              key={p}
              className={period === p ? "active" : ""}
              aria-pressed={period === p}
              onClick={() => {
                setPeriod(p);
                setHovered(null);
              }}
            >
              {p} months
            </button>
          ))}
        </div>
      </div>
      <div className="timeline-readout">
        <strong>{inr(values[last] || 0)}</strong>
        {change !== null && (
          <span className={change <= 0 ? "trend-positive" : "trend-caution"}>
            <Icon name="trend" size={13} />
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}%<small> vs previous month</small>
          </span>
        )}
        <span className="timeline-month">
          {months[last] || "No statement history"}
        </span>
      </div>
      {points.length ? (
        <svg
          className="timeline-svg"
          viewBox="0 0 650 225"
          role="group"
          aria-label={months
            .map((m, i) => `${m}: ${inr(values[i])}`)
            .join(", ")}
        >
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#FF5500" stopOpacity=".2" />
              <stop offset="1" stopColor="#FF5500" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <line
                x1="47"
                x2="633"
                y1={26 + i * 52.5}
                y2={26 + i * 52.5}
                stroke="#FFFFFF09"
                strokeDasharray="3 5"
              />
              <text x="0" y={30 + i * 52.5} className="timeline-axis">
                {inr((max * (3 - i)) / 3).replace("₹", "")}
              </text>
            </g>
          ))}
          <path
            d={`${line} L${points[points.length - 1].x},185 L52,185 Z`}
            fill={`url(#${gradient})`}
          />
          <path className="timeline-stroke" pathLength="1" d={line} fill="none" stroke="#FF5500" strokeWidth="3" />
          {points.map((p, i) => (
            <g
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`${months[i]}: ${inr(values[i])}`}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              onClick={() => setHovered(i)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setHovered(i); }
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {hovered === i && <line className="timeline-crosshair" x1={p.x} x2={p.x} y1="20" y2="185" stroke="#FF5500" strokeOpacity=".35" strokeDasharray="3 4" />}
              <rect
                x={p.x - 22}
                y="0"
                width="44"
                height="200"
                fill="transparent"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={hovered === i ? 5 : 3}
                fill="#FF5500"
                stroke="#0D1322"
                strokeWidth="3"
              />
              <text
                x={p.x}
                y="215"
                textAnchor="middle"
                className="timeline-axis"
              >
                {months[i]}
              </text>
            </g>
          ))}
        </svg>
      ) : (
        <div className="dash-chart-empty">
          <Icon name="chart" size={28} />
          <p>Import a statement to see your spending trend.</p>
        </div>
      )}
      <div className="timeline-summary">
        <span>
          <i />
          Recurring spend
        </span>
        <Link href="/financial-impact">
          View spending analysis <Icon name="arrow" size={14} />
        </Link>
      </div>
    </section>
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
    sampleDashboard,
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
            .map((v) => '"' + String(v).replaceAll('"', '""') + '"')
            .join(","),
        )
        .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = resource.isDemo
      ? "payscope-sample-overview.csv"
      : "payscope-overview.csv";
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
              Your money, in focus<span>.</span>
            </h1>
            <p>
              The bigger picture. The small details. All in a little more
              clarity.
            </p>
          </div>
          <div className="dashboard-title-tools">
            <span className="dashboard-perspective"><Icon name="calendar" size={14} />Your recurring picture <span>INR</span></span>
            <div className="dashboard-actions">
            <button
              className="icon-button"
              aria-label="Refresh dashboard"
              disabled={resource.refreshing || resource.isDemo}
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
        <AIWorkspacePanel controls />
        <div className="dashboard-status">
          <span
            className={`data-source source-${resource.isDemo ? "demo" : resource.error ? "offline" : "live"}`}
          >
            <i />
            {resource.isDemo
              ? "Sample workspace"
              : resource.error && data
                ? "Saved snapshot"
                : resource.refreshing && data
                  ? "Refreshing in background"
                  : data
                    ? "Live workspace"
                    : "Connecting"}
          </span>
          <span>
            {resource.isDemo
              ? "Illustrative data · November 2026"
              : resource.updatedAt
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
            <div className="dashboard-section-label"><span>At a glance</span><span>Small details. A clearer perspective.</span></div>
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
              <SpendTimeline data={data} />
              <CategoryCard data={data} />
            </div>
            <DeferredRelationships />
            <div className="dashboard-bottom-grid">
              <section className="dash-panel dashboard-subscription-panel">
                <div className="dash-panel-heading">
                  <div>
                    <h2>Your recurring commitments</h2>
                    <p>Know what stays. Decide what’s next.</p>
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
                              className="dashboard-merchant"
                            />
                            <div>
                              {c.display_name}
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
                              href={
                                resource.isDemo
                                  ? "/commitments"
                                  : `/commitments/${c.id}`
                              }
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
                    <span className="dash-eyebrow">
                      <Icon name="spark" size={12} />
                      WORTH KNOWING
                    </span>
                    <h2>A few things to look at.</h2>
                  </div>
                  <span className="insight-count">
                    {data.kpis.open_insights_count}
                  </span>
                </div>
                {data.recent_insights.slice(0, 3).map((ins, i) => (
                  <Link
                    className="dashboard-insight"
                    key={ins.id}
                    href={resource.isDemo ? "/insights" : `/insights/${ins.id}`}
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
            <section className="dashboard-next-step">
              <span className="next-step-icon">
                <Icon name="wallet" size={28} />
              </span>
              <div>
                <h2>A little less spending. A little more possibility.</h2>
                <p>
                  See what could change when you let go of the commitments you
                  no longer need.
                </p>
              </div>
              <Link className="button button-subtle" href="/savings">
                Explore your savings <Icon name="arrow" size={16} />
              </Link>
            </section>
          </>
        )}
        {!resource.isDemo && (
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
        )}
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
