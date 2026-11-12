import { useMemo, useState } from "react";
import { LIMITS } from "../config";
import { fmtDuration, parseGen, weiToGen } from "../lib/format";
import { payouts } from "../lib/pool";
import DurationInput from "./DurationInput";
import { Field } from "./ui";

/** The same arithmetic as Cairn._payouts, so people can check the money rules with their own numbers. */
export function PayoutCalculator() {
  const [stake, setStake] = useState("0.006");
  const [rounds, setRounds] = useState(2);
  const [credits, setCredits] = useState<number[]>([2, 1, 0]);
  const [forfeit, setForfeit] = useState("0");

  const stakeWei = parseGen(stake);
  const forfeitWei = parseGen(forfeit) ?? 0n;
  const r = Math.min(14, Math.max(2, Math.floor(rounds) || 2));
  const rows = useMemo(() => {
    if (stakeWei === null) return null;
    const slice = stakeWei / BigInt(r);
    const cr = credits.map((c) => Math.min(c, r));
    const balance = stakeWei * BigInt(cr.length) + forfeitWei;
    const out = payouts(balance, slice, cr);
    return { slice, balance, out, cr, sum: out.reduce((a, b) => a + b, 0n) };
  }, [stakeWei, r, credits, forfeitWei]);

  return (
    <div className="calc card">
      <h3>Payout calculator</h3>
      <div className="form__grid">
        <Field label="Stake per member (GEN)" error={stakeWei === null ? "Enter an amount like 0.006" : null}><input inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value)} /></Field>
        <Field label="Rounds"><input type="number" min={2} max={14} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} /></Field>
        <Field label="Forfeited bonds added to the pot (GEN)"><input inputMode="decimal" value={forfeit} onChange={(e) => setForfeit(e.target.value)} /></Field>
      </div>
      <div className="calc__members">
        {credits.map((c, i) => (
          <label key={i} className="calc__member">
            <span>Member {i + 1}</span>
            <input type="number" min={0} max={r} value={c} onChange={(e) => setCredits((cs) => cs.map((x, j) => (j === i ? Math.max(0, Math.floor(Number(e.target.value) || 0)) : x)))} aria-label={`Rounds that counted for member ${i + 1}`} />
            <small>rounds counted</small>
          </label>
        ))}
        <div className="row">
          <button className="btn btn--soft btn--sm" type="button" disabled={credits.length >= 12} onClick={() => setCredits((c) => [...c, 0])}><span>Add member</span></button>
          <button className="btn btn--ghost btn--sm" type="button" disabled={credits.length <= 2} onClick={() => setCredits((c) => c.slice(0, -1))}><span>Remove</span></button>
        </div>
      </div>
      {rows && (
        <div className="tablewrap">
          <table>
            <thead><tr><th>Member</th><th>Rounds counted</th><th>Payout (GEN)</th></tr></thead>
            <tbody>
              {rows.out.map((v, i) => <tr key={i}><td>Member {i + 1}</td><td>{rows.cr[i]}</td><td><b>{weiToGen(v, 9)}</b></td></tr>)}
              <tr><td colSpan={2}>Total paid out</td><td><b>{weiToGen(rows.sum, 9)}</b> {rows.sum === rows.balance ? "✓ equals the pool balance" : "✗"}</td></tr>
            </tbody>
          </table>
          <p className="muted small">Slice {weiToGen(rows.slice, 9)} GEN · pool balance {weiToGen(rows.balance, 9)} GEN{rows.cr.every((c) => c === 0) ? " · nobody counted, so everything is shared equally" : ""}</p>
        </div>
      )}
    </div>
  );
}

export function ScheduleCalculator() {
  const [rounds, setRounds] = useState(4);
  const [len, setLen] = useState(86400);
  const [grace, setGrace] = useState(600);
  const [review, setReview] = useState(3 * 86400);
  const [dispute, setDispute] = useState(3600);
  const ok = Number.isFinite(len) && Number.isFinite(grace) && Number.isFinite(review) && Number.isFinite(dispute) && len >= LIMITS.roundLen[0];
  const n = Math.min(14, Math.max(2, Math.floor(rounds) || 2));
  return (
    <div className="calc card">
      <h3>Schedule of a pool</h3>
      <p className="muted small">Times are counted from the start of the pool (T+0). “Earliest final” assumes the claim is filed at the end of its round and judged straight away with nobody contesting.</p>
      <div className="form__grid">
        <Field label="Rounds"><input type="number" min={2} max={14} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} /></Field>
        <Field label="Round length"><DurationInput seconds={len} onChange={setLen} /></Field>
        <Field label="Grace"><DurationInput seconds={grace} onChange={setGrace} /></Field>
        <Field label="Review time"><DurationInput seconds={review} onChange={setReview} /></Field>
        <Field label="Dispute time"><DurationInput seconds={dispute} onChange={setDispute} /></Field>
      </div>
      {ok && (
        <div className="tablewrap">
          <table>
            <thead><tr><th>Round</th><th>Opens</th><th>Closes</th><th>Last claim</th><th>Judge by</th><th>Earliest final</th></tr></thead>
            <tbody>
              {Array.from({ length: n }, (_, r) => {
                const open = r * len, close = (r + 1) * len;
                return <tr key={r}><td>{r + 1}</td><td>T+{fmtDuration(open, 3)}</td><td>T+{fmtDuration(close, 3)}</td><td>T+{fmtDuration(close + grace, 3)}</td><td>T+{fmtDuration(close + review, 3)}</td><td>T+{fmtDuration(close + dispute, 3)}</td></tr>;
              })}
            </tbody>
          </table>
          <p className="muted small">The whole pool can be settled once the last round has closed and every round is final: not before T+{fmtDuration(n * len + Math.min(dispute, grace + dispute), 3)} in the best case, and by T+{fmtDuration(n * len + grace + review, 3)} even if nobody does anything (unjudged claims credit after the review time).</p>
        </div>
      )}
    </div>
  );
}
