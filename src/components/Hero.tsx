"use client";

// Cinematic fullscreen hero.
//   • interactive 3D globe (lazy-loaded, client only)
//   • animated logo + tagline that fade/scale in on load
//   • global search bar that opens the command palette
//   • scroll-linked transforms: the whole hero parallaxes + fades as you scroll
//   • floating glow spheres + a scroll cue

import dynamic from "next/dynamic";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Search, ChevronDown } from "lucide-react";
import { useUI } from "@/lib/store";
import { useLang } from "./LangProvider";

// Globe is heavy (three.js) → load only on the client, after paint.
const Globe = dynamic(() => import("./Globe"), {
  ssr: false,
  loading: () => null,
});

export default function Hero() {
  const { openSearch } = useUI();
  const { t } = useLang();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 pt-20"
    >
      {/* Globe sits behind the copy */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[120vmin] w-[120vmin] max-w-[900px] max-h-[900px] opacity-80">
          <Globe />
        </div>
      </div>

      {/* floating glow spheres */}
      <div className="pointer-events-none absolute left-[8%] top-[22%] h-40 w-40 animate-float-slow rounded-full bg-purple/30 blur-3xl" />
      <div className="pointer-events-none absolute right-[10%] top-[30%] h-52 w-52 animate-float rounded-full bg-cyan/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[18%] left-[20%] h-32 w-32 animate-pulse-glow rounded-full bg-amber/20 blur-3xl" />

      <motion.div
        style={{ y, opacity, scale }}
        className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center"
      >
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl"
        >
          {t("hero.tagline1")}
          <br />
          <span className="aurora-text">{t("hero.tagline2")}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: 0.6 }}
          className="mt-6 max-w-xl text-balance text-base text-white/60 sm:text-lg"
        >
          {t("hero.subtitle")}
        </motion.p>

        {/* search bar */}
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          onClick={openSearch}
          className="group glass-strong mt-9 flex w-full max-w-lg items-center gap-3 rounded-2xl px-5 py-4 text-left transition hover:border-white/25 hover:shadow-glow"
        >
          <Search className="h-5 w-5 text-white/50 transition group-hover:text-cyan" />
          <span className="flex-1 text-white/45">
            {t("hero.searchPlaceholder")}
          </span>
          <kbd className="hidden rounded border border-white/15 px-2 py-0.5 text-[11px] text-white/40 sm:block">
            ⌘K
          </kbd>
        </motion.button>
      </motion.div>

      {/* scroll cue */}
      <motion.div
        style={{ opacity }}
        className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2 text-white/40">
          <span className="text-[10px] uppercase tracking-[0.3em]">{t("hero.scroll")}</span>
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      </motion.div>
    </section>
  );
}
