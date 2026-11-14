"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { PayScopeLogo } from "@/components/brand/PayScopeLogo";
import { Icon } from "@/components/ui/Icon";
import { useWorkspaceMode, setWorkspaceMode } from "@/lib/useWorkspaceMode";
const navigation = [
  { href: "/dashboard", name: "Overview", icon: "grid" },
  { href: "/commitments", name: "Subscriptions", icon: "repeat" },
  { href: "/insights", name: "Payment insights", icon: "spark" },
  { href: "/financial-impact", name: "Spending analysis", icon: "chart" },
  { href: "/savings", name: "Savings simulator", icon: "wallet" },
  { href: "/cancellations", name: "Cancellation centre", icon: "shield" },
  { href: "/relationships", name: "Relationships", icon: "network" },
  { href: "/merchants", name: "Merchants", icon: "globe" },
  { href: "/merchant-review", name: "Merchant review", icon: "check" },
  { href: "/upload", name: "Import statement", icon: "upload" },
];
export function AppHeader({
}: {
  apiConnected?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, openAuthModal } = useAuth();
  const mode = useWorkspaceMode();
  const current =
    navigation.find((n) => pathname.startsWith(n.href))?.name ||
    "Your workspace";
  return (
    <>
      <header className="workspace-header">
        <button
          className="icon-button mobile-nav-toggle"
          aria-label="Open workspace menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Icon name="menu" />
        </button>
        <div className="workspace-breadcrumb">
          <span>Personal workspace</span>
          <Icon name="chevron" size={12} />
          <strong>{current}</strong>
        </div>
        <div className="workspace-header-actions">
          {user?.isDemo && (
            <div
              className="workspace-mode"
              role="group"
              aria-label="Workspace data source"
            >
              <button
                aria-pressed={mode === "sample"}
                onClick={() => setWorkspaceMode("sample")}
              >
                Sample
              </button>
              <button
                aria-pressed={mode === "connected"}
                onClick={() => setWorkspaceMode("connected")}
              >
                Connected
              </button>
            </div>
          )}
          <Link
            href="/insights"
            className="icon-button"
            aria-label="View payment insights"
          >
            <Icon name="bell" size={18} />
          </Link>
          <button
            className="workspace-avatar"
            onClick={user ? () => router.push("/about") : openAuthModal}
            aria-label={user ? "About your workspace" : "Sign in"}
          >
            {user?.displayName?.charAt(0) || "P"}
          </button>
        </div>
      </header>
      {open && (
        <div className="sidebar-overlay" onClick={() => setOpen(false)} />
      )}
      <aside className={`workspace-sidebar ${open ? "mobile-open" : ""}`}>
        <Link
          href="/"
          onClick={() => setOpen(false)}
          aria-label="PayScope home"
        >
          <PayScopeLogo />
        </Link>
        <span className="workspace-label">YOUR WORKSPACE</span>
        <nav className="workspace-nav" aria-label="Workspace navigation">
          {navigation.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              prefetch={n.href === "/dashboard" || n.href === "/relationships"}
              onClick={() => setOpen(false)}
              className={pathname.startsWith(n.href) ? "active" : ""}
              aria-current={pathname.startsWith(n.href) ? "page" : undefined}
            >
              <Icon name={n.icon} size={17} />
              {n.name}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <Icon name="shield" size={21} />
            <strong>A little peace of mind.</strong>
            <p>
              Your bank login stays yours.
              <br />
              Clarity starts with a statement.
            </p>
            <Link href="/privacy">
              Privacy, by design <Icon name="arrow" size={12} />
            </Link>
          </div>
          <div className="sidebar-profile">
            <span className="workspace-avatar">
              {user?.displayName?.charAt(0) || "P"}
            </span>
            <span>
              {user?.isDemo
                ? "Demo explorer"
                : user?.displayName || "Your workspace"}
              <small>
                {user?.isDemo
                  ? "Sample data · Free to explore"
                  : "Personal account"}
              </small>
            </span>
            {user ? (
              <button
                aria-label="Sign out"
                onClick={async () => {
                  await signOut();
                  router.push("/");
                }}
              >
                <Icon name="exit" size={17} />
              </button>
            ) : (
              <button aria-label="Sign in" onClick={openAuthModal}>
                <Icon name="arrow" size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
export default AppHeader;
