import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// URL-safe slug from a headline. Appended hash keeps it unique.
export function slugify(title: string, salt = ""): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  const suffix = salt ? `-${hash(salt).toString(36).slice(0, 6)}` : "";
  return `${base || "article"}${suffix}`;
}

export function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// "3h ago" style relative time.
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Estimated reading time at 220 wpm.
export function readingTime(text: string | null | undefined): number {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

// Deterministic gradient fallback when an article has no image.
export function gradientFor(seed: string): string {
  const palettes = [
    ["#7C3AED", "#06B6D4"],
    ["#DC2626", "#F59E0B"],
    ["#A855F7", "#0F172A"],
    ["#06B6D4", "#7C3AED"],
    ["#F59E0B", "#DC2626"],
    ["#0F172A", "#A855F7"],
  ];
  const [a, b] = palettes[hash(seed) % palettes.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
