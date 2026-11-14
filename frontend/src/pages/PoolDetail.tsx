import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import ActionHost, { type Action } from "../components/PoolActions";
import Icon from "../components/Icon";
import StoneStack from "../components/StoneStack";
import { StoneLoader } from "../components/Spinner";
import { AddressChip, Button, Countdown, EmptyState, ErrorState, Notice, PhaseBadge, Skeleton, Tag } from "../components/ui";
import { explorerAddress } from "../config";
import { read } from "../lib/chain";
import { useNow } from "../lib/clock";
import { fmtDate, fmtDuration, fmtGen, pct, sameAddr, shortAddr, toBig, weiToGen } from "../lib/format";
import { useAsync, useCopy } from "../lib/hooks";
import { closeAt, currentRound, markInfo, openAt, phaseHint, poolActions, roleOf, roundActions, type ActionState } from "../lib/pool";
import { BOND_STATE, DECIDED_BY, type Judgement, type Pool, type Round, type Standing } from "../lib/types";
import { openConnect, useWallet } from "../lib/wallet";

/* ------------------------------------------------------------ small pieces */

function Fact({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return <div className="fact" title={hint}><dt>{label}</dt><dd>{value}</dd></div>;
}

function Timeline({ pool, now }: { pool: Pool; now: number }) {
  const total = Math.max(1, pool.end_at - pool.start_at);
  const progress = pct(now - pool.start_at, total);
  const cur = currentRound(pool, now);
  return (
    <div className="timeline">
      <div className="timeline__bar">
        {Array.from({ length: pool.rounds }, (_, r) => (
          <div key={r} className={`timeline__seg ${cur === r ? "is-current" : ""} ${now >= closeAt(pool, r) ? "is-past" : ""}`} title={`Round ${r + 1}: ${fmtDate(openAt(pool, r))} → ${fmtDate(closeAt(pool, r))}`}>
            <span>R{r + 1}</span>
          </div>
        ))}
        {now >= pool.start_at && now <= pool.end_at && <i className="timeline__now" style={{ left: `${progress}%` }} />}
      </div>
      <div className="timeline__ends"><span>{fmtDate(pool.start_at)}</span><span>{fmtDate(pool.end_at)}</span></div>
    </div>
  );
}

function Verdict({ v }: { v?: string }) {
  const tone = v === "MET" ? "green" : v === "NOT_MET" ? "red" : "gold";
  return <Tag tone={tone}>{v ?? "—"}</Tag>;
}

function JudgementCard({ title, j, limit }: { title: string; j: Judgement; limit: number }) {
  const doubt = Number(j.doubt ?? 0);
  return (
    <div className="judgement">
      <div className="judgement__head"><b>{title}</b><Verdict v={j.verdict} />{j.at ? <small>{fmtDate(Number(j.at), true)}</small> : null}</div>
      <div className="meter" role="img" aria-label={`Doubt ${doubt} of 100, limit ${limit}`}>
        <i style={{ left: `${doubt}%` }} />
        <b style={{ left: `${limit}%` }} title={`Doubt limit ${limit}`} />
      </div>
      <div className="judgement__meta"><span>Doubt <b>{doubt}</b>/100</span><span>limit {limit}</span></div>
      {Array.isArray(j.flags) && j.flags.length > 0 && <div className="row wrap">{j.flags.map((f) => <Tag key={String(f)} tone="red">{String(f)}</Tag>)}</div>}
      {j.reason ? <p className="judgement__reason">“{String(j.reason)}”</p> : null}
    </div>
  );
}

function ActionButton({ label, state, onClick, icon, variant = "primary" }: { label: string; state: ActionState; onClick: () => void; icon?: Parameters<typeof Icon>[0]["name"]; variant?: "primary" | "soft" | "danger" | "ghost" }) {
  return (
    <div className="act">
      <Button variant={state.enabled ? variant : "ghost"} icon={icon} disabled={!state.enabled} onClick={onClick}>{label}</Button>
      {!state.enabled && state.reason && <small>{state.reason}</small>}
    </div>
  );
}

/* ------------------------------------------------------------ round inspector */

function RoundInspector({ pool, who, round, now, onAction, onClose }: { pool: Pool; who: string; round: number; now: number; onAction: (a: Action) => void; onClose: () => void }) {
  const w = useWallet();
  const res = useAsync(() => read<Round>("get_round", [pool.id, who, round]), [pool.id, who, round], { interval: 10000 });
  const r = res.data;
  const role = roleOf(pool, w.account);
  const acts = r ? roundActions(pool, r, role, now) : null;
  const mine = sameAddr(who, w.account);

  return (
    <section className="card inspector" aria-live="polite">
      <header className="inspector__head">
        <div>
          <span className="eyebrow">Round {round + 1} of {pool.rounds}</span>
          <h3>{mine ? "Your round" : <>Round of <AddressChip address={who} /></>}</h3>
        </div>
        <button className="iconbtn" onClick={onClose} aria-label="Close round details"><Icon name="close" size={18} /></button>
      </header>

      {res.loading && !r && <div className="center pad"><StoneLoader size={64} label="Loading the round" /></div>}
      {res.error && !r && <ErrorState error={res.error} onRetry={() => res.reload()} />}

      {r && acts && (
        <>
          <div className="inspector__status">
            <Tag tone={r.state === "PASSED" ? "green" : r.state === "MISSED" ? "red" : r.state === "CLAIMED" ? "gold" : "neutral"}>{r.state}</Tag>
            {r.final ? <Tag tone="violet">final</Tag> : <Tag>provisional</Tag>}
            {r.credited && <Tag tone="teal">counts</Tag>}
            {r.decided_by ? <small>decided by {DECIDED_BY[r.decided_by]}</small> : null}
          </div>
          <dl className="facts facts--tight">
            <Fact label="Opens" value={fmtDate(r.opens)} />
            <Fact label="Closes" value={fmtDate(r.closes)} />
            <Fact label="Claim until" value={fmtDate(r.claim_until)} />
            {r.claimed && r.judge_by ? <Fact label="Judge by" value={fmtDate(r.judge_by)} hint="A claim nobody judged counts as missed after this" /> : null}
            {r.dispute_until ? <Fact label="Dispute until" value={fmtDate(r.dispute_until)} /> : null}
          </dl>

          {r.claimed ? (
            <blockquote className="claimnote"><Icon name="flag" size={15} /><p>{r.note}</p><small>claimed {fmtDate(r.claimed_at ?? 0)}</small></blockquote>
          ) : (
            <p className="muted">{now < r.opens ? "This round has not opened yet." : now < r.claim_until ? "No claim yet — the round can still be claimed." : "No claim was filed: a final miss. The model was never asked."}</p>
          )}

          {r.claimed && r.state === "MISSED" && r.final && !r.decided_by && !r.review && <Notice tone="warn" title="Not judged in time">Nobody asked the judge before the review time ended, so this claim is a final miss and earns no credit.</Notice>}
          {r.review && <JudgementCard title="AI judge" j={r.review} limit={pool.doubt_limit} />}
          {(r.tries ?? 0) > 0 && !r.review && <Notice tone="warn">The evidence page could not be read yet ({r.tries} {r.tries === 1 ? "try" : "tries"}). Retries happen every two minutes, up to three times.</Notice>}

          {r.contested && (
            <div className="contest">
              <div className="contest__head"><Icon name="gavel" size={16} /><b>Contested</b><small>by <AddressChip address={r.contester ?? ""} /></small></div>
              <p>“{r.reason}”</p>
              <div className="row wrap"><Tag tone="gold">bond {fmtGen(r.bond ?? "0", 6)} · {BOND_STATE[r.bond_state ?? 0]}</Tag></div>
            </div>
          )}
          {r.audit && <JudgementCard title="Second look (audit)" j={r.audit} limit={Math.floor((pool.doubt_limit * 2) / 3)} />}
          {r.ruling && <Notice tone="info" title="Referee ruling">{r.ruling}</Notice>}

          <div className="actions">
            <ActionButton label="File a claim" icon="flag" state={acts.claim} onClick={() => onAction({ kind: "claim", round })} />
            <ActionButton label="Ask the AI judge" icon="scale" state={acts.judge} onClick={() => onAction({ kind: "judge", who, round })} variant="soft" />
            <ActionButton label={`Contest (bond ${weiToGen(pool.bond_due, 5)} GEN)`} icon="gavel" state={acts.contest} onClick={() => onAction({ kind: "contest", who, round })} variant="soft" />
            <ActionButton label="Run the audit" icon="shield" state={acts.audit} onClick={() => onAction({ kind: "audit", who, round })} variant="soft" />
            <ActionButton label="Return the bond" icon="refresh" state={acts.lapse} onClick={() => onAction({ kind: "lapse", who, round })} variant="ghost" />
            {role.referee && <ActionButton label="Overrule as referee" icon="user" state={acts.overrule} onClick={() => onAction({ kind: "overrule", who, round })} variant="soft" />}
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------ page */

export default function PoolDetail() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const [params, setParams] = useSearchParams();
  const w = useWallet();
  const now = useNow(1000);
  const [action, setAction] = useState<Action | null>(null);
  const [copied, copy] = useCopy();

  const valid = Number.isInteger(id) && id >= 0;
  const pool = useAsync(() => read<Pool>("get_pool", [id]), [id], { enabled: valid, interval: 12000 });
  const p = pool.data;
  const standing = useAsync(() => read<Standing>("standing", [id]), [id, p?.phase], { enabled: !!p && (p.phase === "running" || p.phase === "finishing" || p.phase === "settled"), interval: 12000 });

  const selWho = params.get("member");
  const selRound = params.get("round") !== null ? Number(params.get("round")) : null;
  const selection = selWho && selRound !== null && Number.isInteger(selRound) ? { who: selWho, round: selRound } : null;
  const select = (who: string, round: number) => setParams({ member: who, round: String(round) }, { replace: true });
  const clearSel = () => setParams({}, { replace: true });

  const role = useMemo(() => (p ? roleOf(p, w.account) : null), [p, w.account]);
  const acts = p && role ? poolActions(p, role, now, standing.data?.all_final) : null;
  const standingOf = (who: string) => standing.data?.members.find((m) => sameAddr(m.who, who));
  const myRow = p && w.account ? p.members.find((m) => sameAddr(m.who, w.account) && !m.left) : undefined;
  const need = (fn: () => void) => () => (w.status === "connected" ? fn() : openConnect());

  if (!valid) return <div className="page"><EmptyState title="That is not a pool number" action={<Link className="btn btn--primary btn--md" to="/pools"><span>Browse pools</span></Link>} /></div>;
  if (pool.error && !p) {
    const missing = /No such pool/i.test(pool.error.message);
    return <div className="page">{missing ? <EmptyState title={`There is no pool #${id}`} action={<Link className="btn btn--primary btn--md" to="/pools"><span>Browse pools</span></Link>}>Pool numbers start at 0 and count up.</EmptyState> : <ErrorState error={pool.error} onRetry={() => pool.reload()} />}</div>;
  }
  if (!p) return <div className="page"><div className="card"><Skeleton h={30} w="50%" /><Skeleton h={16} className="mt" /><Skeleton h={16} w="70%" className="mt" /></div><div className="center pad"><StoneLoader size={72} label="Loading the pool" /></div></div>;

  const members = p.members;
  const next = p.phase === "joining" ? { label: "Starts in", at: p.start_at } : p.phase === "running" ? { label: "Ends in", at: p.end_at } : null;

  return (
    <div className="page page--pool">
      <Link to="/pools" className="backlink"><Icon name="arrow" size={15} style={{ transform: "rotate(180deg)" }} /> All pools</Link>

      <header className="pooltop">
        <div className="pooltop__stack"><StoneStack count={p.rounds} marks={myRow?.marks} width={74} /></div>
        <div className="pooltop__main">
          <div className="row wrap">
            <span className="poolcard__id">Pool #{p.id}</span>
            <PhaseBadge phase={p.phase} />
            {role?.organizer && <Tag tone="violet">you organize</Tag>}
            {role?.member && <Tag tone="teal">you are in</Tag>}
            {role?.referee && <Tag tone="gold">you referee</Tag>}
          </div>
          <h1>{p.title}</h1>
          <p className="muted">{phaseHint[p.phase]}</p>
          <div className="row wrap small">
            <AddressChip address={p.organizer} label="Organizer" />
            {p.referee ? <AddressChip address={p.referee} label="Referee" /> : <span className="muted">no referee</span>}
          </div>
        </div>
        <div className="pooltop__side">
          {next && <div className="bigcount"><span>{next.label}</span><strong><Countdown at={next.at} done="any moment" /></strong></div>}
          <div className="row">
            <Button variant="ghost" size="sm" icon={copied ? "check" : "link"} onClick={() => copy(window.location.href)}>{copied ? "Copied" : "Share"}</Button>
            <Button variant="ghost" size="sm" icon="refresh" onClick={() => { pool.reload(); standing.reload(); }}>Refresh</Button>
          </div>
        </div>
      </header>

      <div className="poolgrid">
        <div className="poolgrid__main">
          <section className="card">
            <h3 className="cardtitle">Timeline</h3>
            <Timeline pool={p} now={now} />
          </section>

          <section className="card">
            <h3 className="cardtitle">The rules</h3>
            <p className="rules">{p.rules}</p>
          </section>

          <section className="card">
            <div className="cardhead">
              <h3 className="cardtitle">Members <small>{p.active}/{p.max_entrants} · needs {p.min_entrants}</small></h3>
              <div className="legend">
                {(["p", "m", "c", "."] as const).map((c) => <span key={c}><i className={`mark mark--${markInfo(c).kind}`} />{markInfo(c).short}</span>)}
              </div>
            </div>
            {members.length === 0 ? <p className="muted">Nobody has joined yet.</p> : (
              <div className="tablewrap">
                <table className="matrix">
                  <thead>
                    <tr><th>Member</th>{Array.from({ length: p.rounds }, (_, r) => <th key={r} title={`Round ${r + 1}: ${fmtDate(openAt(p, r))}`}>{r + 1}</th>)}<th>Counted</th><th>{p.phase === "settled" ? "Paid" : "Projected"}</th></tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const st = standingOf(m.who);
                      const mine = sameAddr(m.who, w.account);
                      return (
                        <tr key={m.who} className={`${m.left ? "is-left" : ""} ${mine ? "is-me" : ""}`}>
                          <th scope="row">
                            <AddressChip address={m.who} />
                            {mine && <Tag tone="teal">you</Tag>}
                            {m.left && <Tag>left</Tag>}
                            <a className="evidence" href={m.url} target="_blank" rel="noopener noreferrer nofollow ugc" title={m.url}><Icon name="link" size={12} /> evidence</a>
                          </th>
                          {Array.from({ length: p.rounds }, (_, r) => {
                            const ch = m.left ? "" : m.marks[r] ?? ".";
                            const info = markInfo(ch || ".");
                            const on = selection && sameAddr(selection.who, m.who) && selection.round === r;
                            return (
                              <td key={r}>
                                {m.left ? <span className="mark mark--left" /> : (
                                  <button className={`mark mark--${info.kind} ${on ? "is-selected" : ""}`} onClick={() => select(m.who, r)} title={`Round ${r + 1}: ${info.label}`} aria-label={`Round ${r + 1} of ${shortAddr(m.who)}: ${info.short}`} aria-pressed={!!on} />
                                )}
                              </td>
                            );
                          })}
                          <td className="num">{m.left ? "—" : st ? st.credited : m.credited}{st && st.pending > 0 && <small title="rounds not final yet"> +{st.pending}</small>}</td>
                          <td className="num">{m.left ? "—" : p.phase === "settled" ? fmtGen(m.payout, 5) : st ? fmtGen(st.projected, 5) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {members.length > 0 && !selection && <p className="muted small mt">Select a stone to see the claim, the judgement and what you can do about it.</p>}
          </section>

          {selection && <RoundInspector pool={p} who={selection.who} round={selection.round} now={now} onAction={setAction} onClose={clearSel} />}
        </div>

        <aside className="poolgrid__side">
          {acts && (
            <section className="card actionspanel">
              <h3 className="cardtitle">Actions</h3>
              <div className="actions">
                {w.status !== "connected" && <Notice tone="info">Connect a wallet to act on this pool.</Notice>}
                <ActionButton label={`Join with ${weiToGen(p.stake, 5)} GEN`} icon="plus" state={acts.join} onClick={need(() => setAction({ kind: "join" }))} />
                {myRow && p.phase === "running" && (
                  <ActionButton label="File a claim" icon="flag" state={{ enabled: true }} onClick={need(() => setAction({ kind: "claim" }))} />
                )}
                <ActionButton label="Leave the pool" icon="power" state={acts.leave} onClick={need(() => setAction({ kind: "leave" }))} variant="ghost" />
                <ActionButton label="Tune the terms" icon="scale" state={acts.terms} onClick={need(() => setAction({ kind: "terms" }))} variant="soft" />
                <ActionButton label="Call the pool off" icon="close" state={acts.cancel} onClick={need(() => setAction({ kind: "cancel" }))} variant="danger" />
                <ActionButton label="Settle the pool" icon="coins" state={acts.settle} onClick={need(() => setAction({ kind: "settle" }))} variant="soft" />
              </div>
            </section>
          )}

          <section className="card">
            <h3 className="cardtitle">Terms</h3>
            <dl className="facts">
              <Fact label="Stake" value={fmtGen(p.stake, 6)} />
              <Fact label="Slice per round" value={fmtGen(p.slice, 6)} hint="stake ÷ rounds" />
              <Fact label="Rounds" value={`${p.rounds} × ${fmtDuration(p.round_len)}`} />
              <Fact label="Members" value={`${p.min_entrants}–${p.max_entrants}`} />
              <Fact label="Grace" value={fmtDuration(p.grace)} hint="Extra time to file a claim after a round closed" />
              <Fact label="Review time" value={fmtDuration(p.review_span)} hint="After this, an unjudged claim is a final miss" />
              <Fact label="Dispute time" value={fmtDuration(p.dispute_span)} hint="How long a judgement can be contested" />
              <Fact label="Doubt limit" value={`${p.doubt_limit} / 100`} hint="MET counts only up to this doubt" />
              <Fact label="Contest bond" value={fmtGen(p.bond_due, 6)} />
            </dl>
          </section>

          <section className="card">
            <h3 className="cardtitle">Money</h3>
            <dl className="facts">
              <Fact label="Held by the pool" value={fmtGen(p.balance, 6)} />
              <Fact label="Bonds held" value={fmtGen(p.bonds, 6)} />
              {toBig(p.rewards) > 0n && <Fact label="Rewards paid" value={fmtGen(p.rewards, 6)} />}
              {toBig(p.forfeited) > 0n && <Fact label="Bonds forfeited" value={fmtGen(p.forfeited, 6)} />}
              {p.settled_at > 0 && <Fact label="Settled" value={fmtDate(p.settled_at)} />}
              <Fact label="Created" value={fmtDate(p.created)} />
            </dl>
            <a className="textlink" href={explorerAddress(p.organizer)} target="_blank" rel="noopener noreferrer">Organizer in the explorer <Icon name="up" size={13} /></a>
          </section>
        </aside>
      </div>

      <ActionHost action={action} pool={p} now={now} myMarks={myRow?.marks} onClose={() => setAction(null)} />
    </div>
  );
}
