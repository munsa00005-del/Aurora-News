// Prisma row → plain serializable `Article` (safe across the RSC boundary).

import type { News, Trending } from "@prisma/client";
import type { Article } from "./types";

type NewsWithTrending = News & { trending?: Trending | null };

export function serializeArticle(n: NewsWithTrending): Article {
  return {
    id: n.id,
    title: n.title,
    description: n.description,
    content: n.content,
    image: n.image,
    source: n.source,
    sourceUrl: n.sourceUrl,
    category: n.category,
    language: n.language,
    slug: n.slug,
    url: n.url,
    featured: n.featured,
    views: n.views,
    publishedAt: n.publishedAt.toISOString(),
    createdAt: n.createdAt.toISOString(),
    trendingScore: n.trending?.score,
  };
}

export function serializeMany(rows: NewsWithTrending[]): Article[] {
  return rows.map(serializeArticle);
}
