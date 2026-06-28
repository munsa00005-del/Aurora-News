// GNews API client. https://gnews.io/docs/v4
// Falls back gracefully when no API key is configured.

import { CategoryConfig } from "./categories";

const BASE = "https://gnews.io/api/v4";

export interface GNewsArticle {
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string };
}

interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

export function hasApiKey(): boolean {
  return Boolean(process.env.GNEWS_API_KEY && process.env.GNEWS_API_KEY.length > 5);
}

// Fetch articles for a category. Uses the `top-headlines` topic endpoint when
// the category maps to a GNews topic, otherwise the `search` endpoint.
export async function fetchCategory(
  cat: CategoryConfig,
  max = 10
): Promise<GNewsArticle[]> {
  const key = process.env.GNEWS_API_KEY;
  if (!key) throw new Error("GNEWS_API_KEY not set");

  const params = new URLSearchParams({
    apikey: key,
    lang: "en",
    max: String(Math.min(max, 25)),
  });

  let endpoint: string;
  if (cat.topic) {
    params.set("topic", cat.topic);
    if (cat.slug === "india") params.set("country", "in");
    endpoint = `${BASE}/top-headlines?${params.toString()}`;
  } else {
    params.set("q", cat.query);
    params.set("sortby", "publishedAt");
    endpoint = `${BASE}/search?${params.toString()}`;
  }

  const res = await fetch(endpoint, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GNews ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as GNewsResponse;
  return data.articles ?? [];
}
