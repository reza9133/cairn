import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CONTRACT_ADDRESS, GENLAYER_URL, GITHUB_URL, X_HANDLE, X_URL } from "../config";
import { toggleTheme, useTheme } from "../lib/theme";
import Icon from "./Icon";
import Logo, { GenLayerMark } from "./Logo";
import { AddressChip } from "./ui";
import TxDialog from "./TxDialog";
import { NetworkBanner, NetworkModal, WalletButton, WalletModal } from "./Wallet";

const NAV = [
  { to: "/pools", label: "Pools" },
  { to: "/create", label: "Create" },
  { to: "/me", label: "My pools" },
  { to: "/ledger", label: "Ledger" },
  { to: "/docs", label: "Docs" },
];

export function ThemeToggle() {
  const theme = useTheme();
  return (
    <button className="themetoggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dim" : "light"} theme`} title={theme === "light" ? "Dim theme" : "Light theme"}>
      <span className={`themetoggle__knob ${theme === "dim" ? "is-dim" : ""}`}>
        <Icon name={theme === "light" ? "sun" : "moon"} size={15} />
      </span>
      <Icon name="sun" size={14} className="themetoggle__a" />
      <Icon name="moon" size={14} className="themetoggle__b" />
    </button>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  return (
    <header className="header">
      <div className="header__inner">
        <Logo />
        <nav className={`nav ${open ? "is-open" : ""}`} aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav__link ${isActive ? "is-active" : ""}`}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="header__right">
          <a className="iconbtn hide-sm" href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="Cairn on GitHub"><Icon name="github" size={18} /></a>
          <ThemeToggle />
          <WalletButton />
          <button className="iconbtn burger" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}><Icon name={open ? "close" : "menu"} size={20} /></button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Logo size={42} />
          <p>Commitment pools judged by an AI that can only be as generous as the pool allows.</p>
          <AddressChip address={CONTRACT_ADDRESS} label="Contract" />
        </div>
        <div className="footer__col">
          <h4>Product</h4>
          <NavLink to="/pools">Pools</NavLink>
          <NavLink to="/create">Create a pool</NavLink>
          <NavLink to="/me">My pools</NavLink>
          <NavLink to="/ledger">Ledger</NavLink>
        </div>
        <div className="footer__col">
          <h4>Learn</h4>
          <NavLink to="/docs/introduction">Introduction</NavLink>
          <NavLink to="/docs/quickstart">Quickstart</NavLink>
          <NavLink to="/docs/judge">The AI judge</NavLink>
          <NavLink to="/docs/reference">Contract reference</NavLink>
        </div>
        <div className="footer__col">
          <h4>Find us</h4>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"><Icon name="github" size={15} /> GitHub</a>
          <a href={X_URL} target="_blank" rel="noopener noreferrer"><Icon name="x" size={14} /> {X_HANDLE}</a>
          <a href={GENLAYER_URL} target="_blank" rel="noopener noreferrer"><GenLayerMark size={14} /> GenLayer</a>
        </div>
      </div>
      <div className="footer__base">
        <span>Testnet software on GenLayer Studionet. Not audited. Do not stake what you cannot lose.</span>
        <span className="footer__built"><GenLayerMark size={14} /> Built on GenLayer</span>
      </div>
    </footer>
  );
}

/** Cards with the "tilt" class lean towards the pointer (3D parallax). Skipped on touch screens and for reduced motion. */
function useTilt() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let current: HTMLElement | null = null;
    const reset = (el: HTMLElement | null) => { el?.style.setProperty("--rx", "0deg"); el?.style.setProperty("--ry", "0deg"); };
    const move = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(".tilt") as HTMLElement | null;
      if (current && current !== el) reset(current);
      current = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--ry", `${(x * 7).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-y * 7).toFixed(2)}deg`);
    };
    const leave = () => { reset(current); current = null; };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); };
  }, []);
}

export default function Layout() {
  useTilt();
  const loc = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, [loc.pathname]);
  return (
    <div className="app">
      <div className="bgfx" aria-hidden="true"><i className="bgfx__a" /><i className="bgfx__b" /><i className="bgfx__grid" /></div>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>Skip to content</a>
      <Header />
      <NetworkBanner />
      <main id="main" tabIndex={-1} className="main" key={loc.pathname.startsWith("/docs") ? "docs" : loc.pathname}>
        <Outlet />
      </main>
      <Footer />
      <WalletModal />
      <NetworkModal />
      <TxDialog />
    </div>
  );
}
