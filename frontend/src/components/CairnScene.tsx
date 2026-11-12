import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { usePrefersReducedMotion } from "../lib/hooks";
import { useTheme, type Theme } from "../lib/theme";
import { CairnMark } from "./Logo";

/* ------------------------------------------------------------------------------------------------------------------
 * A real-time 3D cairn: glossy pebbles that levitate, a glowing spark, ripples on the ground and drifting dust.
 *  - one stone per round when used in the create-pool preview (`stones` is live)
 *  - pointer parallax, click = the stones jump one after the other
 *  - pauses when off screen or when the tab is hidden, honours prefers-reduced-motion
 * ------------------------------------------------------------------------------------------------------------------ */

const PALETTE = [0x6a5af0, 0x17b8a8, 0xf3b72b, 0xd957e8, 0x35e3d6, 0x4658dd];

interface Engine {
  setStones(n: number): void;
  setTheme(t: Theme): void;
  pulse(): void;
  dispose(): void;
}

function pebbleGeometry(seed: number, sx: number, sy: number, sz: number): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, 12);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g, 1e-3);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const lump =
      0.035 * Math.sin(v.x * 3.1 + seed) + 0.03 * Math.sin(v.y * 2.3 + seed * 1.7) + 0.026 * Math.sin(v.z * 3.7 + seed * 0.6) + 0.014 * Math.sin((v.x + v.y + v.z) * 6 + seed);
    const r = 1 + lump;
    // flatten the poles a little so that the stones sit on each other like real pebbles
    const fy = Math.sign(v.y) * Math.pow(Math.abs(v.y), 1.18);
    pos.setXYZ(i, v.x * r * sx, fy * r * sy, v.z * r * sz);
  }
  g.computeVertexNormals();
  return g;
}

function glowTexture(inner: string, outer: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner);
  gr.addColorStop(0.35, outer);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = gr;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function starTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  x.translate(64, 64);
  x.fillStyle = "#ffffff";
  x.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const r = i % 2 === 0 ? 58 : 9;
    x.lineTo(Math.cos(a - Math.PI / 2) * r, Math.sin(a - Math.PI / 2) * r);
  }
  x.closePath();
  x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function createEngine(host: HTMLElement, opts: { stones: number; interactive: boolean; reduced: boolean; theme: Theme }): Engine {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;

  const key = new THREE.DirectionalLight(0xfff1dc, 1.8);
  key.position.set(4, 7, 5);
  const cyan = new THREE.PointLight(0x35e3d6, 40, 0, 2);
  cyan.position.set(-4.5, 2.5, 3.5);
  const violet = new THREE.PointLight(0xa070ff, 30, 0, 2);
  violet.position.set(4, -0.5, -3);
  scene.add(key, cyan, violet);

  const group = new THREE.Group();
  scene.add(group);

  /* ---- stones ---- */
  type Stone = { mesh: THREE.Mesh; base: number; phase: number; amp: number; spin: number; o: number; v: number; kick: number };
  let stones: Stone[] = [];
  let totalH = 3;
  let maxW = 1.6;
  let n = opts.stones;

  const disposeStones = () => {
    stones.forEach((s) => {
      group.remove(s.mesh);
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
    });
    stones = [];
  };

  const buildStones = (count: number) => {
    disposeStones();
    n = Math.max(2, Math.min(14, count));
    const wBase = n <= 6 ? 1.7 : 1.5;
    const wTop = n <= 6 ? 0.62 : 0.5;
    let y = 0;
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0;
      const w = wBase + (wTop - wBase) * Math.pow(t, 0.9);
      const sy = w * 0.4;
      const geo = pebbleGeometry(i * 2.37 + 1, w, sy, w * (0.86 + 0.1 * Math.sin(i * 1.3)));
      const mat = new THREE.MeshPhysicalMaterial({
        color: PALETTE[i % PALETTE.length],
        roughness: 0.34,
        metalness: 0.04,
        clearcoat: 0.7,
        clearcoatRoughness: 0.28,
        sheen: 0.4,
        sheenColor: new THREE.Color(0xffffff),
      });
      const mesh = new THREE.Mesh(geo, mat);
      y += sy * 0.96 + (i === 0 ? 0.08 : 0.07);
      mesh.position.set(Math.sin(i * 2.1) * 0.06 * w, y, Math.cos(i * 1.7) * 0.05 * w);
      mesh.rotation.y = i * 1.1;
      group.add(mesh);
      stones.push({ mesh, base: y, phase: i * 0.9, amp: 0.012 + 0.03 * t, spin: (i % 2 ? 1 : -1) * (0.08 + 0.05 * t), o: 0, v: 0, kick: -1 });
      y += sy * 0.96;
    }
    totalH = y;
    maxW = wBase;
    spark.position.y = totalH + 0.75;
    star.position.y = totalH + 0.75;
    frame();
    shadow.scale.setScalar(maxW * 3.4);
    rings.forEach((r) => (r.userData.base = maxW));
  };

  /* ---- spark above the stack ---- */
  const sparkMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(170,255,246,1)", "rgba(53,227,214,0.5)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const spark = new THREE.Sprite(sparkMat);
  const starMat = new THREE.SpriteMaterial({ map: starTexture(), transparent: true, depthWrite: false, color: 0xffffff });
  const star = new THREE.Sprite(starMat);
  group.add(spark, star);

  /* ---- ground: contact shadow + ripples ---- */
  const shadowTex = glowTexture("rgba(0,0,0,0.9)", "rgba(0,0,0,0.35)");
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.3 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.004;
  group.add(shadow);

  const rings: THREE.Mesh[] = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.98, 1, 128), new THREE.MeshBasicMaterial({ color: 0x6a5af0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.006;
    m.userData = { offset: i / 3, base: 1.7 };
    group.add(m);
    return m;
  });

  /* ---- drifting dust ---- */
  const COUNT = host.clientWidth < 420 ? 70 : 150;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(COUNT * 3);
  const pSeed = new Float32Array(COUNT);
  const pCol = new Float32Array(COUNT * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.2 + Math.random() * 3.2;
    pPos.set([Math.cos(a) * r, Math.random() * 8, Math.sin(a) * r * 0.8], i * 3);
    pSeed[i] = Math.random();
    tmp.setHex(PALETTE[i % PALETTE.length]);
    pCol.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("aSeed", new THREE.BufferAttribute(pSeed, 1));
  pGeo.setAttribute("aColor", new THREE.BufferAttribute(pCol, 3));
  const pMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uRange: { value: 8 }, uOpacity: { value: 0.85 } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uPx; uniform float uRange;
      attribute float aSeed; attribute vec3 aColor;
      varying vec3 vColor; varying float vA;
      void main(){
        float t = uTime * (0.10 + aSeed * 0.14) + aSeed * 40.0;
        vec3 p = position;
        p.y = mod(p.y + t, uRange);
        p.x += sin(t * 1.7 + aSeed * 20.0) * 0.35;
        p.z += cos(t * 1.3 + aSeed * 17.0) * 0.35;
        float k = p.y / uRange;
        vA = smoothstep(0.0, 0.12, k) * (1.0 - smoothstep(0.7, 1.0, k));
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (14.0 + aSeed * 26.0) * uPx / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying vec3 vColor; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d);
        gl_FragColor = vec4(vColor, a * vA * uOpacity);
      }`,
  });
  const dust = new THREE.Points(pGeo, pMat);
  group.add(dust);

  /* ---- camera framing ---- */
  function frame() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    camera.aspect = w / h;
    const fov = (camera.fov * Math.PI) / 180;
    const needH = totalH + 3.6;
    const distH = needH / 2 / Math.tan(fov / 2);
    const distW = (maxW * 2 + 1.4) / 2 / (Math.tan(fov / 2) * camera.aspect);
    const d = Math.max(distH, distW);
    const cy = totalH * 0.5 + 0.15;
    camera.position.set(0, cy + totalH * 0.12, d);
    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();
    (pMat.uniforms.uRange as { value: number }).value = totalH + 3;
  }

  /* ---- theme ---- */
  let theme = opts.theme;
  const applyTheme = (t: Theme) => {
    theme = t;
    const dim = t === "dim";
    scene.environmentIntensity = dim ? 0.5 : 0.55;
    key.intensity = dim ? 1.6 : 2.4;
    cyan.intensity = dim ? 70 : 26;
    violet.intensity = dim ? 50 : 18;
    renderer.toneMappingExposure = dim ? 1.0 : 0.95;
    pMat.blending = dim ? THREE.AdditiveBlending : THREE.NormalBlending;
    pMat.uniforms.uOpacity.value = dim ? 0.9 : 0.75;
    pMat.needsUpdate = true;
    sparkMat.blending = dim ? THREE.AdditiveBlending : THREE.NormalBlending;
    sparkMat.opacity = dim ? 1 : 0.55;
    sparkMat.needsUpdate = true;
    starMat.color.setHex(dim ? 0xffffff : 0x0fb5a8);
    (shadow.material as THREE.MeshBasicMaterial).opacity = dim ? 0.55 : 0.28;
    rings.forEach((r) => (r.material as THREE.MeshBasicMaterial).color.setHex(dim ? 0x35e3d6 : 0x5b4de0));
    requestRender();
  };

  /* ---- interaction ---- */
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  const onLeave = () => { target.x = 0; target.y = 0; };
  const pulse = () => {
    const now = performance.now() / 1000;
    stones.forEach((s, i) => (s.kick = now + i * 0.055));
    requestRender();
  };
  if (opts.interactive && !opts.reduced) {
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", pulse);
  }

  /* ---- loop ---- */
  let raf = 0;
  let visible = true;
  let running = false;
  let last = performance.now() / 1000;
  let time = 0;
  let spin = 0.35;

  function render(dt: number) {
    time += dt;
    const now = performance.now() / 1000;
    cur.x += (target.x - cur.x) * Math.min(1, dt * 4);
    cur.y += (target.y - cur.y) * Math.min(1, dt * 4);
    spin += dt * 0.22;
    group.rotation.y = spin + cur.x * 0.55;
    group.rotation.x = cur.y * 0.1;

    stones.forEach((s, i) => {
      if (s.kick > 0 && now >= s.kick) { s.v += 3.4; s.kick = -1; }
      s.v += (-70 * s.o - 8 * s.v) * dt;
      s.o += s.v * dt;
      s.mesh.position.y = s.base + s.o + Math.sin(time * 0.9 + s.phase) * s.amp;
      s.mesh.rotation.y += s.spin * dt;
      s.mesh.rotation.z = Math.sin(time * 0.6 + i) * 0.025;
    });

    const pulseK = 0.5 + 0.5 * Math.sin(time * 2.1);
    spark.scale.setScalar(1.15 + pulseK * 0.35);
    star.scale.setScalar(0.5 + pulseK * 0.16);
    star.material.rotation = time * 0.6;
    const lift = Math.sin(time * 1.1) * 0.08;
    spark.position.y = totalH + 0.75 + lift;
    star.position.y = totalH + 0.75 + lift;

    rings.forEach((r) => {
      const k = (time * 0.18 + (r.userData.offset as number)) % 1;
      const base = r.userData.base as number;
      r.scale.setScalar(base * (0.9 + k * 1.9));
      (r.material as THREE.MeshBasicMaterial).opacity = (1 - k) * (theme === "dim" ? 0.4 : 0.3);
    });

    pMat.uniforms.uTime.value = time;
    renderer.render(scene, camera);
  }

  const tick = () => {
    if (!running) return;
    const t = performance.now() / 1000;
    const dt = Math.min(0.05, t - last);
    last = t;
    render(dt);
    raf = requestAnimationFrame(tick);
  };
  const startLoop = () => {
    if (running || opts.reduced || !visible || document.hidden) return;
    running = true;
    last = performance.now() / 1000;
    raf = requestAnimationFrame(tick);
  };
  const stopLoop = () => { running = false; cancelAnimationFrame(raf); };
  function requestRender() {
    if (!running) render(0.016);
  }

  const io = new IntersectionObserver((es) => {
    visible = es.some((e) => e.isIntersecting);
    visible ? startLoop() : stopLoop();
  });
  io.observe(host);
  const onVis = () => (document.hidden ? stopLoop() : startLoop());
  document.addEventListener("visibilitychange", onVis);

  const resize = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    frame();
    requestRender();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  buildStones(opts.stones);
  applyTheme(opts.theme);
  resize();
  startLoop();

  return {
    setStones(c) { if (c !== n) { buildStones(c); requestRender(); } },
    setTheme(t) { applyTheme(t); },
    pulse,
    dispose() {
      stopLoop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", pulse);
      disposeStones();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry && !stones.some((s) => s.mesh === m)) m.geometry.dispose();
        const mat = (m as { material?: THREE.Material | THREE.Material[] }).material;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
          (x as THREE.MeshBasicMaterial).map?.dispose?.();
          x.dispose();
        });
      });
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

interface Props { stones?: number; interactive?: boolean; className?: string }

export default function CairnScene({ stones = 5, interactive = true, className = "" }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const theme = useTheme();
  const reduced = usePrefersReducedMotion();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    try {
      engine.current = createEngine(host.current, { stones, interactive, reduced, theme });
      setFailed(false);
    } catch {
      setFailed(true);
    }
    return () => {
      engine.current?.dispose();
      engine.current = null;
    };
    // the engine is created once per motion preference; stones and theme are pushed in by the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, interactive]);

  useEffect(() => { engine.current?.setStones(stones); }, [stones]);
  useEffect(() => { engine.current?.setTheme(theme); }, [theme]);

  return (
    <div ref={host} className={`scene ${interactive ? "is-interactive" : ""} ${className}`} aria-hidden="true">
      {failed && (
        <div className="scene__fallback">
          <CairnMark size={180} animated />
        </div>
      )}
    </div>
  );
}
