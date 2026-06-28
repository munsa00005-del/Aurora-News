"use client";

// Generic infinite-scroll grid. Seeds with SSR articles + cursor, then fetches
// more from `endpoint` as an IntersectionObserver sentinel nears the viewport.
// Used by both the homepage trending feed and category pages.

import { useCallback, useEffect, useRef, useState } from "react";
import NewsCard, { NewsCardSkeleton } from "./NewsCard";
import type { Article, Paginated } from "@/lib/types";

export default function InfiniteFeed({
  endpoint,
  initial,
  initialCursor,
  emptyLabel = "No articles yet — the next sync will fill this in.",
}: {
  endpoint: string; // e.g. "/api/trending" or "/api/category/india"
  initial: Article[];
  initialCursor: string | null;
  emptyLabel?: string;
}) {
  const [items, setItems] = useState<Article[]>(initial);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(!initialCursor);
  const sentinel = useRef<HTMLDivElement>(null);
  const seen = useRef(new Set(initial.map((a) => a.id)));

  const loadMore = useCallback(async () => {
    if (loading || done || !cursor) return;
    setLoading(true);
    try {
      const sep = endpoint.includes("?") ? "&" : "?";
      const res = await fetch(`${endpoint}${sep}cursor=${encodeURIComponent(cursor)}`);
      const data: Paginated<Article> = await res.json();
      const fresh = (data.items || []).filter((a) => !seen.current.has(a.id));
      fresh.forEach((a) => seen.current.add(a.id));
      setItems((prev) => [...prev, ...fresh]);
      setCursor(data.nextCursor);
      if (!data.nextCursor) setDone(true);
    } catch {
      // swallow; sentinel will retry on next intersection
    } finally {
      setLoading(false);
    }
  }, [cursor, done, endpoint, loading]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && loadMore(),
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  if (!items.length) {
    return (
      <div className="glass rounded-2xl px-6 py-16 text-center text-white/50">
        {emptyLabel}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a, i) => (
          <NewsCard key={a.id} article={a} index={i} priority={i < 3} />
        ))}
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <NewsCardSkeleton key={`sk-${i}`} />
          ))}
      </div>

      <div ref={sentinel} className="h-12" />

      {done && (
        <p className="py-10 text-center text-sm text-white/35">
          You’ve reached the edge of the aurora ✦
        </p>
      )}
    </>
  );
}
