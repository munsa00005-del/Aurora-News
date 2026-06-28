// Trending score model.
//
// score = recency * categoryWeight * sourceWeight * engagement
//
//   recency      — exponential decay on publish age (half-life ~18h)
//   categoryWeight — "category importance" from categories.ts
//   sourceWeight   — "popular news sources" boost
//   engagement     — log-scaled view count (user engagement metric)

import { CATEGORY_MAP, POPULAR_SOURCES } from "./categories";

const HALF_LIFE_HOURS = 18;

export function recencyScore(publishedAt: Date, now = Date.now()): number {
  const ageHours = Math.max(0, (now - publishedAt.getTime()) / 36e5);
  // 0.5 ^ (age / halfLife)  → 1.0 fresh, 0.5 after 18h, etc.
  return Math.pow(0.5, ageHours / HALF_LIFE_HOURS);
}

export function sourceWeight(source: string): number {
  // Case-insensitive partial match against the popular-sources table.
  const lower = source.toLowerCase();
  for (const [name, w] of Object.entries(POPULAR_SOURCES)) {
    if (lower.includes(name.toLowerCase())) return w;
  }
  return 1.0;
}

export function categoryWeight(category: string): number {
  return CATEGORY_MAP[category.toLowerCase()]?.weight ?? 1.0;
}

export function engagementScore(views: number): number {
  // log1p so a viral article doesn't completely dominate.
  return 1 + Math.log1p(views) / 6;
}

export function computeScore(args: {
  publishedAt: Date;
  category: string;
  source: string;
  views: number;
  now?: number;
}): number {
  const recency = recencyScore(args.publishedAt, args.now);
  const cat = categoryWeight(args.category);
  const src = sourceWeight(args.source);
  const eng = engagementScore(args.views);
  // Scale to a friendlier 0–100ish range.
  return Number((recency * cat * src * eng * 100).toFixed(4));
}
