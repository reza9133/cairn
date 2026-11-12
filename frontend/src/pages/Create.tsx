import { lazy, Suspense, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DurationInput from "../components/DurationInput";
import Icon from "../components/Icon";
import { StoneLoader } from "../components/Spinner";
import { Button, Field, Notice, SectionTitle } from "../components/ui";
import { BOND_BPS, BPS, DEFAULTS, LIMITS, MIN_BOND_WEI } from "../config";
import { newestPoolOf } from "../lib/chain";
import { fmtDuration, fmtGen, isAddress, parseGen, sameAddr } from "../lib/format";
import { runTx } from "../lib/tx";
import { openConnect, useWallet } from "../lib/wallet";

const CairnScene = lazy(() => import("../components/CairnScene"));

const len = (s: string, [lo, hi]: readonly [number, number]) => s.trim().length >= lo && s.trim().length <= hi;
const within = (v: number, [lo, hi]: readonly [number, number]) => Number.isFinite(v) && v >= lo && v <= hi;

const TEMPLATES = [
  { name: "Daily run", title: "Run every day", rules: "In every round each member goes for a run of at least 3 km and logs it on their public evidence page, with the date. A round counts when the page shows a run dated inside that round." },
  { name: "Writing streak", title: "Write every day", rules: "In every round each member publishes at least one new piece of writing (300 words or more) on their public page. A round counts when a new dated piece appears inside that round." },
  { name: "Open-source weeks", title: "Ship something weekly", rules: "In every round each member merges at least one commit or pull request in a public repository. The evidence page is the member's contribution page; the round counts when it shows activity inside the round." },
];

export default function Create() {
  const w = useWallet();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [rules, setRules] = useState("");
  const [stake, setStake] = useState("0.01");
  const [rounds, setRounds] = useState(5);
  const [roundLen, setRoundLen] = useState(86400);
  const [startsIn, setStartsIn] = useState(3600);
  const [minE, setMinE] = useState(2);
  const [maxE, setMaxE] = useState(6);
  const [referee, setReferee] = useState("");
  const [adv, setAdv] = useState(false);
  const [grace, setGrace] = useState<number>(DEFAULTS.grace);
  const [review, setReview] = useState<number>(DEFAULTS.review);
  const [dispute, setDispute] = useState<number>(DEFAULTS.dispute);
  const [doubt, setDoubt] = useState<number>(DEFAULTS.doubt);
  const [busy, setBusy] = useState(false);
  const [showErr, setShowErr] = useState(false);
  const [step, setStep] = useState<string | null>(null);

  const stakeWei = parseGen(stake);
  const slice = stakeWei !== null && rounds > 0 ? stakeWei / BigInt(rounds) : 0n;
  const bond = (() => { const b = (slice * BOND_BPS) / BPS; return b < MIN_BOND_WEI ? MIN_BOND_WEI : b; })();

  const errs = useMemo(() => ({
    title: len(title, LIMITS.title) ? null : "3 to 60 characters",
    rules: len(rules, LIMITS.rules) ? null : "20 to 1200 characters: say what a member does in every round and what counts as proof",
    stake: stakeWei === null ? "Enter an amount in GEN, for example 0.01" : stakeWei > LIMITS.maxStakeWei ? "That is more than the contract accepts" : slice < LIMITS.minSliceWei ? "Every round has to be worth at least 0.001 GEN (stake ÷ rounds)" : null,
    rounds: Number.isInteger(rounds) && within(rounds, LIMITS.rounds) ? null : "2 to 14 rounds",
    roundLen: within(roundLen, LIMITS.roundLen) ? null : "1 minute to 30 days",
    startsIn: within(startsIn, LIMITS.startsIn) ? null : "1 minute to 30 days",
    members: Number.isInteger(minE) && Number.isInteger(maxE) && minE >= 2 && maxE <= 12 && minE <= maxE ? null : "2 ≤ minimum ≤ maximum ≤ 12",
    referee: referee.trim() === "" || isAddress(referee) ? null : "A wallet address (0x…) or leave empty",
    advanced: within(grace, LIMITS.grace) && within(review, LIMITS.review) && within(dispute, LIMITS.dispute) && Number.isInteger(doubt) && within(doubt, LIMITS.doubt) ? null : "One of the advanced values is outside its range",
  }), [title, rules, stakeWei, slice, rounds, roundLen, startsIn, minE, maxE, referee, grace, review, dispute, doubt]);

  const valid = Object.values(errs).every((e) => e === null);
  const changedTerms = grace !== DEFAULTS.grace || review !== DEFAULTS.review || dispute !== DEFAULTS.dispute || doubt !== DEFAULTS.doubt;
  const refereeIsMe = !!referee && sameAddr(referee.trim(), w.account);

  async function submit() {
    if (!valid || stakeWei === null) { setShowErr(true); return; }
    if (w.status !== "connected") { openConnect(); return; }
    setBusy(true);
    try {
      setStep("Creating the pool");
      const res = await runTx({
        label: `Create “${title.trim().slice(0, 30)}”`,
        fn: "create_pool",
        args: [title.trim(), rules.trim(), stakeWei, rounds, roundLen, startsIn, minE, maxE, referee.trim()],
        note: "The pool opens as soon as validators accept this transaction.",
      });
      if (!res.ok) return;
      const id = w.account ? await newestPoolOf(w.account) : null;
      if (id === null) { nav("/me"); return; }
      if (changedTerms) {
        setStep("Saving your terms");
        const t = await runTx({ label: `Set terms of pool #${id}`, fn: "set_terms", args: [id, grace, review, dispute, doubt] });
        if (!t.ok) { nav(`/pools/${id}`); return; }
      }
      nav(`/pools/${id}`);
    } finally {
      setBusy(false);
      setStep(null);
    }
  }

  return (
    <div className="page page--create">
      <SectionTitle eyebrow="Create" title="Open a new pool">
        Write the promise in plain words, set the money and the rhythm, and invite your group. The stones on the right grow with your rounds.
      </SectionTitle>

      <div className="createlayout">
        <form className={`card form ${showErr ? "show-errors" : ""}`} onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
          <div className="templates">
            <span className="eyebrow">Start from an idea</span>
            <div className="row wrap">{TEMPLATES.map((t) => <button type="button" key={t.name} className="chip" onClick={() => { setTitle(t.title); setRules(t.rules); }}>{t.name}</button>)}</div>
          </div>

          <Field label="Title" counter={`${title.trim().length}/60`} error={title && errs.title ? errs.title : showErr ? errs.title : null}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Run every day for five days" />
          </Field>
          <Field label="Rules" counter={`${rules.trim().length}/1200`} error={rules && errs.rules ? errs.rules : showErr ? errs.rules : null}
            hint="What does a member promise in every round, and what counts as proof? The AI judge reads exactly this.">
            <textarea rows={6} value={rules} onChange={(e) => setRules(e.target.value)} maxLength={1300} placeholder="In every round each member …" />
          </Field>

          <div className="form__grid">
            <Field label="Stake per member (GEN)" error={errs.stake} hint={stakeWei !== null && !errs.stake ? `Each round is worth ${fmtGen(slice, 6)}` : undefined}>
              <input inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value)} />
            </Field>
            <Field label="Rounds" error={errs.rounds}>
              <input type="number" min={2} max={14} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} />
            </Field>
            <Field label="Length of a round" error={errs.roundLen}>
              <DurationInput seconds={roundLen} onChange={setRoundLen} units={["minutes", "hours", "days"]} />
            </Field>
            <Field label="Starts in" error={errs.startsIn} hint="Members join before this moment. Leave time for people to join.">
              <DurationInput seconds={startsIn} onChange={setStartsIn} units={["minutes", "hours", "days"]} />
            </Field>
            <Field label="Minimum members" error={errs.members}><input type="number" min={2} max={12} value={minE} onChange={(e) => setMinE(Number(e.target.value))} /></Field>
            <Field label="Maximum members"><input type="number" min={2} max={12} value={maxE} onChange={(e) => setMaxE(Number(e.target.value))} /></Field>
          </div>

          <Field label="Referee (optional)" error={errs.referee} hint="A person who can overrule any claim that is not final. Leave empty for a pool without one. The referee cannot join.">
            <input value={referee} onChange={(e) => setReferee(e.target.value)} placeholder="0x… or leave empty" spellCheck={false} />
          </Field>
          {refereeIsMe && <Notice tone="info">You are the referee of your own pool. That is allowed, but you will not be able to join it as a member.</Notice>}

          <button type="button" className="disclosure" aria-expanded={adv} onClick={() => setAdv((a) => !a)}>
            <Icon name="chevron" size={16} style={{ transform: adv ? "rotate(180deg)" : undefined }} /> Advanced terms <small>time limits and the judge’s strictness</small>
          </button>
          {adv && (
            <div className="form__grid form__grid--adv">
              <Field label="Grace time" hint={`Default ${fmtDuration(DEFAULTS.grace)}`}><DurationInput seconds={grace} onChange={setGrace} units={["minutes", "hours", "days"]} /></Field>
              <Field label="Review time" hint={`Default ${fmtDuration(DEFAULTS.review)}`}><DurationInput seconds={review} onChange={setReview} units={["minutes", "hours", "days"]} /></Field>
              <Field label="Dispute time" hint={`Default ${fmtDuration(DEFAULTS.dispute)}`}><DurationInput seconds={dispute} onChange={setDispute} units={["minutes", "hours", "days"]} /></Field>
              <Field label="Doubt limit (0–100)" hint={`Lower is stricter. Default ${DEFAULTS.doubt}`}><input type="number" min={0} max={100} value={doubt} onChange={(e) => setDoubt(Number(e.target.value))} /></Field>
              {errs.advanced && <Notice tone="error">{errs.advanced}</Notice>}
              {changedTerms && <Notice tone="info">Changed terms are saved with a second transaction right after the pool is created.</Notice>}
            </div>
          )}

          <div className="form__submit">
            <Button size="lg" icon={w.status === "connected" ? "plus" : "wallet"} busy={busy} type="submit">{w.status === "connected" ? "Create the pool" : "Connect wallet to create"}</Button>
            {busy && step && <span className="muted small">{step}…</span>}
            {showErr && !valid && <span className="field__error">Some fields need attention.</span>}
          </div>
        </form>

        <aside className="createside">
          <div className="card createpreview">
            <div className="createpreview__scene">
              <Suspense fallback={<div className="scene scene--loading"><StoneLoader size={64} /></div>}>
                <CairnScene stones={within(rounds, LIMITS.rounds) ? rounds : 5} className="scene--mini" />
              </Suspense>
            </div>
            <h3>{title.trim() || "Your pool"}</h3>
            <dl className="facts facts--tight">
              <div className="fact"><dt>Rounds</dt><dd>{within(rounds, LIMITS.rounds) ? rounds : "—"} <small>stones</small></dd></div>
              <div className="fact"><dt>Slice</dt><dd>{stakeWei !== null && slice > 0n ? fmtGen(slice, 6) : "—"}</dd></div>
              <div className="fact"><dt>Contest bond</dt><dd>{slice > 0n ? fmtGen(bond, 6) : "—"}</dd></div>
              <div className="fact"><dt>Pool length</dt><dd>{within(roundLen, LIMITS.roundLen) && within(rounds, LIMITS.rounds) ? fmtDuration(roundLen * rounds) : "—"}</dd></div>
              <div className="fact"><dt>Max pot</dt><dd>{stakeWei !== null ? fmtGen(stakeWei * BigInt(maxE > 0 ? Math.min(Math.max(maxE, 0), 12) : 0), 5) : "—"}</dd></div>
            </dl>
          </div>
          <Notice tone="info" title="Good to know">Creating a pool costs nothing but gas. Your stake is only sent when you join like everyone else.</Notice>
        </aside>
      </div>
    </div>
  );
}
