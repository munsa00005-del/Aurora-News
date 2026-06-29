import { NextRequest, NextResponse } from "next/server";
import { getTrending } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const lang = searchParams.get("lang") === "hi" ? "hi" : "en";
  const limit = Math.min(Number(searchParams.get("limit")) || 18, 40);
  const data = await getTrending(limit, cursor, lang);
  return NextResponse.json(data);
}
