"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PayScopeLogo } from "@/components/brand/PayScopeLogo";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/context/AuthContext";
import { DownloadAppLink } from "./DownloadAppLink";
import { TermsModal } from "./TermsModal";
import { ContactModal } from "./ContactModal";
import styles from "./Landing.module.css";

interface PayScopeLandingHeaderProps {
  apiConnected?: boolean;
  headerLogoRef?: RefObject<HTMLDivElement | null>;
  showFinalLogo?: boolean;
}

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About us" },
  { href: "/privacy", label: "Privacy" },
];

export function PayScopeLandingHeader({ headerLogoRef, showFinalLogo = true }: PayScopeLandingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { user, openAuthModal, signOut } = useAuth();

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  const handleAuthAction = async () => {
    setMobileMenuOpen(false);
    setLogoutFailed(false);
    if (user) setLogoutFailed(!(await signOut()));
    else openAuthModal();
  };

  return (
    <>
      <header className={styles.header}>
        <a className={styles.skipLink} href="#main-content">Skip to content</a>
        <div className={styles.headerInner}>
          <div ref={headerLogoRef} id="header-target-logo" className={styles.brand} style={{ opacity: showFinalLogo ? 1 : 0 }}>
            <Link href="/" aria-label="PayScope home"><PayScopeLogo variant="navbar" size={35} /></Link>
          </div>
          <nav className={styles.desktopNav} aria-label="Main navigation">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} className={pathname === href ? styles.activeNav : undefined} aria-current={pathname === href ? "page" : undefined}>{label}</Link>
            ))}
            <button type="button" onClick={() => setTermsModalOpen(true)}>Terms</button>
            <button type="button" onClick={() => setContactModalOpen(true)}>Contact</button>
          </nav>
          <div className={styles.headerActions}>
            <DownloadAppLink className={styles.headerDownload} iconSize={16} />
            <button type="button" className={styles.signInButton} onClick={handleAuthAction}>{user ? "Sign out" : "Sign in"}</button>
            <button ref={menuButtonRef} type="button" className={styles.menuButton} aria-controls="landing-mobile-menu" aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Icon name={mobileMenuOpen ? "close" : "menu"} size={21} />
            </button>
          </div>
        </div>
        {logoutFailed && <p role="alert" className={styles.logoutError}>Sign-out failed. Please try again.</p>}
        {mobileMenuOpen && (
          <nav id="landing-mobile-menu" className={styles.mobileNav} aria-label="Mobile navigation">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setMobileMenuOpen(false)}>{label}</Link>
            ))}
            <button type="button" onClick={() => { setMobileMenuOpen(false); setTermsModalOpen(true); }}>Terms and conditions</button>
            <button type="button" onClick={() => { setMobileMenuOpen(false); setContactModalOpen(true); }}>Contact us</button>
            {user && <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>Open dashboard</Link>}
            <DownloadAppLink className={styles.mobileDownload} iconSize={17} onClick={() => setMobileMenuOpen(false)} />
          </nav>
        )}
      </header>
      <TermsModal isOpen={termsModalOpen} onClose={() => setTermsModalOpen(false)} />
      <ContactModal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} />
    </>
  );
}

export default PayScopeLandingHeader;
