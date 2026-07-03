// API route to bulk-summarize all unsummarized articles with Grok.
// POST /api/summarize — triggers summarization of ALL pending articles.
// Protected by CRON_SECRET for production safety.
//
// This can be called manually after deployment or via a cron job.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  rewriteArticle,
  looksLikeOriginalReportForLanguage,
} from "@/lib/rewrite";
import { serializeArticle } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for Vercel

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  return !secret || auth === `Bearer ${secret}`;
}

function batchLimit(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("limit");
  const parsed = raw ? Number(raw) : 5;
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(Math.max(Math.floor(parsed), 1), 20);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const articles = await prisma.news.findMany({
    orderBy: { publishedAt: "desc" },
    select: { id: true, content: true, language: true },
  });

  const pending = articles.filter(
    (a) => !looksLikeOriginalReportForLanguage(a.content, a.language)
  );

  return NextResponse.json({
    total: articles.length,
    pending: pending.length,
    completed: articles.length - pending.length,
  });
}

export async function POST(req: NextRequest) {
  // Auth check
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const articles = await prisma.news.findMany({
    orderBy: { publishedAt: "desc" },
  });

  const pending = articles.filter(
    (a) => !looksLikeOriginalReportForLanguage(a.content, a.language)
  );
  const selected = pending.slice(0, batchLimit(req));

  let success = 0;
  let failed = 0;
  const results: Array<{ title: string; status: string; engine?: string }> = [];

  for (const dbArticle of selected) {
    const article = serializeArticle(dbArticle);
    const html = await rewriteArticle(article);

    if (html) {
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

    // Rate limit between calls
    await new Promise((r) => setTimeout(r, 1500));
  }

  return NextResponse.json({
    total: articles.length,
    pending: pending.length,
    processed: selected.length,
    success,
    failed,
    remaining: pending.length - success,
    results: results.slice(0, 20), // only show first 20 in response
  });
}
