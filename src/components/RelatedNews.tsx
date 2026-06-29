// Related-news grid for the article page.
import NewsCard from "./NewsCard";
import type { Article } from "@/lib/types";
import { Lang, makeT } from "@/lib/i18n";

export default function RelatedNews({
  items,
  lang = "en",
}: {
  items: Article[];
  lang?: Lang;
}) {
  if (!items.length) return null;
  const t = makeT(lang);
  return (
    <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
      <h2 className="mb-8 font-display text-2xl font-bold sm:text-3xl">
        {t("article.related1")}{" "}
        <span className="text-gradient">{t("article.related2")}</span>
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a, i) => (
          <NewsCard key={a.id} article={a} index={i} />
        ))}
      </div>
    </section>
  );
}
