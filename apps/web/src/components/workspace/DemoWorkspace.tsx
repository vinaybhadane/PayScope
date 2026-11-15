"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppHeader from "@/components/navigation/AppHeader";
import { Icon } from "@/components/ui/Icon";
import { MerchantLogo } from "@/components/workspace/MerchantLogo";
import { Modal } from "@/components/ui/Modal";
import { useDemoSessionState } from "@/lib/useDemoSessionState";
import {
  demoSubscriptions as subscriptions,
  demoMonthly,
  demoInsights,
  inr,
  type DemoSubscription,
} from "@/lib/demo-data";

function MerchantMark({ sub }: { sub: DemoSubscription }) {
  return <MerchantLogo name={sub.name} size={32} className="merchant-icon" fallbackMark={sub.mark} />;
}
function Stats({ savings = 7548 }: { savings?: number }) {
  return (
    <div className="stats-grid">
      {[
        {
          label: "Monthly recurring spend",
          value: inr(demoMonthly),
          icon: "wallet",
          note: "Across 6 active subscriptions",
          featured: true,
        },
        {
          label: "Annual commitment",
          value: inr(demoMonthly * 12),
          icon: "chart",
          note: "Based on current monthly rates",
        },
        {
          label: "Potential annual savings",
          value: inr(savings),
          icon: "spark",
          note: "Illustrative review opportunities",
        },
        {
          label: "Active subscriptions",
          value: "06",
          icon: "repeat",
          note: "Next payment: Netflix · Nov 16",
        },
      ].map((s, i) => (
        <div
          className={`stat-card ${s.featured ? "featured" : ""}`}
          key={s.label}
        >
          <div className="stat-top">
            {s.label}
            <Icon name={s.icon} size={17} />
          </div>
          <strong className="stat-value">{s.value}</strong>
          <small className={i === 2 ? "green-text" : ""}>
            {i === 2 && <Icon name="trend" size={12} />} {s.note}
          </small>
        </div>
      ))}
    </div>
  );
}
function SpendChart() {
  const [period, setPeriod] = useState("6 months");
  const months =
    period === "6 months"
      ? ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"]
      : [
        "Dec",
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
      ];
  const amounts =
    period === "6 months"
      ? [3400, 3890, 3680, 4690, 4490, 4290]
      : [
        3190, 3250, 3490, 3290, 3590, 3390, 3400, 3890, 3680, 4690, 4490,
        4290,
      ];
  return (
    <div className="surface">
      <div className="surface-heading">
        <div>
          <h2>A little spending perspective</h2>
          <p>Your recurring payments over time</p>
        </div>
        <div className="segmented-control">
          {["6 months", "12 months"].map((p) => (
            <button
              className={period === p ? "active" : ""}
              key={p}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-legend">
        <span>
          <i />
          Recurring spend
        </span>
        <span>Sample history · INR</span>
      </div>
      <div
        className="spend-chart"
        role="img"
        aria-label={`Sample monthly recurring spend: ${months.map((m, i) => `${m} ${inr(amounts[i])}`).join(", ")}`}
      >
        <div className="chart-y-axis">
          <span>₹5,000</span>
          <span>₹3,750</span>
          <span>₹2,500</span>
          <span>₹1,250</span>
          <span>₹0</span>
        </div>
        <div
          className="spend-bars"
          style={{ gap: period === "12 months" ? 7 : undefined }}
        >
          {months.map((m, i) => (
            <div className="spend-bar-column" key={`${period}-${i}`}>
              <div
                className="spend-bar"
                style={{
                  height: `${amounts[i] / 50}%`,
                  animationDelay: `${i * 0.04}s`,
                }}
              >
                <span className="bar-tooltip">{inr(amounts[i])}</span>
              </div>
              <span>{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function Categories() {
  const categories = ["Productivity", "Entertainment", "Storage"].map(
    (name, i) => ({
      name,
      color: ["#FF5500", "#00E0E0", "#9333EA"][i],
      amount: subscriptions
        .filter((s) => s.category === name)
        .reduce((a, b) => a + b.amount, 0),
    }),
  );
  const prodPercent = (categories[0].amount / demoMonthly) * 100;
  const entertainmentEnd =
    ((categories[0].amount + categories[1].amount) / demoMonthly) * 100;
  return (
    <div className="surface">
      <div className="surface-heading">
        <div>
          <h2>Where your money goes</h2>
          <p>Every category, accounted for.</p>
        </div>
        <Icon name="chart" size={16} style={{ color: "#FF5500" }} />
      </div>
      <div className="category-donut">
        <div
          className="donut"
          style={{
            background: `conic-gradient(#FF5500 0 ${prodPercent}%, #00E0E0 ${prodPercent}% ${entertainmentEnd}%, #9333EA ${entertainmentEnd}% 100%)`,
          }}
        >
          <div className="donut-center">
            <strong>{inr(demoMonthly)}</strong>
            <small>TOTAL / MONTH</small>
          </div>
        </div>
        <div className="category-legend">
          {categories.map((c) => (
            <div key={c.name}>
              <i style={{ background: c.color }} />
              {c.name}
              <b>{Math.round((c.amount / demoMonthly) * 100)}%</b>
            </div>
          ))}
        </div>
      </div>
      <div className="opportunity-note">
        <Icon name="spark" size={14} />
        <span>Small changes, bigger possibilities.</span>
        <Link
          href="/savings"
          className="text-link"
          style={{ marginLeft: "auto", fontSize: 8 }}
        >
          Explore <Icon name="arrow" size={11} />
        </Link>
      </div>
    </div>
  );
}
function SubscriptionTable({
  select,
  compact = false,
}: {
  select: (sub: DemoSubscription) => void;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const list = subscriptions
    .filter(
      (s) =>
        s.name.toLowerCase().includes(query.toLowerCase()) &&
        (category === "All" || s.category === category),
    )
    .slice(0, compact ? 4 : 99);
  return (
    <div className="surface">
      <div className="surface-heading">
        <div>
          <h2>
            {compact ? "Your next payments" : "Every commitment, one place"}
          </h2>
          <p>
            {compact
              ? "A heads-up for what’s coming."
              : "6 sample subscriptions · November 2026"}
          </p>
        </div>
        {compact && (
          <Link href="/commitments" className="text-link">
            View all <Icon name="arrow" size={13} />
          </Link>
        )}
      </div>
      {!compact && (
        <div className="table-toolbar">
          <div className="segmented-control">
            {["All", "Entertainment", "Productivity", "Storage"].map((c) => (
              <button
                key={c}
                className={category === c ? "active" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="search-field">
            <Icon name="search" size={15} />
            <input
              aria-label="Search subscriptions"
              placeholder="Find a subscription…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
      )}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>SUBSCRIPTION</th>
              {!compact && <th>CATEGORY</th>}
              <th>NEXT PAYMENT</th>
              <th>AMOUNT</th>
              <th>STATUS</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((sub) => (
              <tr key={sub.id}>
                <td>
                  <div className="merchant-cell">
                    <MerchantMark sub={sub} />
                    <span>
                      {sub.name}
                      <small>{sub.account}</small>
                    </span>
                  </div>
                </td>
                {!compact && <td>{sub.category}</td>}
                <td>Nov {sub.day}, 2026</td>
                <td className="amount-cell">
                  {inr(sub.amount)}
                  <small
                    style={{ fontSize: 8, color: "#FF5500", marginLeft: 3 }}
                  >
                    / mo
                  </small>
                </td>
                <td>
                  <span className="status-pill">Active</span>
                </td>
                <td>
                  <button
                    onClick={() => select(sub)}
                    className="table-action"
                    aria-label={`View ${sub.name}`}
                  >
                    Details <Icon name="chevron" size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <div className="empty-state">
            <Icon name="search" />
            No subscriptions match this search.
            <br />
            <button
              className="text-link"
              style={{ marginTop: 12 }}
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
function Savings() {
  const [selected, setSelected] = useDemoSessionState<string[]>(
    "savings-selection",
    ["chatgpt", "prime"],
  );
  const monthly = subscriptions
    .filter((s) => selected.includes(s.id))
    .reduce((a, b) => a + b.amount, 0);
  return (
    <div className="detail-grid">
      <div className="surface">
        <div className="surface-heading">
          <div>
            <h2>What could you let go of?</h2>
            <p>Select subscriptions to see the cost you could avoid.</p>
          </div>
          <span className="demo-chip">{selected.length} selected</span>
        </div>
        {subscriptions.map((sub) => (
          <label className="check-row" key={sub.id}>
            <span>
              <input
                type="checkbox"
                checked={selected.includes(sub.id)}
                onChange={() =>
                  setSelected((current) =>
                    current.includes(sub.id)
                      ? current.filter((id) => id !== sub.id)
                      : [...current, sub.id],
                  )
                }
              />
              <MerchantMark sub={sub} />
              {sub.name}
            </span>
            <strong style={{ fontWeight: 450 }}>
              {inr(sub.amount)}
              <small style={{ fontSize: 8, color: "#FF5500" }}>/mo</small>
            </strong>
          </label>
        ))}
      </div>
      <div>
        <div className="savings-result">
          <Icon name="wallet" size={30} />
          <span>YOUR POTENTIAL ANNUAL SAVINGS</span>
          <strong aria-live="polite">{inr(monthly * 12)}</strong>
          <p>
            That’s {inr(monthly)} a month
            <br />
            for the things that matter to you.
          </p>
          <div className="projection-row">
            {[1, 3, 5].map((years) => (
              <div key={years}>
                <small>
                  {years} YEAR{years > 1 ? "S" : ""}
                </small>
                <b>{inr(monthly * 12 * years)}</b>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 8, marginTop: 25 }}>
            Estimates use current sample rates, with no interest,
            <br />
            future price changes, or cancellation fees included.
          </p>
          <Link
            href="/cancellations"
            className="button button-primary"
            style={{ marginTop: 15, fontSize: 10, minHeight: 39 }}
          >
            See your next steps <Icon name="arrow" size={14} />
          </Link>
        </div>
        <div className="surface" style={{ marginTop: 17 }}>
          <div className="surface-heading">
            <h2>A possibility, not a promise.</h2>
          </div>
          <p style={{ fontSize: 10, color: "#FF5500", lineHeight: 1.8 }}>
            This simulator helps you explore choices. Selecting a subscription
            here does not cancel it or change your real accounts.
          </p>
        </div>
      </div>
    </div>
  );
}

const titles: Record<string, [string, string, string]> = {
  dashboard: [
    "YOUR FINANCIAL EXHALE",
    "A clearer picture starts here.",
    "A little less guessing. A little more knowing where your money goes.",
  ],
  commitments: [
    "KNOW WHAT STAYS",
    "Your subscriptions.",
    "All the little commitments. One beautifully clear view.",
  ],
  insights: [
    "WORTH A SECOND LOOK",
    "Your payment insights.",
    "Small changes deserve your attention. Here’s where to start.",
  ],
  "financial-impact": [
    "THE BIGGER PICTURE",
    "Your spending, understood.",
    "See how small recurring payments shape the year ahead.",
  ],
  savings: [
    "MAKE ROOM FOR MORE",
    "What if you kept a little more?",
    "Explore the possibilities, one subscription at a time.",
  ],
  cancellations: [
    "YOUR NEXT CHAPTER",
    "A clear way out.",
    "Step-by-step guidance for the commitments you’re ready to leave behind.",
  ],
  relationships: [
    "CONNECT THE DOTS",
    "Your money has a story.",
    "Explore the connections between merchants, accounts, and recurring payments.",
  ],
  merchants: [
    "BEHIND EVERY PAYMENT",
    "Meet your merchants.",
    "Recognise the names behind your recurring commitments.",
  ],
  "merchant-review": [
    "A LITTLE HUMAN PERSPECTIVE",
    "Give every payment a name.",
    "Review uncertain statement descriptions and connect the dots.",
  ],
};
export function DemoWorkspace() {
  const pathname = usePathname();
  const section = pathname.split("/")[1] || "dashboard";
  const [selectedSub, setSelectedSub] = useState<DemoSubscription | null>(null);
  const [dismissed, setDismissed] = useDemoSessionState<string[]>(
    "reviewed-insights",
    [],
  );
  const [filter, setFilter] = useState("All insights");
  const [playbook, setPlaybook] = useState<DemoSubscription | null>(null);
  const [progress, setProgress] = useDemoSessionState<string[]>(
    "cancellation-progress",
    [],
  );
  const [toast, setToast] = useState("");
  const [reviewed, setReviewed] = useDemoSessionState(
    "merchant-reviewed",
    false,
  );
  const closeSub = useCallback(() => setSelectedSub(null), []);
  const closePlaybook = useCallback(() => setPlaybook(null), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  const title = titles[section] || titles.dashboard;
  const insights = demoInsights.filter((i) => !dismissed.includes(i.id));
  const download = () => {
    const csv =
      "Subscription,Category,Monthly INR,Annual INR\n" +
      subscriptions
        .map((s) => `${s.name},${s.category},${s.amount},${s.amount * 12}`)
        .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "payscope-sample-subscriptions.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Sample subscription report downloaded.");
  };
  return (
    <div className="demo-workspace">
      <AppHeader />
      <main id="workspace-content" tabIndex={-1} className="workspace-main" key={section}>
        <div className="workspace-page-title">
          <div>
            <span className="section-eyebrow">
              <i />
              {title[0]}
            </span>
            <h1>{title[1]}</h1>
            <p>{title[2]}</p>
          </div>
          <div className="workspace-page-title-actions">
            <button className="button button-subtle" onClick={download}>
              <Icon name="download" size={14} />
              Export report
            </button>
            <Link href="/upload" className="button button-primary">
              <Icon name="plus" size={14} />
              Import statement
            </Link>
          </div>
        </div>
        <div className="sample-banner">
          <Icon name="spark" size={14} />
          <span>
            You’re exploring a sample workspace. All amounts and activity are
            illustrative.
          </span>
          <Link href="/">
            Back to home <Icon name="arrow" size={12} />
          </Link>
        </div>
        {section === "dashboard" && (
          <>
            <Stats />
            <div className="workspace-grid">
              <SpendChart />
              <Categories />
            </div>
            <div
              className="workspace-grid"
              style={{ gridTemplateColumns: "minmax(0, 1fr)" }}
            >
              <SubscriptionTable compact select={setSelectedSub} />
            </div>
            <div className="workspace-grid">
              <div className="surface">
                <div className="surface-heading">
                  <div>
                    <h2>A few things worth knowing</h2>
                    <p>Good decisions start with the right details.</p>
                  </div>
                  <Link href="/insights" className="text-link">
                    All insights <Icon name="arrow" size={13} />
                  </Link>
                </div>
                {insights.slice(0, 2).map((i) => (
                  <div className="workspace-insight" key={i.id}>
                    <span className="insight-symbol">
                      <Icon name={i.icon} size={16} />
                    </span>
                    <div>
                      <h3>{i.title}</h3>
                      <p>{i.text}</p>
                      <Link href="/insights" className="text-link">
                        Take a closer look <Icon name="arrow" size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="surface"
                style={{
                  background:
                    "radial-gradient(at 100% 100%, #1E293B28, transparent 85%), #0D1322",
                }}
              >
                <span className="icon-tile">
                  <Icon name="wallet" />
                </span>
                <h2
                  style={{
                    fontSize: 23,
                    lineHeight: 1.25,
                    fontWeight: 450,
                    letterSpacing: -0.7,
                    margin: "20px 0 12px",
                  }}
                >
                  A little less spending.
                  <br />A little more possibility.
                </h2>
                <p
                  style={{
                    fontSize: 10,
                    lineHeight: 1.9,
                    color: "#FF5500",
                    marginBottom: 19,
                  }}
                >
                  What could you do with {inr(7548)} more a year?
                  <br />
                  Try a scenario in your savings simulator.
                </p>
                <Link href="/savings" className="text-link">
                  Explore your possibilities <Icon name="arrow" size={14} />
                </Link>
              </div>
            </div>
          </>
        )}
        {section === "commitments" && (
          <>
            <Stats />
            <SubscriptionTable select={setSelectedSub} />
          </>
        )}
        {section === "insights" && (
          <>
            <div className="table-toolbar">
              <div className="segmented-control">
                {[
                  "All insights",
                  "Price increase",
                  "Review suggested",
                  "Trial conversion",
                ].map((t) => (
                  <button
                    className={filter === t ? "active" : ""}
                    onClick={() => setFilter(t)}
                    key={t}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 10, color: "#FF5500" }}>
                {insights.length} open insights
              </span>
            </div>
            {insights
              .filter((i) => filter === "All insights" || i.type === filter)
              .map((i) => (
                <article className="surface insight-card" key={i.id}>
                  <div className="surface-heading" style={{ marginBottom: 10 }}>
                    <span className="status-pill warning">{i.type}</span>
                    <span style={{ fontSize: 10, color: "#FF5500" }}>
                      {i.amount}
                    </span>
                  </div>
                  <h3>{i.title}</h3>
                  <p>
                    <strong style={{ color: "#FF5500", fontWeight: 450 }}>
                      {i.merchant}
                    </strong>{" "}
                    · {i.text}
                  </p>
                  <div style={{ display: "flex", gap: 22, marginTop: 18 }}>
                    <button
                      className="text-link"
                      onClick={() =>
                        setSelectedSub(
                          subscriptions.find((s) => s.id === i.subId)!,
                        )
                      }
                    >
                      Review subscription <Icon name="arrow" size={14} />
                    </button>
                    <button
                      className="table-action"
                      onClick={() => {
                        setDismissed((d) => [...d, i.id]);
                        setToast(
                          "Insight marked as reviewed for this demo session.",
                        );
                      }}
                    >
                      <Icon name="check" size={13} />
                      Mark as reviewed
                    </button>
                  </div>
                </article>
              ))}
            {insights.filter(
              (i) => filter === "All insights" || i.type === filter,
            ).length === 0 && (
                <div className="surface empty-state">
                  <Icon name="check" size={28} />
                  You’re all caught up in this category.
                  <br />
                  <button
                    className="text-link"
                    style={{ marginTop: 15 }}
                    onClick={() => {
                      setDismissed([]);
                      setFilter("All insights");
                    }}
                  >
                    Reset sample insights
                  </button>
                </div>
              )}
          </>
        )}
        {section === "financial-impact" && (
          <>
            <Stats />
            <div className="workspace-grid">
              <SpendChart />
              <Categories />
            </div>
            <SubscriptionTable select={setSelectedSub} />
          </>
        )}
        {section === "savings" && <Savings />}
        {section === "cancellations" && (
          <>
            <div className="surface" style={{ marginBottom: 20 }}>
              <div className="surface-heading">
                <div>
                  <h2>Choose what you’re ready to leave behind</h2>
                  <p>
                    Guidance is tailored to the payment method in this sample.
                  </p>
                </div>
                <span className="demo-chip">
                  {progress.length} reported cancelled
                </span>
              </div>
              {subscriptions.map((sub) => (
                <div className="check-row" key={sub.id}>
                  <span>
                    <MerchantMark sub={sub} />
                    <span>
                      {sub.name}
                      <small
                        style={{
                          display: "block",
                          marginTop: 5,
                          fontSize: 9,
                          color: "#FF5500",
                        }}
                      >
                        {sub.account} · {inr(sub.amount)} / month
                      </small>
                    </span>
                  </span>
                  {progress.includes(sub.id) ? (
                    <span className="status-pill">Reported cancelled</span>
                  ) : (
                    <button
                      className="table-action"
                      onClick={() => setPlaybook(sub)}
                    >
                      View playbook <Icon name="arrow" size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="opportunity-note">
              <Icon name="shield" size={16} />
              You complete cancellation with your provider. Reporting it here
              only updates this demo session.
            </div>
          </>
        )}
        {section === "relationships" && (
          <div className="surface">
            <div className="surface-heading">
              <div>
                <h2>A connected view of your money</h2>
                <p>Select any merchant to explore its recurring commitment.</p>
              </div>
              <span className="demo-chip">Illustrative relationship map</span>
            </div>
            <div className="graph-visual">
              <svg
                className="graph-line"
                viewBox="0 0 600 330"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {[
                  [90, 66],
                  [510, 66],
                  [90, 264],
                  [510, 264],
                ].map(([x, y], i) => (
                  <path
                    key={i}
                    d={`M300 165 Q${x} 165 ${x} ${y}`}
                    fill="none"
                    stroke="#FF550044"
                    strokeWidth="1"
                    strokeDasharray="4 6"
                  />
                ))}
              </svg>
              <span
                className="graph-node core"
                style={{ left: "50%", top: "50%" }}
              >
                <Icon name="wallet" />
                Your accounts
              </span>
              {subscriptions.slice(0, 4).map((sub, i) => (
                <button
                  key={sub.id}
                  className="graph-node"
                  style={{
                    left: i % 2 === 0 ? "15%" : "85%",
                    top: i < 2 ? "20%" : "80%",
                  }}
                  onClick={() => setSelectedSub(sub)}
                >
                  <MerchantMark sub={sub} />
                  {sub.name.split(" ")[0]}
                </button>
              ))}
            </div>
            <div className="opportunity-note">
              <Icon name="network" size={16} />
              This sample shows how merchants connect to recurring payments.
              Your live graph is built from imported statements.
            </div>
          </div>
        )}
        {section === "merchants" && (
          <SubscriptionTable select={setSelectedSub} />
        )}
        {section === "merchant-review" && (
          <div className="surface">
            <div className="surface-heading">
              <div>
                <h2>Let’s make this description clearer.</h2>
                <p>One sample description is ready for your review.</p>
              </div>
            </div>
            {!reviewed ? (
              <>
                <div className="detail-row">
                  <span>Statement description</span>
                  <strong>SPOTIFYINDIA SI 8819</strong>
                </div>
                <div className="detail-row">
                  <span>Suggested merchant</span>
                  <strong>Spotify</strong>
                </div>
                <div className="detail-row">
                  <span>Sample amount</span>
                  <strong>₹119 / month</strong>
                </div>
                <p
                  style={{
                    fontSize: 10,
                    color: "#FF5500",
                    lineHeight: 1.8,
                    marginTop: 20,
                  }}
                >
                  This description appears to match Spotify. Confirming connects
                  it to the merchant in this demo session.
                </p>
                <button
                  className="button button-primary"
                  style={{ marginTop: 18, fontSize: 10 }}
                  onClick={() => {
                    setReviewed(true);
                    setToast("Sample description matched to Spotify.");
                  }}
                >
                  <Icon name="check" size={15} />
                  Confirm merchant
                </button>
              </>
            ) : (
              <div className="empty-state">
                <Icon name="check" size={30} />
                All clear. This sample description has a name.
                <br />
                <button
                  className="text-link"
                  style={{ marginTop: 15 }}
                  onClick={() => setReviewed(false)}
                >
                  Reset sample review
                </button>
              </div>
            )}
          </div>
        )}
        <footer
          style={{
            fontSize: 8,
            color: "#1E293B",
            marginTop: 30,
            display: "flex",
            justifyContent: "space-between",
            gap: 15,
          }}
        >
          <span>PayScope · A little more clarity.</span>
          <Link href="/privacy">Your data. Your control.</Link>
        </footer>
      </main>
      {selectedSub && (
        <Modal label={selectedSub.name} close={closeSub}>
          <MerchantMark sub={selectedSub} />
          <h2>{selectedSub.name}</h2>
          <p>
            Your recurring commitment, at a glance.
            <br />
            Illustrative data from the sample workspace.
          </p>
          {[
            ["Monthly payment", inr(selectedSub.amount)],
            ["Annual commitment", inr(selectedSub.amount * 12)],
            ["Category", selectedSub.category],
            ["Payment method", selectedSub.account],
            ["Next sample payment", `Nov ${selectedSub.day}, 2026`],
          ].map(([label, value]) => (
            <div className="detail-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
          <Link
            href="/savings"
            onClick={closeSub}
            className="button button-primary"
          >
            Explore a savings scenario <Icon name="arrow" size={15} />
          </Link>
        </Modal>
      )}
      {playbook && (
        <Modal
          label={`Cancellation guidance for ${playbook.name}`}
          close={closePlaybook}
        >
          <span className="icon-tile">
            <Icon name="shield" />
          </span>
          <h2>A clear way out.</h2>
          <p>
            {playbook.name} · {playbook.account}
            <br />
            General guidance. Provider steps may vary.
          </p>
          {(playbook.account.includes("UPI")
            ? [
              "Open your UPI payment app and find AutoPay or Mandates under your profile or payment settings.",
              `Locate the ${playbook.name} recurring mandate and check its details.`,
              "Choose revoke or cancel, follow the app’s confirmation steps, and keep a record.",
              "Also check your merchant account for any remaining subscription or billing obligation.",
            ]
            : [
              `Sign in to your ${playbook.name} account through its official website.`,
              "Open your account’s billing or subscription settings and locate your active plan.",
              "Follow the cancellation flow. Review the effective date and any fees before confirming.",
              "Keep your confirmation and check future statements for unexpected charges.",
            ]
          ).map((step, i) => (
            <div className="playbook-step" key={step}>
              <span>0{i + 1}</span>
              <p>{step}</p>
            </div>
          ))}
          <button
            className="button button-primary"
            onClick={() => {
              setProgress((p) => [...p, playbook.id]);
              setPlaybook(null);
              setToast(
                "Cancellation reported in this demo. No real subscription was changed.",
              );
            }}
          >
            <Icon name="check" size={15} />
            Mark as reported cancelled
          </button>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
