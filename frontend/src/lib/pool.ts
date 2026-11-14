import { AUDIT_PATIENCE } from "../config";
import { sameAddr } from "./format";
import type { Member, Phase, Pool, Round } from "./types";

/* Pure helpers that mirror the rules of contracts/cairn.py, so the interface can say what is possible and why. */

export const openAt = (p: Pick<Pool, "start_at" | "round_len">, r: number) => p.start_at + r * p.round_len;
export const closeAt = (p: Pick<Pool, "start_at" | "round_len">, r: number) => p.start_at + (r + 1) * p.round_len;
export const claimUntil = (p: Pick<Pool, "start_at" | "round_len" | "grace">, r: number) => closeAt(p, r) + p.grace;

/** The round that is open at `now` (claims accepted, round not yet closed), or -1. */
export function currentRound(p: Pool, now: number): number {
  if (now < p.start_at || now >= p.end_at) return -1;
  return Math.min(p.rounds - 1, Math.floor((now - p.start_at) / p.round_len));
}

/** Rounds in which a claim can still be filed right now (a round stays claimable during its grace time). */
export function claimableRounds(p: Pool, now: number): number[] {
  const out: number[] = [];
  for (let r = 0; r < p.rounds; r++) if (now >= openAt(p, r) && now < claimUntil(p, r)) out.push(r);
  return out;
}

export const phaseLabel: Record<Phase, string> = {
  joining: "Joining",
  failed: "Not enough members",
  running: "Running",
  finishing: "Finishing",
  settled: "Settled",
  cancelled: "Called off",
};

export const phaseHint: Record<Phase, string> = {
  joining: "Members can join until the start time.",
  failed: "Too few members joined. Anyone can call the pool off and every stake goes back.",
  running: "Rounds are being played: members file claims.",
  finishing: "All rounds closed. Judgements and disputes are being finalised.",
  settled: "The stakes were shared out.",
  cancelled: "The pool never ran. Every stake went back.",
};

export type MarkKind = "none" | "late" | "claimed" | "passed" | "missed" | "passed-final" | "missed-final";
export interface MarkInfo { kind: MarkKind; label: string; short: string }

export function markInfo(ch: string): MarkInfo {
  switch (ch) {
    case ".": return { kind: "none", label: "No claim yet (the round has not been claimed)", short: "open" };
    case "_": return { kind: "late", label: "No claim and the time to claim is over: a final miss", short: "missed" };
    case "c": return { kind: "claimed", label: "Claimed, waiting for the AI judge", short: "claimed" };
    case "p": return { kind: "passed", label: "Judged credited, still open to contest", short: "credited" };
    case "m": return { kind: "missed", label: "Judged missed, still open to contest", short: "missed" };
    case "P": return { kind: "passed-final", label: "Credited and final", short: "credited" };
    case "M": return { kind: "missed-final", label: "Missed and final", short: "missed" };
    default: return { kind: "none", label: "Unknown", short: "?" };
  }
}

export const isCredited = (ch: string) => ch === "p" || ch === "P";

export interface Role { organizer: boolean; referee: boolean; member: Member | null; left: boolean }
export function roleOf(p: Pool, account: string | null): Role {
  if (!account) return { organizer: false, referee: false, member: null, left: false };
  const entry = p.members.find((m) => sameAddr(m.who, account));
  return {
    organizer: sameAddr(p.organizer, account),
    referee: !!p.referee && sameAddr(p.referee, account),
    member: entry && !entry.left ? entry : null,
    left: !!entry?.left,
  };
}

export interface ActionState { enabled: boolean; reason?: string }
const yes: ActionState = { enabled: true };
const no = (reason: string): ActionState => ({ enabled: false, reason });

export function poolActions(p: Pool, role: Role, now: number, allFinal: boolean | undefined) {
  const joining = p.phase === "joining";
  const join: ActionState = !joining ? no("Joining ended when the pool started.")
    : role.referee ? no("The referee cannot join the pool.")
    : role.member ? no("You are already a member.")
    : role.left ? no("A member who left cannot join this pool again.")
    : p.active >= p.max_entrants ? no("The pool is full.")
    : yes;
  const leave: ActionState = joining && role.member ? yes : no(joining ? "You are not a member." : "Members can only leave before the start.");
  const cancel: ActionState =
    p.phase === "joining" ? (role.organizer ? yes : no("Only the organizer can call the pool off before it starts."))
    : p.phase === "failed" ? yes
    : no("A pool that has started with enough members cannot be called off.");
  const terms: ActionState = joining && role.organizer ? yes : no(joining ? "Only the organizer can change the terms." : "Terms can only change before the start.");
  const settle: ActionState =
    p.phase === "settled" || p.phase === "cancelled" ? no("The pool is already closed.")
    : p.phase === "joining" || p.phase === "failed" ? no("The pool has not run.")
    : now < p.end_at ? no("The last round is still running.")
    : allFinal === false ? no("Some rounds are not final yet.")
    : yes;
  return { join, leave, cancel, terms, settle };
}

export function roundActions(p: Pool, r: Round, role: Role, now: number) {
  const running = p.phase === "running" || p.phase === "finishing";
  const mine = sameAddr(r.member, role.member?.who);
  const claim: ActionState = !role.member ? no("Only members can claim.")
    : !mine ? no("You can only claim your own rounds.")
    : r.claimed ? no("Already claimed.")
    : now < r.opens ? no("That round has not started yet.")
    : now >= r.claim_until ? no("The time to claim that round is over.")
    : yes;

  const decided = r.state === "PASSED" || r.state === "MISSED";
  const judge: ActionState = !running ? no("The pool is not running.")
    : !r.claimed ? no("There is no claim to judge.")
    : r.state !== "CLAIMED" ? no("This claim has already been judged.")
    : now < r.closes ? no("The round is still running. The judge looks at it after it closes.")
    : r.judge_by && now >= r.judge_by ? no("The review time is over; a claim nobody judged counts as missed.")
    : (r.tries ?? 0) > 0 && now < (r.last_try ?? 0) + 120 ? no("Wait two minutes before asking again.")
    : yes;

  const aiDecided = decided && r.decided_by === 1;
  const contest: ActionState = !running ? no("The pool is not running.")
    : !decided || !aiDecided ? no("Only a judgement of the AI can be contested.")
    : r.contested ? no("That judgement has already been contested.")
    : r.dispute_until && now >= r.dispute_until ? no("The dispute time of that judgement is over.")
    : !role.member ? no("Only members of this pool can contest.")
    : mine ? (r.state === "MISSED" ? yes : no("You can contest only your own missed rounds."))
    : r.state === "PASSED" ? yes : no("You can contest only a round that the other member was credited for.");

  const underContest = !!r.contested && !r.final && r.bond_state === 1;
  const lapsed = underContest && now >= (r.contested_at ?? 0) + AUDIT_PATIENCE;
  const audit: ActionState = !running ? no("The pool is not running.")
    : !underContest ? no("That judgement is not under contest.")
    : lapsed ? no("The contest lapsed. Use “Return the bond” instead.")
    : yes;
  const lapse: ActionState = !underContest ? no("That judgement is not under contest.") : lapsed ? yes : no("The contest has not lapsed yet. Run the audit instead.");

  const overrule: ActionState = !role.referee ? no("Only the referee can overrule.")
    : !running ? no("The pool is not running.")
    : !r.claimed ? no("A round without a claim cannot be credited.")
    : r.final ? no("That round is already final.")
    : yes;

  return { claim, judge, contest, audit, lapse, overrule };
}

/* ---- payout model: the same arithmetic as Cairn._payouts, for the docs calculator and the previews ---- */
export function payouts(balance: bigint, slice: bigint, credits: number[]): bigint[] {
  const n = credits.length;
  const out = Array<bigint>(n).fill(0n);
  if (!n) return out;
  const total = credits.reduce((a, b) => a + b, 0);
  if (total === 0) {
    const share = balance / BigInt(n);
    out.fill(share);
    out[0] += balance - share * BigInt(n);
    return out;
  }
  let pot = balance - BigInt(total) * slice;
  if (pot < 0n) pot = 0n;
  let given = 0n;
  let top = 0;
  for (let i = 0; i < n; i++) {
    const part = (pot * BigInt(credits[i])) / BigInt(total);
    out[i] = BigInt(credits[i]) * slice + part;
    given += part;
    if (credits[i] > credits[top]) top = i;
  }
  out[top] += pot - given;
  return out;
}

export function nextMilestone(p: Pool, now: number): { label: string; at: number } | null {
  if (p.phase === "joining") return { label: "Starts in", at: p.start_at };
  if (p.phase === "running") {
    const r = currentRound(p, now);
    if (r >= 0) return { label: `Round ${r + 1} closes in`, at: closeAt(p, r) };
    return { label: "Ends in", at: p.end_at };
  }
  return null;
}
