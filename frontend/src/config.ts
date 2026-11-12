// Central configuration. Change a value here and the whole site follows.

/** The deployed Cairn contract on GenLayer Studionet. Override with VITE_CAIRN_ADDRESS at build time. */
export const CONTRACT_ADDRESS: string =
  (import.meta.env.VITE_CAIRN_ADDRESS as string | undefined)?.trim() || "0x6a5413E33cDE24E7C2d84d8df134D6a47328f935";

export const GITHUB_URL = "https://github.com/reza9133/cairn";
export const X_URL = "https://x.com/amirhp771";
export const X_HANDLE = "@amirhp771";
export const GENLAYER_URL = "https://www.genlayer.com";
export const GENLAYER_DOCS_URL = "https://docs.genlayer.com";

/** GenLayer Studionet, exactly as genlayer-js defines it (chain id 61999). */
export const CHAIN = {
  id: 61999,
  hex: "0xf22f",
  name: "GenLayer Studionet",
  rpc: (import.meta.env.VITE_STUDIONET_RPC as string | undefined)?.trim() || "https://studio.genlayer.com/api",
  explorer: "https://genlayer-explorer.vercel.app",
  currency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
} as const;

export const explorerAddress = (addr: string) => `${CHAIN.explorer}/address/${addr}`;
export const explorerTx = (hash: string) => `${CHAIN.explorer}/transactions/${hash}`;

/** Limits of the contract (see contracts/cairn.py). The forms validate with the same numbers. */
export const LIMITS = {
  title: [3, 60],
  rules: [20, 1200],
  claim: [12, 300],
  reason: [12, 300],
  rounds: [2, 14],
  entrants: [2, 12],
  roundLen: [60, 30 * 86400],
  startsIn: [60, 30 * 86400],
  grace: [0, 7 * 86400],
  review: [600, 30 * 86400],
  dispute: [120, 7 * 86400],
  doubt: [0, 100],
  minSliceWei: 10n ** 15n,
  maxStakeWei: 10n ** 24n,
  maxUrl: 300,
} as const;

export const DEFAULTS = { grace: 600, review: 3 * 86400, dispute: 3600, doubt: 35 } as const;
export const BOND_BPS = 2000n;
export const MIN_BOND_WEI = 10n ** 15n;
export const REWARD_BPS = 2500n;
export const BPS = 10000n;
export const AUDIT_PATIENCE = 86400;

export const KNOWN_CHAINS: Record<number, string> = {
  1: "Ethereum Mainnet",
  10: "OP Mainnet",
  56: "BNB Smart Chain",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum One",
  11155111: "Sepolia",
  84532: "Base Sepolia",
  61999: "GenLayer Studionet",
};
