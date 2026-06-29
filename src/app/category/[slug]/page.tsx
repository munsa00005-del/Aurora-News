// Category page — premium card grid with infinite scroll. The first page
// renders the spec'd number of latest articles (e.g. India = 20, World = 10);
// scrolling loads more via the same /api/category endpoint.

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getByCategory } from "@/lib/queries";
import { getCategory, CATEGORIES } from "@/lib/categories";
import { normalizeLang, LANG_COOKIE, makeT, catLabel } from "@/lib/i18n";
import InfiniteFeed from "@/components/InfiniteFeed";
import ScrollReveal from "@/components/ScrollReveal";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const cat = getCategory(params.slug);
  if (!cat) return { title: "Not found" };
  return {
    title: `${cat.label} news`,
    description: `Latest ${cat.label} stories on Aurora News — continuously synced.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const cat = getCategory(params.slug);
  if (!cat) notFound();

  const lang = normalizeLang(cookies().get(LANG_COOKIE)?.value);
  const t = makeT(lang);
  const label = catLabel(lang, cat.slug);
  const { items, nextCursor } = await getByCategory(cat.slug, cat.limit, null, lang);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-28 sm:px-6 sm:pt-32">
      <ScrollReveal className="mb-10">
        <div
          className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider"
          style={{ borderColor: `${cat.accent}66`, color: cat.accent }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: cat.accent }}
          />
          {t("category.badge")}
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">
          <span
            style={{
              backgroundImage: `linear-gradient(115deg, #fff, ${cat.accent})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {label}
          </span>
        </h1>
        <p className="mt-3 max-w-xl text-white/55">
          {t("category.subtitle", { label })}
        </p>
      </ScrollReveal>

      <InfiniteFeed
        key={lang}
        endpoint={`/api/category/${cat.slug}?lang=${lang}`}
        initial={items}
        initialCursor={nextCursor}
        emptyLabel={t("feed.empty")}
        endLabel={t("feed.end")}
      />
    </div>
  );
}
