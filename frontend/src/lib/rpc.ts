import { CHAIN } from "../config";

/** Minimal JSON-RPC call against the public Studionet endpoint (no wallet involved). */
export async function rpc<T = unknown>(method: string, params: unknown[] = []): Promise<{ result: T; date: string | null }> {
  const res = await fetch(CHAIN.rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message ?? JSON.stringify(body.error));
  return { result: body.result as T, date: res.headers.get("date") };
}

export async function balanceOf(address: string): Promise<bigint> {
  const { result } = await rpc<string>("eth_getBalance", [address, "latest"]);
  return BigInt(result);
}
