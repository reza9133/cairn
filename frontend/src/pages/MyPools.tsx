import { Link } from "react-router-dom";
import PoolCard from "../components/PoolCard";
import { Button, EmptyState, ErrorState, LinkButton, SectionTitle, Skeleton } from "../components/ui";
import Icon from "../components/Icon";
import { read } from "../lib/chain";
import { useNow } from "../lib/clock";
import { weiToGen, toBig, sameAddr } from "../lib/format";
import { useAsync } from "../lib/hooks";
import { claimableRounds, roleOf } from "../lib/pool";
import type { Pool } from "../lib/types";
import { openConnect, useWallet } from "../lib/wallet";

export default function MyPools() {
  const w = useWallet();
  const now = useNow(5000);
  const res = useAsync(() => read<Pool[]>("pools_of", [w.account, 0, 50]), [w.account], { enabled: !!w.account, interval: 20000 });

  if (!w.account) {
    return (
      <div className="page">
        <SectionTitle eyebrow="My pools" title="Your cairns in one place" />
        <EmptyState title="Connect a wallet to see your pools" action={<Button icon="wallet" size="lg" onClick={openConnect}>Connect wallet</Button>}>
          Pools you organize, referee or have joined appear here, together with the rounds that wait for your claim.
        </EmptyState>
      </div>
    );
  }

  const pools = res.data ?? [];
  const todo = pools.flatMap((p) => {
    const role = roleOf(p, w.account);
    if (!role.member || p.phase !== "running") return [];
    return claimableRounds(p, now)
      .filter((r) => (role.member!.marks[r] ?? "") === ".")
      .map((r) => ({ pool: p, round: r }));
  });
  const owed = pools.reduce((sum, p) => {
    const m = p.members.find((x) => sameAddr(x.who, w.account));
    return p.phase === "settled" && m ? sum + toBig(m.payout) : sum;
  }, 0n);

  return (
    <div className="page">
      <SectionTitle eyebrow="My pools" title="Your cairns in one place">
        Everything you organize, referee or have joined — newest first.
      </SectionTitle>

      {res.error && !res.data && <ErrorState error={res.error} onRetry={() => res.reload()} />}
      {res.loading && !res.data && <div className="grid grid--3">{[0, 1, 2].map((i) => <div key={i} className="card"><Skeleton h={22} w="55%" /><Skeleton h={14} className="mt" /></div>)}</div>}

      {todo.length > 0 && (
        <div className="todo">
          <h3><Icon name="flag" size={18} /> Waiting for your claim</h3>
          <ul>
            {todo.map(({ pool, round }) => (
              <li key={`${pool.id}-${round}`}>
                <span><b>{pool.title}</b> · round {round + 1}</span>
                <Link className="btn btn--primary btn--sm" to={`/pools/${pool.id}?round=${round}&member=${w.account}`}><span>Claim now</span><Icon name="arrow" size={15} /></Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {res.data && pools.length > 0 && (
        <>
          <div className="summary">
            <div><span>Pools</span><strong>{pools.length}</strong></div>
            <div><span>Running</span><strong>{pools.filter((p) => p.phase === "running" || p.phase === "finishing").length}</strong></div>
            <div><span>Paid out to you</span><strong>{weiToGen(owed, 5)} <small>GEN</small></strong></div>
          </div>
          <div className="grid grid--3">{pools.map((p, i) => <PoolCard key={p.id} pool={p} index={i} />)}</div>
        </>
      )}
      {res.data && pools.length === 0 && (
        <EmptyState title="No pools yet" action={<div className="row"><LinkButton to="/create" icon="plus">Create a pool</LinkButton><LinkButton to="/pools" variant="ghost" icon="layers">Browse pools</LinkButton></div>}>
          You have not created, refereed or joined a pool with this wallet.
        </EmptyState>
      )}
    </div>
  );
}
