// Standalone one-off GNews sync. Mirrors src/lib/sync.ts in plain JS so it can
// run from the CLI (`npm run sync`) without the Next server. Fetches real
// articles for every category, dedupes, upserts, and scores trending.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = "https://gnews.io/api/v4";
const KEY = process.env.GNEWS_API_KEY;

const CATEGORIES = [
  { slug: "india", limit: 20, weight: 1.25, query: "India", topic: "nation", country: "in" },
  { slug: "world", limit: 10, weight: 1.15, query: "world", topic: "world" },
  { slug: "sports", limit: 8, weight: 0.95, query: "sports", topic: "sports" },
  { slug: "ai", limit: 8, weight: 1.3, query: "artificial intelligence" },
  { slug: "technology", limit: 8, weight: 1.2, query: "technology", topic: "technology" },
  { slug: "economy", limit: 8, weight: 1.1, query: "economy business", topic: "business" },
  { slug: "crime", limit: 8, weight: 0.9, query: "crime" },
  { slug: "entertainment", limit: 8, weight: 0.85, query: "entertainment", topic: "entertainment" },
  { slug: "science", limit: 7, weight: 1.05, query: "science", topic: "science" },
  { slug: "health", limit: 7, weight: 1.0, query: "health", topic: "health" },
];

const POPULAR = {
  bbc: 1.3, reuters: 1.3, "new york times": 1.25, cnn: 1.2, guardian: 1.2,
  "al jazeera": 1.15, "times of india": 1.2, hindu: 1.2, ndtv: 1.15,
  bloomberg: 1.25, techcrunch: 1.2, verge: 1.15, wired: 1.15, espn: 1.15,
};

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function slugify(title, salt = "") {
  const base = title.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
  return `${base || "article"}-${hash(salt).toString(36).slice(0, 6)}`;
}
function normTitle(t) {
  return t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ").trim();
}
function sourceWeight(s) {
  const l = s.toLowerCase();
  for (const [k, w] of Object.entries(POPULAR)) if (l.includes(k)) return w;
  return 1;
}
function score({ publishedAt, weight, source, views }) {
  const ageH = Math.max(0, (Date.now() - publishedAt.getTime()) / 36e5);
  const recency = Math.pow(0.5, ageH / 18);
  const eng = 1 + Math.log1p(views) / 6;
  return Number((recency * weight * sourceWeight(source) * eng * 100).toFixed(4));
}

async function fetchCat(cat) {
  const p = new URLSearchParams({ apikey: KEY, lang: "en", max: String(Math.min(cat.limit + 4, 25)) });
  let url;
  if (cat.topic) {
    p.set("topic", cat.topic);
    if (cat.country) p.set("country", cat.country);
    url = `${BASE}/top-headlines?${p}`;
  } else {
    p.set("q", cat.query);
    p.set("sortby", "publishedAt");
    url = `${BASE}/search?${p}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GNews ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return (await res.json()).articles ?? [];
}

async function main() {
  if (!KEY) {
    console.error("GNEWS_API_KEY not set in environment.");
    process.exit(1);
  }
  let totalNew = 0, totalDup = 0;
  for (const cat of CATEGORIES) {
    try {
      const arts = await fetchCat(cat);
      const seen = new Set();
      let inserted = 0, dupes = 0;
      for (const a of arts) {
        if (!a.title || !a.url) continue;
        const key = `k_${hash(normTitle(a.title)).toString(36)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const existing = await prisma.news.findFirst({
          where: { OR: [{ url: a.url }, { dedupeKey: key }] }, select: { id: true },
        });
        const data = {
          title: a.title.slice(0, 500),
          description: a.description ?? null,
          content: a.content ?? null,
          image: a.image ?? null,
          source: a.source?.name?.slice(0, 200) || "Unknown",
          sourceUrl: a.source?.url ?? null,
          category: cat.slug,
          url: a.url,
          dedupeKey: key,
          publishedAt: new Date(a.publishedAt || Date.now()),
        };
        if (existing) {
          await prisma.news.update({ where: { id: existing.id }, data: { description: data.description, content: data.content, image: data.image } });
          dupes++;
        } else {
          await prisma.news.create({ data: { ...data, slug: slugify(a.title, a.url) } });
          inserted++;
        }
      }
      await prisma.syncLog.create({ data: { category: cat.slug, status: "success", fetched: arts.length, inserted, duplicates: dupes } });
      totalNew += inserted; totalDup += dupes;
      console.log(`  ${cat.slug.padEnd(14)} fetched ${String(arts.length).padStart(2)}  +${inserted} new  ${dupes} dup`);
      await new Promise((r) => setTimeout(r, 1100)); // rate limit
    } catch (e) {
      console.error(`  ${cat.slug.padEnd(14)} ERROR: ${e.message}`);
      await prisma.syncLog.create({ data: { category: cat.slug, status: "error", message: String(e.message).slice(0, 400) } });
    }
  }

  // Score trending for the freshest 600.
  const rows = await prisma.news.findMany({ orderBy: { publishedAt: "desc" }, take: 600,
    select: { id: true, category: true, source: true, views: true, publishedAt: true } });
  for (const r of rows) {
    const w = CATEGORIES.find((c) => c.slug === r.category)?.weight ?? 1;
    const s = score({ publishedAt: r.publishedAt, weight: w, source: r.source, views: r.views });
    await prisma.trending.upsert({ where: { newsId: r.id }, create: { newsId: r.id, score: s }, update: { score: s } });
  }

  console.log(`\nDone. +${totalNew} new articles, ${totalDup} updated, ${rows.length} scored.`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
