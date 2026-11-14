"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { PayScopeLogo } from "@/components/brand/PayScopeLogo";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useWorkspaceMode, setWorkspaceMode } from "@/lib/useWorkspaceMode";

const groups = [
  { name: "Workspace", pages: [
    { href: "/dashboard", name: "Overview", icon: "grid", detail: "Your financial picture, at a glance" },
    { href: "/commitments", name: "Subscriptions", icon: "repeat", detail: "Every recurring commitment in one place" },
    { href: "/insights", name: "Payment insights", icon: "spark", detail: "Discover changes worth a closer look" },
  ] },
  { name: "Intelligence", pages: [
    { href: "/financial-impact", name: "Spending analysis", icon: "chart", detail: "Understand your monthly and annual spend" },
    { href: "/savings", name: "Savings simulator", icon: "wallet", detail: "Explore what you could keep" },
    { href: "/cancellations", name: "Cancellation centre", icon: "shield", detail: "Clear guidance for your next step" },
    { href: "/relationships", name: "Relationships", icon: "network", detail: "Connect accounts, merchants, and payments" },
  ] },
  { name: "Organise", pages: [
    { href: "/merchants", name: "Merchants", icon: "globe", detail: "The names behind your payments" },
    { href: "/merchant-review", name: "Merchant review", icon: "check", detail: "Give unfamiliar descriptions a name" },
    { href: "/upload", name: "Import statement", icon: "upload", detail: "Bring your synthetic statement into focus" },
  ] },
];
const navigation = groups.flatMap((group) => group.pages);

function PageSearch({ close }: { close: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const matches = navigation.filter((page) => `${page.name} ${page.detail}`.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => {
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  const visit = (href: string) => { close(); router.push(href); };
  return (
    <Modal label="Find a page" close={close} className="command-dialog">
      <div className="command-heading"><Icon name="search" size={20} /><span>Find your next step</span></div>
      <input ref={input} className="command-input" placeholder="Search pages, insights, savings…" aria-label="Search workspace pages"
        role="combobox" aria-expanded="true" aria-controls="workspace-search-results" aria-autocomplete="list"
        aria-activedescendant={matches[selected] ? `page-result-${selected}` : undefined} value={query}
        onChange={(event) => { setQuery(event.target.value); setSelected(0); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const next = Math.max(0, Math.min(matches.length - 1, selected + (event.key === "ArrowDown" ? 1 : -1)));
            setSelected(next);
            document.getElementById(`page-result-${next}`)?.scrollIntoView({ block: "nearest" });
          }
          if (event.key === "Enter" && matches[selected]) { event.preventDefault(); visit(matches[selected].href); }
        }} />
      <div className="command-results" id="workspace-search-results" role="listbox" aria-label="Pages">
        {matches.map((page, index) => (
          <button key={page.href} id={`page-result-${index}`} role="option" aria-selected={index === selected}
            className="command-result" onClick={() => visit(page.href)}>
            <span className="command-result-icon"><Icon name={page.icon} size={18} /></span>
            <span><strong>{page.name}</strong><small>{page.detail}</small></span><Icon name="arrow" size={16} />
          </button>
        ))}
      </div>
      {!matches.length && <div className="command-empty"><Icon name="search" /><strong>No pages found</strong><span>Try “savings”, “statement”, or “subscriptions”.</span></div>}
      <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to explore</span><span><kbd>↵</kbd> to open</span><span><kbd>esc</kbd> to close</span></div>
    </Modal>
  );
}

export function AppHeader({}: { apiConnected?: boolean }) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, openAuthModal } = useAuth();
  const mode = useWorkspaceMode();
  const current = navigation.find((page) => pathname.startsWith(page.href));
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setOpen(false); setSearchOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector<HTMLElement>(".sidebar-close")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
      if (event.key !== "Tab") return;
      const elements = sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), [tabindex="0"]');
      if (!elements?.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const desktop = window.matchMedia("(min-width: 1101px)");
    const resize = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", resize);
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", keydown); desktop.removeEventListener("change", resize); };
  }, [open]);
  return (
    <>
      <a href="#workspace-content" className="skip-workspace">Skip to content</a>
      <header className="workspace-header">
        <button ref={toggle} className="icon-button mobile-nav-toggle" aria-label="Open workspace menu" aria-expanded={open}
          aria-controls="workspace-sidebar" onClick={() => setOpen(!open)}><Icon name="menu" /></button>
        <div className="workspace-breadcrumb"><span className="breadcrumb-home"><Icon name="grid" size={14} />My workspace</span>
          <Icon name="chevron" size={12} /><strong>{current?.name || "Your workspace"}</strong></div>
        <div className="workspace-header-actions">
          <button className="workspace-search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search workspace pages">
            <Icon name="search" size={16} /><span>Quick find</span><kbd>Ctrl K</kbd>
          </button>
          {user?.isDemo && <div className="workspace-mode" role="group" aria-label="Workspace data source">
            <button aria-pressed={mode === "sample"} onClick={() => setWorkspaceMode("sample")}>Sample</button>
            <button aria-pressed={mode === "connected"} onClick={() => setWorkspaceMode("connected")}>Connected</button>
          </div>}
          <span className="header-divider" />
          <Link href="/insights" className="icon-button header-insights" aria-label="View payment insights"><Icon name="bell" size={19} /></Link>
          <button className="workspace-avatar" onClick={user ? () => router.push("/about") : openAuthModal}
            aria-label={user ? "About your workspace" : "Sign in"}>{user?.displayName?.charAt(0) || "P"}</button>
        </div>
      </header>
      {open && <div className="sidebar-overlay" onClick={() => { setOpen(false); toggle.current?.focus(); }} />}
      <aside ref={sidebar} id="workspace-sidebar" className={`workspace-sidebar ${open ? "mobile-open" : ""}`}
        role={open ? "dialog" : undefined} aria-modal={open ? true : undefined} aria-label="Your PayScope workspace">
        <div className="sidebar-brand-row">
          <Link href="/" onClick={() => setOpen(false)} aria-label="PayScope home"><PayScopeLogo size={34} /></Link>
          <button className="icon-button sidebar-close" aria-label="Close workspace menu" onClick={() => { setOpen(false); toggle.current?.focus(); }}><Icon name="close" size={18} /></button>
        </div>
        <div className="sidebar-workspace-card"><span className="sidebar-workspace-icon"><Icon name="wallet" size={19} /></span>
          <div><strong>Personal space</strong><span>Your money, made clear.</span></div><span className="workspace-presence" title="Personal workspace" /></div>
        <div className="sidebar-scroll-area" tabIndex={0} aria-label="Scrollable workspace navigation">
          <nav className="workspace-nav" aria-label="Workspace navigation">
            {groups.map((group) => <div className="workspace-nav-group" key={group.name}>
              <span className="workspace-label">{group.name}</span>
              {group.pages.map((page) => <Link key={page.href} href={page.href}
                prefetch={page.href === "/dashboard" || page.href === "/relationships"} onClick={() => setOpen(false)}
                className={pathname.startsWith(page.href) ? "active" : ""} aria-current={pathname.startsWith(page.href) ? "page" : undefined}>
                <span className="nav-icon"><Icon name={page.icon} size={18} /></span><span>{page.name}</span><span className="nav-active-mark" aria-hidden="true" />
              </Link>)}
            </div>)}
          </nav>
          <Link href="/privacy" className="sidebar-privacy-card" onClick={() => setOpen(false)}>
            <span className="sidebar-privacy-emblem"><Icon name="shield" size={23} /></span>
            <strong>A little peace of mind.</strong><p>Your data stays yours.<br />Clarity starts with a statement.</p>
            <span className="sidebar-privacy-link">Privacy, by design <Icon name="arrow" size={13} /></span>
          </Link>
        </div>
        <div className="sidebar-profile"><span className="workspace-avatar">{user?.displayName?.charAt(0) || "P"}</span>
          <span className="sidebar-profile-name">{user?.isDemo ? "Demo explorer" : user?.displayName || "Your workspace"}
            <small>{user?.isDemo ? "A little room to explore" : "Personal account"}</small></span>
          {user ? <button aria-label="Sign out" title="Sign out" onClick={async () => { await signOut(); router.push("/"); }}><Icon name="exit" size={17} /></button>
            : <button aria-label="Sign in" onClick={openAuthModal}><Icon name="arrow" size={16} /></button>}
        </div>
      </aside>
      {searchOpen && <PageSearch close={closeSearch} />}
    </>
  );
}
export default AppHeader;
