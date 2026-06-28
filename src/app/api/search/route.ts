import { NextRequest, NextResponse } from "next/server";
import { searchArticles, suggest, recordSearch } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category") || undefined;
  const cursor = searchParams.get("cursor");
  const mode = searchParams.get("mode"); // "suggest" | "full"
  const limit = Math.min(Number(searchParams.get("limit")) || 18, 40);

  if (!q) return NextResponse.json({ items: [], nextCursor: null });

  if (mode === "suggest") {
    const items = await suggest(q, 6);
    return NextResponse.json({ items, nextCursor: null });
  }

  // Record full searches only (not every keystroke) for trending-searches.
  if (!cursor) await recordSearch(q);
  const data = await searchArticles(q, { category, cursor, limit });
  return NextResponse.json(data);
}
