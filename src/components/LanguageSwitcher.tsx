"use client";

// Compact EN / हिंदी switcher with an animated sliding pill. Sits in the navbar.

import { motion } from "framer-motion";
import { Globe2 } from "lucide-react";
import { LANGS, LANG_LABELS, Lang } from "@/lib/i18n";
import { useLang } from "./LangProvider";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-0.5">
      <Globe2 className="ml-1.5 h-3.5 w-3.5 shrink-0 text-white/45" />
      {LANGS.map((l: Lang) => {
        const active = lang === l;
        return (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`relative rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              active ? "text-white" : "text-white/55 hover:text-white"
            }`}
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-purple/40 to-cyan/40"
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
