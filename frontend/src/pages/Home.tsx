import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { CONTRACT_ADDRESS, GITHUB_URL, X_URL, X_HANDLE, CHAIN } from "../config";
import Icon from "../components/Icon";
import { GenLayerMark } from "../components/Logo";
import Mochi from "../components/Mochi";
import PoolCard from "../components/PoolCard";
import { StoneLoader } from "../components/Spinner";
import { AddressChip, Button, ErrorState, LinkButton, SectionTitle, Skeleton } from "../components/ui";
import { read } from "../lib/chain";
import { weiToGen } from "../lib/format";
import { useAsync, useReveal } from "../lib/hooks";
import type { Pool, Stats } from "../lib/types";
import { explorerAddress } from "../config";

const CairnScene = lazy(() => import("../components/CairnScene"));

const STEPS = [
  { icon: "flag" as const, title: "Open", text: "An organizer writes the rules in plain words, sets the stake, the rounds and the start. A referee is optional." },
  { icon: "users" as const, title: "Join", text: "Members send exactly the stake and name one public evidence page each. No two members share a page." },
  { icon: "link" as const, title: "Claim", text: "In every round a member files a short claim: what I did. No claim, no credit — and the AI is never asked." },
  { icon: "scale" as const, title: "Judge", text: "Anyone can ask the AI judge about a claim after the round closes. It can only ever make crediting harder." },
  { icon: "coins" as const, title: "Settle", text: "Kept rounds return the slice. Missed slices form a pot that the people who kept going share." },
];

const PRINCIPLES = [
  { icon: "lock" as const, title: "No claim, no credit", text: "A round without a claim is a deterministic miss. The model is never consulted about it." },
  { icon: "scale" as const, title: "The AI is a brake", text: "Its answer is measured against the pool's doubt limit. Too much doubt becomes UNCLEAR, and UNCLEAR never credits." },
  { icon: "gavel" as const, title: "Everything can be contested", text: "Put a bond on the table and a stricter second look decides. Rivals are paid for catching a wrong credit." },
  { icon: "shield" as const, title: "Nobody can lock the pool", text: "Unjudged claims lapse as misses after their review time, unaudited contests lapse, and a pool with too few members is called off by anyone." },
];

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useReveal<HTMLDivElement>();
  return <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

function Counter({ label, value, icon, loading }: { label: string; value: string; icon: Parameters<typeof Icon>[0]["name"]; loading: boolean }) {
  return (
    <div className="counter">
      <Icon name={icon} size={18} />
      <strong>{loading ? <Skeleton h={26} w={64} /> : value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ExampleBars() {
  const rows = [
    { name: "Alice", note: "kept both rounds", got: 0.012, stake: 0.006, color: "teal" },
    { name: "Bob", note: "kept one round", got: 0.006, stake: 0.006, color: "gold" },
    { name: "Carol", note: "kept none", got: 0, stake: 0.006, color: "violet" },
  ];
  const max = 0.012;
  return (
    <div className="example">
      <div className="example__head"><b>Three members, 0.006 GEN each, two rounds</b><span>pot 0.009 GEN</span></div>
      {rows.map((r) => (
        <div className="example__row" key={r.name}>
          <span className="example__who"><b>{r.name}</b><small>{r.note}</small></span>
          <div className="example__bar">
            <i className="example__stake" style={{ width: `${(r.stake / max) * 100}%` }} />
            <i className={`example__got example__got--${r.color}`} style={{ width: `${(r.got / max) * 100}%` }} />
          </div>
          <span className="example__val">{r.got.toFixed(3)} <small>GEN</small></span>
        </div>
      ))}
      <p className="example__foot"><i className="swatch swatch--stake" /> staked <i className="swatch swatch--got" /> paid out. Missed slices went to the people who kept going.</p>
    </div>
  );
}

export default function Home() {
  const stats = useAsync(() => read<Stats>("stats"), [], { interval: 30000 });
  const latest = useAsync(() => read<Pool[]>("list_pools", [0, 3]), [], { interval: 30000 });
  const s = stats.data;

  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <span className="eyebrow eyebrow--pill"><i /> Live on {CHAIN.name}</span>
          <h1>Stake on your word.<br /><span className="grad">Let the evidence decide.</span></h1>
          <p className="hero__lead">
            Cairn is a GenLayer Intelligent Contract where a group stakes money on keeping a promise, round after round. Every round needs a public page as proof,
            and an AI judge that can only ever be <em>as generous as the pool allows</em> reads it.
          </p>
          <div className="hero__cta">
            <LinkButton to="/pools" size="lg" icon="layers">Explore pools</LinkButton>
            <LinkButton to="/create" size="lg" variant="soft" icon="plus">Create a pool</LinkButton>
            <LinkButton to="/docs/introduction" size="lg" variant="ghost" icon="book">Read the docs</LinkButton>
          </div>
          <div className="counters">
            <Counter icon="layers" label="pools" value={String(s?.pools ?? 0)} loading={stats.loading && !s} />
            <Counter icon="flag" label="claims" value={String(s?.claims ?? 0)} loading={stats.loading && !s} />
            <Counter icon="scale" label="judgements" value={String(s?.judgements ?? 0)} loading={stats.loading && !s} />
            <Counter icon="coins" label="GEN staked" value={weiToGen(s?.volume ?? 0, 4)} loading={stats.loading && !s} />
          </div>
          {stats.error && !s && <ErrorState error={stats.error} onRetry={() => stats.reload()} title="Live numbers are unavailable" />}
        </div>
        <div className="hero__stage">
          <Suspense fallback={<div className="scene scene--loading"><StoneLoader size={84} /></div>}>
            <CairnScene stones={5} className="scene--hero" />
          </Suspense>
          <div className="hero__mochi"><Mochi size={250} /></div>
          <span className="hero__hint"><Icon name="spark" size={13} /> click the stones</span>
        </div>
      </section>

      <section className="section">
        <Reveal><SectionTitle eyebrow="How a cairn is built" title="One stone per kept promise">
          A cairn marks a trail: each stone is a step somebody really took. Here, each stone is a round with a claim and a page behind it.
        </SectionTitle></Reveal>
        <ol className="steprow">
          {STEPS.map((st, i) => (
            <Reveal key={st.title} delay={i * 70} className="steprow__item">
              <li className="card tilt">
                <span className="steprow__n">{i + 1}</span>
                <Icon name={st.icon} size={26} className="steprow__icon" />
                <h3>{st.title}</h3>
                <p>{st.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="section section--split">
        <Reveal>
          <SectionTitle eyebrow="The money" title="Missed slices become the pot">
            The stake is split into one slice per round. A member gets back the slices of the rounds that counted, plus a share of the pot in proportion to the rounds that counted.
          </SectionTitle>
          <ul className="checks">
            <li><Icon name="check" size={16} /> Everything about money is deterministic Python — the model never touches an amount.</li>
            <li><Icon name="check" size={16} /> The payouts of a settlement add up to the pool’s balance exactly, or the contract refuses to settle.</li>
            <li><Icon name="check" size={16} /> If nobody counted, the whole balance is shared equally.</li>
          </ul>
          <LinkButton to="/docs/money" variant="soft" icon="arrow">Money rules in detail</LinkButton>
        </Reveal>
        <Reveal delay={100}><ExampleBars /></Reveal>
      </section>

      <section className="section">
        <Reveal><SectionTitle eyebrow="Design" title="Why the AI is a brake, not a judge with a wallet" /></Reveal>
        <div className="grid grid--4">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 70}>
              <article className="card tilt principle">
                <span className="principle__icon"><Icon name={p.icon} size={22} /></span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <Reveal><SectionTitle eyebrow="Live from Studionet" title="Newest pools" /></Reveal>
        {latest.error && !latest.data && <ErrorState error={latest.error} onRetry={() => latest.reload()} />}
        {latest.loading && !latest.data && <div className="grid grid--3">{[0, 1, 2].map((i) => <div key={i} className="card"><Skeleton h={22} w="60%" /><Skeleton h={14} className="mt" /><Skeleton h={14} w="80%" className="mt" /></div>)}</div>}
        {latest.data && latest.data.length === 0 && (
          <div className="card card--center"><h3>No pool yet</h3><p className="muted">Be the first to open one.</p><LinkButton to="/create" icon="plus">Create a pool</LinkButton></div>
        )}
        {latest.data && latest.data.length > 0 && <div className="grid grid--3">{latest.data.map((p, i) => <PoolCard key={p.id} pool={p} index={i} />)}</div>}
        <div className="center mt-lg"><LinkButton to="/pools" variant="ghost" icon="arrow">All pools</LinkButton></div>
      </section>

      <section className="section">
        <Reveal>
          <div className="contractcard">
            <div>
              <span className="eyebrow">The contract</span>
              <h2>Deployed. Verifiable. Open.</h2>
              <p>This site talks to one Intelligent Contract on {CHAIN.name} (chain id {CHAIN.id}). Every number you see is read from it, and every button sends a real transaction from your wallet.</p>
              <div className="contractcard__row"><AddressChip address={CONTRACT_ADDRESS} label="Address" /></div>
              <div className="contractcard__links">
                <a className="btn btn--soft btn--md" href={explorerAddress(CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} /><span>Open in explorer</span></a>
                <a className="btn btn--ghost btn--md" href={GITHUB_URL} target="_blank" rel="noopener noreferrer"><Icon name="github" size={16} /><span>Source on GitHub</span></a>
              </div>
            </div>
            <div className="contractcard__mochi"><Mochi size={190} /></div>
          </div>
        </Reveal>
      </section>

      <section className="section section--cta">
        <Reveal>
          <div className="cta">
            <GenLayerMark size={30} />
            <h2>Ready to build your first cairn?</h2>
            <p>Connect a wallet, open a pool for your group, and let the stones pile up.</p>
            <div className="hero__cta hero__cta--center">
              <LinkButton to="/create" size="lg" icon="plus">Create a pool</LinkButton>
              <LinkButton to="/docs/quickstart" size="lg" variant="ghost" icon="book">Quickstart</LinkButton>
            </div>
            <p className="cta__by">Built by <a href={X_URL} target="_blank" rel="noopener noreferrer">{X_HANDLE}</a> · <Link to="/docs/introduction">How it works</Link></p>
          </div>
        </Reveal>
      </section>
    </>
  );
}
