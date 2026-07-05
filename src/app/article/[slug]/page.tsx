// Article detail page.
//   • large hero image + headline + source + date + reading time
//   • Gemini-generated original report, reading progress, view tracking
//   • related-news recommendations

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { Clock, Eye, ArrowLeft, ExternalLink, CalendarDays } from "lucide-react";
import { getArticleBySlug, getRelated } from "@/lib/queries";
import { categoryAccent } from "@/lib/categories";
import { normalizeLang, LANG_COOKIE, makeT, catLabel } from "@/lib/i18n";
import { formatDate, readingTime, timeAgo } from "@/lib/utils";
import { extractFullContent, isTruncated, looksLikeHtml } from "@/lib/extract";
import {
  buildLocalBrief,
  looksLikeCompleteBriefForLanguage,
} from "@/lib/localBrief";
import { prisma } from "@/lib/db";
import ReadingProgress from "@/components/ReadingProgress";
import ViewTracker from "@/components/ViewTracker";
import RelatedNews from "@/components/RelatedNews";
import SafeImage from "@/components/SafeImage";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  if (!article) return { title: "Not found" };
  return {
    title: article.title,
    description: article.description ?? undefined,
    openGraph: {
      title: article.title,
      description: article.description ?? undefined,
      images: article.image ? [article.image] : undefined,
      type: "article",
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await getArticleBySlug(params.slug);
  if (!article) notFound();

  const related = await getRelated(article, 6);
  const accent = categoryAccent(article.category);
  const uiLang = normalizeLang(cookies().get(LANG_COOKIE)?.value);
  const t = makeT(uiLang);

  // Prefer a complete BRIEFXIFY report and repair missing/short content locally.
  let contentHtml: string | null = looksLikeCompleteBriefForLanguage(
    article.content,
    article.language
  )
    ? article.content
    : null;
  if (!contentHtml) {
    const rewritten = buildLocalBrief(article);
    if (looksLikeCompleteBriefForLanguage(rewritten, article.language)) {
      contentHtml = rewritten;
      await prisma.news
        .update({ where: { id: article.id }, data: { content: rewritten } })
        .catch(() => {});
    }
  }

  // Fallback when AI rewrite is unavailable: fetch + extract the original page
  // once and cache sanitized HTML so the article remains readable.
  if (!contentHtml && looksLikeHtml(article.content)) {
    contentHtml = article.content;
  }
  if (!contentHtml && isTruncated(article.content) && article.url) {
    const full = await extractFullContent(article.url);
    if (full) {
      contentHtml = full;
      await prisma.news
        .update({ where: { id: article.id }, data: { content: full } })
        .catch(() => {});
    }
  }

  // Fallback when extraction isn't possible: render whatever plain text we have.
  const fallbackText =
    article.content?.replace(/\[\+\d+\s*chars\]$/i, "").trim() ||
    article.description ||
    "";
  const fallbackParagraphs = fallbackText.split(/\n+/).filter(Boolean);
  const mins = readingTime(
    contentHtml
      ? contentHtml.replace(/<[^>]+>/g, " ")
      : fallbackText || article.description
  );

  return (
    <article className="relative pb-10">
      <ReadingProgress />
      <ViewTracker id={article.id} />

      {/* Hero image */}
      <div className="relative h-[52vh] min-h-[360px] w-full overflow-hidden">
        <SafeImage
          src={article.image}
          alt={article.title}
          fallbackKey={article.id}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f6f7fb] via-[#f6f7fb]/70 to-white/10" />

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-4xl px-4 pb-10 sm:px-6">
            <Link
              href={`/category/${article.category}`}
              className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ink backdrop-blur-md"
              style={{ borderColor: `${accent}66`, background: `${accent}22` }}
            >
              {catLabel(uiLang, article.category)}
            </Link>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              {article.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Meta + body */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> {t("article.back")}
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border py-4 text-sm text-muted">
          <span className="font-medium text-ink">{article.source}</span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" /> {formatDate(article.publishedAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {mins} {t("article.minRead")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-4 w-4" /> {article.views.toLocaleString()} {t("article.views")}
          </span>
          <span className="ml-auto text-muted/75">{timeAgo(article.publishedAt)}</span>
        </div>

        {contentHtml ? (
          <div
            className="article-body mt-8"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : (
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink/80">
            {fallbackParagraphs.length ? (
              fallbackParagraphs.map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <p className="text-muted">
                Full content for this story is available at the original source.
              </p>
            )}
          </div>
        )}

        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-flex items-center gap-2 rounded-full border border-border bg-white/60 px-5 py-2.5 text-sm font-medium text-muted transition hover:border-accent/35 hover:text-ink"
          >
            {t("article.viewOriginal", { source: article.source })}
            <ExternalLink className="h-4 w-4" />
          </a>
        )}

      </div>

      <RelatedNews items={related} lang={uiLang} />
    </article>
  );
}
