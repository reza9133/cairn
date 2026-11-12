import { useSyncExternalStore } from "react";

export type Theme = "light" | "dim";
const KEY = "cairn.theme";

function initial(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dim") return saved;
  } catch { /* ignore */ }
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dim" : "light";
}

let theme: Theme = typeof document !== "undefined" ? ((document.documentElement.dataset.theme as Theme) || initial()) : "light";
const listeners = new Set<() => void>();

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.documentElement.style.colorScheme = t === "dim" ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", t === "dim" ? "#1b2038" : "#f6f4ee");
}
if (typeof document !== "undefined") apply(theme);

export function setTheme(t: Theme) {
  theme = t;
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  apply(t);
  listeners.forEach((l) => l());
}
export const toggleTheme = () => setTheme(theme === "light" ? "dim" : "light");
export const useTheme = (): Theme =>
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => theme, () => "light" as Theme);
