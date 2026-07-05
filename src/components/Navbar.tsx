"use client";

// Sticky glass navbar. Becomes more opaque on scroll. Houses the animated
// logo, the full category menu, and the global-search trigger. Collapses to a
// slide-in drawer on mobile.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Menu, X, Command } from "lucide-react";
import Logo from "./Logo";
import LanguageSwitcher from "./LanguageSwitcher";
import { useUI } from "@/lib/store";
import { useLang } from "./LangProvider";
import { CATEGORIES } from "@/lib/categories";
import { catLabel, Lang } from "@/lib/i18n";

const NAV_ITEMS = [
  { slug: "", href: "/", accent: undefined as string | undefined },
  ...CATEGORIES.map((c) => ({
    slug: c.slug,
    href: `/category/${c.slug}`,
    accent: c.accent as string | undefined,
  })),
];

function navLabel(lang: Lang, slug: string, t: (k: string) => string) {
  return slug === "" ? t("nav.home") : catLabel(lang, slug);
}

export default function Navbar() {
  const { openSearch } = useUI();
  const { lang, t } = useLang();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setDrawer(false), [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "glass-strong border-b border-border py-2"
            : "border-b border-transparent py-2.5 sm:py-3"
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-6">
          <Logo compact={scrolled} />

          {/* Desktop category links */}
          <div className="no-scrollbar ml-2 hidden flex-1 items-center gap-0.5 overflow-x-auto py-1 lg:flex">
            {NAV_ITEMS.map((item, i) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={navLabel(lang, item.slug, t)}
                accent={item.accent}
                active={isActive(item.href)}
                index={i}
              />
            ))}
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher />
            <button
              onClick={openSearch}
              aria-label={t("nav.search")}
              className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted transition hover:border-accent/35 hover:text-ink sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">{t("nav.search")}</span>
              <kbd className="hidden items-center gap-0.5 rounded border border-border px-1 text-[10px] text-muted/70 sm:flex">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>

            <button
              onClick={() => setDrawer(true)}
              aria-label="Open menu"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card text-muted transition hover:text-ink lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </nav>

        <div className="mt-2 border-t border-border/60 lg:hidden">
          <nav
            aria-label="Mobile categories"
            className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 py-2"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  isActive(item.href)
                    ? "border-accent/35 bg-white/70 text-ink"
                    : "border-border bg-white/50 text-muted"
                }`}
                style={
                  isActive(item.href) && item.accent
                    ? {
                        borderColor: `${item.accent}88`,
                        boxShadow: `inset 0 0 12px -8px ${item.accent}`,
                      }
                    : undefined
                }
              >
                {navLabel(lang, item.slug, t)}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <motion.div
            className="fixed inset-0 z-[90] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              aria-label="Close menu"
              onClick={() => setDrawer(false)}
              className="absolute inset-0 bg-white/55 backdrop-blur-md"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="glass-strong absolute right-0 top-0 flex h-full w-[min(84vw,20rem)] flex-col gap-1 overflow-y-auto p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <Logo compact />
                <button
                  onClick={() => setDrawer(false)}
                  className="rounded-lg p-1 text-muted hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {NAV_ITEMS.map((item, i) => (
                <MobileNavLink
                  key={item.href}
                  href={item.href}
                  label={navLabel(lang, item.slug, t)}
                  accent={item.accent}
                  active={isActive(item.href)}
                  index={i}
                />
              ))}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

type NavLinkProps = {
  href: string;
  label: string;
  accent?: string;
  active: boolean;
  index: number;
};

// Animated, accent-coloured desktop nav pill: glowing dot, hover glow,
// gradient underline, and a colour-morphing active background.
function NavLink({ href, label, accent: accentProp, active, index }: NavLinkProps) {
  const accent = accentProp || "#A855F7";
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.035, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={href}
        className="group relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-transform duration-200 hover:-translate-y-0.5"
      >
        {/* hover glow halo */}
        <span
          className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: `radial-gradient(70% 120% at 50% 50%, ${accent}66, transparent 70%)` }}
        />
        {/* active pill — shared layout element morphs colour as you navigate */}
        {active && (
          <motion.span
            layoutId="nav-active"
            className="absolute inset-0 -z-10 rounded-full"
            style={{
              background: `${accent}26`,
              border: `1px solid ${accent}80`,
              boxShadow: `0 0 18px -4px ${accent}, inset 0 0 12px -6px ${accent}`,
            }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        {/* accent status dot */}
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-300 ${
            active ? "scale-110" : "scale-75 opacity-50 group-hover:scale-110 group-hover:opacity-100"
          }`}
          style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
        />
        <span className={active ? "text-ink" : "text-muted transition-colors group-hover:text-ink"}>
          {label}
        </span>
        {/* animated gradient underline */}
        <span
          className="pointer-events-none absolute -bottom-px left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full transition-all duration-300 group-hover:w-3/4"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        />
      </Link>
    </motion.div>
  );
}

// Mobile drawer link: staggered slide-in with an accent dot + accent hover bar.
function MobileNavLink({ href, label, accent: accentProp, active, index }: NavLinkProps) {
  const accent = accentProp || "#A855F7";
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.06 + index * 0.04, duration: 0.35 }}
    >
      <Link
        href={href}
        className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-4 py-2.5 text-sm transition ${
          active ? "text-ink" : "text-muted hover:text-ink"
        }`}
        style={active ? { background: `${accent}1f` } : {}}
      >
        {/* sliding accent fill on hover */}
        <span
          className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-0 transition-all duration-300 group-hover:w-full"
          style={{ background: `linear-gradient(90deg, ${accent}22, transparent)` }}
        />
        <span
          className="h-2 w-2 shrink-0 rounded-full transition-transform duration-300 group-hover:scale-125"
          style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
        />
        {label}
      </Link>
    </motion.div>
  );
}
