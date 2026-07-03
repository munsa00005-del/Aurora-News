"use client";

// Global command-palette style search.
//   • instant suggestions (debounced) as you type
//   • trending searches + recent history when empty
//   • category filter chips
//   • Enter / "See all results" → /search?q=…
// Opened from anywhere via the `useUI` store (Cmd/Ctrl-K or the nav button).

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, TrendingUp, Clock, ArrowRight, Hash } from "lucide-react";
import { useUI } from "@/lib/store";
import { useLang } from "./LangProvider";
import { CATEGORIES } from "@/lib/categories";
import { catLabel } from "@/lib/i18n";
import type { Article } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const HISTORY_KEY = "orbitnews_search_history";

function loadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]").slice(0, 6);
  } catch {
    return [];
  }
}
function pushHistory(term: string) {
  const t = term.trim();
  if (!t) return;
  const next = [t, ...loadHistory().filter((x) => x !== t)].slice(0, 6);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export default function SearchOverlay() {
  const { searchOpen, closeSearch, toggleSearch } = useUI();
  const { lang, t } = useLang();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  // Global Cmd/Ctrl-K shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleSearch();
      }
      if (e.key === "Escape") closeSearch();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSearch, closeSearch]);

  // On open: focus, load history + trending.
  useEffect(() => {
    if (!searchOpen) return;
    setHistory(loadHistory());
    fetch("/api/search/trending")
      .then((r) => r.json())
      .then((d) => setTrending(d.terms || []))
      .catch(() => {});
    const id = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(id);
  }, [searchOpen]);

  // Debounced instant suggestions.
  useEffect(() => {
    if (!q.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(() => {
      const params = new URLSearchParams({ q, mode: "suggest", lang });
      fetch(`/api/search?${params}`)
        .then((r) => r.json())
        .then((d) => setSuggestions(d.items || []))
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 220);
    return () => clearTimeout(id);
  }, [q]);

  const submit = useCallback(
    (term?: string) => {
      const value = (term ?? q).trim();
      if (!value) return;
      pushHistory(value);
      closeSearch();
      const params = new URLSearchParams({ q: value });
      if (category) params.set("category", category);
      router.push(`/search?${params}`);
    },
    [q, category, router, closeSearch]
  );

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center px-3 pt-[8vh] sm:px-4 sm:pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            aria-label="Close search"
            onClick={closeSearch}
            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="glass-strong relative w-full max-w-2xl overflow-hidden rounded-2xl shadow-glow sm:rounded-3xl"
          >
            {/* Input */}
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
              <Search className="h-5 w-5 shrink-0 text-white/50" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={t("search.placeholder")}
                className="min-w-0 w-full bg-transparent text-base text-white placeholder-white/35 outline-none sm:text-lg"
              />
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-cyan" />
              )}
              <button
                onClick={closeSearch}
                className="rounded-lg p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Category filter chips */}
            <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-white/5 px-3 py-3 sm:px-5">
              <Chip active={category === ""} onClick={() => setCategory("")}>
                {t("search.all")}
              </Chip>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.slug}
                  active={category === c.slug}
                  accent={c.accent}
                  onClick={() => setCategory(c.slug)}
                >
                  {catLabel(lang, c.slug)}
                </Chip>
              ))}
            </div>

            {/* Body */}
            <div className="max-h-[62vh] overflow-y-auto p-2 sm:max-h-[48vh] sm:p-3">
              {q.trim() ? (
                <>
                  {suggestions.length > 0 ? (
                    <ul className="space-y-1">
                      {suggestions.map((a) => (
                        <li key={a.id}>
                          <Link
                            href={`/article/${a.slug}`}
                            onClick={closeSearch}
                            className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/5 sm:items-center"
                          >
                            <Search className="h-4 w-4 shrink-0 text-white/30" />
                            <span className="line-clamp-1 flex-1 text-sm text-white/90">
                              {a.title}
                            </span>
                            <span className="hidden shrink-0 text-[11px] uppercase tracking-wide text-white/35 sm:inline">
                              {catLabel(lang, a.category)} · {timeAgo(a.publishedAt)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    !loading && (
                      <p className="px-3 py-6 text-center text-sm text-white/40">
                        {t("search.noQuick")}
                      </p>
                    )
                  )}
                  <button
                    onClick={() => submit()}
                    className="mt-2 flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-purple/20 to-cyan/20 px-4 py-3 text-sm font-medium text-white transition hover:from-purple/30 hover:to-cyan/30"
                  >
                    <span>
                      {t("search.seeAll")} “{q.trim()}”
                      {category ? ` · ${catLabel(lang, category)}` : ""}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div className="space-y-5 p-2">
                  {history.length > 0 && (
                    <Section icon={<Clock className="h-3.5 w-3.5" />} label={t("search.recent")}>
                      {history.map((h) => (
                        <Pill key={h} onClick={() => submit(h)}>
                          {h}
                        </Pill>
                      ))}
                    </Section>
                  )}
                  <Section
                    icon={<TrendingUp className="h-3.5 w-3.5" />}
                    label={t("search.trending")}
                  >
                    {trending.map((term) => (
                      <Pill key={term} onClick={() => submit(term)}>
                        <Hash className="h-3 w-3 opacity-50" />
                        {term}
                      </Pill>
                    ))}
                  </Section>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Chip({
  children,
  active,
  accent = "#A855F7",
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  accent?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={active ? { borderColor: accent, color: "#fff" } : {}}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "bg-white/10"
          : "border-white/10 text-white/55 hover:border-white/25 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-white/40">
        {icon}
        {label}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Pill({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/75 transition hover:border-purple/40 hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}
