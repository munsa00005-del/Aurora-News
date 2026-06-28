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
import { useUI } from "@/lib/store";
import { CATEGORIES } from "@/lib/categories";

const NAV = [
  { slug: "", label: "Home", href: "/" },
  ...CATEGORIES.map((c) => ({
    slug: c.slug,
    label: c.label,
    href: `/category/${c.slug}`,
    accent: c.accent,
  })),
];

export default function Navbar() {
  const { openSearch } = useUI();
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
            ? "glass-strong border-b border-white/10 py-2"
            : "border-b border-transparent py-3"
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo compact={scrolled} />

          {/* Desktop category links */}
          <div className="no-scrollbar ml-2 hidden flex-1 items-center gap-1 overflow-x-auto lg:flex">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition ${
                    active
                      ? "text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 -z-10 rounded-full bg-white/10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={openSearch}
              className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/60 transition hover:border-white/25 hover:text-white"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden items-center gap-0.5 rounded border border-white/15 px-1 text-[10px] text-white/40 sm:flex">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>

            <button
              onClick={() => setDrawer(true)}
              aria-label="Open menu"
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </nav>
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
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="glass-strong absolute right-0 top-0 flex h-full w-72 flex-col gap-1 overflow-y-auto p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <Logo compact />
                <button
                  onClick={() => setDrawer(false)}
                  className="rounded-lg p-1 text-white/50 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-4 py-2.5 text-sm transition ${
                    isActive(item.href)
                      ? "bg-white/10 text-white"
                      : "text-white/65 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
