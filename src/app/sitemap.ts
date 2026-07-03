import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "daily", priority: 0.4 },
    { url: `${SITE_URL}/about-us`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/contact-us`, changeFrequency: "monthly", priority: 0.3 },
    {
      url: `${SITE_URL}/privacy-policy`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    { url: `${SITE_URL}/disclaimer`, changeFrequency: "monthly", priority: 0.3 },
    ...CATEGORIES.map((c) => ({
      url: `${SITE_URL}/category/${c.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
  ];

  let articles: MetadataRoute.Sitemap = [];
  try {
    const rows = await prisma.news.findMany({
      orderBy: { publishedAt: "desc" },
      take: 500,
      select: { slug: true, publishedAt: true },
    });
    articles = rows.map((r) => ({
      url: `${SITE_URL}/article/${r.slug}`,
      lastModified: r.publishedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
  } catch {
    /* DB may be unavailable at build time */
  }

  return [...staticRoutes, ...articles];
}
