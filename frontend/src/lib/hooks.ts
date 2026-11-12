import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> { data?: T; error?: Error; loading: boolean; reload: (silent?: boolean) => Promise<void> }

/**
 * Loads data and keeps it fresh: re-runs when `deps` change, every `interval` ms while the tab is visible,
 * and whenever a transaction finished (the "cairn:data" event).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], opts: { interval?: number; enabled?: boolean } = {}): AsyncState<T> {
  const { interval, enabled = true } = opts;
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({ loading: enabled });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const reload = useCallback(async (silent = false) => {
    const id = ++seq.current;
    if (!silent) setState((s) => ({ data: s.data, loading: true }));
    try {
      const data = await fnRef.current();
      if (id === seq.current) setState({ data, loading: false });
    } catch (e) {
      if (id === seq.current) setState((s) => ({ data: s.data, error: e as Error, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false });
      return;
    }
    setState({ loading: true });
    reload(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  useEffect(() => {
    if (!interval || !enabled) return;
    const id = window.setInterval(() => { if (!document.hidden) reload(true); }, interval);
    return () => window.clearInterval(id);
  }, [interval, enabled, reload]);

  useEffect(() => {
    if (!enabled) return;
    const h = () => reload(true);
    window.addEventListener("cairn:data", h);
    return () => window.removeEventListener("cairn:data", h);
  }, [enabled, reload]);

  return { ...state, reload };
}

export function useCopy(timeout = 1400): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    const done = () => { setCopied(true); window.setTimeout(() => setCopied(false), timeout); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, done);
    else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      ta.remove();
      done();
    }
  }, [timeout]);
  return [copied, copy];
}

export function useReveal<T extends HTMLElement>(): React.RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { el.classList.add("in"); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

export function usePrefersReducedMotion(): boolean {
  const [r, setR] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const h = () => setR(mq.matches);
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, []);
  return r;
}
