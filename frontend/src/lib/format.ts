import { CHAIN } from "../config";

const TEN18 = 10n ** 18n;

export function toBig(v: string | number | bigint | null | undefined): bigint {
  try {
    if (v === null || v === undefined || v === "") return 0n;
    return BigInt(v);
  } catch {
    return 0n;
  }
}

/** wei -> "0.0123" (no unit). Trailing zeros removed, at most `max` decimals (truncated, never rounded up). */
export function weiToGen(v: string | number | bigint | null | undefined, max = 6): string {
  const w = toBig(v);
  const neg = w < 0n;
  const abs = neg ? -w : w;
  const whole = abs / TEN18;
  let frac = (abs % TEN18).toString().padStart(18, "0").slice(0, max).replace(/0+$/, "");
  if (!frac && whole === 0n && abs > 0n) frac = "0".repeat(Math.max(0, max - 1)) + "1"; // tiny non-zero
  return `${neg ? "-" : ""}${whole.toLocaleString("en-US")}${frac ? "." + frac : ""}`;
}

export const fmtGen = (v: string | number | bigint | null | undefined, max = 6) => `${weiToGen(v, max)} ${CHAIN.currency.symbol}`;

/** "0.006" -> wei (bigint). Returns null for anything that is not a plain non-negative decimal with <= 18 decimals. */
export function parseGen(text: string): bigint | null {
  const t = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,18})?$/.test(t)) return null;
  const [w, f = ""] = t.split(".");
  return BigInt(w) * TEN18 + BigInt(f.padEnd(18, "0"));
}

export const shortAddr = (a: string, head = 6, tail = 4) => (a && a.length > head + tail + 2 ? `${a.slice(0, head)}…${a.slice(-tail)}` : a || "");
export const sameAddr = (a?: string | null, b?: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export function fmtDuration(totalSeconds: number, parts = 2): string {
  let s = Math.max(0, Math.round(totalSeconds));
  if (s === 0) return "0s";
  const units: [string, number][] = [["d", 86400], ["h", 3600], ["m", 60], ["s", 1]];
  const out: string[] = [];
  for (const [name, size] of units) {
    if (s >= size) {
      out.push(`${Math.floor(s / size)}${name}`);
      s %= size;
    }
    if (out.length >= parts) break;
  }
  return out.join(" ");
}

export function fmtDate(ts: number, withSeconds = false): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", ...(withSeconds ? { second: "2-digit" } : {}),
  });
}

export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return `${h ? h + ":" : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(r).padStart(2, "0")}`;
}

export const pct = (n: number, d: number) => (d > 0 ? Math.max(0, Math.min(100, (n / d) * 100)) : 0);
export const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Mirrors contracts/cairn.py::_public_url so the form can refuse an evidence page before sending a transaction. */
export function checkEvidenceUrl(url: string): string | null {
  const BAD_TLD = ["local", "localhost", "internal", "lan", "home", "corp", "intranet", "test", "invalid", "example", "onion", "arpa", "localdomain"];
  const BAD_SUFFIX = ["nip.io", "sslip.io", "xip.io", "localtest.me", "lvh.me", "traefik.me"];
  const msg = "The evidence must be a single public http(s) link (a real domain, no IP address, no login, no custom port).";
  if (!url) return "Paste the link of your public evidence page.";
  if (url.length > 300 || /[^\x21-\x7e]/.test(url)) return msg;
  const m = /^https?:\/\/([^/?#\s]+)([/?#]\S*)?$/.exec(url);
  if (!m) return msg;
  let host = m[1].toLowerCase();
  if (host.includes("@")) return msg;
  if (host.includes(":")) {
    const [h, port] = host.split(":");
    if (port !== "80" && port !== "443") return msg;
    host = h;
  }
  const labels = host.split(".");
  if (labels.length < 2 || !labels.every((x) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))) return msg;
  const tld = labels[labels.length - 1];
  if (!((/^[a-z]+$/.test(tld) && tld.length >= 2) || tld.startsWith("xn--"))) return msg;
  if (BAD_TLD.includes(tld)) return msg;
  for (let i = 0; i < labels.length - 3; i++) if (labels.slice(i, i + 4).every((x) => /^\d+$/.test(x))) return msg;
  if (BAD_SUFFIX.some((s) => host === s || host.endsWith("." + s))) return msg;
  return null;
}

export function isAddress(s: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(s.trim());
}
