import { useRef } from "react";

const SRC = `${import.meta.env.BASE_URL}assets/mochi.webp`;

/** Mochi, the mascot. Tilts in 3D towards the pointer and floats gently. */
export default function Mochi({ size = 320, tilt = true, className = "", float = true, alt = "Mochi, the GenLayer cat mascot, holding a skateboard and showing a peace sign" }: { size?: number; tilt?: boolean; className?: string; float?: boolean; alt?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !tilt) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    el.style.setProperty("--ry", `${x * 12}deg`);
    el.style.setProperty("--rx", `${-y * 8}deg`);
  };
  const onLeave = () => {
    ref.current?.style.setProperty("--ry", "0deg");
    ref.current?.style.setProperty("--rx", "0deg");
  };
  return (
    <div ref={ref} className={`mochi ${float ? "is-float" : ""} ${className}`} style={{ width: size }} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="mochi__glow" />
      <img src={SRC} alt={alt} width={696} height={1100} loading="lazy" decoding="async" draggable={false} />
      <span className="mochi__shadow" />
    </div>
  );
}
