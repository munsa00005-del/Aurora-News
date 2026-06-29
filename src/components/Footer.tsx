import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { Lang, makeT, catLabel } from "@/lib/i18n";

export default function Footer({ lang = "en" }: { lang?: Lang }) {
  const year = new Date().getFullYear();
  const t = makeT(lang);
  return (
    <footer className="relative z-10 mt-24 border-t border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="font-display text-2xl font-bold">
              <span className="aurora-text">AURORA</span>
              <span className="ml-1 font-light text-white/70">News</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-white/50">
              {t("footer.tagline")}
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
              {t("footer.categories")}
            </h4>
            <ul className="grid grid-cols-2 gap-y-2 text-sm">
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/category/${c.slug}`}
                    className="text-white/60 transition hover:text-white"
                  >
                    {catLabel(lang, c.slug)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
              {t("footer.platform")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-white/60 transition hover:text-white">
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/search"
                  className="text-white/60 transition hover:text-white"
                >
                  {t("nav.search")}
                </Link>
              </li>
              <li>
                <span className="text-white/40">Powered by GNews</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <span>© {year} Aurora News.</span>
          <span>{t("footer.updated")}</span>
        </div>

        <div className="mt-6 text-center">
          <span className="text-sm font-medium tracking-wide">
            {t("footer.madeBy")}{" "}
            <span className="aurora-text font-display font-bold">NITESH KUMAR</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
