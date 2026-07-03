"use client";

// Animated futuristic wordmark.
//   • animates in on page load (framer-motion)
//   • the orbital mark reacts to cursor movement (magnetic tilt)
//   • glows on hover
//   • `compact` variant is used in the navbar (no scroll transform there)
//
// The homepage hero passes a motion value via CSS vars for scroll transform;
// here we keep the component self-contained and let the parent scale it.

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

export default function Logo({
  compact = false,
}: {
  compact?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-40, 40], [12, -12]), {
    stiffness: 150,
    damping: 12,
  });
  const ry = useSpring(useTransform(mx, [-40, 40], [-12, 12]), {
    stiffness: 150,
    damping: 12,
  });

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set(e.clientX - (r.left + r.width / 2));
    my.set(e.clientY - (r.top + r.height / 2));
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  const size = compact ? 30 : 40;

  return (
    <Link
      ref={ref}
      href="/"
      aria-label="BRIEFXIFY — home"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="group inline-flex min-w-0 items-center gap-2 sm:gap-3"
    >
      {/* Orbital mark */}
      <motion.span
        style={{ rotateX: rx, rotateY: ry, transformPerspective: 600 }}
        className="relative inline-grid place-items-center"
      >
        <motion.svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          initial={{ scale: 0, rotate: -120, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.1 }}
          className="drop-shadow-[0_0_10px_rgba(124,58,237,0.55)] transition-[filter] duration-300 group-hover:drop-shadow-[0_0_18px_rgba(168,85,247,0.9)]"
        >
          <defs>
            <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48">
              <stop stopColor="#A855F7" />
              <stop offset="0.5" stopColor="#06B6D4" />
              <stop offset="1" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
          {/* core */}
          <circle cx="24" cy="24" r="6" fill="url(#logoGrad)">
            <animate
              attributeName="r"
              values="6;7;6"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          {/* orbit rings */}
          <g
            stroke="url(#logoGrad)"
            strokeWidth="1.6"
            fill="none"
            opacity="0.9"
          >
            <ellipse cx="24" cy="24" rx="20" ry="9" />
            <ellipse
              cx="24"
              cy="24"
              rx="20"
              ry="9"
              transform="rotate(60 24 24)"
            />
            <ellipse
              cx="24"
              cy="24"
              rx="20"
              ry="9"
              transform="rotate(120 24 24)"
            />
          </g>
          {/* orbiting electron */}
          <circle r="2.2" fill="#F59E0B">
            <animateMotion dur="4s" repeatCount="indefinite" rotate="auto">
              <mpath href="#orbitPath" />
            </animateMotion>
          </circle>
          <path
            id="orbitPath"
            d="M4 24a20 9 0 1 0 40 0a20 9 0 1 0 -40 0"
            fill="none"
          />
        </motion.svg>
      </motion.span>

      {/* Wordmark */}
      <motion.span
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className={`font-display font-bold tracking-tight ${
          compact ? "text-base sm:text-lg" : "text-2xl"
        }`}
      >
        <span className="aurora-text">BRIEF</span>
        <span className="font-light text-white/70">XIFY</span>
      </motion.span>
    </Link>
  );
}
