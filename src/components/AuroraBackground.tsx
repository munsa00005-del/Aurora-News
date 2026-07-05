"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const BLOB_COLORS = ["#b7c9ff", "#ffd7ad", "#b6f0c9", "#ffc2e3", "#dcc8ff"];
const PARTICLE_COLORS = ["#b7c9ff", "#ffd7ad", "#b6f0c9", "#ffc2e3", "#dcc8ff"];

type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  color: string;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function AuroraBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);
  const particlesRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  const blobs = useMemo(
    () => [
      { className: "left-[-8rem] top-[-7rem] h-[26rem] w-[26rem]", depth: -0.018 },
      { className: "right-[-9rem] top-[6rem] h-[28rem] w-[28rem]", depth: 0.014 },
      { className: "bottom-[-10rem] left-[8%] h-[29rem] w-[29rem]", depth: 0.016 },
      { className: "bottom-[8%] right-[8%] h-[24rem] w-[24rem]", depth: -0.012 },
      { className: "left-1/2 top-1/2 h-[31rem] w-[31rem] -translate-x-1/2 -translate-y-1/2", depth: 0.01 },
    ],
    []
  );

  useEffect(() => {
    setParticles(
      Array.from({ length: 18 }, (_, id) => ({
        id,
        x: randomBetween(2, 98),
        y: randomBetween(4, 96),
        size: randomBetween(4, 12),
        duration: randomBetween(6, 14),
        delay: randomBetween(-14, 0),
        drift: randomBetween(-28, 28),
        color: PARTICLE_COLORS[id % PARTICLE_COLORS.length],
      }))
    );
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (reduced.matches || !finePointer.matches) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const current = { x: target.x, y: target.y };
    let raf = 0;

    function onMouseMove(event: MouseEvent) {
      target.x = event.clientX;
      target.y = event.clientY;
    }

    function frame() {
      current.x += (target.x - current.x) * 0.075;
      current.y += (target.y - current.y) * 0.075;

      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      const fromCenterX = current.x - vw / 2;
      const fromCenterY = current.y - vh / 2;

      if (haloRef.current) {
        haloRef.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate3d(-50%, -50%, 0)`;
        haloRef.current.style.opacity = "1";
      }

      blobRefs.current.forEach((blob, index) => {
        if (!blob) return;
        const depth = blobs[index]?.depth ?? 0.01;
        blob.style.transform = `translate3d(${fromCenterX * depth}px, ${fromCenterY * depth}px, 0)`;
      });

      if (particlesRef.current) {
        particlesRef.current.style.transform = `translate3d(${fromCenterX * -0.006}px, ${fromCenterY * -0.006}px, 0)`;
      }

      raf = requestAnimationFrame(frame);
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [blobs]);

  return (
    <div
      ref={rootRef}
      className="site-background fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="mesh-layer absolute inset-0">
        {blobs.map((blob, index) => (
          <div
            key={BLOB_COLORS[index]}
            ref={(node) => {
              blobRefs.current[index] = node;
            }}
            className={`mesh-blob-shell absolute ${blob.className}`}
          >
            <div
              className={`mesh-blob mesh-blob-${index + 1} h-full w-full rounded-full`}
              style={{ backgroundColor: BLOB_COLORS[index] }}
            />
          </div>
        ))}
      </div>

      <div className="orbit-layer absolute inset-0">
        <span className="orbit-ring orbit-ring-1" />
        <span className="orbit-ring orbit-ring-2" />
        <span className="orbit-ring orbit-ring-3" />
      </div>

      <div ref={particlesRef} className="particle-layer absolute inset-0">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="particle"
            style={
              {
                "--particle-x": `${particle.x}%`,
                "--particle-y": `${particle.y}%`,
                "--particle-size": `${particle.size}px`,
                "--particle-duration": `${particle.duration}s`,
                "--particle-delay": `${particle.delay}s`,
                "--particle-drift": `${particle.drift}px`,
                "--particle-color": particle.color,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div ref={haloRef} className="cursor-halo" />
      <div className="background-noise absolute inset-0" />
    </div>
  );
}
