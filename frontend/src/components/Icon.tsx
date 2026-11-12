import type { SVGProps } from "react";

const P: Record<string, JSX.Element> = {
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" /></>,
  moon: <path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7Z" />,
  wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><path d="M4 7.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.5a1.5 1.5 0 0 0-1.5-1.5H6.5A2.5 2.5 0 0 1 4 7.5Z" /><circle cx="16.2" cy="13.5" r="1.1" /></>,
  power: <><path d="M12 3.5v8" /><path d="M6.4 6.9a7.8 7.8 0 1 0 11.2 0" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2.2" /><path d="M5 15V6.2A2.2 2.2 0 0 1 7.2 4H16" /></>,
  check: <path d="m5 12.5 4.6 4.5L19 7.5" />,
  external: <><path d="M14 4h6v6" /><path d="M20 4l-9.5 9.5" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></>,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  up: <><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5" /><path d="M4 4v4.5h4.5" /><path d="M4 13a8 8 0 0 0 14.3 4.6L20 15.5" /><path d="M20 20v-4.5h-4.5" /></>,
  alert: <><path d="M12 3.8 2.8 19.5a1 1 0 0 0 .9 1.5h16.6a1 1 0 0 0 .9-1.5Z" /><path d="M12 10v4.5" /><path d="M12 17.6v.1" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5" /><path d="M12 7.6v.1" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" /><path d="M4 5.5v15A2.5 2.5 0 0 1 6.5 18H20v3H6.5" /></>,
  users: <><circle cx="9" cy="8.5" r="3.3" /><path d="M2.8 20c.4-3.4 3-5.4 6.2-5.4s5.8 2 6.2 5.4" /><path d="M16 5.4a3.3 3.3 0 0 1 0 6.2" /><path d="M18.6 14.9c1.6.8 2.5 2.4 2.7 4.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5.3l3.4 2" /></>,
  shield: <><path d="M12 3 4.5 6v5.6c0 4.5 3 8 7.5 9.4 4.5-1.4 7.5-4.9 7.5-9.4V6Z" /><path d="m8.8 12 2.4 2.4 4.2-4.6" /></>,
  scale: <><path d="M12 4v16M7 20h10" /><path d="M5 8h14" /><path d="m5 8-2.7 6.5a3.2 3.2 0 0 0 5.4 0Z" /><path d="m19 8-2.7 6.5a3.2 3.2 0 0 0 5.4 0Z" /></>,
  spark: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z M18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  link: <><path d="M10 14a4.2 4.2 0 0 0 6 0l3-3a4.2 4.2 0 0 0-6-6l-1 1" /><path d="M14 10a4.2 4.2 0 0 0-6 0l-3 3a4.2 4.2 0 0 0 6 6l1-1" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  coins: <><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" /><path d="M15 9.2c3 .1 6 1.3 6 2.8v5c0 1.7-2.7 3-6 3-2.2 0-4.1-.6-5.2-1.5" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4.5h11l-2 4 2 4H5" /></>,
  gavel: <><path d="m14 4.5 5.5 5.5-3 3L11 7.5Z" /><path d="m11 10-7 7a1.8 1.8 0 0 0 2.5 2.5l7-7" /><path d="M13 20.5h8" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.4" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.4 3.9 5.4 3.9 9s-1.3 6.6-3.9 9c-2.6-2.4-3.9-5.4-3.9-9S9.4 5.4 12 3Z" /></>,
  layers: <><path d="m12 3.5 9 4.6-9 4.6-9-4.6Z" /><path d="m3 12.2 9 4.6 9-4.6" /><path d="m3 16.4 9 4.6 9-4.6" /></>,
  filter: <path d="M4 5h16l-6.2 7.4V19l-3.6-1.8v-4.8Z" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>,
  zap: <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12Z" />,
  terminal: <><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="m7.5 10 3 2.5-3 2.5M13 15h4" /></>,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.3A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.3C19.5 15.4 12 20 12 20Z" />,
  user: <><circle cx="12" cy="8.5" r="3.6" /><path d="M4.5 20c.5-3.8 3.6-6 7.5-6s7 2.2 7.5 6" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4.5 6h.1M4.5 12h.1M4.5 18h.1" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
};

const FILLED: Record<string, JSX.Element> = {
  github: <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />,
  x: <path d="M18.2 2.2h3.3l-7.2 8.3 8.5 11.2h-6.7l-5.2-6.8-6 6.8H1.7l7.7-8.8L1.3 2.2h6.8l4.7 6.2Zm-1.2 17.5h1.8L7.1 4.1H5.1Z" />,
};

export type IconName = keyof typeof P | keyof typeof FILLED;

interface Props extends Omit<SVGProps<SVGSVGElement>, "name"> { name: IconName; size?: number }

export default function Icon({ name, size = 18, className, ...rest }: Props) {
  const filled = name in FILLED;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`icon ${className ?? ""}`}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {filled ? FILLED[name as string] : P[name as string]}
    </svg>
  );
}
