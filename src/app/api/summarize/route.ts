// API route to bulk-summarize all unsummarized articles with Gemini.
// POST /api/summarize — triggers summarization of ALL pending articles.
// Protected by CRON_SECRET for production safety.
//
// This can be called manually after deployment or via a cron job.

import { NextRequest, NextResponse } from "next/server";
import {
  countPendingSummaries,
  summarizePending,
} from "@/lib/summarize";

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

  return NextResponse.json(await countPendingSummaries());
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await summarizePending({ limit: batchLimit(req) });
  return NextResponse.json(summary, { status: summary.ok ? 200 : 409 });
}
