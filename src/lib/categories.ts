// Central category configuration.
// `limit` controls how many latest articles a category page renders (per spec).
// `weight` feeds the trending algorithm (category importance).
// `query` is the GNews search/topic used when syncing.

export type CategorySlug =
  | "india"
  | "world"
  | "sports"
  | "ai"
  | "technology"
  | "economy"
  | "crime"
  | "entertainment"
  | "science"
  | "health";

export interface CategoryConfig {
  slug: CategorySlug;
  label: string;
  limit: number;
  weight: number;
  accent: string; // hex used for glows / chips
  query: string; // GNews query (English)
  queryHi?: string; // GNews query (Hindi) for search-based categories
  topic?: string; // GNews topic when available
}

export const CATEGORIES: CategoryConfig[] = [
  { slug: "india", label: "India", limit: 20, weight: 1.25, accent: "#F59E0B", query: "India", topic: "nation" },
  { slug: "world", label: "World", limit: 10, weight: 1.15, accent: "#06B6D4", query: "world", topic: "world" },
  { slug: "sports", label: "Sports", limit: 8, weight: 0.95, accent: "#22C55E", query: "sports", topic: "sports" },
  { slug: "ai", label: "AI", limit: 8, weight: 1.3, accent: "#A855F7", query: "artificial intelligence", queryHi: "आर्टिफिशियल इंटेलिजेंस" },
  { slug: "technology", label: "Technology", limit: 8, weight: 1.2, accent: "#7C3AED", query: "technology", topic: "technology" },
  { slug: "economy", label: "Economy", limit: 8, weight: 1.1, accent: "#F59E0B", query: "economy business", topic: "business" },
  { slug: "crime", label: "Crime", limit: 8, weight: 0.9, accent: "#DC2626", query: "crime", queryHi: "अपराध" },
  { slug: "entertainment", label: "Entertainment", limit: 8, weight: 0.85, accent: "#EC4899", query: "entertainment", topic: "entertainment" },
  { slug: "science", label: "Science", limit: 7, weight: 1.05, accent: "#06B6D4", query: "science", topic: "science" },
  { slug: "health", label: "Health", limit: 7, weight: 1.0, accent: "#10B981", query: "health", topic: "health" },
];

export const CATEGORY_MAP: Record<string, CategoryConfig> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c])
);

export function getCategory(slug: string): CategoryConfig | undefined {
  return CATEGORY_MAP[slug.toLowerCase()];
}

export function categoryLabel(slug: string): string {
  return CATEGORY_MAP[slug.toLowerCase()]?.label ?? slug;
}

export function categoryAccent(slug: string): string {
  return CATEGORY_MAP[slug.toLowerCase()]?.accent ?? "#A855F7";
}

// Popular sources get a trending boost (popular news sources factor).
export const POPULAR_SOURCES: Record<string, number> = {
  "BBC": 1.3,
  "Reuters": 1.3,
  "The New York Times": 1.25,
  "CNN": 1.2,
  "The Guardian": 1.2,
  "Al Jazeera": 1.15,
  "The Times of India": 1.2,
  "The Hindu": 1.2,
  "NDTV": 1.15,
  "Hindustan Times": 1.15,
  "Bloomberg": 1.25,
  "TechCrunch": 1.2,
  "The Verge": 1.15,
  "Wired": 1.15,
  "ESPN": 1.15,
};
