"use client";

// Continuous breaking-news ticker. Duplicates the items so the marquee loops
// seamlessly; pauses on hover.

import Link from "next/link";
import type { Article } from "@/lib/types";

export default function BreakingTicker({ items }: { items: Article[] }) {
  if (!items.length) return null;
  const loop = [...items, ...items];

  return (
    <div className="group relative flex items-center overflow-hidden border-y border-border bg-white/58 py-2 backdrop-blur-md">
      <span className="z-10 flex shrink-0 items-center gap-2 bg-gradient-to-r from-accent2 to-peachblob px-4 py-1 text-xs font-bold uppercase tracking-widest text-ink">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
        Breaking
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className="animate-ticker flex w-max gap-8 whitespace-nowrap group-hover:[animation-play-state:paused]">
          {loop.map((a, i) => (
            <Link
              key={`${a.id}-${i}`}
              href={`/article/${a.slug}`}
              className="flex items-center gap-2 text-sm text-muted transition hover:text-ink"
            >
              <span className="text-amber">›</span>
              <span className="uppercase text-[10px] tracking-wider text-accent">
                {a.category}
              </span>
              {a.title}
            </Link>
          ))}
        </div>
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#f6f7fb] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#f6f7fb] to-transparent" />
      </div>
    </div>
  );
}
