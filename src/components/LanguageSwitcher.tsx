"use client";

// Compact EN / हिंदी switcher with an animated sliding pill. Sits in the navbar.

import { motion } from "framer-motion";
import { Globe2 } from "lucide-react";
import { LANGS, LANG_LABELS, Lang } from "@/lib/i18n";
import { useLang } from "./LangProvider";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border bg-white/60 p-0.5 sm:gap-1">
      <Globe2 className="ml-1 h-3.5 w-3.5 shrink-0 text-muted sm:ml-1.5" />
      {LANGS.map((l: Lang) => {
        const active = lang === l;
        return (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`relative rounded-full px-2 py-1 text-[11px] font-medium transition-colors sm:px-2.5 sm:text-xs ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-blueblob/70 to-mintblob/70"
                style={{ boxShadow: "0 0 14px -4px #7C3AED" }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            {LANG_LABELS[l]}
          </button>
        );
      })}
    </div>
  );
}
