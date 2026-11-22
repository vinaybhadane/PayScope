"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PayScopeLandingHeader } from "@/components/landing/PayScopeLandingHeader";
import { DownloadAppLink } from "@/components/landing/DownloadAppLink";
import { CookieConsentModal } from "@/components/landing/CookieConsentModal";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/context/AuthContext";
import styles from "./Landing.module.css";

interface LandingClientContainerProps {
  apiConnected: boolean;
}

const features = [
  { icon: "repeat", title: "Every subscription, together.", description: "A clear view of your recurring payments." },
  { icon: "chart", title: "See the bigger picture.", description: "Understand what small payments add up to." },
  { icon: "shield", title: "Your privacy comes first.", description: "Statement insights. No bank login needed." },
];

export function LandingClientContainer({}: LandingClientContainerProps) {
  const router = useRouter();
  const { user, openAuthModal } = useAuth();

  const handleLaunchApp = () => {
    if (user) router.push("/dashboard");
    else openAuthModal();
  };

  return (
    <div className={styles.page}>
      <PayScopeLandingHeader />
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowIcon}><Icon name="spark" size={15} /></span>
              A LITTLE CLARITY. A LOT MORE CONTROL.
            </div>
            <h1 id="hero-title" className={styles.headline}>
              Your money.
              <span>A clearer picture.</span>
            </h1>
            <p className={styles.description}>
              Forgotten subscriptions. Quiet price increases. Payments that add
              up. Bring them all into focus with PayScope.
            </p>
            <div className={styles.heroActions}>
              <button type="button" className={styles.primaryButton} onClick={handleLaunchApp}>
                <Icon name="grid" size={18} />
                {user ? "Open dashboard" : "Explore PayScope"}
              </button>
              <DownloadAppLink className={styles.secondaryButton} iconSize={18} />
            </div>
            <p className={styles.reassurance}>
              <Icon name="shield" size={15} /> No bank login required
            </p>
            <div className={styles.productNote}>
              <div className={styles.merchantStack} aria-hidden="true">
                <span><Image src="/merchant-logos/netflix.svg" alt="" width={19} height={19} /></span>
                <span><Image src="/merchant-logos/spotify.svg" alt="" width={21} height={21} /></span>
                <span><Image src="/merchant-logos/youtube.svg" alt="" width={22} height={22} /></span>
              </div>
              <p>Your subscriptions.<br /><strong>Finally, all in one place.</strong></p>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.orbit} aria-hidden="true" />
            <div className={styles.orbitInner} aria-hidden="true" />
            <div className={styles.visualGlow} aria-hidden="true" />
            <div className={styles.visualLabel}>
              <span className={styles.visualLabelIcon}><Icon name="spark" size={20} /></span>
              <span>Less guesswork.<br /><strong>More peace of mind.</strong></span>
            </div>

            {/* Floating Alert: Duplicate Subscription */}
            <div className={styles.heroAlertLeft} aria-label="Duplicate Subscription Alert Preview">
              <span className={styles.heroAlertBadgeCyan}>
                <Icon name="repeat" size={13} /> Duplicate subscription
              </span>
              <p className={styles.heroAlertQuote}>
                “You have two music subscriptions: Spotify and YouTube Premium.”
              </p>
              <p className={styles.heroAlertSub}>
                Also flags AI overlap: “You have two AI subscriptions: ChatGPT and Gemini.”
              </p>
            </div>

            {/* Floating Alert: Trial Converting */}
            <div className={styles.heroAlertRight} aria-label="Trial Converting Alert Preview">
              <span className={styles.heroAlertBadgeOrange}>
                <Icon name="clock" size={13} /> Trial converting
              </span>
              <p className={styles.heroAlertQuote}>
                “Your free trial ends in 3 days; the next charge will be ₹799.”
              </p>
              <p className={styles.heroAlertSub}>
                Automatic warning before bank auto-debit triggers.
              </p>
            </div>

            <Image
              src="/holdingPhone.png"
              alt="A hand holding a phone showing the PayScope sample dashboard and recurring payment overview"
              width={1047}
              height={1503}
              sizes="(max-width: 600px) 340px, (max-width: 900px) 440px, (max-width: 1200px) 480px, 560px"
              loading="eager"
              fetchPriority="high"
              className={styles.phoneImage}
            />
            <div className={styles.visualCaption}>
              <span className={styles.captionLine} aria-hidden="true" /> YOUR FINANCES, IN FOCUS
            </div>
          </div>
        </section>

        <section className={styles.intelligenceShowcase} aria-label="Autonomous Detection Showcase">
          <div className={styles.showcaseHeader}>
            <span className={styles.showcaseEyebrow}>
              <Icon name="spark" size={14} /> Autonomous Detection In Action
            </span>
            <h2 className={styles.showcaseTitle}>Alerts that catch what bank statements hide.</h2>
          </div>
          <div className={styles.showcaseGrid}>
            <div className={styles.showcaseCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardBadgeOrange}>
                  <Icon name="clock" size={14} /> Trial converting
                </span>
                <span className={styles.cardStatus}>Active Alert</span>
              </div>
              <p className={styles.cardQuote}>
                “Your free trial ends in 3 days; the next charge will be ₹799.”
              </p>
              <p className={styles.cardDesc}>
                Proactively notifies you 3 days before free trials expire and convert into recurring paid debit mandates.
              </p>
            </div>

            <div className={styles.showcaseCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardBadgeCyan}>
                  <Icon name="repeat" size={14} /> Duplicate subscription
                </span>
                <span className={styles.cardStatus}>Redundant Spend</span>
              </div>
              <p className={styles.cardQuote}>
                “You have two music subscriptions: Spotify and YouTube Premium.”
              </p>
              <p className={styles.cardDesc}>
                Flags redundant services in the same category, including AI: “You have two AI subscriptions: ChatGPT and Gemini.”
              </p>
            </div>
          </div>
        </section>

        <section className={styles.features} aria-label="A little more clarity, every day">
          {features.map((feature) => (
            <div className={styles.feature} key={feature.title}>
              <span className={styles.featureIcon}><Icon name={feature.icon} size={22} /></span>
              <div><h2>{feature.title}</h2><p>{feature.description}</p></div>
            </div>
          ))}
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p><strong>PayScope</strong><span>© {new Date().getFullYear()} PayScope. All rights reserved.</span></p>
          <nav aria-label="Footer navigation">
            <Link href="/about">About us</Link>
            <Link href="/privacy">Privacy policy</Link>
            <button type="button" onClick={handleLaunchApp}>Launch dashboard</button>
          </nav>
        </div>
      </footer>
      <CookieConsentModal />
    </div>
  );
}

export default LandingClientContainer;
