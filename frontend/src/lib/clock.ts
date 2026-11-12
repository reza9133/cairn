import { useEffect, useState } from "react";
import { rpc } from "./rpc";

/**
 * The contract judges deadlines by chain time. The browser clock is usually within a few seconds of it, but
 * when the node tells us the time (HTTP Date header or the latest block) we use that difference as an offset.
 */
let offset = 0;
let synced = false;

export async function syncClock(): Promise<void> {
  try {
    const { date } = await rpc("eth_chainId");
    const ms = date ? Date.parse(date) : NaN;
    if (Number.isFinite(ms)) {
      const off = Math.round(ms / 1000) - Math.floor(Date.now() / 1000);
      if (Math.abs(off) <= 86400) {
        offset = off;
        synced = true;
      }
    }
  } catch {
    /* keep the local clock */
  }
}

export const netNow = () => Math.floor(Date.now() / 1000) + offset;
export const clockSynced = () => synced;

/** Seconds since the epoch on the network clock, re-rendered every `ms`. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(netNow());
  useEffect(() => {
    const id = window.setInterval(() => setNow(netNow()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
