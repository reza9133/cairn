import { useState } from "react";
import { DEFAULTS, LIMITS } from "../config";
import { checkEvidenceUrl, fmtDuration, fmtGen, toBig } from "../lib/format";
import { claimableRounds } from "../lib/pool";
import type { TxSpec } from "../lib/chain";
import { runTx } from "../lib/tx";
import { ensureReady } from "../lib/wallet";
import type { Pool } from "../lib/types";
import DurationInput from "./DurationInput";
import { Button, Field, Modal, Notice } from "./ui";

export type Action =
  | { kind: "join" }
  | { kind: "leave" }
  | { kind: "cancel" }
  | { kind: "terms" }
  | { kind: "settle" }
  | { kind: "claim"; round?: number }
  | { kind: "judge"; who: string; round: number }
  | { kind: "contest"; who: string; round: number }
  | { kind: "audit"; who: string; round: number }
  | { kind: "lapse"; who: string; round: number }
  | { kind: "overrule"; who: string; round: number };

interface Ctx { pool: Pool; now: number; myMarks?: string; onClose: () => void }

function Shell({ title, lead, confirm, danger, spec, valid = true, onClose, children }: { title: string; lead?: React.ReactNode; confirm: string; danger?: boolean; spec: () => TxSpec; valid?: boolean; onClose: () => void; children?: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  const [showErr, setShowErr] = useState(false);
  async function go() {
    if (!valid) { setShowErr(true); return; }
    setBusy(true);
    if (!(await ensureReady())) { setBusy(false); return; } // opens the connect / network dialog and keeps this form
    const tx = spec();
    onClose(); // the transaction dialog takes over from here
    await runTx(tx);
  }
  return (
    <Modal open onClose={onClose} title={title}>
      {lead && <p className="modal__lead">{lead}</p>}
      <div className={`form ${showErr ? "show-errors" : ""}`}>{children}</div>
      <div className="modal__actions">
        <Button variant={danger ? "danger" : "primary"} size="lg" busy={busy} onClick={go}>{confirm}</Button>
        <Button variant="quiet" size="lg" onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  );
}

const len = (s: string, [lo, hi]: readonly [number, number]) => s.trim().length >= lo && s.trim().length <= hi;
const counter = (s: string, [, hi]: readonly [number, number]) => `${s.trim().length}/${hi}`;

function Join({ pool, onClose }: Ctx) {
  const [url, setUrl] = useState("");
  const err = checkEvidenceUrl(url.trim());
  return (
    <Shell title={`Join “${pool.title}”`} confirm={`Join with ${fmtGen(pool.stake, 6)}`} valid={!err} onClose={onClose}
      lead={<>You send exactly the stake. It is split into {pool.rounds} slices of {fmtGen(pool.slice, 6)}; you get a slice back for every round that counts, plus a share of the pot.</>}
      spec={() => ({ label: `Join pool #${pool.id}`, fn: "join", args: [pool.id, url.trim()], value: toBig(pool.stake) })}>
      <Field label="Your evidence page" error={url ? err : null} hint="One public page that shows what you do (a log, profile, blog or repository page). The judge reads it. No other member can use the same page.">
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/my-progress" autoFocus maxLength={LIMITS.maxUrl} />
      </Field>
      <Notice tone="warn">Choose a page that a plain web fetch can read: no login, no heavy scripts. A page that cannot be read counts against you.</Notice>
    </Shell>
  );
}

function Leave({ pool, onClose }: Ctx) {
  return <Shell title="Leave this pool" confirm="Leave and take my stake back" onClose={onClose} lead={<>Your {fmtGen(pool.stake, 6)} comes back. You cannot join this pool again afterwards.</>} spec={() => ({ label: `Leave pool #${pool.id}`, fn: "leave", args: [pool.id] })} />;
}

function CancelPool({ pool, onClose }: Ctx) {
  return <Shell title="Call the pool off" danger confirm="Call it off" onClose={onClose} lead={pool.phase === "failed" ? "Too few members joined. Calling the pool off sends every stake back." : "The pool never starts and every stake goes back to its owner."} spec={() => ({ label: `Call off pool #${pool.id}`, fn: "cancel_pool", args: [pool.id] })} />;
}

function Settle({ pool, onClose }: Ctx) {
  return <Shell title="Settle the pool" confirm="Settle now" onClose={onClose} lead="Every round is final. Settling shares the stakes out: each member gets their credited slices plus a share of the pot. Anyone may do this." spec={() => ({ label: `Settle pool #${pool.id}`, fn: "settle", args: [pool.id] })} />;
}

function Terms({ pool, onClose }: Ctx) {
  const [grace, setGrace] = useState(pool.grace);
  const [review, setReview] = useState(pool.review_span);
  const [dispute, setDispute] = useState(pool.dispute_span);
  const [doubt, setDoubt] = useState(String(pool.doubt_limit));
  const d = Number(doubt);
  const within = (v: number, [lo, hi]: readonly [number, number]) => Number.isFinite(v) && v >= lo && v <= hi;
  const ok = within(grace, LIMITS.grace) && within(review, LIMITS.review) && within(dispute, LIMITS.dispute) && Number.isInteger(d) && within(d, LIMITS.doubt);
  return (
    <Shell title="Tune the terms" confirm="Save terms" valid={ok} onClose={onClose}
      lead="Only the organizer can do this, and only before the start."
      spec={() => ({ label: `Set terms of pool #${pool.id}`, fn: "set_terms", args: [pool.id, grace, review, dispute, d] })}>
      <Field label="Grace time" error={within(grace, LIMITS.grace) ? null : "0 to 7 days"} hint={`Extra time to file a claim after a round closed. Default ${fmtDuration(DEFAULTS.grace)}.`}><DurationInput seconds={grace} onChange={setGrace} units={["minutes", "hours", "days"]} /></Field>
      <Field label="Review time" error={within(review, LIMITS.review) ? null : "10 minutes to 30 days"} hint={`How long somebody has to ask the judge before an unjudged claim lapses as a miss. Default ${fmtDuration(DEFAULTS.review)}.`}><DurationInput seconds={review} onChange={setReview} /></Field>
      <Field label="Dispute time" error={within(dispute, LIMITS.dispute) ? null : "2 minutes to 7 days"} hint={`How long a judgement can be contested. Default ${fmtDuration(DEFAULTS.dispute)}.`}><DurationInput seconds={dispute} onChange={setDispute} /></Field>
      <Field label="Doubt limit (0–100)" error={Number.isInteger(d) && within(d, LIMITS.doubt) ? null : "A whole number from 0 to 100"} hint={`A round counts only if the judge says MET with doubt at or below this. Lower is stricter. Default ${DEFAULTS.doubt}.`}><input inputMode="numeric" value={doubt} onChange={(e) => setDoubt(e.target.value)} /></Field>
    </Shell>
  );
}

function Claim({ pool, now, myMarks, round, onClose }: Ctx & { round?: number }) {
  const open = claimableRounds(pool, now).filter((r) => (myMarks?.[r] ?? ".") === ".");
  const [r, setR] = useState<number>(round !== undefined && open.includes(round) ? round : open[0] ?? 0);
  const [note, setNote] = useState("");
  return (
    <Shell title="File a claim" confirm="Send claim" valid={open.length > 0 && len(note, LIMITS.claim)} onClose={onClose}
      lead="Say what you did in this round, in a sentence or two. The judge compares it with the rules and with your evidence page. After the round closes, ask the judge before the review time ends: a claim nobody judged in time counts as missed."
      spec={() => ({ label: `Claim round ${r + 1} of pool #${pool.id}`, fn: "claim", args: [pool.id, r, note.trim()] })}>
      {open.length === 0 ? <Notice tone="warn">There is no round you can claim right now.</Notice> : (
        <>
          <Field label="Round"><select value={r} onChange={(e) => setR(Number(e.target.value))}>{open.map((x) => <option key={x} value={x}>Round {x + 1}</option>)}</select></Field>
          <Field label="What did you do?" counter={counter(note, LIMITS.claim)} error={note && !len(note, LIMITS.claim) ? "12 to 300 characters" : null} hint="Plain words. Do not try to instruct the judge — a claim that does is refused without asking the model.">
            <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} autoFocus placeholder="Ran 5 km this morning; the log entry of today is on my page." />
          </Field>
        </>
      )}
    </Shell>
  );
}

function Judge({ pool, who, round, onClose }: Ctx & { who: string; round: number }) {
  return <Shell title="Ask the AI judge" confirm="Ask the judge" onClose={onClose} lead="The judge reads the rules, the claim and the evidence page, then decides. Anyone may ask; the answer is provisional until the dispute time is over."
    spec={() => ({ label: `Judge round ${round + 1} of pool #${pool.id}`, fn: "judge", args: [pool.id, who, round], slow: true, note: "Validators fetch the page and ask a model, then agree. This commonly takes one to a few minutes." })} />;
}

function Contest({ pool, who, round, onClose }: Ctx & { who: string; round: number }) {
  const [reason, setReason] = useState("");
  return (
    <Shell title="Contest this judgement" confirm={`Post bond ${fmtGen(pool.bond_due, 6)} and contest`} valid={len(reason, LIMITS.reason)} onClose={onClose}
      lead={<>You post a bond of {fmtGen(pool.bond_due, 6)}. A stricter second look decides. If you are right you get the bond back (and a reward when you contested someone else’s credit); if you are wrong the bond stays in the pot.</>}
      spec={() => ({ label: `Contest round ${round + 1} of pool #${pool.id}`, fn: "contest", args: [pool.id, who, round, reason.trim()], value: toBig(pool.bond_due) })}>
      <Field label="Why was the judgement wrong?" counter={counter(reason, LIMITS.reason)} error={reason && !len(reason, LIMITS.reason) ? "12 to 300 characters" : null} hint="The auditor treats your reason as a lead to check on the page, never as a fact.">
        <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={400} autoFocus />
      </Field>
    </Shell>
  );
}

function Audit({ pool, who, round, onClose }: Ctx & { who: string; round: number }) {
  return <Shell title="Run the stricter second look" confirm="Run the audit" onClose={onClose} lead="The auditor credits a round only up to two thirds of the pool’s doubt limit. Its answer is final."
    spec={() => ({ label: `Audit round ${round + 1} of pool #${pool.id}`, fn: "audit", args: [pool.id, who, round], slow: true, note: "The audit reads the page again and asks a model. This commonly takes one to a few minutes." })} />;
}

function Lapse({ pool, who, round, onClose }: Ctx & { who: string; round: number }) {
  return <Shell title="Return the bond" confirm="Return the bond" onClose={onClose} lead="Nobody ran the audit within a day. The bond goes back to its owner and the judgement stands."
    spec={() => ({ label: `Lapse contest, round ${round + 1} of pool #${pool.id}`, fn: "lapse_contest", args: [pool.id, who, round] })} />;
}

function Overrule({ pool, who, round, onClose }: Ctx & { who: string; round: number }) {
  const [credit, setCredit] = useState(true);
  const [note, setNote] = useState("");
  return (
    <Shell title="Overrule as referee" confirm={credit ? "Credit this round" : "Do not credit this round"} valid={note.trim().length >= 1 && note.trim().length <= 300} onClose={onClose}
      lead="Your ruling settles this filed claim by hand and closes any contest on it."
      spec={() => ({ label: `Overrule round ${round + 1} of pool #${pool.id}`, fn: "overrule", args: [pool.id, who, round, credit, note.trim()] })}>
      <Field label="Ruling">
        <div className="seg">
          <button type="button" className={credit ? "is-on" : ""} onClick={() => setCredit(true)}>Credit</button>
          <button type="button" className={!credit ? "is-on" : ""} onClick={() => setCredit(false)}>Do not credit</button>
        </div>
      </Field>
      <Field label="Your note" counter={`${note.trim().length}/300`} hint="Kept on the round for everyone to see.">
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} autoFocus />
      </Field>
    </Shell>
  );
}

export default function ActionHost({ action, pool, now, myMarks, onClose }: { action: Action | null; pool: Pool; now: number; myMarks?: string; onClose: () => void }) {
  if (!action) return null;
  const ctx: Ctx = { pool, now, myMarks, onClose };
  switch (action.kind) {
    case "join": return <Join {...ctx} />;
    case "leave": return <Leave {...ctx} />;
    case "cancel": return <CancelPool {...ctx} />;
    case "settle": return <Settle {...ctx} />;
    case "terms": return <Terms {...ctx} />;
    case "claim": return <Claim {...ctx} round={action.round} />;
    case "judge": return <Judge {...ctx} who={action.who} round={action.round} />;
    case "contest": return <Contest {...ctx} who={action.who} round={action.round} />;
    case "audit": return <Audit {...ctx} who={action.who} round={action.round} />;
    case "lapse": return <Lapse {...ctx} who={action.who} round={action.round} />;
    case "overrule": return <Overrule {...ctx} who={action.who} round={action.round} />;
  }
}
