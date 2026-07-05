import { prisma } from "./db";
import {
  buildLocalBrief,
  looksLikeCompleteBriefForLanguage,
  needsLocalBrief,
} from "./localBrief";
import { serializeArticle } from "./serialize";

let running = false;
let lastRunAt: number | null = null;

export function summarizeStatus() {
  return { running, lastRunAt };
}

function configuredLimit(raw?: string | null): number {
  const parsed = raw ? Number(raw) : Number(process.env.AUTO_SUMMARY_BATCH_SIZE || 5);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(Math.floor(parsed), 1), 20);
}

function configuredDelay(raw?: string | null): number {
  const parsed = raw ? Number(raw) : Number(process.env.AUTO_SUMMARY_DELAY_MS || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(Math.floor(parsed), 0), 30000);
}

export interface SummarizePendingOptions {
  limit?: number;
  delayMs?: number;
}

export interface SummarizePendingSummary {
  ok: boolean;
  skipped?: boolean;
  total: number;
  pending: number;
  processed: number;
  success: number;
  failed: number;
  remaining: number;
  durationMs: number;
  message?: string;
  results: Array<{ title: string; status: "ok" | "failed" }>;
}

export async function summarizePending(
  options: SummarizePendingOptions = {}
): Promise<SummarizePendingSummary> {
  const start = Date.now();

  if (running) {
    return {
      ok: false,
      skipped: true,
      total: 0,
      pending: 0,
      processed: 0,
      success: 0,
      failed: 0,
      remaining: 0,
      durationMs: 0,
      message: "A summarization job is already in progress.",
      results: [],
    };
  }

  running = true;
  try {
    const articles = await prisma.news.findMany({
      orderBy: { publishedAt: "desc" },
    });

    const pending = articles.filter(needsLocalBrief);
    const limit = options.limit ?? configuredLimit();
    const delayMs = options.delayMs ?? configuredDelay();
    const selected = pending.slice(0, limit);

    let success = 0;
    let failed = 0;
    const results: SummarizePendingSummary["results"] = [];

    for (let i = 0; i < selected.length; i++) {
      const dbArticle = selected[i];
      const html = buildLocalBrief(serializeArticle(dbArticle));

      if (looksLikeCompleteBriefForLanguage(html, dbArticle.language)) {
        await prisma.news.update({
          where: { id: dbArticle.id },
          data: { content: html },
        });
        success++;
        results.push({ title: dbArticle.title.slice(0, 60), status: "ok" });
      } else {
        failed++;
        results.push({ title: dbArticle.title.slice(0, 60), status: "failed" });
      }

      if (i < selected.length - 1 && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    lastRunAt = Date.now();
    return {
      ok: true,
      total: articles.length,
      pending: pending.length,
      processed: selected.length,
      success,
      failed,
      remaining: Math.max(pending.length - success, 0),
      durationMs: Date.now() - start,
      results,
    };
  } finally {
    running = false;
  }
}

export async function countPendingSummaries() {
  const articles = await prisma.news.findMany({
    orderBy: { publishedAt: "desc" },
    select: { id: true, content: true, language: true },
  });

  const pending = articles.filter(
    (a) => !looksLikeCompleteBriefForLanguage(a.content, a.language)
  );

  return {
    total: articles.length,
    pending: pending.length,
    completed: articles.length - pending.length,
  };
}
