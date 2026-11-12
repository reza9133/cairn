import { useId } from "react";
import { Link } from "react-router-dom";

/** The Cairn mark: three stones and a spark. Colours come from the brand palette, so it works on light and dim themes. */
export function CairnMark({ size = 36, className = "", animated = false }: { size?: number; className?: string; animated?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={`cairn-mark ${animated ? "is-animated" : ""} ${className}`} role="img" aria-label="Cairn logo">
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7d6cff" /><stop offset="1" stopColor="#3a2cb4" /></linearGradient>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2fe0cd" /><stop offset="1" stopColor="#0a8683" /></linearGradient>
        <linearGradient id={`t${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd25a" /><stop offset="1" stopColor="#ec9410" /></linearGradient>
        <radialGradient id={`s${id}`} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#e9fffc" /><stop offset=".45" stopColor="#4bf4e4" /><stop offset="1" stopColor="#4bf4e4" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="60" cy="112" rx="40" ry="5" fill="#000" opacity=".16" className="cm-ground" />
      <g className="cm-base">
        <path d="M14 95C14 80 34 73 60 73c27 0 46 8 46 22 0 12-19 19-46 19S14 108 14 95Z" fill={`url(#b${id})`} />
        <path d="M24 88c8-7 22-10 36-10" fill="none" stroke="#fff" strokeOpacity=".38" strokeWidth="3.2" strokeLinecap="round" />
        <ellipse cx="62" cy="80" rx="29" ry="5" fill="#0b0640" opacity=".28" />
      </g>
      <g className="cm-mid">
        <path d="M30 66c0-12 14-18 32-18s32 6 32 18-14 17-32 17-32-5-32-17Z" fill={`url(#m${id})`} />
        <path d="M39 60c6-5 14-7 23-7" fill="none" stroke="#fff" strokeOpacity=".42" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="59" cy="50" rx="19" ry="3.6" fill="#04403f" opacity=".3" />
      </g>
      <g className="cm-top">
        <path d="M38 40c0-9 9-14 21-14s21 5 21 14-9 13-21 13-21-4-21-13Z" fill={`url(#t${id})`} />
        <path d="M46 35c4-3 9-4 14-4" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <g className="cm-spark">
        <circle cx="61" cy="12" r="11" fill={`url(#s${id})`} />
        <path d="M61 4.5l2.2 5.3 5.3 2.2-5.3 2.2L61 19.5l-2.2-5.3-5.3-2.2 5.3-2.2Z" fill="#fff" />
      </g>
    </svg>
  );
}

export default function Logo({ to = "/", size = 38, compact = false }: { to?: string; size?: number; compact?: boolean }) {
  return (
    <Link to={to} className="logo" aria-label="Cairn home">
      <CairnMark size={size} animated />
      {!compact && (
        <span className="logo__word">
          cairn
          <small>on GenLayer</small>
        </span>
      )}
    </Link>
  );
}

/** The GenLayer triangle, painted with the current text colour so it follows the theme. */
export function GenLayerMark({ size = 18, className = "" }: { size?: number; className?: string }) {
  const url = `${import.meta.env.BASE_URL}assets/genlayer-mark.png`;
  return (
    <span
      className={`gl-mark ${className}`}
      role="img"
      aria-label="GenLayer"
      style={{ width: size, height: size, WebkitMaskImage: `url(${url})`, maskImage: `url(${url})` }}
    />
  );
}
