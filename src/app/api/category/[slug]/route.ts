import { NextRequest, NextResponse } from "next/server";
import { getByCategory } from "@/lib/queries";
import { getCategory } from "@/lib/categories";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const cat = getCategory(params.slug);
  if (!cat) {
    return NextResponse.json({ error: "Unknown category" }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit")) || cat.limit, 40);
  const data = await getByCategory(cat.slug, limit, cursor);
  return NextResponse.json(data);
}
