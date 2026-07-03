// Search results page. Reads ?q= and ?category= from the URL, runs the initial
// search server-side, then pages more results with infinite scroll. Category
// filter chips are links that re-run the search.

import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { Search as SearchIcon } from "lucide-react";
import { searchArticles } from "@/lib/queries";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { normalizeLang, LANG_COOKIE, makeT, catLabel } from "@/lib/i18n";
import InfiniteFeed from "@/components/InfiniteFeed";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { q?: string };
}): Promise<Metadata> {
  const q = (searchParams.q || "").trim();
  return { title: q ? `Search: ${q}` : "Search" };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const q = (searchParams.q || "").trim();
  const category =
    searchParams.category && getCategory(searchParams.category)
      ? searchParams.category.toLowerCase()
      : "";

  const lang = normalizeLang(cookies().get(LANG_COOKIE)?.value);
  const t = makeT(lang);

  const { items, nextCursor } = q
    ? await searchArticles(q, { category, limit: 18, lang })
    : { items: [], nextCursor: null };

  const endpointParams = new URLSearchParams({ q, lang });
  if (category) endpointParams.set("category", category);

  function chipHref(slug: string) {
    const p = new URLSearchParams({ q });
    if (slug) p.set("category", slug);
    return `/search?${p}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-36 sm:px-6 sm:pt-32">
      <div className="mb-3 inline-flex items-center gap-2 text-sm text-white/50">
        <SearchIcon className="h-4 w-4" /> {t("search.results")}
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
        {q ? (
          <>
            “<span className="text-gradient">{q}</span>”
          </>
        ) : (
          t("search.title")
        )}
      </h1>
      {q && (
        <p className="mt-2 text-white/55">
          {items.length === 0
            ? t("search.none")
            : `${t("search.showing")}${category ? ` · ${catLabel(lang, category)}` : ""}.`}
        </p>
      )}

      {/* category filter chips */}
      {q && (
        <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-2">
          <Chip href={chipHref("")} active={!category}>
            {t("search.all")}
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.slug} href={chipHref(c.slug)} active={category === c.slug}>
              {catLabel(lang, c.slug)}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-8">
        {q ? (
          <InfiniteFeed
            key={`${q}-${category}-${lang}`}
            endpoint={`/api/search?${endpointParams}`}
            initial={items}
            initialCursor={nextCursor}
            emptyLabel={t("search.none")}
            endLabel={t("feed.end")}
          />
        ) : (
          <p className="glass rounded-2xl px-6 py-16 text-center text-white/50">
            {t("hero.searchPlaceholder")}
          </p>
        )}
      </div>
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${
        active
          ? "border-white/30 bg-white/10 text-white"
          : "border-white/10 text-white/55 hover:border-white/25 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
