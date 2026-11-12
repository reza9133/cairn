export type Phase = "joining" | "failed" | "running" | "finishing" | "settled" | "cancelled";

export interface Member {
  who: string;
  url: string;
  joined_at: number;
  left: boolean;
  marks: string;
  payout: string;
  credited: number;
}

export interface Pool {
  id: number;
  organizer: string;
  referee: string;
  title: string;
  rules: string;
  created: number;
  start_at: number;
  end_at: number;
  state: number;
  phase: Phase;
  stake: string;
  slice: string;
  rounds: number;
  round_len: number;
  min_entrants: number;
  max_entrants: number;
  grace: number;
  review_span: number;
  dispute_span: number;
  doubt_limit: number;
  active: number;
  balance: string;
  bonds: string;
  bond_due: string;
  rewards: string;
  forfeited: string;
  settled_at: number;
  members: Member[];
}

export interface Judgement {
  verdict?: string;
  doubt?: number;
  flags?: string[];
  reason?: string;
  at?: number;
  tries?: number;
  lapsed?: boolean;
  [k: string]: unknown;
}

export type RoundState = "OPEN" | "CLAIMED" | "PASSED" | "MISSED";

export interface Round {
  pool: number;
  member: string;
  round: number;
  opens: number;
  closes: number;
  claim_until: number;
  state: RoundState;
  credited: boolean;
  final: boolean;
  claimed: boolean;
  note?: string;
  claimed_at?: number;
  judge_by?: number;
  decided_by?: number;
  decided_at?: number;
  tries?: number;
  last_try?: number;
  doubt?: number;
  dispute_until?: number;
  contested?: boolean;
  contester?: string;
  contested_at?: number;
  bond?: string;
  bond_state?: number;
  reason?: string;
  ruling?: string;
  review?: Judgement | null;
  audit?: Judgement | null;
}

export interface StandingRow {
  who: string;
  credited: number;
  pending: number;
  projected: string;
}

export interface Standing {
  pool: number;
  phase: Phase;
  all_final: boolean;
  members: StandingRow[];
}

export interface Stats {
  pools: number;
  claims: number;
  settled: number;
  cancelled: number;
  judgements: number;
  contests_upheld: number;
  contests_dismissed: number;
  overruled: number;
  volume: string;
  deposited: string;
  paid: string;
  bonds: string;
}

export interface Solvency {
  deposited: string;
  paid: string;
  held: string;
  bonds: string;
  balanced: boolean;
}

export const DECIDED_BY = ["nobody", "the AI judge", "default (unreadable evidence)", "the audit", "the referee"] as const;
export const BOND_STATE = ["none", "held", "refunded", "forfeited", "rewarded"] as const;
