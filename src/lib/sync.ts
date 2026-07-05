// News automation engine.
//
//   syncAll()  — fetch every category from GNews, dedupe, upsert into Postgres,
//                write a SyncLog row, then recompute trending scores.
//
// Dedupe strategy (two layers):
//   1. `url`       — canonical article URL is unique.
//   2. `dedupeKey` — normalized-title hash, catches the same story re-published
//                    under a different URL / by a syndicating source.

import { prisma } from "./db";
import { CATEGORIES, CategoryConfig } from "./categories";
import { fetchCategory, hasApiKey, GNewsArticle } from "./gnews";
import { computeScore } from "./trending";
import { slugify, hash } from "./utils";
import {
  buildLocalBrief,
  looksLikeCompleteBriefForLanguage,
} from "./localBrief";
import { serializeArticle } from "./serialize";

// Module-level guard so overlapping triggers (cron + manual) don't double-run.
let running = false;
let lastRunAt: number | null = null;

export function syncStatus() {
  return { running, lastRunAt };
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeKeyFor(a: GNewsArticle, lang: string): string {
  return `k_${lang}_${hash(normalizeTitle(a.title)).toString(36)}`;
}

interface CategorySyncResult {
  category: string;
  fetched: number;
  inserted: number;
  duplicates: number;
  error?: string;
}

async function syncCategory(
  cat: CategoryConfig,
  lang: "en" | "hi" = "en"
): Promise<CategorySyncResult> {
  const start = Date.now();
  let fetched = 0;
  let inserted = 0;
  let duplicates = 0;

  try {
    const articles = await fetchCategory(cat, Math.max(cat.limit + 4, 10), lang);
    fetched = articles.length;

    // De-dupe within the batch first.
    const seen = new Set<string>();
    for (const a of articles) {
      if (!a.title || !a.url) continue;
      const key = dedupeKeyFor(a, lang);
      if (seen.has(key)) continue;
      seen.add(key);

      const existing = await prisma.news.findFirst({
        where: { OR: [{ url: a.url }, { dedupeKey: key }] },
        select: { id: true, content: true },
      });

      const data = {
        title: a.title.slice(0, 500),
        description: a.description ?? null,
        content: a.content ?? null,
        image: a.image ?? null,
        source: a.source?.name?.slice(0, 200) || "Unknown",
        sourceUrl: a.source?.url ?? null,
        category: cat.slug,
        language: lang,
        url: a.url,
        dedupeKey: key,
        publishedAt: new Date(a.publishedAt || Date.now()),
      };

      if (existing) {
        // Refresh content/image in place (no duplicate row).
        await prisma.news.update({
          where: { id: existing.id },
          data: {
            description: data.description,
            content: looksLikeCompleteBriefForLanguage(existing.content, lang)
              ? existing.content
              : data.content,
            image: data.image,
          },
        });
        duplicates++;
      } else {
        const created = await prisma.news.create({
          data: { ...data, slug: slugify(a.title, a.url) },
        });
        inserted++;

        // Auto-summarize newly inserted articles locally so no row is left as a raw feed snippet.
        try {
          const serialized = serializeArticle(created);
          const summary = buildLocalBrief(serialized);
          await prisma.news.update({
            where: { id: created.id },
            data: { content: summary },
          });
        } catch (e) {
          console.error(`[BRIEFXIFY] Auto-summarize failed for "${a.title.slice(0, 40)}"`, e);
        }
      }
    }

    await prisma.syncLog.create({
      data: {
        category: `${cat.slug}:${lang}`,
        status: "success",
        fetched,
        inserted,
        duplicates,
        durationMs: Date.now() - start,
      },
    });

    return { category: `${cat.slug}:${lang}`, fetched, inserted, duplicates };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.syncLog.create({
      data: {
        category: `${cat.slug}:${lang}`,
        status: "error",
        fetched,
        inserted,
        duplicates,
        message: message.slice(0, 500),
        durationMs: Date.now() - start,
      },
    });
    return { category: `${cat.slug}:${lang}`, fetched, inserted, duplicates, error: message };
  }
}

/** Recompute trending scores for the freshest N articles. */
export async function recomputeTrending(window = 600): Promise<number> {
  const rows = await prisma.news.findMany({
    orderBy: { publishedAt: "desc" },
    take: window,
    select: {
      id: true,
      category: true,
      source: true,
      views: true,
      publishedAt: true,
    },
  });

  const now = Date.now();
  let n = 0;
  for (const r of rows) {
    const score = computeScore({
      publishedAt: r.publishedAt,
      category: r.category,
      source: r.source,
      views: r.views,
      now,
    });
    await prisma.trending.upsert({
      where: { newsId: r.id },
      create: { newsId: r.id, score },
      update: { score },
    });
    n++;
  }
  return n;
}

export interface SyncSummary {
  ok: boolean;
  skipped?: boolean;
  totals: { fetched: number; inserted: number; duplicates: number };
  perCategory: CategorySyncResult[];
  scored: number;
  durationMs: number;
  message?: string;
}

export async function syncAll(): Promise<SyncSummary> {
  const start = Date.now();

  if (running) {
    return {
      ok: false,
      skipped: true,
      totals: { fetched: 0, inserted: 0, duplicates: 0 },
      perCategory: [],
      scored: 0,
      durationMs: 0,
      message: "A sync is already in progress.",
    };
  }
  if (!hasApiKey()) {
    await prisma.syncLog.create({
      data: { status: "error", message: "GNEWS_API_KEY not configured." },
    });
    return {
      ok: false,
      totals: { fetched: 0, inserted: 0, duplicates: 0 },
      perCategory: [],
      scored: 0,
      durationMs: Date.now() - start,
      message: "GNEWS_API_KEY not configured.",
    };
  }

  running = true;
  const perCategory: CategorySyncResult[] = [];
  // Languages to pull. Override with SYNC_LANGS="en" to save GNews quota.
  const langs = (process.env.SYNC_LANGS || "en,hi")
    .split(",")
    .map((l) => l.trim())
    .filter((l): l is "en" | "hi" => l === "en" || l === "hi");
  try {
    // Sequential to respect GNews free-tier rate limits.
    for (const lang of langs) {
      for (const cat of CATEGORIES) {
        const r = await syncCategory(cat, lang);
        perCategory.push(r);
        await new Promise((res) => setTimeout(res, 1100));
      }
    }

    const scored = await recomputeTrending();
    const totals = perCategory.reduce(
      (acc, r) => ({
        fetched: acc.fetched + r.fetched,
        inserted: acc.inserted + r.inserted,
        duplicates: acc.duplicates + r.duplicates,
      }),
      { fetched: 0, inserted: 0, duplicates: 0 }
    );

    lastRunAt = Date.now();
    return {
      ok: true,
      totals,
      perCategory,
      scored,
      durationMs: Date.now() - start,
    };
  } finally {
    running = false;
  }
}

export async function isDbEmpty(): Promise<boolean> {
  const count = await prisma.news.count();
  return count === 0;
}
