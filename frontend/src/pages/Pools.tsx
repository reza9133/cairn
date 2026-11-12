import { useMemo, useState } from "react";
import PoolCard from "../components/PoolCard";
import Icon from "../components/Icon";
import { Button, EmptyState, ErrorState, LinkButton, SectionTitle, Skeleton } from "../components/ui";
import { read } from "../lib/chain";
import { useAsync } from "../lib/hooks";
import { phaseLabel } from "../lib/pool";
import type { Phase, Pool } from "../lib/types";

const PAGE = 24;
const FILTERS: ("all" | Phase)[] = ["all", "joining", "running", "finishing", "settled", "cancelled", "failed"];

export default function Pools() {
  const [limit, setLimit] = useState(PAGE);
  const [filter, setFilter] = useState<"all" | Phase>("all");
  const [q, setQ] = useState("");
  const res = useAsync(() => read<Pool[]>("list_pools", [0, Math.min(limit, 50)]), [limit], { interval: 20000 });
  const [more, setMore] = useState<Pool[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const all = useMemo(() => {
    const seen = new Set<number>();
    return [...(res.data ?? []), ...more].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  }, [res.data, more]);

  const shown = all.filter((p) => (filter === "all" || p.phase === filter) && (!q.trim() || `${p.title} ${p.id} ${p.rules}`.toLowerCase().includes(q.trim().toLowerCase().replace(/^#/, ""))));
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length };
    all.forEach((p) => (c[p.phase] = (c[p.phase] ?? 0) + 1));
    return c;
  }, [all]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const page = await read<Pool[]>("list_pools", [all.length, 50]);
      setMore((m) => [...m, ...page]);
      if (page.length < 50) setExhausted(true);
    } finally { setLoadingMore(false); }
  }

  return (
    <div className="page">
      <SectionTitle eyebrow="Pools" title="Every commitment pool on Studionet">
        Newest first. Open a pool to join it, file claims, ask the judge or settle it.
      </SectionTitle>

      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={17} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, rules or #id" aria-label="Search pools" />
        </label>
        <div className="chips" role="tablist" aria-label="Filter by phase">
          {FILTERS.map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} className={`chip ${filter === f ? "is-on" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : phaseLabel[f]}{counts[f] ? <small>{counts[f]}</small> : null}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" icon="refresh" onClick={() => res.reload()}>Refresh</Button>
      </div>

      {res.error && !res.data && <ErrorState error={res.error} onRetry={() => res.reload()} />}
      {res.loading && !res.data && <div className="grid grid--3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="card"><Skeleton h={22} w="55%" /><Skeleton h={14} className="mt" /><Skeleton h={14} w="75%" className="mt" /></div>)}</div>}

      {res.data && all.length === 0 && (
        <EmptyState title="No pools yet" action={<LinkButton to="/create" icon="plus">Create the first pool</LinkButton>}>Nobody has opened a pool on this contract. You could be first.</EmptyState>
      )}
      {res.data && all.length > 0 && shown.length === 0 && <EmptyState title="Nothing matches" mochi={false}>Try another phase or a shorter search.</EmptyState>}
      {shown.length > 0 && <div className="grid grid--3">{shown.map((p, i) => <PoolCard key={p.id} pool={p} index={i} />)}</div>}

      {res.data && all.length >= PAGE && !exhausted && (
        <div className="center mt-lg"><Button variant="soft" busy={loadingMore} onClick={loadMore}>Load older pools</Button></div>
      )}
    </div>
  );
}
