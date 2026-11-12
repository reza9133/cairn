import { useSyncExternalStore } from "react";
import { decodeOutcome, submit, waitDecided, type TxSpec } from "./chain";
import { ensureReady, getActiveProvider, getWallet, isRejection, refreshBalance } from "./wallet";

export type TxStage = "idle" | "wallet" | "consensus" | "done" | "failed" | "rejected";

export interface TxState {
  open: boolean;
  minimized: boolean;
  stage: TxStage;
  spec: TxSpec | null;
  hash: string | null;
  startedAt: number;
  finishedAt: number;
  error: string | null;
  step?: string;
}
export interface TxResult { ok: boolean; hash?: string; cancelled?: boolean; error?: string }
export interface TxRecord { hash: string; label: string; status: "pending" | "ok" | "failed"; at: number }

const HISTORY = "cairn.tx.history";
const idle: TxState = { open: false, minimized: false, stage: "idle", spec: null, hash: null, startedAt: 0, finishedAt: 0, error: null };
let state: TxState = idle;
const listeners = new Set<() => void>();
const setTx = (p: Partial<TxState>) => { state = { ...state, ...p }; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export const useTx = (): TxState => useSyncExternalStore(subscribe, () => state, () => state);

/* ---- history (kept in this browser only) */
let history: TxRecord[] = (() => { try { return JSON.parse(localStorage.getItem(HISTORY) ?? "[]"); } catch { return []; } })();
const histListeners = new Set<() => void>();
function saveHistory() {
  history = history.slice(0, 12);
  try { localStorage.setItem(HISTORY, JSON.stringify(history)); } catch { /* ignore */ }
  histListeners.forEach((l) => l());
}
export const useTxHistory = (): TxRecord[] =>
  useSyncExternalStore((l) => { histListeners.add(l); return () => histListeners.delete(l); }, () => history, () => history);

export const dismissTx = () => setTx({ open: false });
export const minimizeTx = () => setTx({ minimized: true });
export const expandTx = () => setTx({ minimized: false, open: true });
export const dataChanged = () => window.dispatchEvent(new Event("cairn:data"));

/**
 * Runs one write call end to end: wallet check, signature, submission, consensus, outcome.
 * The dialog follows every step; the promise resolves when the network has decided (or the person said no).
 */
export async function runTx(spec: TxSpec): Promise<TxResult> {
  if (state.open && (state.stage === "wallet" || state.stage === "consensus")) {
    return { ok: false, cancelled: true, error: "Another transaction is still in progress." };
  }
  if (!(await ensureReady())) return { ok: false, cancelled: true };
  const w = getWallet();
  const provider = getActiveProvider();
  if (!provider || !w.account) return { ok: false, cancelled: true };

  setTx({ ...idle, open: true, stage: "wallet", spec, startedAt: Date.now() });
  let hash: string;
  try {
    hash = await submit(w.account, provider, spec);
  } catch (e) {
    if (isRejection(e)) {
      setTx({ stage: "rejected", finishedAt: Date.now(), error: "You rejected the request in your wallet. Nothing was sent." });
      return { ok: false, cancelled: true };
    }
    const msg = String((e as { shortMessage?: string })?.shortMessage ?? (e as Error)?.message ?? e).slice(0, 240);
    setTx({ stage: "failed", finishedAt: Date.now(), error: msg });
    return { ok: false, error: msg };
  }

  history = [{ hash, label: spec.label, status: "pending" as const, at: Date.now() }, ...history];
  saveHistory();
  setTx({ stage: "consensus", hash });

  try {
    const out = await waitDecided(hash);
    history = history.map((h) => (h.hash === hash ? { ...h, status: out.ok ? ("ok" as const) : ("failed" as const) } : h));
    saveHistory();
    setTx({ stage: out.ok ? "done" : "failed", finishedAt: Date.now(), error: out.ok ? null : out.message ?? "The contract refused this call." });
    refreshBalance();
    dataChanged();
    return out.ok ? { ok: true, hash } : { ok: false, hash, error: out.message };
  } catch (e) {
    const msg = /Timed out/i.test(String((e as Error)?.message)) ? "The network is taking longer than expected. The transaction may still be processed — check it in the explorer." : String((e as Error)?.message ?? e).slice(0, 240);
    history = history.map((h) => (h.hash === hash ? { ...h, status: "failed" as const } : h));
    saveHistory();
    setTx({ stage: "failed", finishedAt: Date.now(), error: msg });
    return { ok: false, hash, error: msg };
  }
}

export { decodeOutcome };
