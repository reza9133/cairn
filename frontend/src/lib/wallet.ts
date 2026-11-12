import { useSyncExternalStore } from "react";
import { CHAIN, KNOWN_CHAINS } from "../config";
import { balanceOf } from "./rpc";

/* ------------------------------------------------------------------------------------------------------------------
 * Wallet layer: EIP-6963 multi injected provider discovery + EIP-1193 requests.
 *
 *  - wallets announce themselves with `eip6963:announceProvider`; we ask them with `eip6963:requestProvider`
 *  - connect  = eth_requestAccounts on the wallet the person picked (never window.ethereum guesswork)
 *  - disconnect = forget the wallet here + wallet_revokePermissions where the wallet supports it
 *  - network  = wallet_switchEthereumChain, falling back to wallet_addEthereumChain for GenLayer Studionet
 * ------------------------------------------------------------------------------------------------------------------ */

export interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
  on?(event: string, handler: (...args: any[]) => void): void;
  removeListener?(event: string, handler: (...args: any[]) => void): void;
}
export interface WalletInfo { uuid: string; name: string; icon: string; rdns: string }
export interface WalletDetail { info: WalletInfo; provider: EIP1193Provider }

export interface WalletState {
  providers: WalletDetail[];
  status: "disconnected" | "connecting" | "connected";
  wallet: WalletInfo | null;
  account: string | null;
  chainId: number | null;
  balance: bigint | null;
  switching: boolean;
  error: string | null;
  connectOpen: boolean;
  networkOpen: boolean;
  discovered: boolean;
}

const LAST = "cairn.wallet.rdns";
const AUTO = "cairn.wallet.auto";

const GENERIC_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='#6a5af0'/><path d='M8 12.5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3V21a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3Z' fill='none' stroke='#fff' stroke-width='1.8'/><circle cx='20' cy='16.8' r='1.6' fill='#fff'/></svg>`,
  );

let state: WalletState = {
  providers: [],
  status: "disconnected",
  wallet: null,
  account: null,
  chainId: null,
  balance: null,
  switching: false,
  error: null,
  connectOpen: false,
  networkOpen: false,
  discovered: false,
};
const listeners = new Set<() => void>();
const set = (patch: Partial<WalletState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
export const getWallet = () => state;
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useWallet = (): WalletState => useSyncExternalStore(subscribe, getWallet, getWallet);

let active: { detail: WalletDetail; onAccounts: (a: string[]) => void; onChain: (c: string) => void; onDisconnect: () => void } | null = null;
export const getActiveProvider = (): EIP1193Provider | null => active?.detail.provider ?? null;

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* private mode */ } },
};

export const chainName = (id: number | null) => (id === null ? "unknown network" : KNOWN_CHAINS[id] ?? `chain ${id}`);
export const onRightChain = (s: WalletState = state) => s.status === "connected" && s.chainId === CHAIN.id;

function errCode(e: unknown): number | undefined {
  const x = e as { code?: number; error?: { code?: number }; data?: { originalError?: { code?: number } } };
  return x?.code ?? x?.error?.code ?? x?.data?.originalError?.code;
}
export const isRejection = (e: unknown) => errCode(e) === 4001 || /user (rejected|denied)|rejected the request|request rejected/i.test(String((e as Error)?.message ?? e));
function errText(e: unknown): string {
  const x = e as { shortMessage?: string; message?: string };
  return String(x?.shortMessage ?? x?.message ?? e).slice(0, 220);
}

/* --------------------------------------------------------- discovery */

function addProvider(detail: WalletDetail) {
  if (!detail?.info?.uuid || !detail.provider) return;
  if (state.providers.some((p) => p.info.uuid === detail.info.uuid)) return;
  set({ providers: [...state.providers, detail].sort((a, b) => a.info.name.localeCompare(b.info.name)) });
  maybeAutoConnect();
}

let started = false;
export function initWallet() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("eip6963:announceProvider", ((e: CustomEvent<WalletDetail>) => addProvider(e.detail)) as EventListener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  // Wallets that do not speak EIP-6963 yet are still offered, but only after the announcements had time to arrive.
  window.setTimeout(() => {
    const legacy = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
    if (legacy && !state.providers.length) {
      addProvider({ info: { uuid: "legacy-injected", name: "Browser wallet", icon: GENERIC_ICON, rdns: "injected" }, provider: legacy });
    }
    set({ discovered: true });
    maybeAutoConnect();
  }, 700);
}

/** Ask the wallets again (the "refresh" button in the connect dialog). */
export function rescanWallets() {
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

let autoTried = false;
async function maybeAutoConnect() {
  if (autoTried || state.status !== "disconnected") return;
  if (store.get(AUTO) === "0") return;
  const last = store.get(LAST);
  if (!last) return;
  const detail = state.providers.find((p) => p.info.rdns === last);
  if (!detail) return;
  autoTried = true;
  try {
    const accounts = (await detail.provider.request({ method: "eth_accounts" })) as string[];
    if (accounts?.length) await finishConnect(detail, accounts[0]);
  } catch {
    /* silent: the person can connect by hand */
  }
}

/* --------------------------------------------------------- connect / disconnect */

async function finishConnect(detail: WalletDetail, account: string) {
  detach();
  const chainHex = (await detail.provider.request({ method: "eth_chainId" })) as string;
  const chainId = parseInt(chainHex, 16);
  const onAccounts = (accs: string[]) => {
    if (!accs?.length) {
      hardReset();
    } else {
      set({ account: accs[0] });
      refreshBalance();
    }
  };
  const onChain = (hex: string) => {
    const id = parseInt(hex, 16);
    set({ chainId: id, networkOpen: id !== CHAIN.id ? state.networkOpen : false });
    refreshBalance();
  };
  const onDisconnect = () => hardReset();
  detail.provider.on?.("accountsChanged", onAccounts);
  detail.provider.on?.("chainChanged", onChain);
  detail.provider.on?.("disconnect", onDisconnect);
  active = { detail, onAccounts, onChain, onDisconnect };
  store.set(LAST, detail.info.rdns);
  store.set(AUTO, "1");
  set({ status: "connected", wallet: detail.info, account, chainId, error: null, connectOpen: false, networkOpen: chainId !== CHAIN.id });
  refreshBalance();
}

function detach() {
  if (!active) return;
  const { detail, onAccounts, onChain, onDisconnect } = active;
  detail.provider.removeListener?.("accountsChanged", onAccounts);
  detail.provider.removeListener?.("chainChanged", onChain);
  detail.provider.removeListener?.("disconnect", onDisconnect);
  active = null;
}

function hardReset() {
  detach();
  set({ status: "disconnected", wallet: null, account: null, chainId: null, balance: null, switching: false, networkOpen: false });
}

export async function connect(uuid: string): Promise<void> {
  const detail = state.providers.find((p) => p.info.uuid === uuid);
  if (!detail) {
    set({ error: "That wallet is no longer available. Refresh the list and try again." });
    return;
  }
  set({ status: "connecting", error: null });
  try {
    const accounts = (await detail.provider.request({ method: "eth_requestAccounts" })) as string[];
    if (!accounts?.length) throw new Error("The wallet returned no account.");
    await finishConnect(detail, accounts[0]);
  } catch (e) {
    set({ status: "disconnected", error: isRejection(e) ? "You closed the connection request in your wallet." : errText(e) });
  }
}

export async function disconnect(): Promise<void> {
  const provider = active?.detail.provider;
  hardReset();
  store.set(AUTO, "0");
  store.del(LAST);
  autoTried = true;
  set({ error: null });
  try {
    // Not every wallet knows this method; where it exists it really removes the site's permission.
    await provider?.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] });
  } catch {
    /* the site is disconnected on our side either way */
  }
}

export async function refreshBalance(): Promise<void> {
  const a = state.account;
  if (!a) return;
  try {
    const b = await balanceOf(a);
    if (state.account === a) set({ balance: b });
  } catch {
    /* the balance is a convenience */
  }
}

/* --------------------------------------------------------- network */

export async function switchNetwork(): Promise<boolean> {
  const provider = active?.detail.provider;
  if (!provider) return false;
  set({ switching: true, error: null });
  try {
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN.hex }] });
    } catch (e) {
      const code = errCode(e);
      const msg = String((e as Error)?.message ?? "");
      if (code === 4902 || code === -32603 || /unrecognized|not added|add (this )?chain|Unknown chain/i.test(msg)) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: CHAIN.hex,
            chainName: CHAIN.name,
            nativeCurrency: CHAIN.currency,
            rpcUrls: [CHAIN.rpc],
            blockExplorerUrls: [CHAIN.explorer],
          }],
        });
      } else {
        throw e;
      }
    }
    const hex = (await provider.request({ method: "eth_chainId" })) as string;
    const id = parseInt(hex, 16);
    set({ chainId: id, switching: false, networkOpen: id !== CHAIN.id });
    refreshBalance();
    return id === CHAIN.id;
  } catch (e) {
    set({ switching: false, error: isRejection(e) ? "You closed the network request in your wallet." : errText(e) });
    return false;
  }
}

/* --------------------------------------------------------- dialogs + guard */

export const openConnect = () => { rescanWallets(); set({ connectOpen: true, error: null }); };
export const closeConnect = () => set({ connectOpen: false, error: null });
export const openNetwork = () => set({ networkOpen: true, error: null });
export const closeNetwork = () => set({ networkOpen: false, error: null });

/** Call before every write: opens the right dialog and returns false when a transaction cannot be sent yet. */
export async function ensureReady(): Promise<boolean> {
  if (state.status !== "connected") {
    openConnect();
    return false;
  }
  if (state.chainId !== CHAIN.id) {
    const ok = await switchNetwork();
    if (!ok) openNetwork();
    return ok;
  }
  return true;
}
