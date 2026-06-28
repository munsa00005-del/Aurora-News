import { NextRequest, NextResponse } from "next/server";
import { incrementViews } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id || typeof id !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await incrementViews(id);
  return NextResponse.json({ ok: true });
}
