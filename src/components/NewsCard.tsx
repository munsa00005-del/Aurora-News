"use client";

// Premium trending/category card.
//   • glassmorphism surface
//   • pointer-driven 3D tilt + dynamic glow that follows the cursor
//   • thumbnail (or deterministic gradient fallback), headline, category chip,
//     source and relative publish time — NO description/body (per spec)

import Link from "next/link";
import { useRef } from "react";
import { motion } from "framer-motion";
import type { Article } from "@/lib/types";
import { categoryAccent } from "@/lib/categories";
import { catLabel } from "@/lib/i18n";
import { useLang } from "./LangProvider";
import { timeAgo } from "@/lib/utils";
import SafeImage from "./SafeImage";

export default function NewsCard({
  article,
  index = 0,
  priority = false,
}: {
  article: Article;
  index?: number;
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const accent = categoryAccent(article.category);
  const { lang } = useLang();

  // Tilt is written straight to the DOM (no React state) so moving the mouse
  // never triggers a re-render — critical when 18+ cards are on screen. Updates
  // are throttled to one per animation frame. Disabled on touch / small screens.
  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el || rafRef.current != null) return;
    const cx = e.clientX;
    const cy = e.clientY;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const r = el.getBoundingClientRect();
      const px = (cx - r.left) / r.width;
      const py = (cy - r.top) / r.height;
      el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 8}deg) rotateY(${(px - 0.5) * 10}deg)`;
      if (glowRef.current) {
        glowRef.current.style.background = `radial-gradient(380px circle at ${px * 100}% ${py * 100}%, ${accent}22, transparent 60%)`;
      }
    });
  }
  function reset() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const el = ref.current;
    if (el) el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.04, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link href={`/article/${article.slug}`} className="block">
        <div
          ref={ref}
          onMouseMove={onMove}
          onMouseLeave={reset}
          className="tilt-card group relative h-full overflow-hidden rounded-2xl border border-border bg-card hover:border-accent/25"
          style={{ transform: "perspective(900px) rotateX(0deg) rotateY(0deg)" }}
        >
          {/* cursor glow */}
          <div
            ref={glowRef}
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />

          {/* thumbnail */}
          <div className="relative aspect-[16/10] overflow-hidden">
            <SafeImage
              src={article.image}
              alt={article.title}
              fallbackKey={article.id}
              fill
              sizes="(max-width:768px) 100vw, 33vw"
              priority={priority}
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/10 to-transparent" />

            {/* category chip */}
            <span
              className="absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink backdrop-blur-md"
              style={{
                borderColor: `${accent}66`,
                background: `${accent}22`,
              }}
            >
              {catLabel(lang, article.category)}
            </span>
          </div>

          {/* meta */}
          <div className="p-4">
            <h3 className="line-clamp-3 text-[15px] font-semibold leading-snug text-ink transition-colors group-hover:text-accent">
              {article.title}
            </h3>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted/75">
              <span className="line-clamp-1 max-w-[60%] font-medium text-muted">
                {article.source}
              </span>
              <span>{timeAgo(article.publishedAt)}</span>
            </div>
          </div>

          {/* bottom accent line */}
          <div
            className="absolute bottom-0 left-0 h-[2px] w-0 transition-all duration-500 group-hover:w-full"
            style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
          />
        </div>
      </Link>
    </motion.article>
  );
}

export function NewsCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="skeleton aspect-[16/10]" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton mt-3 h-3 w-1/3 rounded" />
      </div>
    </div>
  );
}
