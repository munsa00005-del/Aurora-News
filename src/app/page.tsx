// Homepage — NO category sections (per spec). Just:
//   1. Cinematic fullscreen hero
//   2. Breaking-news ticker
//   3. Trending feed (all categories combined) with infinite scroll

import Hero from "@/components/Hero";
import BreakingTicker from "@/components/BreakingTicker";
import InfiniteFeed from "@/components/InfiniteFeed";
import ScrollReveal from "@/components/ScrollReveal";
import { getTrending, getTicker } from "@/lib/queries";
import { TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [{ items, nextCursor }, ticker] = await Promise.all([
    getTrending(18),
    getTicker(12),
  ]);

  return (
    <>
      <Hero />

      <div className="relative">
        <BreakingTicker items={ticker} />

        <section
          id="trending"
          className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24"
        >
          <ScrollReveal className="mb-10 flex flex-col items-start gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60">
              <TrendingUp className="h-3.5 w-3.5 text-amber" />
              Trending now
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
              What the world is <span className="text-gradient">reading</span>
            </h2>
            <p className="max-w-xl text-white/55">
              The highest-signal stories across every category, ranked live by
              recency, source weight and engagement.
            </p>
          </ScrollReveal>

          <InfiniteFeed
            endpoint="/api/trending"
            initial={items}
            initialCursor={nextCursor}
          />
        </section>
      </div>
    </>
  );
}
