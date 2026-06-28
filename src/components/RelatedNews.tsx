// Related-news grid for the article page.
import NewsCard from "./NewsCard";
import type { Article } from "@/lib/types";

export default function RelatedNews({ items }: { items: Article[] }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
      <h2 className="mb-8 font-display text-2xl font-bold sm:text-3xl">
        More to <span className="text-gradient">explore</span>
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a, i) => (
          <NewsCard key={a.id} article={a} index={i} />
        ))}
      </div>
    </section>
  );
}
