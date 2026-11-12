import { CHAIN, CONTRACT_ADDRESS } from "../config";
import { CONTRACT_ERRORS } from "./errors";
import type { EIP1193Provider } from "./wallet";

/* ------------------------------------------------------------------------------------------------------------------
 * Everything that talks to the Cairn contract goes through here, using genlayer-js (loaded lazily so that the
 * first paint of the site does not wait for it).
 * ------------------------------------------------------------------------------------------------------------------ */

type AnyClient = any; // genlayer-js ships very large generic types; the calls below are narrow and checked at runtime.

let sdkP: Promise<{ sdk: typeof import("genlayer-js"); studionet: any }> | null = null;
const loadSdk = () =>
  (sdkP ??= Promise.all([import("genlayer-js"), import("genlayer-js/chains")]).then(([sdk, chains]) => ({ sdk, studionet: (chains as any).studionet })));

let readerP: Promise<AnyClient> | null = null;
export function reader(): Promise<AnyClient> {
  return (readerP ??= loadSdk().then(({ sdk, studionet }) => sdk.createClient({ chain: studionet, endpoint: CHAIN.rpc })));
}

/** Calls a view of the contract. Every Cairn view returns JSON text, which is parsed here. */
export async function read<T>(fn: string, args: unknown[] = []): Promise<T> {
  const client = await reader();
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await client.readContract({ address: CONTRACT_ADDRESS, functionName: fn, args });
      return JSON.parse(String(raw)) as T;
    } catch (e) {
      lastErr = e;
      if (/No such (pool|round)|not a member|not a valid address/i.test(String((e as Error)?.message ?? e))) break;
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  throw friendlyReadError(lastErr);
}

function friendlyReadError(e: unknown): Error {
  const text = String((e as Error)?.message ?? e);
  const known = findKnownError(text);
  if (known) return new Error(known);
  if (/fetch|network|Failed to|CORS|ECONN|timeout/i.test(text)) return new Error("Cannot reach GenLayer Studionet right now. Check your connection and try again.");
  return new Error(text.slice(0, 220));
}

/* --------------------------------------------------------- writing */

export interface TxSpec {
  label: string;
  fn: string;
  args: unknown[];
  value?: bigint;
  /** extra line for the dialog (for example "This asks the AI judge and can take a few minutes") */
  note?: string;
  slow?: boolean;
}

/** Signs and sends one transaction with the wallet the person connected; resolves to the transaction hash. */
export async function submit(account: string, provider: EIP1193Provider, spec: TxSpec): Promise<string> {
  const { sdk, studionet } = await loadSdk();
  const client: AnyClient = sdk.createClient({ chain: studionet, endpoint: CHAIN.rpc, account: account as `0x${string}`, provider: provider as never });
  const call: Record<string, unknown> = { address: CONTRACT_ADDRESS, functionName: spec.fn, args: spec.args };
  if (spec.value && spec.value > 0n) call.value = spec.value;
  return String(await client.writeContract(call));
}

export interface Outcome {
  ok: boolean;
  known: boolean;
  status: string;
  message?: string;
}

const replacer = (_k: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v);
function dump(v: unknown): string {
  try {
    return JSON.stringify(v ?? null, replacer) ?? "";
  } catch {
    return String(v);
  }
}
const FAIL = /ERROR|REVERT|FAIL|ROLLBACK/i;
const PASS = /RETURN|SUCCESS/i;
const BAD_STATUS = /UNDETERMINED|TIMEOUT|CANCEL/i;

export function findKnownError(text: string): string | null {
  const hit = CONTRACT_ERRORS.find((m) => text.includes(m));
  if (hit) return hit;
  const m = /UserError[^A-Za-z0-9]{0,12}([A-Z][^"\\\n]{8,200})/.exec(text);
  return m ? m[1].trim() : null;
}

/** Reads the result of a decided transaction without depending on one exact receipt shape (same idea as scripts/receipt.mjs). */
export function decodeOutcome(receipt: any): Outcome {
  const named: string = receipt?.statusName ?? receipt?.status_name ?? "";
  const leader = receipt?.consensus_data?.leader_receipt?.[0] ?? receipt?.data?.leader_receipt?.[0] ?? receipt?.leader_receipt?.[0];
  const text = dump(receipt);
  if (BAD_STATUS.test(named)) {
    return { ok: false, known: true, status: named, message: "The validators could not agree on this call, so nothing changed. Please try again in a moment." };
  }
  const direct = [receipt?.txExecutionResultName, receipt?.resultName, leader?.execution_result, leader?.result?.status];
  for (const v of direct) {
    if (typeof v !== "string" || !v) continue;
    if (FAIL.test(v)) return { ok: false, known: true, status: `${named || "decided"} / ${v}`, message: findKnownError(dump(leader ?? receipt)) ?? "The contract refused this call." };
    if (PASS.test(v)) return { ok: true, known: true, status: `${named || "decided"} / ${v}` };
  }
  if (/FINISHED_WITH_ERROR|"execution_result"\s*:\s*"ERROR"/.test(text)) return { ok: false, known: true, status: `${named || "decided"} / error`, message: findKnownError(text) ?? "The contract refused this call." };
  if (/FINISHED_WITH_RETURN|"execution_result"\s*:\s*"SUCCESS"/.test(text)) return { ok: true, known: true, status: `${named || "decided"} / success` };
  return { ok: false, known: false, status: named || "decided", message: findKnownError(text) ?? "The network decided this transaction, but the receipt has no readable result. Open it in the explorer to check." };
}

export async function waitDecided(hash: string): Promise<Outcome> {
  const client = await reader();
  const receipt = await client.waitForTransactionReceipt({ hash, status: "ACCEPTED", retries: 600, interval: 3000 });
  return decodeOutcome(receipt);
}

/** After create_pool: the newest pool of this address is the one that was just created. */
export async function newestPoolOf(address: string): Promise<number | null> {
  const rows = await read<{ id: number }[]>("pools_of", [address, 0, 1]);
  return rows.length ? rows[0].id : null;
}
