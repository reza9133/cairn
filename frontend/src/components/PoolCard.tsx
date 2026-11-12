import { Link } from "react-router-dom";
import { fmtDuration, plural, weiToGen } from "../lib/format";
import { useNow } from "../lib/clock";
import { nextMilestone, roleOf } from "../lib/pool";
import { useWallet } from "../lib/wallet";
import type { Pool } from "../lib/types";
import Icon from "./Icon";
import StoneStack from "./StoneStack";
import { PhaseBadge, Tag } from "./ui";

export default function PoolCard({ pool, index = 0 }: { pool: Pool; index?: number }) {
  const now = useNow(1000);
  const w = useWallet();
  const role = roleOf(pool, w.account);
  const next = nextMilestone(pool, now);
  const members = pool.members ?? [];
  return (
    <Link to={`/pools/${pool.id}`} className="poolcard tilt" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
      <div className="poolcard__stack"><StoneStack count={pool.rounds} width={58} /></div>
      <div className="poolcard__body">
        <div className="poolcard__top">
          <span className="poolcard__id">#{pool.id}</span>
          <PhaseBadge phase={pool.phase} />
          {role.organizer && <Tag tone="violet">organizer</Tag>}
          {role.member && <Tag tone="teal">you are in</Tag>}
          {role.referee && <Tag tone="gold">referee</Tag>}
        </div>
        <h3>{pool.title}</h3>
        <dl className="poolcard__facts">
          <div><dt>Stake</dt><dd>{weiToGen(pool.stake, 5)} <small>GEN</small></dd></div>
          <div><dt>Rounds</dt><dd>{pool.rounds} <small>× {fmtDuration(pool.round_len, 1)}</small></dd></div>
          <div><dt>Members</dt><dd>{pool.active}<small>/{pool.max_entrants}</small></dd></div>
        </dl>
        <div className="poolcard__foot">
          {next ? <span><Icon name="clock" size={14} /> {next.label} <b>{fmtDuration(Math.max(0, next.at - now))}</b></span>
            : <span className="muted">{pool.phase === "settled" ? plural(members.filter((m) => !m.left).length, "member") + " paid out" : pool.phase === "cancelled" ? "Stakes returned" : pool.phase === "failed" ? "Too few members — can be called off" : "Waiting for the last judgements"}</span>}
          <Icon name="arrow" size={16} className="poolcard__go" />
        </div>
      </div>
    </Link>
  );
}
