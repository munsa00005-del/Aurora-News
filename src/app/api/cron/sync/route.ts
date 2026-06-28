// Vercel Cron entrypoint. Vercel sends a GET request on the schedule defined in
// vercel.json and includes `Authorization: Bearer <CRON_SECRET>` when the
// CRON_SECRET env var is set. We verify that, then run a full GNews sync.
//
// (Self-hosted deployments use the in-app scheduler in instrumentation.ts;
//  serverless deployments use this route instead.)

import { NextRequest, NextResponse } from "next/server";
import { syncAll } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  // Allow Vercel's signed cron header OR a manual bearer call.
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await syncAll();
  return NextResponse.json(summary, { status: summary.ok ? 200 : 409 });
}
