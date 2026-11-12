import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { explorerAddress } from "../config";
import { useCopy } from "../lib/hooks";
import { fmtClock, fmtDuration, shortAddr } from "../lib/format";
import { useNow } from "../lib/clock";
import { phaseHint, phaseLabel } from "../lib/pool";
import type { Phase } from "../lib/types";
import Icon from "./Icon";
import Mochi from "./Mochi";
import { Ring } from "./Spinner";

export function Button({ children, variant = "primary", size = "md", busy = false, disabled, className = "", icon, ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "soft" | "danger" | "quiet"; size?: "sm" | "md" | "lg"; busy?: boolean; icon?: Parameters<typeof Icon>[0]["name"] }) {
  return (
    <button className={`btn btn--${variant} btn--${size} ${className}`} disabled={disabled || busy} aria-busy={busy} {...rest}>
      {busy ? <Ring size={size === "sm" ? 13 : 16} /> : icon ? <Icon name={icon} size={size === "sm" ? 15 : 17} /> : null}
      <span>{children}</span>
    </button>
  );
}

export function LinkButton({ to, children, variant = "primary", size = "md", icon, external = false }: { to: string; children: ReactNode; variant?: "primary" | "ghost" | "soft"; size?: "sm" | "md" | "lg"; icon?: Parameters<typeof Icon>[0]["name"]; external?: boolean }) {
  const inner = (<>{icon && <Icon name={icon} size={size === "sm" ? 15 : 17} />}<span>{children}</span></>);
  return external
    ? <a className={`btn btn--${variant} btn--${size}`} href={to} target="_blank" rel="noopener noreferrer">{inner}</a>
    : <Link className={`btn btn--${variant} btn--${size}`} to={to}>{inner}</Link>;
}

export function PhaseBadge({ phase }: { phase: Phase }) {
  return <span className={`badge badge--${phase}`} title={phaseHint[phase]}><i />{phaseLabel[phase]}</span>;
}

export function Tag({ children, tone = "neutral", title }: { children: ReactNode; tone?: "neutral" | "teal" | "gold" | "violet" | "red" | "green"; title?: string }) {
  return <span className={`tag tag--${tone}`} title={title}>{children}</span>;
}

export function AddressChip({ address, label, link = true }: { address: string; label?: string; link?: boolean }) {
  const [copied, copy] = useCopy();
  if (!address) return <span className="muted">—</span>;
  return (
    <span className="addr">
      {label && <em>{label}</em>}
      {link ? <a href={explorerAddress(address)} target="_blank" rel="noopener noreferrer" title={address}>{shortAddr(address)}</a> : <span title={address}>{shortAddr(address)}</span>}
      <button type="button" className="addr__copy" onClick={() => copy(address)} aria-label="Copy address">
        <Icon name={copied ? "check" : "copy"} size={13} />
      </button>
    </span>
  );
}

/** Time left until `at`, ticking every second on the network clock. */
export function Countdown({ at, prefix, done = "now", clock = false }: { at: number; prefix?: string; done?: string; clock?: boolean }) {
  const now = useNow();
  const left = at - now;
  return <span className="countdown">{prefix && <em>{prefix} </em>}{left <= 0 ? done : clock ? fmtClock(left) : fmtDuration(left)}</span>;
}

export function Skeleton({ h = 16, w = "100%", r = 8, className = "" }: { h?: number; w?: number | string; r?: number; className?: string }) {
  return <span className={`skeleton ${className}`} style={{ height: h, width: w, borderRadius: r }} />;
}

export function EmptyState({ title, children, action, mochi = true }: { title: string; children?: ReactNode; action?: ReactNode; mochi?: boolean }) {
  return (
    <div className="empty">
      {mochi && <Mochi size={150} float tilt={false} />}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Could not load this from Studionet" }: { error: Error; onRetry?: () => void; title?: string }) {
  return (
    <div className="errorbox" role="alert">
      <Icon name="alert" size={22} />
      <div>
        <strong>{title}</strong>
        <p>{error.message}</p>
      </div>
      {onRetry && <Button variant="soft" size="sm" icon="refresh" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Notice({ tone = "info", children, title }: { tone?: "info" | "warn" | "ok" | "error"; children: ReactNode; title?: string }) {
  return (
    <div className={`notice notice--${tone}`} role={tone === "error" ? "alert" : "note"}>
      <Icon name={tone === "ok" ? "check" : tone === "info" ? "info" : "alert"} size={18} />
      <div>{title && <strong>{title}</strong>}<div>{children}</div></div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false, locked = false, icon }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean; locked?: boolean; icon?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    document.body.classList.add("modal-open");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !locked) onClose(); };
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
      prev?.focus?.();
    };
  }, [open, locked, onClose]);
  if (!open) return null;
  return (
    <div className="modal" role="presentation">
      <div className="modal__backdrop" onClick={() => !locked && onClose()} />
      <div className={`modal__card ${wide ? "is-wide" : ""}`} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} tabIndex={-1} ref={ref}>
        <header className="modal__head">
          {icon}
          <h2>{title}</h2>
          {!locked && <button className="iconbtn" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>}
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, hint, error, children, counter }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; counter?: ReactNode }) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span className="field__label"><b>{label}</b>{counter && <small>{counter}</small>}</span>
      {children}
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: Parameters<typeof Icon>[0]["name"] }) {
  return (
    <div className="stat">
      {icon && <Icon name={icon} size={18} className="stat__icon" />}
      <span className="stat__label">{label}</span>
      <strong className="stat__value">{value}</strong>
      {sub && <span className="stat__sub">{sub}</span>}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="sectiontitle">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </header>
  );
}
