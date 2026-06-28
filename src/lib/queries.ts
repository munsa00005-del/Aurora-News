// Server-side data access. Returns serialized `Article`s ready for the client.

import { prisma } from "./db";
import { serializeArticle, serializeMany } from "./serialize";
import type { Article, Paginated } from "./types";
import { getCategory } from "./categories";

const TRENDING_INCLUDE = { trending: true } as const;

// ---- Cursor helpers (opaque base64 of "score|id" or "iso|id") ----
function encodeCursor(a: string, b: string): string {
  return Buffer.from(`${a}::${b}`).toString("base64url");
}
function decodeCursor(c: string | null | undefined): [string, string] | null {
  if (!c) return null;
  try {
    const [a, b] = Buffer.from(c, "base64url").toString("utf8").split("::");
    if (a == null || b == null) return null;
    return [a, b];
  } catch {
    return null;
  }
}

/**
 * Trending feed across ALL categories, ordered by trending score desc.
 * Keyset pagination on (score, id) for stable infinite scroll.
 */
export async function getTrending(
  limit = 18,
  cursor?: string | null
): Promise<Paginated<Article>> {
  const dec = decodeCursor(cursor);
  const where = dec
    ? {
        trending: {
          OR: [
            { score: { lt: Number(dec[0]) } },
            { score: Number(dec[0]), newsId: { lt: dec[1] } },
          ],
        },
      }
    : { trending: { isNot: null } };

  const rows = await prisma.news.findMany({
    where,
    include: TRENDING_INCLUDE,
    orderBy: [{ trending: { score: "desc" } }, { id: "desc" }],
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last?.trending
      ? encodeCursor(String(last.trending.score), last.id)
      : null;

  return { items: serializeMany(items), nextCursor };
}

/** Lightweight list for the breaking-news ticker. */
export async function getTicker(limit = 12): Promise<Article[]> {
  const rows = await prisma.news.findMany({
    include: TRENDING_INCLUDE,
    orderBy: [{ trending: { score: "desc" } }, { publishedAt: "desc" }],
    take: limit,
  });
  return serializeMany(rows);
}

/** Featured / hero spotlight articles. */
export async function getFeatured(limit = 5): Promise<Article[]> {
  const featured = await prisma.news.findMany({
    where: { featured: true },
    include: TRENDING_INCLUDE,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
  if (featured.length >= limit) return serializeMany(featured);

  // Backfill with top trending so the hero is never empty.
  const fill = await prisma.news.findMany({
    where: { featured: false },
    include: TRENDING_INCLUDE,
    orderBy: [{ trending: { score: "desc" } }],
    take: limit - featured.length,
  });
  return serializeMany([...featured, ...fill]);
}

/**
 * Latest articles for a category, ordered by publish time.
 * `limit` (from category config) caps the first SSR page; infinite
 * scroll then pages with a publishedAt/id keyset cursor.
 */
export async function getByCategory(
  slug: string,
  limit: number,
  cursor?: string | null
): Promise<Paginated<Article>> {
  const dec = decodeCursor(cursor);
  const where: Record<string, unknown> = { category: slug.toLowerCase() };
  if (dec) {
    const iso = dec[0];
    where.OR = [
      { publishedAt: { lt: new Date(iso) } },
      { publishedAt: new Date(iso), id: { lt: dec[1] } },
    ];
  }

  const rows = await prisma.news.findMany({
    where,
    include: TRENDING_INCLUDE,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor(last.publishedAt.toISOString(), last.id)
      : null;

  return { items: serializeMany(items), nextCursor };
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const row = await prisma.news.findUnique({
    where: { slug },
    include: TRENDING_INCLUDE,
  });
  return row ? serializeArticle(row) : null;
}

/** Related articles: same category first, then recent fillers. */
export async function getRelated(
  article: Article,
  limit = 6
): Promise<Article[]> {
  const sameCat = await prisma.news.findMany({
    where: { category: article.category, id: { not: article.id } },
    include: TRENDING_INCLUDE,
    orderBy: [{ trending: { score: "desc" } }, { publishedAt: "desc" }],
    take: limit,
  });
  if (sameCat.length >= limit) return serializeMany(sameCat);

  const ids = [article.id, ...sameCat.map((r) => r.id)];
  const fill = await prisma.news.findMany({
    where: { id: { notIn: ids } },
    include: TRENDING_INCLUDE,
    orderBy: [{ trending: { score: "desc" } }],
    take: limit - sameCat.length,
  });
  return serializeMany([...sameCat, ...fill]);
}

/** Full-text-ish search over title/description/source, optional category. */
export async function searchArticles(
  q: string,
  opts: { category?: string; limit?: number; cursor?: string | null } = {}
): Promise<Paginated<Article>> {
  const limit = opts.limit ?? 18;
  const term = q.trim();
  if (!term) return { items: [], nextCursor: null };

  const dec = decodeCursor(opts.cursor);
  const where: Record<string, unknown> = {
    AND: [
      {
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { source: { contains: term, mode: "insensitive" } },
        ],
      },
    ],
  };
  if (opts.category && getCategory(opts.category)) {
    (where.AND as unknown[]).push({ category: opts.category.toLowerCase() });
  }
  if (dec) {
    (where.AND as unknown[]).push({
      OR: [
        { publishedAt: { lt: new Date(dec[0]) } },
        { publishedAt: new Date(dec[0]), id: { lt: dec[1] } },
      ],
    });
  }

  const rows = await prisma.news.findMany({
    where,
    include: TRENDING_INCLUDE,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor(last.publishedAt.toISOString(), last.id)
      : null;

  return { items: serializeMany(items), nextCursor };
}

/** Lightweight autosuggestions (titles) for the search box. */
export async function suggest(q: string, limit = 6): Promise<Article[]> {
  const term = q.trim();
  if (!term) return [];
  const rows = await prisma.news.findMany({
    where: { title: { contains: term, mode: "insensitive" } },
    include: TRENDING_INCLUDE,
    orderBy: [{ trending: { score: "desc" } }, { publishedAt: "desc" }],
    take: limit,
  });
  return serializeMany(rows);
}

/** Record a search term (powers "trending searches"). */
export async function recordSearch(term: string): Promise<void> {
  const t = term.trim().toLowerCase().slice(0, 80);
  if (t.length < 2) return;
  await prisma.searchQuery
    .upsert({
      where: { term: t },
      create: { term: t, count: 1 },
      update: { count: { increment: 1 } },
    })
    .catch(() => {});
}

export async function getTrendingSearches(limit = 8): Promise<string[]> {
  const rows = await prisma.searchQuery.findMany({
    orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
  return rows.map((r) => r.term);
}

/** Increment an article's view count (engagement signal). */
export async function incrementViews(id: string): Promise<void> {
  await prisma.news
    .update({ where: { id }, data: { views: { increment: 1 } } })
    .catch(() => {});
}
