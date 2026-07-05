// Bulk Gemini summarization script.
// Fetches articles that do not already have the stored BRIEFXIFY brief format,
// sends them to Gemini with key rotation, and updates `content` in place.
//
// Usage: node scripts/gemini-summarize-all.mjs
//
// Requires: GEMINI_API_KEYS or GEMINI_API_KEY in .env

import { PrismaClient } from "@prisma/client";
import "./env.mjs";

const prisma = new PrismaClient();

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
  .split(",")
  .map((key) => key.trim())
  .filter(Boolean);
const BETWEEN_CALLS_MS = Number(process.env.GEMINI_BETWEEN_CALLS_MS || 1500);
const RATE_LIMIT_WAIT_MS = Number(process.env.GEMINI_RATE_LIMIT_WAIT_MS || 15000);
const MAX_ATTEMPTS = Number(process.env.GEMINI_MAX_ATTEMPTS || 3);
const SUMMARIZE_MAX = Number(process.env.SUMMARIZE_MAX || 0);

let keyCursor = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextKeys() {
  if (GEMINI_KEYS.length <= 1) return GEMINI_KEYS;
  const start = keyCursor % GEMINI_KEYS.length;
  keyCursor = (keyCursor + 1) % GEMINI_KEYS.length;
  return [...GEMINI_KEYS.slice(start), ...GEMINI_KEYS.slice(0, start)];
}

function isAlreadySummarized(content, language) {
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

function buildPrompt(article) {
  const strip = (text) =>
    (text || "").replace(/\[\+\d+\s*chars\]$/i, "").trim() || "Not provided";
  const isHindi = article.language === "hi";
  const languageRules = isHindi
    ? `Language rules - follow these strictly:
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
    : `Language rules - follow these strictly:
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

  const source = [
    `Title: ${article.title}`,
    `Description: ${article.description || "Not provided"}`,
    `Available content: ${strip(article.content)}`,
    `Category: ${article.category}`,
    `Published at: ${article.publishedAt.toISOString()}`,
    `Original source: ${article.source}`,
    article.url ? `Original URL: ${article.url}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `You are writing for BRIEFXIFY, a news explainer website. Your readers are everyday people who want a clear, useful brief that explains what happened, why it matters, and what to watch next.

Create an original BRIEFXIFY news brief based only on the provided GNews/source metadata below. Do not write, modify, or repeat the headline; the page already displays it.

${languageRules}

Style rules - follow these strictly:
- Write between 500 and 800 words.
- Sound like a careful human editor. Vary sentence length, explain clearly, and avoid generic filler.
- Do not mention prompts, rewriting, summarization, or automation outside the required transparency note.
- Use active voice wherever possible.
- Be direct and specific. No filler sentences.
- Use a neutral, professional tone.
- Include relevant numbers, names, places, and dates from the source material.
- Do NOT invent facts, quotes, statistics, allegations, names, dates, or outcomes.
- If a detail is missing from the source metadata, say it is not available from the provided source information.

Output only clean Markdown. No preamble, no sign-off.

Source material:
${source}`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMd(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function mdToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let inList = false;

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMd(paragraph.join(" "))}</p>`);
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
      flushParagraph();
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length === 1 ? 2 : heading[1].length + 1;
      html.push(`<h${level}>${inlineMd(heading[2])}</h${level}>`);
      continue;
    }
    const item = line.match(/^[-*]\s+(.+)$/);
    if (item) {
      flushParagraph();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMd(item[1])}</li>`);
      continue;
    }
    closeList();
    paragraph.push(line);
  }

  flushParagraph();
  closeList();
  return html.join("\n");
}

function isTransientGeminiError(status, message) {
  return (
    status === 429 ||
    status === 503 ||
    /RESOURCE_EXHAUSTED|UNAVAILABLE|rate|quota|limit/i.test(String(message))
  );
}

async function rewriteWithGemini(article) {
  for (const key of nextKeys()) {
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
          contents: [{ role: "user", parts: [{ text: buildPrompt(article) }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 2200 },
        }),
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.error) {
      const status = data?.error?.status || data?.error?.code || res.status;
      const message = data?.error?.message || res.statusText;
      console.error(`    ⚠ Gemini ${status}: ${String(message).slice(0, 180)}`);
      if (isTransientGeminiError(res.status, `${status} ${message}`)) continue;
      continue;
    }
    const markdown = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();
    if (!markdown || markdown.length < 400) continue;
    return mdToHtml(markdown);
  }

  return null;
}

async function main() {
  if (!GEMINI_KEYS.length) {
    console.error("GEMINI_API_KEYS or GEMINI_API_KEY is not set.");
    process.exit(1);
  }

  console.log("Fetching all articles from the database...");
  const articles = await prisma.news.findMany({
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      content: true,
      category: true,
      source: true,
      url: true,
      publishedAt: true,
      language: true,
    },
  });

  let pending = articles.filter((article) =>
    !isAlreadySummarized(article.content, article.language)
  );
  console.log(
    `${pending.length} need summarization (${articles.length - pending.length} already done).`
  );

  if (SUMMARIZE_MAX > 0 && pending.length > SUMMARIZE_MAX) {
    pending = pending.slice(0, SUMMARIZE_MAX);
    console.log(`Capping this run to ${SUMMARIZE_MAX}.`);
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const article = pending[i];
    const label = `[${i + 1}/${pending.length}]`;
    process.stdout.write(`${label} "${article.title.slice(0, 55)}..."  `);

    let html = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        html = await rewriteWithGemini(article);
        break;
      } catch (error) {
        if (attempt === MAX_ATTEMPTS) {
          console.error(`    ⚠ ${error.message}`);
          break;
        }
        await sleep(RATE_LIMIT_WAIT_MS);
      }
    }

    if (html) {
      await prisma.news.update({
        where: { id: article.id },
        data: { content: html },
      });
      success++;
      console.log("ok");
    } else {
      failed++;
      console.log("skipped");
    }

    if (i < pending.length - 1) await sleep(BETWEEN_CALLS_MS);
  }

  console.log(`Done. ${success} summarized, ${failed} failed.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Fatal error:", error);
  await prisma.$disconnect();
  process.exit(1);
});
