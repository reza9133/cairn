// A stand-in for genlayer-js that talks to the local rehearsal server (tests/direct/test_rehearsal.py).
// The server runs the real contract code in the GenVM direct runner, so the live script can be rehearsed offline.
import { createHash } from "node:crypto";

const URL_ = process.env.REHEARSAL_URL;
const real = () => globalThis.__realFetch;
const vnow = () => Math.floor(Date.now() / 1000);
const advance = (s) => {
  if (typeof globalThis.__advance === "function") globalThis.__advance(s);
};
const encode = (_k, v) => (typeof v === "bigint" ? { $big: v.toString() } : v);
async function post(body) {
  const res = await real()(URL_, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, now: vnow() }, encode) });
  return res.json();
}

export function createAccount(key) {
  return { key, address: "0x" + createHash("sha256").update(String(key)).digest("hex").slice(0, 40) };
}

export function createClient({ account } = {}) {
  const sender = account?.address;
  return {
    async readContract({ functionName, args = [] }) {
      const r = await post({ op: "read", fn: functionName, args });
      if (r.error) throw new Error(r.error);
      return r.result;
    },
    async writeContract({ functionName, args = [], value }) {
      advance(4);
      const r = await post({ op: "write", fn: functionName, args, sender, value: value ?? 0n });
      if (r.error) throw new Error(r.error);
      return r.hash;
    },
    async deployContract({ args = [] }) {
      advance(4);
      const r = await post({ op: "deploy", args, sender });
      if (r.error) throw new Error(r.error);
      return r.hash;
    },
    async waitForDecision({ hash }) {
      advance(25); // what a decision takes on the real network
      const r = await post({ op: "receipt", hash });
      if (r.error) throw new Error(r.error);
      return r.receipt;
    },
  };
}
