"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PayScopeLandingHeader } from "./PayScopeLandingHeader";
import { PayScopeLogo } from "@/components/brand/PayScopeLogo";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/context/AuthContext";

const brands = [
  {
    name: "Netflix",
    mark: "N",
    color: "#789575",
    cost: "649",
    category: "Entertainment",
  },
  {
    name: "Spotify",
    mark: "≋",
    color: "#789575",
    cost: "119",
    category: "Music",
  },
  {
    name: "Adobe",
    mark: "A",
    color: "#789575",
    cost: "1,699",
    category: "Productivity",
  },
];
const faq = [
  [
    "What exactly does PayScope do?",
    "PayScope helps you discover recurring payments in statement exports, spot price changes and trial conversions, and understand your future spending. It brings the evidence and your next steps into one clear workspace.",
  ],
  [
    "Do I need to connect my bank account?",
    "No bank login is needed. PayScope works with uploaded statement exports. The current prototype is designed for synthetic data; you can explore everything with the included sample workspace.",
  ],
  [
    "Can PayScope cancel subscriptions for me?",
    "PayScope provides payment-specific cancellation playbooks for card billing, UPI AutoPay, e-mandates, and merchant portals. You complete the cancellation with the relevant provider and can record your progress here.",
  ],
  [
    "How does the savings simulator work?",
    "Choose the recurring commitments you could stop. The simulator shows the monthly and annual cost you could avoid, based on those amounts. These are estimates, rather than guaranteed savings.",
  ],
  [
    "Can I try it before uploading a statement?",
    "Absolutely. Open the demo to explore a clearly labelled sample dashboard, subscriptions, insights, and a working savings simulator. You do not need an account to try it.",
  ],
];

function Preview({ onDemo }: { onDemo: () => void }) {
  const [tab, setTab] = useState("Overview");
  return (
    <div className="product-preview">
      <div className="preview-topbar">
        <PayScopeLogo size={25} />
        <div className="preview-tabs">
          {["Overview", "Subscriptions", "Insights"].map((t) => (
            <button
              key={t}
              className={tab === t ? "selected" : ""}
              onClick={() => setTab(t)}
            >
              {t}
              {t === "Insights" && <span className="tiny-dot" />}
            </button>
          ))}
        </div>
        <div className="preview-account">
          <Icon name="search" size={16} />
          <Icon name="bell" size={16} />
          <span className="mini-avatar">A</span>
          <span>
            Alex Morgan<small>Personal workspace</small>
          </span>
          <Icon name="down" size={13} />
        </div>
      </div>
      <div className="preview-layout">
        <aside className="preview-sidebar">
          {["grid", "repeat", "chart", "spark", "wallet"].map((name, i) => (
            <button
              key={name}
              onClick={() =>
                setTab(
                  i === 1 ? "Subscriptions" : i === 3 ? "Insights" : "Overview",
                )
              }
              aria-label={
                [
                  "Overview",
                  "Subscriptions",
                  "Spending",
                  "Insights",
                  "Savings",
                ][i]
              }
              className={i === 0 ? "selected" : ""}
            >
              <Icon name={name} size={17} />
            </button>
          ))}
          <Icon name="help" size={17} />
        </aside>
        <div className="preview-main">
          <div className="preview-greeting">
            <div>
              <span className="eyebrow-muted">YOUR MONEY, AT A GLANCE</span>
              <h3>
                A little clarity. A lot of control<span>.</span>
              </h3>
              <p>Here’s what’s happening with your recurring payments.</p>
            </div>
            <span className="demo-chip">
              <span />
              Sample workspace
            </span>
          </div>
          {tab === "Overview" ? (
            <>
              <div className="preview-metrics">
                <div className="preview-metric featured">
                  <span>
                    Monthly recurring spend <Icon name="wallet" size={15} />
                  </span>
                  <strong>
                    ₹4,290<span>.00</span>
                  </strong>
                  <small>
                    <Icon name="trend" size={12} /> Across 8 active
                    subscriptions
                  </small>
                  <div className="metric-wave" />
                </div>
                <div className="preview-metric">
                  <span>
                    Potential annual savings <Icon name="spark" size={15} />
                  </span>
                  <strong>
                    ₹7,548<span>.00</span>
                  </strong>
                  <small className="green-text">
                    2 opportunities found <Icon name="arrow" size={12} />
                  </small>
                </div>
                <div className="preview-metric">
                  <span>
                    Next payment <Icon name="calendar" size={15} />
                  </span>
                  <strong>
                    ₹649<span>.00</span>
                  </strong>
                  <small>
                    <span className="netflix-letter">N</span> Netflix Premium ·
                    in 2 days
                  </small>
                </div>
              </div>
              <div className="preview-bottom">
                <div className="preview-chart">
                  <div className="panel-heading">
                    <div>
                      <h4>Your spending, in perspective</h4>
                      <span>Monthly recurring payments</span>
                    </div>
                    <span className="preview-select">
                      Last 6 months <Icon name="down" size={11} />
                    </span>
                  </div>
                  <div className="chart-legend">
                    <span>
                      <i />
                      Recurring spend
                    </span>
                    <span>
                      <i />
                      Potential savings
                    </span>
                  </div>
                  <div className="preview-bars">
                    {[54, 69, 61, 84, 76, 66].map((h, i) => (
                      <div className="bar-group" key={i}>
                        <div className="bar-pair">
                          <i
                            style={{
                              height: `${h}%`,
                              animationDelay: `${0.7 + i * 0.09}s`,
                            }}
                          />
                          <i
                            style={{
                              height: `${h * 0.32}%`,
                              animationDelay: `${0.8 + i * 0.09}s`,
                            }}
                          />
                        </div>
                        <span>
                          {["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="preview-subscriptions">
                  <div className="panel-heading">
                    <h4>Upcoming payments</h4>
                    <button
                      onClick={() => setTab("Subscriptions")}
                      aria-label="View subscriptions"
                    >
                      <Icon name="arrow" size={15} />
                    </button>
                  </div>
                  {brands.map((b) => (
                    <div className="preview-sub-row" key={b.name}>
                      <span
                        className="merchant-icon"
                        style={{ color: b.color, background: `${b.color}12` }}
                      >
                        {b.mark}
                      </span>
                      <span>
                        {b.name}
                        <small>{b.category}</small>
                      </span>
                      <strong>
                        ₹{b.cost}
                        <small>/ month</small>
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : tab === "Subscriptions" ? (
            <div className="preview-tab-content">
              <h4>Know every commitment.</h4>
              <p>Your recurring payments, together in one place.</p>
              {brands.map((b) => (
                <div className="preview-sub-row" key={b.name}>
                  <span className="merchant-icon" style={{ color: b.color }}>
                    {b.mark}
                  </span>
                  <span>
                    {b.name}
                    <small>{b.category} · Monthly</small>
                  </span>
                  <span className="status-pill">Active</span>
                  <strong>₹{b.cost}</strong>
                </div>
              ))}
              <button className="text-link" onClick={onDemo}>
                Explore all subscriptions <Icon name="arrow" size={15} />
              </button>
            </div>
          ) : (
            <div className="preview-tab-content">
              <span className="icon-tile">
                <Icon name="spark" />
              </span>
              <h4>The small changes add up.</h4>
              <p>See what your statements might be telling you.</p>
              <div className="preview-insight">
                <Icon name="trend" />
                <div>
                  <strong>A price increase worth a second look</strong>
                  <p>Adobe increased from ₹1,499 to ₹1,699 in this sample.</p>
                </div>
                <span>+13.3%</span>
              </div>
              <div className="preview-insight">
                <Icon name="clock" />
                <div>
                  <strong>A trial is about to become a commitment</strong>
                  <p>Review your upcoming renewal before the next debit.</p>
                </div>
              </div>
              <button className="text-link" onClick={onDemo}>
                Explore payment insights <Icon name="arrow" size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LandingClientContainer({}: { apiConnected: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { signInAsGuest, user, openAuthModal } = useAuth();
  const router = useRouter();
  const demo = () => {
    if (!user || user.isDemo) signInAsGuest();
    router.push("/dashboard");
  };
  const start = () => (user ? router.push("/dashboard") : openAuthModal());
  useEffect(() => {
    if (
      !window.matchMedia(
        "(hover: hover) and (prefers-reduced-motion: no-preference)",
      ).matches
    )
      return;
    const container = root.current;
    const spotlight = (event: PointerEvent) => {
      const card = (event.target as HTMLElement).closest<HTMLElement>(
        ".bento-card",
      );
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
    };
    container?.addEventListener("pointermove", spotlight, { passive: true });
    return () => container?.removeEventListener("pointermove", spotlight);
  }, []);
  return (
    <div className="marketing-site" ref={root}>
      <PayScopeLandingHeader />
      <main>
        <section className="hero-section">
          <div className="hero-atmosphere" aria-hidden="true" /><div className="hero-fine-grid" aria-hidden="true" />
          <div className="hero-copy page-width">
            <span className="eyebrow-chip hero-enter">
              <span className="live-dot" />A LITTLE CLARITY GOES A LONG WAY
              <Icon name="spark" size={12} />
            </span>
            <h1 className="hero-enter">
              Your money.
              <br />
              <span>A clearer picture.</span>
            </h1>
            <p className="hero-enter">
              Meet the quiet side of your spending.
              <br />
              Uncover subscriptions, catch hidden charges, and make room for
              more.
            </p>
            <div className="hero-buttons hero-enter">
              <button className="button button-primary" onClick={start}>
                Take control for free <Icon name="arrow" size={17} />
              </button>
              <button className="button button-subtle" onClick={demo}>
                <span className="play-circle">
                  <Icon name="play" size={12} />
                </span>
                Explore the demo
              </button>
            </div>
            <span className="hero-note hero-enter">
              <Icon name="shield" size={13} />
              No bank connection. No guesswork. Just clarity.
            </span>
          </div>
          <div className="hero-product page-width">
            <div className="horizon-glow" aria-hidden="true">
              <div />
            </div>
            <div className="hero-floating-note note-left" aria-hidden="true"><span><Icon name="shield" size={19} /></span><div><strong>A little peace of mind.</strong><small>No bank login needed.</small></div></div>
            <div className="hero-floating-note note-right" aria-hidden="true"><span><Icon name="spark" size={19} /></span><div><strong>Make room for more.</strong><small>Your next chapter starts here.</small></div></div>
            <div className="preview-frame">
              <div className="preview-window-dots">
                <i />
                <i />
                <i />
                <span>payscope / your financial overview</span>
                <Icon name="lock" size={10} />
              </div>
              <Preview onDemo={demo} />
            </div>
            <div className="product-fade" />
          </div>
        </section>
        <section className="integrations-strip page-width" data-reveal>
          <p>ALL YOUR SUBSCRIPTIONS. ONE CLEAR VIEW.</p>
          <div className="integration-brands">
            <span>
              <b className="spotify-symbol">≋</b>Spotify
            </span>
            <span className="netflix-brand">NETFLIX</span>
            <span>
              <b className="adobe-symbol">△</b>Adobe
            </span>
            <span>
              <b className="notion-symbol">N</b>Notion
            </span>
            <span className="amazon-brand">
              amazon<span>prime</span>
            </span>
            <span>
              <Icon name="globe" size={27} />
              and everything else
            </span>
          </div>
        </section>
        <section
          id="features"
          className="features-section page-width section-space"
        >
          <div className="section-heading" data-reveal>
            <span className="section-eyebrow">
              <i />
              LESS NOISE. MORE KNOWING.
            </span>
            <h2>
              Small payments.
              <br />
              <span>A much bigger picture.</span>
            </h2>
            <p>
              Your finances don’t need more spreadsheets.
              <br />
              They need a little perspective.
            </p>
          </div>
          <div className="bento-grid">
            <article className="bento-card bento-wide" data-reveal>
              <span className="icon-tile">
                <Icon name="repeat" />
              </span>
              <h3>
                Everything recurring.
                <br />
                Nothing overlooked.
              </h3>
              <p>
                From streaming nights to your daily workflow,
                <br />
                see every commitment in one place.
              </p>
              <div className="subscription-orbit">
                <div className="orbit-ring ring-one" />
                <div className="orbit-ring ring-two" />
                <div className="orbit-core">
                  <PayScopeLogo variant="compact" size={46} />
                </div>
                {[
                  ...brands,
                  { name: "Notion", mark: "N", color: "#243C2D" },
                  { name: "YouTube", mark: "▶", color: "#789575" },
                ].map((b, i) => (
                  <span
                    key={b.name}
                    className={`orbit-brand orbit-${i}`}
                    style={{ color: b.color }}
                  >
                    {b.mark}
                  </span>
                ))}
              </div>
              <span className="bento-footnote">
                <span className="live-dot" />
                One workspace. A connected view.
              </span>
            </article>
            <article className="bento-card bento-wide price-card" data-reveal>
              <span className="icon-tile">
                <Icon name="spark" />
              </span>
              <h3>
                Catch the changes
                <br />
                you didn’t sign up for.
              </h3>
              <p>
                Silent price hikes. Forgotten trials.
                <br />
                Spot the little things before they add up.
              </p>
              <div className="price-visual">
                <div className="price-visual-top">
                  <span className="merchant-icon adobe">A</span>
                  <span>
                    Adobe Creative Cloud<small>Monthly subscription</small>
                  </span>
                  <span className="price-alert">Price increase</span>
                </div>
                <div className="price-comparison">
                  <span>
                    ₹1,499<small>Previous payment</small>
                  </span>
                  <Icon name="arrow" size={22} />
                  <span>
                    ₹1,699<small>Latest payment</small>
                  </span>
                </div>
                <div className="price-visual-bottom">
                  <Icon name="trend" size={15} />
                  <span>That’s ₹2,400 more over a year.</span>
                  <b>+13.3%</b>
                </div>
              </div>
            </article>
            <article className="bento-card bento-small" data-reveal>
              <span className="icon-tile">
                <Icon name="chart" />
              </span>
              <h3>See the year ahead.</h3>
              <p>
                Turn monthly charges into a clear view of your annual
                commitments.
              </p>
              <div className="mini-sparkline">
                <svg viewBox="0 0 260 72" fill="none">
                  <path
                    d="M0 64 25 56 50 59 75 37 100 43 125 27 150 31 175 12 200 17 230 3 260 8"
                    stroke="url(#sparkGradient)"
                    strokeWidth="2"
                  />
                  <defs>
                    <linearGradient id="sparkGradient">
                      <stop stopColor="#789575" stopOpacity=".15" />
                      <stop offset="1" stopColor="#789575" />
                    </linearGradient>
                  </defs>
                </svg>
                <span>12 months. No surprises.</span>
              </div>
            </article>
            <article className="bento-card bento-small" data-reveal>
              <span className="icon-tile">
                <Icon name="wallet" />
              </span>
              <h3>Make room for more.</h3>
              <p>
                Explore what you could save by letting go of what you no longer
                need.
              </p>
              <div className="savings-mini">
                <span>YOUR NEXT POSSIBILITY</span>
                <strong>
                  ₹7,548<small>/ year</small>
                </strong>
                <span className="green-text">
                  <Icon name="trend" size={13} />
                  Illustrative savings scenario
                </span>
              </div>
            </article>
            <article className="bento-card bento-small" data-reveal>
              <span className="icon-tile">
                <Icon name="shield" />
              </span>
              <h3>A clear way out.</h3>
              <p>
                Get cancellation guidance built around how you actually pay.
              </p>
              <div className="payment-pills">
                <span>
                  <Icon name="check" size={13} />
                  UPI AutoPay
                </span>
                <span>
                  <Icon name="check" size={13} />
                  Card billing
                </span>
                <span>
                  <Icon name="check" size={13} />
                  e-Mandates
                </span>
              </div>
            </article>
          </div>
        </section>
        <section id="how-it-works" className="how-section section-space">
          <div className="page-width">
            <div className="section-heading" data-reveal>
              <span className="section-eyebrow">
                <i />
                FROM STATEMENT TO UNDERSTANDING
              </span>
              <h2>
                Three steps to
                <br />
                <span>your financial exhale.</span>
              </h2>
            </div>
            <div className="steps-grid">
              {[
                {
                  icon: "upload",
                  title: "Bring your statement.",
                  text: "Start with a synthetic statement export. No bank passwords or account linking needed.",
                },
                {
                  icon: "spark",
                  title: "Connect the dots.",
                  text: "PayScope finds recurring patterns, organises merchants, and surfaces changes worth your attention.",
                },
                {
                  icon: "wallet",
                  title: "Decide what stays.",
                  text: "Review your commitments, explore your savings, and take your next step with confidence.",
                },
              ].map((step, i) => (
                <article className="step-card" data-reveal key={step.title}>
                  <div className="step-number">
                    0{i + 1}
                    <span />
                    <Icon name={step.icon} size={22} />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
            <div className="privacy-banner" data-reveal>
              <div className="privacy-emblem">
                <Icon name="lock" size={27} />
              </div>
              <div>
                <h3>Your money story is yours.</h3>
                <p>
                  Statement-based insights. No bank credentials. You stay in
                  control.
                </p>
              </div>
              <Link href="/privacy">
                Our approach to privacy <Icon name="arrow" size={16} />
              </Link>
            </div>
          </div>
        </section>
        <section id="faq" className="faq-section page-width section-space">
          <div className="faq-intro" data-reveal>
            <span className="section-eyebrow">
              <i />A LITTLE MORE CLARITY
            </span>
            <h2>
              Good questions.
              <br />
              <span>Straight answers.</span>
            </h2>
            <p>
              Getting to know your money
              <br />
              starts with getting to know us.
            </p>
            <Link className="button button-subtle" href="/about">
              Meet PayScope <Icon name="arrow" size={15} />
            </Link>
          </div>
          <div className="faq-list" data-reveal>
            {faq.map(([q, a], i) => (
              <article
                className={`faq-item ${openFaq === i ? "is-open" : ""}`}
                key={q}
              >
                <h3>
                  <button
                    aria-expanded={openFaq === i}
                    aria-controls={`faq-answer-${i}`}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span>
                      <small>0{i + 1}</small>
                      {q}
                    </span>
                    <Icon name={openFaq === i ? "minus" : "plus"} size={17} />
                  </button>
                </h3>
                <div
                  className="faq-answer"
                  id={`faq-answer-${i}`}
                  hidden={openFaq !== i}
                >
                  <p>{a}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="cta-section page-width" data-reveal>
          <div className="cta-orbit" aria-hidden="true" />
          <span className="section-eyebrow">
            <i />A FRESH PERSPECTIVE STARTS HERE
          </span>
          <h2>
            Less money slipping away.
            <br />
            <span>More life ahead.</span>
          </h2>
          <p>
            Get to know your recurring payments. Then make them work for you.
          </p>
          <button className="button button-primary" onClick={demo}>
            Find your clarity <Icon name="arrow" size={17} />
          </button>
          <span className="cta-note">
            Start with the free sample workspace.
          </span>
        </section>
      </main>
      <footer className="marketing-footer page-width">
        <div className="footer-top">
          <div>
            <Link href="/">
              <PayScopeLogo />
            </Link>
            <p>Find the money leaving quietly.</p>
          </div>
          <div>
            <span>EXPLORE</span>
            <Link href="/#features">Features</Link>
            <Link href="/#how-it-works">How it works</Link>
            <button onClick={demo}>Try the demo</button>
          </div>
          <div>
            <span>PAYSCOPE</span>
            <Link href="/about">Our story</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/#faq">Questions & answers</Link>
          </div>
          <div className="footer-manifesto">
            A little less noise.
            <br />A little more <span>possibility.</span>
            <Icon name="spark" size={20} />
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} PayScope. All rights reserved.
          </span>
          <span>
            <span className="live-dot" />
            Designed for a clearer financial future.
          </span>
          <Link href="/privacy">Privacy & data</Link>
        </div>
      </footer>
    </div>
  );
}
