// Homepage — NO category sections (per spec). Just:
//   1. Cinematic fullscreen hero
//   2. Breaking-news ticker
//   3. Trending feed (all categories combined) with infinite scroll

import { cookies } from "next/headers";
import Hero from "@/components/Hero";
import BreakingTicker from "@/components/BreakingTicker";
import InfiniteFeed from "@/components/InfiniteFeed";
import ScrollReveal from "@/components/ScrollReveal";
import { getTrending, getTicker } from "@/lib/queries";
import { normalizeLang, LANG_COOKIE, makeT } from "@/lib/i18n";
import { TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const lang = normalizeLang(cookies().get(LANG_COOKIE)?.value);
  const t = makeT(lang);
  const [{ items, nextCursor }, ticker] = await Promise.all([
    getTrending(18, null, lang),
    getTicker(12, lang),
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
              {t("trending.badge")}
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
              {t("trending.title1")}{" "}
              <span className="text-gradient">{t("trending.title2")}</span>
            </h2>
            <p className="max-w-xl text-white/55">{t("trending.subtitle")}</p>
          </ScrollReveal>

          <InfiniteFeed
            key={lang}
            endpoint={`/api/trending?lang=${lang}`}
            initial={items}
            initialCursor={nextCursor}
            emptyLabel={t("feed.empty")}
            endLabel={t("feed.end")}
          />
        </section>
      </div>
    </>
  );
}
