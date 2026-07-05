import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { Lang, makeT, catLabel } from "@/lib/i18n";

export default function Footer({ lang = "en" }: { lang?: Lang }) {
  const year = new Date().getFullYear();
  const t = makeT(lang);
  return (
    <footer className="relative z-10 mt-24 border-t border-border bg-white/58 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="font-display text-2xl font-bold">
              <span className="aurora-text">BRIEF</span>
              <span className="font-light text-muted">XIFY</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted">
              {t("footer.tagline")}
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted/80">
              {t("footer.categories")}
            </h4>
            <ul className="grid grid-cols-2 gap-y-2 text-sm">
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/category/${c.slug}`}
                    className="text-muted transition hover:text-ink"
                  >
                    {catLabel(lang, c.slug)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted/80">
              {t("footer.platform")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted transition hover:text-ink">
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/search"
                  className="text-muted transition hover:text-ink"
                >
                  {t("nav.search")}
                </Link>
              </li>
              <li>
                <Link
                  href="/about-us"
                  className="text-muted transition hover:text-ink"
                >
                  {t("footer.about")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact-us"
                  className="text-muted transition hover:text-ink"
                >
                  {t("footer.contact")}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-muted transition hover:text-ink"
                >
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/disclaimer"
                  className="text-muted transition hover:text-ink"
                >
                  {t("footer.disclaimer")}
                </Link>
              </li>
              <li>
                <span className="text-muted/75">Powered by GNews</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted/75 sm:flex-row">
          <span>© {year} BRIEFXIFY.</span>
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
