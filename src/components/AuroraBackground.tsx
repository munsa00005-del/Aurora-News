"use client";

// Site-wide living background. A single fixed canvas paints:
//   • an animated gradient mesh of drifting colour blobs (aurora waves)
//   • a mouse-reactive light blob that follows the cursor
//   • floating particles with subtle parallax
//   • slow diagonal light rays
//
// Everything is drawn on one canvas for performance (one rAF loop, capped DPR).
// Honors prefers-reduced-motion by freezing on the first frame.

import { useEffect, useRef } from "react";

const PALETTE = [
  [124, 58, 237], // electric purple
  [168, 85, 247], // neon violet
  [6, 182, 212], // neon cyan
  [220, 38, 38], // deep crimson
  [245, 158, 11], // golden amber
  [15, 23, 42], // midnight (anchor)
];

interface Blob {
  x: number;
  y: number;
  r: number;
  color: number[];
  dx: number;
  dy: number;
  phase: number;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  z: number; // depth 0..1 → parallax + size
  vy: number;
  tw: number; // twinkle phase
}

export default function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    const blobs: Blob[] = [];
    const particles: Particle[] = [];

    // Smoothed pointer (lerped towards the raw target each frame).
    const pointer = { x: 0.5, y: 0.4, tx: 0.5, ty: 0.4, active: 0 };

    function rand(a: number, b: number) {
      return a + Math.random() * (b - a);
    }

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      blobs.length = 0;
      const count = w < 768 ? 5 : 7;
      for (let i = 0; i < count; i++) {
        blobs.push({
          x: rand(0, w),
          y: rand(0, h),
          r: rand(Math.min(w, h) * 0.35, Math.min(w, h) * 0.7),
          color: PALETTE[i % PALETTE.length],
          dx: rand(-0.12, 0.12),
          dy: rand(-0.1, 0.1),
          phase: rand(0, Math.PI * 2),
          speed: rand(0.0004, 0.0011),
        });
      }

      particles.length = 0;
      const pc = w < 768 ? 40 : 90;
      for (let i = 0; i < pc; i++) {
        particles.push({
          x: rand(0, w),
          y: rand(0, h),
          z: rand(0.15, 1),
          vy: rand(0.02, 0.18),
          tw: rand(0, Math.PI * 2),
        });
      }
    }

    function draw(t: number) {
      // Base wash.
      ctx!.fillStyle = "#050505";
      ctx!.fillRect(0, 0, w, h);

      // Smooth the pointer.
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      pointer.active += ((pointer.active > 0.5 ? 1 : 0) - pointer.active) * 0.05;

      ctx!.globalCompositeOperation = "screen";

      // Drifting aurora blobs.
      for (const b of blobs) {
        const ox = Math.cos(t * b.speed + b.phase) * 80;
        const oy = Math.sin(t * b.speed * 1.3 + b.phase) * 70;
        b.x += b.dx;
        b.y += b.dy;
        if (b.x < -b.r) b.x = w + b.r;
        if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r;
        if (b.y > h + b.r) b.y = -b.r;

        const cx = b.x + ox;
        const cy = b.y + oy;
        const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, b.r);
        const [r, g, bl] = b.color;
        grad.addColorStop(0, `rgba(${r},${g},${bl},0.42)`);
        grad.addColorStop(0.45, `rgba(${r},${g},${bl},0.16)`);
        grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(cx, cy, b.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Mouse-reactive light blob.
      {
        const cx = pointer.x * w;
        const cy = pointer.y * h;
        const r = Math.min(w, h) * 0.34;
        const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, "rgba(168,85,247,0.30)");
        grad.addColorStop(0.4, "rgba(6,182,212,0.12)");
        grad.addColorStop(1, "rgba(6,182,212,0)");
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(cx, cy, r, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Slow diagonal light rays.
      ctx!.save();
      ctx!.globalAlpha = 0.06;
      ctx!.translate(w * 0.5, h * 0.5);
      ctx!.rotate(Math.sin(t * 0.00006) * 0.25 + 0.5);
      for (let i = -3; i <= 3; i++) {
        const x = i * 220 + Math.sin(t * 0.0002 + i) * 40;
        const g = ctx!.createLinearGradient(x, -h, x + 120, h);
        g.addColorStop(0, "rgba(124,58,237,0)");
        g.addColorStop(0.5, "rgba(168,85,247,0.5)");
        g.addColorStop(1, "rgba(6,182,212,0)");
        ctx!.fillStyle = g;
        ctx!.fillRect(x, -h, 90, h * 2);
      }
      ctx!.restore();

      // Particles (with cursor parallax).
      ctx!.globalCompositeOperation = "lighter";
      const px = (pointer.x - 0.5) * 40;
      const py = (pointer.y - 0.5) * 40;
      for (const p of particles) {
        p.y -= p.vy * (0.4 + p.z);
        p.tw += 0.02;
        if (p.y < -4) {
          p.y = h + 4;
          p.x = rand(0, w);
        }
        const size = p.z * 1.8 + 0.3;
        const alpha = (0.25 + Math.sin(p.tw) * 0.2) * p.z;
        const dx = p.x + px * p.z;
        const dy = p.y + py * p.z;
        ctx!.fillStyle = `rgba(190,210,255,${Math.max(0, alpha)})`;
        ctx!.beginPath();
        ctx!.arc(dx, dy, size, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.globalCompositeOperation = "source-over";
    }

    let raf = 0;
    function loop(t: number) {
      draw(t);
      raf = requestAnimationFrame(loop);
    }

    function onMove(e: PointerEvent) {
      pointer.tx = e.clientX / w;
      pointer.ty = e.clientY / h;
      pointer.active = 1;
    }
    function onResize() {
      build();
    }

    build();
    if (reduced) {
      draw(0);
    } else {
      window.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(loop);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
      {/* Static grain + vignette overlay for cinematic depth. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 0%, transparent 40%, rgba(5,5,5,0.55) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
