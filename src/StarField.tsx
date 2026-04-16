import { useEffect, useRef } from "react";

// Real-night-sky starfield — canvas-rendered, pixel-accurate (no oval
// distortion from SVG viewBox scaling). Dense, mostly tiny, with a small
// minority of brighter stars and a very subtle twinkle on a fraction of
// them so the background feels alive without pulsing.

interface Star {
  x: number;
  y: number;
  baseR: number;
  // Base alpha — most stars sit here always.
  baseA: number;
  // Color drift toward cool (blue-white) or warm (amber). 0..1, 0.5 = neutral.
  warmth: number;
  // Twinkle parameters — most stars have amp = 0 (static).
  twinkleAmp: number;
  twinkleSpeed: number;
  twinklePhase: number;
  // Bright stars get a faint cross-spike.
  spike: boolean;
}

interface Props {
  reduceMotion?: boolean;
  density?: number; // stars per 10k px², default 1.4
}

function makeStars(w: number, h: number, density: number): Star[] {
  const target = Math.round((w * h) / 10000 * density);
  const count = Math.max(80, Math.min(900, target));
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    let baseR: number;
    let baseA: number;
    let twinkleAmp = 0;
    let spike = false;

    if (roll < 0.78) {
      // Faint background grain — most of the sky.
      baseR = 0.4 + Math.random() * 0.35;
      baseA = 0.12 + Math.random() * 0.22;
    } else if (roll < 0.96) {
      // Medium stars — some twinkle softly.
      baseR = 0.7 + Math.random() * 0.45;
      baseA = 0.35 + Math.random() * 0.25;
      if (Math.random() < 0.35) twinkleAmp = 0.06 + Math.random() * 0.08;
    } else {
      // Bright anchor stars — slower twinkle, faint cross-spike.
      baseR = 1.0 + Math.random() * 0.6;
      baseA = 0.55 + Math.random() * 0.2;
      twinkleAmp = 0.04 + Math.random() * 0.06;
      spike = true;
    }

    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      baseR,
      baseA,
      warmth: Math.random(),
      twinkleAmp,
      twinkleSpeed: 0.0003 + Math.random() * 0.0006, // very slow
      twinklePhase: Math.random() * Math.PI * 2,
      spike,
    });
  }
  return stars;
}

function starColor(warmth: number, alpha: number): string {
  // Cool (blue-white) ↔ Warm (amber). Stay mostly near-white.
  const r = Math.round(232 + (warmth - 0.5) * 28);
  const g = Math.round(226 + (warmth - 0.5) * 10);
  const b = Math.round(210 - (warmth - 0.5) * 24);
  const clamp = (v: number) => Math.max(180, Math.min(255, v));
  return `rgba(${clamp(r)}, ${clamp(g)}, ${clamp(b)}, ${alpha.toFixed(3)})`;
}

export function StarField({ reduceMotion = false, density = 1.4 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    function resize() {
      if (!canvas || !ctx) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      starsRef.current = makeStars(w, h, density);
      drawStatic();
    }

    function drawStar(s: Star, alpha: number, radius: number) {
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = starColor(s.warmth, alpha);
      ctx.fill();

      if (s.spike) {
        // Faint 4-point spike for the brightest stars.
        ctx.strokeStyle = starColor(s.warmth, alpha * 0.35);
        ctx.lineWidth = 0.6;
        const len = radius * 3.5;
        ctx.beginPath();
        ctx.moveTo(s.x - len, s.y);
        ctx.lineTo(s.x + len, s.y);
        ctx.moveTo(s.x, s.y - len);
        ctx.lineTo(s.x, s.y + len);
        ctx.stroke();
      }
    }

    function drawStatic() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      for (const s of starsRef.current) drawStar(s, s.baseA, s.baseR);
    }

    function frame(t: number) {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      for (const s of starsRef.current) {
        if (s.twinkleAmp === 0) {
          drawStar(s, s.baseA, s.baseR);
        } else {
          const phase = s.twinklePhase + t * s.twinkleSpeed;
          const flicker = Math.sin(phase) * s.twinkleAmp;
          const alpha = Math.max(0.04, Math.min(0.95, s.baseA + flicker));
          const radius = s.baseR * (1 + flicker * 0.4);
          drawStar(s, alpha, radius);
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);

    if (!reduceMotion) {
      rafRef.current = requestAnimationFrame(frame);
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [reduceMotion, density]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
}
