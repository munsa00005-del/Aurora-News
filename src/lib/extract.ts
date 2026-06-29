// Full-article extraction.
//
// GNews' free tier only returns a truncated snippet ("…[+1234 chars]"). To show
// the COMPLETE story on our own site, we fetch the original page and run a
// readability extraction, then sanitize the resulting HTML so it's safe to
// render. The cleaned HTML is cached back into the DB so we only do this once
// per article.

import { extract } from "@extractus/article-extractor";
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "h2", "h3", "h4", "ul", "ol", "li", "blockquote",
  "a", "strong", "em", "b", "i", "u", "br", "hr",
  "figure", "figcaption", "img", "span",
];

function clean(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
    // drop empty paragraphs and stray attributes
    exclusiveFilter: (frame) =>
      frame.tag === "p" && !frame.text.trim() && !frame.mediaChildren.length,
  });
}

/** Returns true when stored content is just the GNews snippet (or HTML we wrote). */
export function isTruncated(content: string | null | undefined): boolean {
  if (!content) return true;
  if (/\[\+\d+\s*chars\]/.test(content)) return true; // GNews marker
  if (looksLikeHtml(content)) return false; // we already stored full HTML
  return content.trim().length < 600; // short plain snippet
}

export function looksLikeHtml(content: string | null | undefined): boolean {
  return !!content && /<\/?(p|h2|h3|ul|ol|li|blockquote|figure|img|br)\b/i.test(content);
}

/** Fetch + extract + sanitize the full article body. Null if it can't be read. */
export async function extractFullContent(url: string): Promise<string | null> {
  try {
    const data = (await Promise.race([
      extract(url),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000)),
    ])) as { content?: string } | null;

    if (!data?.content) return null;
    const html = clean(data.content);
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length < 200) return null; // not enough real content
    return html;
  } catch {
    return null;
  }
}
