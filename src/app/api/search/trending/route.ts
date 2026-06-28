import { NextResponse } from "next/server";
import { getTrendingSearches } from "@/lib/queries";

export const dynamic = "force-dynamic";

const FALLBACK = [
  "artificial intelligence",
  "india elections",
  "stock market",
  "space mission",
  "world cup",
  "climate",
];

export async function GET() {
  const terms = await getTrendingSearches(8);
  return NextResponse.json({
    terms: terms.length ? terms : FALLBACK,
  });
}
