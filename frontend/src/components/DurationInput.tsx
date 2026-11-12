import { useEffect, useRef, useState } from "react";

export type Unit = "seconds" | "minutes" | "hours" | "days";
const SIZE: Record<Unit, number> = { seconds: 1, minutes: 60, hours: 3600, days: 86400 };

function best(seconds: number, units: Unit[]): { text: string; unit: Unit } {
  for (const u of [...units].sort((a, b) => SIZE[b] - SIZE[a])) {
    if (seconds >= SIZE[u] && seconds % SIZE[u] === 0) return { text: String(seconds / SIZE[u]), unit: u };
  }
  const u = units[0];
  return { text: String(Math.round((seconds / SIZE[u]) * 100) / 100), unit: u };
}

/** A number plus a unit; reports whole seconds (NaN while the text is not a valid number). */
export default function DurationInput({ seconds, onChange, units = ["minutes", "hours", "days"], id, ariaLabel }: { seconds: number; onChange: (s: number) => void; units?: Unit[]; id?: string; ariaLabel?: string }) {
  const init = useRef(best(seconds, units));
  const [text, setText] = useState(init.current.text);
  const [unit, setUnit] = useState<Unit>(init.current.unit);
  useEffect(() => {
    const n = Number(text.replace(",", "."));
    onChange(text.trim() !== "" && Number.isFinite(n) && n >= 0 ? Math.round(n * SIZE[unit]) : NaN);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, unit]);
  return (
    <span className="duration">
      <input id={id} aria-label={ariaLabel} inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} />
      <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} aria-label="Unit">
        {units.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
    </span>
  );
}
