// Article summarization.
//
// Priority: Gemini -> null
//
// When GNews syncs articles, the content is often truncated. This module
// rewrites each article into a BRIEFXIFY brief with source-based explanation,
// context, impact, and a transparency note. The result is cached in `content`
// so the API call happens only once.

import sanitizeHtml from "sanitize-html";
import type { Article } from "./types";
import { extractFullContent, isTruncated } from "./extract";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

let geminiKeyCursor = 0;

function geminiApiKeys(): string[] {
  return (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

function nextGeminiKeys(): string[] {
  const keys = geminiApiKeys();
  if (keys.length <= 1) return keys;
  const start = geminiKeyCursor % keys.length;
  geminiKeyCursor = (geminiKeyCursor + 1) % keys.length;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

// ── Shared helpers ──────────────────────────────────────────────────────────

function stripSourceMarkers(text: string): string {
  return text.replace(/\[\+\d+\s*chars\]$/i, "").trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export function markdownToSafeHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let inList = false;

  function closeParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function closeList() {
    if (!inList) return;
    html.push("</ul>");
    inList = false;
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeParagraph();
      closeList();
      const level = heading[1].length === 1 ? 2 : heading[1].length + 1;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const item = line.match(/^[-*]\s+(.+)$/);
    if (item) {
      closeParagraph();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(item[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(line);
  }

  closeParagraph();
  closeList();

  return sanitizeHtml(html.join("\n"), {
    allowedTags: ["p", "h2", "h3", "h4", "ul", "li", "strong", "em"],
  });
}

export function looksLikeOriginalReport(content: string | null | undefined): boolean {
  return !!content &&
    (
      /<h[23]>Quick Brief<\/h[23]>/i.test(content) ||
      /<h[23]>त्वरित ब्रीफ<\/h[23]>/i.test(content)
    ) &&
    (
      /<h[23]>Why This Matters<\/h[23]>/i.test(content) ||
      /<h[23]>यह क्यों महत्वपूर्ण है<\/h[23]>/i.test(content)
    ) &&
    (
      /BRIEFXIFY brief is AI-assisted/i.test(content) ||
      /BRIEFXIFY ब्रीफ AI-सहायता से तैयार/i.test(content)
    );
}

export function looksLikeOriginalReportForLanguage(
  content: string | null | undefined,
  language: string | null | undefined
): boolean {
  if (!content) return false;
  if (language === "hi") {
    return (
      /<h[23]>त्वरित ब्रीफ<\/h[23]>/i.test(content) &&
      /<h[23]>यह क्यों महत्वपूर्ण है<\/h[23]>/i.test(content) &&
      /BRIEFXIFY ब्रीफ AI-सहायता से तैयार/i.test(content)
    );
  }
  return (
    /<h[23]>Quick Brief<\/h[23]>/i.test(content) &&
    /<h[23]>Why This Matters<\/h[23]>/i.test(content) &&
    /BRIEFXIFY brief is AI-assisted/i.test(content)
  );
}

export function sourceTextForRewrite(article: Article): string {
  return sourceTextForRewriteWithExtract(article);
}

function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function sourceTextForRewriteWithExtract(
  article: Article,
  extractedHtml?: string | null
): string {
  const extractedText = extractedHtml ? htmlToText(extractedHtml).slice(0, 9000) : "";
  return [
    `Title: ${article.title}`,
    `Description: ${article.description || "Not provided"}`,
    `Available content: ${stripSourceMarkers(article.content || "") || "Not provided"}`,
    extractedText ? `Extracted original article text: ${extractedText}` : "",
    `Category: ${article.category}`,
    `Published at: ${article.publishedAt}`,
    `Original source: ${article.source}`,
    article.url ? `Original URL: ${article.url}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// ── Prompt ──────────────────────────────────────────────────────────────────
// Designed to produce a source-attributed BRIEFXIFY explainer, not a copied
// article. The structure gives each page more value than a plain news summary.

function buildPrompt(article: Article, extractedHtml?: string | null): string {
  const isHindi = article.language === "hi";
  const languageRules = isHindi
    ? `Language rules — follow these strictly:
- Write the entire output in natural, fluent Hindi.
- Use Devanagari script only, except source names, brand names, URLs, and unavoidable proper nouns.
- Use these exact Markdown H2 section headings, in this order:
  ## त्वरित ब्रीफ
  ## यह क्यों महत्वपूर्ण है
  ## पृष्ठभूमि
  ## मुख्य जानकारी
  ## संभावित प्रभाव
  ## आगे क्या देखना है
  ## स्रोत और पारदर्शिता
- End the final section with these exact two lines:
  स्रोत: ${article.source}
  यह BRIEFXIFY ब्रीफ AI-सहायता से तैयार किया गया है और सार्वजनिक रूप से उपलब्ध समाचार स्रोत जानकारी पर आधारित है। यह त्वरित समझ के लिए लिखा गया है और मूल रिपोर्ट की जगह नहीं लेता। पूरे संदर्भ के लिए मूल स्रोत पढ़ें।`
    : `Language rules — follow these strictly:
- Write the entire output in English.
- Use these exact Markdown H2 section headings, in this order:
  ## Quick Brief
  ## Why This Matters
  ## Background
  ## Key Details
  ## Possible Impact
  ## What To Watch Next
  ## Source and Transparency
- End the final section with these exact two lines:
  Source: ${article.source}
  This BRIEFXIFY brief is AI-assisted and based on publicly available news source information. It is written for quick understanding and does not replace the original report. Read the original source for full context.`;

  return `You are writing for BRIEFXIFY, a news explainer website. Your readers are everyday people who want a clear, useful brief that explains what happened, why it matters, and what to watch next.

Create an original BRIEFXIFY news brief based only on the provided GNews/source metadata below. Do not write, modify, or repeat the headline; the page already displays it.

${languageRules}

Style rules — follow these strictly:
- Write between 500 and 800 words.
- Sound like a careful human editor. Vary sentence length, explain clearly, and avoid generic filler.
- NEVER use these words/phrases: "Furthermore", "Moreover", "In conclusion", "It is worth noting", "It's important to note", "Delve", "Crucial", "Landscape", "Realm", "Arguably", "Notably", "Leveraging". If you use any of these, the output is rejected.
- Do not mention prompts, rewriting, summarization, or automation outside the required transparency note.
- Use active voice wherever possible. Write "The government announced" not "It was announced by the government".
- Be direct and specific. No filler sentences. Every sentence should add new information.
- Use a neutral, professional tone — not sensational, not dry.
- Include relevant numbers, names, places, and dates from the source material.
- Do NOT invent facts, quotes, statistics, allegations, names, dates, or outcomes.
- You may add general background only when it is common context and clearly separate from the specific facts in the source.
- If a detail is missing from the source metadata, say it is not available from the provided source information.

Section rules:
- Quick Brief: 2-3 short paragraphs covering the core news.
- Why This Matters: explain reader relevance in plain language.
- Background: provide helpful context without adding unsupported claims.
- Key Details: 4-6 bullet points based on the source material.
- Possible Impact: explain who may be affected and how.
- What To Watch Next: explain what readers should monitor next, without predicting unsupported outcomes.
- Source and Transparency: include only the exact source and transparency lines required above.

Output only clean Markdown. No preamble, no sign-off.

Source material:
${sourceTextForRewriteWithExtract(article, extractedHtml)}`;
}

// ── Gemini rewrite ─────────────────────────────────────────────────────────

async function rewriteWithGemini(
  article: Article,
  extractedHtml?: string | null
): Promise<string | null> {
  const keys = nextGeminiKeys();
  if (!keys.length) return null;

  for (const key of keys) {
    try {
      const res = await fetch(
        `${GEMINI_ENDPOINT}/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    "You are a careful news explainer for BRIEFXIFY. Use only the provided source facts, add useful context without inventing details, and include the required transparency note.",
                },
              ],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: buildPrompt(article, extractedHtml) }],
              },
            ],
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 2200,
            },
          }),
        }
      );

      const data = (await res.json().catch(() => null)) as {
        error?: { message?: string; code?: number | string; status?: string };
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      } | null;

      if (!res.ok || data?.error) {
        const status = data?.error?.status || data?.error?.code || res.status;
        const message = data?.error?.message || res.statusText;
        console.error(
          `[BRIEFXIFY] Gemini rewrite failed: ${status} ${String(message).slice(0, 200)}`
        );
        if (
          res.status === 429 ||
          res.status === 503 ||
          /RESOURCE_EXHAUSTED|UNAVAILABLE|rate|quota|limit/i.test(String(status)) ||
          /RESOURCE_EXHAUSTED|UNAVAILABLE|rate|quota|limit/i.test(String(message))
        ) {
          continue;
        }
        continue;
      }

      const markdown = data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim();
      if (!markdown || markdown.length < 400) continue;

      console.log(
        `[BRIEFXIFY] Gemini summarized: "${article.title.slice(0, 60)}..." (${markdown.length} chars)`
      );
      return markdownToSafeHtml(markdown);
    } catch (e) {
      console.error("[BRIEFXIFY] Gemini rewrite error:", e);
    }
  }

  return null;
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function rewriteArticle(
  article: Article
): Promise<string | null> {
  const extractedHtml =
    article.url && isTruncated(article.content)
      ? await extractFullContent(article.url)
      : null;
  return rewriteWithGemini(article, extractedHtml);
}
