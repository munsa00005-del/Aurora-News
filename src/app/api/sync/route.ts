import { NextRequest, NextResponse } from "next/server";
import { syncAll, syncStatus } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Manual sync trigger, authorized via a CRON_SECRET bearer token so an external
// scheduler can hit it. The in-app scheduler (instrumentation.ts) calls
// syncAll() directly and does not go through this route.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await syncAll();
  return NextResponse.json(summary, { status: summary.ok ? 200 : 409 });
}

export async function GET() {
  return NextResponse.json(syncStatus());
}
