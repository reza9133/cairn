import { CONTRACT_ADDRESS } from "../config";
import Icon from "../components/Icon";
import { AddressChip, ErrorState, SectionTitle, Skeleton, Stat } from "../components/ui";
import { read } from "../lib/chain";
import { fmtGen, toBig, weiToGen } from "../lib/format";
import { useAsync } from "../lib/hooks";
import type { Solvency, Stats } from "../lib/types";

export default function Ledger() {
  const stats = useAsync(() => read<Stats>("stats"), [], { interval: 20000 });
  const sol = useAsync(() => read<Solvency>("solvency"), [], { interval: 20000 });
  const s = stats.data, v = sol.data;
  const deposited = toBig(v?.deposited);
  const parts = v ? [
    { key: "paid", label: "Paid out", value: toBig(v.paid), cls: "paid" },
    { key: "held", label: "Held by pools", value: toBig(v.held), cls: "held" },
    { key: "bonds", label: "Contest bonds", value: toBig(v.bonds), cls: "bonds" },
  ] : [];
  const pctOf = (x: bigint) => (deposited > 0n ? Number((x * 10000n) / deposited) / 100 : 0);

  return (
    <div className="page">
      <SectionTitle eyebrow="Ledger" title="The books of the contract">
        Read straight from the contract. Everything that was ever paid in is either paid out or still held by a pool — and the contract can prove it.
      </SectionTitle>

      {(stats.error || sol.error) && !s && !v && <ErrorState error={(stats.error ?? sol.error)!} onRetry={() => { stats.reload(); sol.reload(); }} />}

      <div className="card ledger">
        <div className="ledger__head">
          <div>
            <span className="eyebrow">Solvency</span>
            <h3>{!v ? <Skeleton h={28} w={220} /> : v.balanced ? <><Icon name="check" size={22} className="ok" /> The books balance</> : <><Icon name="alert" size={22} className="danger" /> The books do not balance</>}</h3>
          </div>
          <AddressChip address={CONTRACT_ADDRESS} label="Contract" />
        </div>
        <div className="ledger__total"><span>Ever paid in</span><strong>{v ? fmtGen(v.deposited, 6) : <Skeleton h={30} w={170} />}</strong></div>
        <div className="ledger__bar" role="img" aria-label="Where the deposited money is">
          {parts.map((p) => <i key={p.key} className={`ledger__seg ledger__seg--${p.cls}`} style={{ width: `${pctOf(p.value)}%` }} title={`${p.label}: ${weiToGen(p.value)} GEN`} />)}
        </div>
        <div className="ledger__legend">
          {parts.map((p) => <div key={p.key}><i className={`swatch ledger__seg--${p.cls}`} /><span>{p.label}</span><b>{weiToGen(p.value, 6)} GEN</b><small>{pctOf(p.value).toFixed(1)}%</small></div>)}
        </div>
        <p className="muted small">Rule checked by <code>solvency()</code>: deposited = paid + held, and the bonds held by the pools add up to the bonds the contract reports.</p>
      </div>

      <div className="grid grid--4 mt-lg">
        <Stat icon="layers" label="Pools opened" value={s ? s.pools : <Skeleton h={28} w={50} />} />
        <Stat icon="flag" label="Claims filed" value={s ? s.claims : <Skeleton h={28} w={50} />} />
        <Stat icon="scale" label="AI judgements" value={s ? s.judgements : <Skeleton h={28} w={50} />} />
        <Stat icon="coins" label="Volume" value={s ? fmtGen(s.volume, 5) : <Skeleton h={28} w={110} />} />
        <Stat icon="check" label="Pools settled" value={s ? s.settled : <Skeleton h={28} w={50} />} />
        <Stat icon="close" label="Pools called off" value={s ? s.cancelled : <Skeleton h={28} w={50} />} />
        <Stat icon="shield" label="Contests upheld" value={s ? s.contests_upheld : <Skeleton h={28} w={50} />} sub="the second look agreed" />
        <Stat icon="gavel" label="Contests dismissed" value={s ? s.contests_dismissed : <Skeleton h={28} w={50} />} sub="the judgement stood" />
        <Stat icon="user" label="Referee rulings" value={s ? s.overruled : <Skeleton h={28} w={50} />} />
        <Stat icon="lock" label="Bonds held now" value={v ? fmtGen(v.bonds, 5) : <Skeleton h={28} w={110} />} />
      </div>
    </div>
  );
}
