// Search results page. Reads ?q= and ?category= from the URL, runs the initial
// search server-side, then pages more results with infinite scroll. Category
// filter chips are links that re-run the search.

import Link from "next/link";
import type { Metadata } from "next";
import { Search as SearchIcon } from "lucide-react";
import { searchArticles } from "@/lib/queries";
import { CATEGORIES, getCategory } from "@/lib/categories";
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

  const { items, nextCursor } = q
    ? await searchArticles(q, { category, limit: 18 })
    : { items: [], nextCursor: null };

  const endpointParams = new URLSearchParams({ q });
  if (category) endpointParams.set("category", category);

  function chipHref(slug: string) {
    const p = new URLSearchParams({ q });
    if (slug) p.set("category", slug);
    return `/search?${p}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-28 sm:px-6 sm:pt-32">
      <div className="mb-3 inline-flex items-center gap-2 text-sm text-white/50">
        <SearchIcon className="h-4 w-4" /> Search results
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
        {q ? (
          <>
            “<span className="text-gradient">{q}</span>”
          </>
        ) : (
          "Search Aurora News"
        )}
      </h1>
      {q && (
        <p className="mt-2 text-white/55">
          {items.length === 0
            ? "No matching stories found."
            : `Showing top matches${category ? ` in ${category}` : ""}.`}
        </p>
      )}

      {/* category filter chips */}
      {q && (
        <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-2">
          <Chip href={chipHref("")} active={!category}>
            All
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.slug} href={chipHref(c.slug)} active={category === c.slug}>
              {c.label}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-8">
        {q ? (
          <InfiniteFeed
            key={`${q}-${category}`}
            endpoint={`/api/search?${endpointParams}`}
            initial={items}
            initialCursor={nextCursor}
            emptyLabel="No matching stories — try a different term."
          />
        ) : (
          <p className="glass rounded-2xl px-6 py-16 text-center text-white/50">
            Type a query in the search bar (⌘K) to explore the archive.
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
