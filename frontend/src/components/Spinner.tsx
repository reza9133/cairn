import { CairnMark } from "./Logo";

/** Three stones drop one after the other and the stack sways in 3D. Used wherever the site waits for the chain. */
export function StoneLoader({ size = 72, label = "Loading" }: { size?: number; label?: string }) {
  return (
    <div className="stoneloader" style={{ width: size, height: size }} role="status" aria-label={label}>
      <div className="stoneloader__stage">
        <span className="stoneloader__shadow" />
        <svg className="stoneloader__stone sl-1" viewBox="0 0 120 60"><defs><linearGradient id="sl1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7d6cff" /><stop offset="1" stopColor="#3a2cb4" /></linearGradient></defs><path d="M6 30C6 14 30 4 60 4s54 10 54 26-24 26-54 26S6 46 6 30Z" fill="url(#sl1)" /><path d="M20 22c10-8 26-11 44-11" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="4" strokeLinecap="round" /></svg>
        <svg className="stoneloader__stone sl-2" viewBox="0 0 120 60"><defs><linearGradient id="sl2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2fe0cd" /><stop offset="1" stopColor="#0a8683" /></linearGradient></defs><path d="M14 30C14 15 34 6 60 6s46 9 46 24-20 24-46 24S14 45 14 30Z" fill="url(#sl2)" /><path d="M28 23c8-6 20-9 34-9" fill="none" stroke="#fff" strokeOpacity=".42" strokeWidth="4" strokeLinecap="round" /></svg>
        <svg className="stoneloader__stone sl-3" viewBox="0 0 120 60"><defs><linearGradient id="sl3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd25a" /><stop offset="1" stopColor="#ec9410" /></linearGradient></defs><path d="M26 30C26 17 40 9 60 9s34 8 34 21-14 21-34 21-34-8-34-21Z" fill="url(#sl3)" /><path d="M38 24c6-4 14-6 22-6" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="4" strokeLinecap="round" /></svg>
        <span className="stoneloader__spark" />
      </div>
    </div>
  );
}

/** Small ring for buttons and inline waits. */
export function Ring({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <span className={`ring ${className}`} style={{ width: size, height: size }} role="status" aria-label="Loading" />;
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="pageload">
      <StoneLoader size={92} label={label} />
      <p>{label}</p>
    </div>
  );
}

export function BrandSplash() {
  return (
    <div className="pageload pageload--splash">
      <CairnMark size={74} animated />
    </div>
  );
}
