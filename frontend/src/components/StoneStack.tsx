import { markInfo } from "../lib/pool";

/**
 * A small cairn: one stone per round, round 1 at the bottom. Each stone shows what happened in that round.
 * With only `count` the stones are neutral (used as decoration and in the create-pool preview).
 */
export default function StoneStack({ marks, count, width = 64, highlight = -1, className = "" }: { marks?: string; count?: number; width?: number; highlight?: number; className?: string }) {
  const n = marks ? marks.length : count ?? 3;
  const hS = Math.max(6, Math.min(16, 118 / Math.max(n, 1)));
  const gap = hS * 0.12;
  const H = n * (hS - gap) + gap + 8;
  const rows = Array.from({ length: n }, (_, i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    const w = 94 - t * 52;
    const x = (100 - w) / 2 + Math.sin(i * 1.9) * 2.4;
    const y = H - 4 - (i + 1) * (hS - gap) - gap;
    const kind = marks ? markInfo(marks[i]).kind : "tone";
    return { i, w, x, y, kind };
  });
  return (
    <svg viewBox={`0 0 100 ${H}`} width={width} height={(width * H) / 100} className={`stonestack ${className}`} role="img" aria-label={marks ? `Rounds: ${marks}` : `${n} rounds`}>
      {rows.map(({ i, w, x, y, kind }) => (
        <g key={i} className={`stonestack__stone is-${kind} ${highlight === i ? "is-hot" : ""}`} style={{ animationDelay: `${i * 70}ms` }}>
          <rect x={x} y={y} width={w} height={hS} rx={hS / 2} />
          <rect x={x + w * 0.14} y={y + hS * 0.2} width={w * 0.34} height={Math.max(1.4, hS * 0.16)} rx={hS * 0.08} className="shine" />
        </g>
      ))}
    </svg>
  );
}
