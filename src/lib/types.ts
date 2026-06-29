// Shared serializable shapes used across server/client boundaries.

export interface Article {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  image: string | null;
  source: string;
  sourceUrl: string | null;
  category: string;
  language: string;
  slug: string;
  url: string | null;
  featured: boolean;
  views: number;
  publishedAt: string; // ISO
  createdAt: string; // ISO
  trendingScore?: number;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

export interface SyncLogEntry {
  id: string;
  category: string | null;
  status: string;
  fetched: number;
  inserted: number;
  duplicates: number;
  message: string | null;
  durationMs: number | null;
  createdAt: string;
}
