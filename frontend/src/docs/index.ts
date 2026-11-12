import type { IconName } from "../components/Icon";
import introduction from "./introduction.md?raw";
import quickstart from "./quickstart.md?raw";
import wallet from "./wallet.md?raw";
import lifecycle from "./lifecycle.md?raw";
import money from "./money.md?raw";
import judge from "./judge.md?raw";
import disputes from "./disputes.md?raw";
import reference from "./reference.md?raw";
import limits from "./limits.md?raw";
import errors from "./errors.md?raw";
import security from "./security.md?raw";
import run from "./run.md?raw";
import frontend from "./frontend.md?raw";
import faq from "./faq.md?raw";

export interface DocPage { slug: string; title: string; group: string; summary: string; icon: IconName; body?: string; custom?: "calculator" }

export const DOCS: DocPage[] = [
  { slug: "introduction", title: "Introduction", group: "Getting started", summary: "What Cairn is and the idea in one minute.", icon: "book", body: introduction },
  { slug: "quickstart", title: "Quickstart", group: "Getting started", summary: "Create, join, claim, judge and settle a pool on this site.", icon: "zap", body: quickstart },
  { slug: "wallet", title: "Wallet & network", group: "Getting started", summary: "EIP-6963 wallet discovery, connecting, disconnecting and switching to Studionet.", icon: "wallet", body: wallet },
  { slug: "lifecycle", title: "Lifecycle & timing", group: "Concepts", summary: "Phases of a pool and every moment of a round.", icon: "clock", body: lifecycle },
  { slug: "money", title: "Money rules", group: "Concepts", summary: "Slices, the pot, bonds, rewards and exact payouts.", icon: "coins", body: money },
  { slug: "judge", title: "The AI judge", group: "Concepts", summary: "What the model sees, what it can say and why it can only withhold.", icon: "scale", body: judge },
  { slug: "disputes", title: "Contests, audits & referee", group: "Concepts", summary: "How a judgement is challenged and how a pool never gets stuck.", icon: "gavel", body: disputes },
  { slug: "reference", title: "Contract reference", group: "Reference", summary: "Every write method, every view and the JSON they return.", icon: "terminal", body: reference },
  { slug: "limits", title: "Limits & numbers", group: "Reference", summary: "Ranges, defaults and enumerations used by the contract.", icon: "list", body: limits },
  { slug: "errors", title: "Errors", group: "Reference", summary: "Every refusal the contract can raise and what to do about it.", icon: "alert", body: errors },
  { slug: "calculator", title: "Calculators", group: "Reference", summary: "Try the payout arithmetic and a round-by-round schedule.", icon: "spark", custom: "calculator" },
  { slug: "security", title: "Trade-offs & security", group: "Guides", summary: "What the design protects against and what it cannot.", icon: "shield", body: security },
  { slug: "run", title: "Run & test the contract", group: "Guides", summary: "Setup, local tests, the rehearsal and the live Studionet run.", icon: "terminal", body: run },
  { slug: "frontend", title: "This website", group: "Guides", summary: "Configuration, build, deploy and how the app is organised.", icon: "layers", body: frontend },
  { slug: "faq", title: "FAQ", group: "Guides", summary: "Short answers to common questions.", icon: "info", body: faq },
];

export const GROUPS = ["Getting started", "Concepts", "Reference", "Guides"];
