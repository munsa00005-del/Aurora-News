// Vercel Cron entrypoint for automatic pending-article summarization.
// Processes a bounded batch each run so serverless executions stay inside
// provider and platform limits.

import { NextRequest, NextResponse } from "next/server";
import { summarizePending } from "@/lib/summarize";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function batchLimit(req: NextRequest): number {
  const raw =
    req.nextUrl.searchParams.get("limit") ||
    process.env.CRON_SUMMARY_BATCH_SIZE;
  const parsed = raw ? Number(raw) : 20;
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(Math.floor(parsed), 1), 20);
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await summarizePending({ limit: batchLimit(req) });
  return NextResponse.json(summary, { status: summary.ok ? 200 : 409 });
}
