"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PayScopeLogo } from "@/components/brand/PayScopeLogo";
import { useAuth } from "@/context/AuthContext";
import { Icon } from "@/components/ui/Icon";
interface Props {
  apiConnected?: boolean;
  headerLogoRef?: React.RefObject<HTMLDivElement | null>;
  showFinalLogo?: boolean;
}
const links = [
  { label: "Home", href: "/", section: "home" },
  { label: "Features", href: "/#features", section: "features" },
  { label: "How it works", href: "/#how-it-works", section: "how-it-works" },
  { label: "FAQ", href: "/#faq", section: "faq" },
];
export function PayScopeLandingHeader({ headerLogoRef }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("home");
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const { user, openAuthModal } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 16);
      if (pathname !== "/") {
        setActive("");
        return;
      }
      const current = [...links].reverse().find((link) => {
        const section = document.getElementById(link.section);
        return section && section.getBoundingClientRect().top <= 180;
      });
      setActive(current?.section || "home");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const start = () => (user ? router.push("/dashboard") : openAuthModal());
  return (
    <header
      ref={header}
      className={`marketing-header ${scrolled ? "is-scrolled" : ""} ${open ? "menu-is-open" : ""}`}
    >
      <div className="marketing-nav page-width">
        <div ref={headerLogoRef}>
          <Link href="/" aria-label="PayScope home">
            <PayScopeLogo size={36} />
          </Link>
        </div>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.section}
              href={link.href}
              className={active === link.section ? "nav-current" : ""}
              aria-current={active === link.section ? "location" : undefined}
            >
              <span className="nav-link-dot" />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <button className="nav-login" onClick={start}>
            {user ? "Dashboard" : "Log in"}
          </button>
          <button className="button button-primary nav-signup" onClick={start}>
            Start for free <Icon name="arrow" size={17} />
          </button>
          <button
            className="icon-button mobile-nav-toggle"
            ref={menuButton}
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="marketing-mobile-menu"
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="marketing-mobile-menu"
          className="mobile-nav"
          aria-label="Mobile navigation"
        >
          <span className="mobile-nav-label">
            A CLEARER PICTURE STARTS HERE
          </span>
          {links.map((link, index) => (
            <Link
              href={link.href}
              key={link.section}
              className={active === link.section ? "nav-current" : ""}
              onClick={() => setOpen(false)}
            >
              <span>
                <small aria-hidden="true">0{index + 1}</small>
                {link.label}
              </span>
              <Icon name="arrow" size={19} />
            </Link>
          ))}
          <div className="mobile-nav-footer">
            <span>
              <Icon name="shield" size={15} />
              Your money. Your control.
            </span>
            <button
              className="button button-primary"
              onClick={() => {
                setOpen(false);
                start();
              }}
            >
              Get started <Icon name="arrow" size={16} />
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
export default PayScopeLandingHeader;
