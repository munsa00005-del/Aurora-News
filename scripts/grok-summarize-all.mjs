// Bulk Groq summarization script.
// Fetches ALL articles from the database that don't already have the stored
// BRIEFXIFY brief format, sends them to Groq for a source-attributed explainer,
// and updates the `content` column in-place.
//
// Usage:  node scripts/grok-summarize-all.mjs
//
// Requires: GROQ_API_KEY or GROK_API_KEY in .env

import { PrismaClient } from "@prisma/client";
import "./env.mjs";

const prisma = new PrismaClient();

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
const configuredModel = process.env.GROQ_MODEL || process.env.GROK_MODEL;
const GROQ_MODEL =
  configuredModel && !configuredModel.startsWith("grok-")
    ? configuredModel
    : "llama-3.1-8b-instant";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
// Steady pacing: ~1 request / 30s keeps us comfortably under Groq's free-tier
// limits so a large backlog clears without 429 storms. Override via env.
const BETWEEN_CALLS_MS = Number(process.env.GROQ_BETWEEN_CALLS_MS || 30000);
const RATE_LIMIT_WAIT_MS = Number(process.env.GROQ_RATE_LIMIT_WAIT_MS || 65000);
const MAX_ATTEMPTS = Number(process.env.GROQ_MAX_ATTEMPTS || 8);
// Optional cap on articles processed per run (0 = no cap). Keeps a scheduled
// job within a time budget (e.g. GitHub Actions' 6h job limit).
const SUMMARIZE_MAX = Number(process.env.SUMMARIZE_MAX || 0);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Detection: does the content already look like our report? ───────────────
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

// ── Build prompt ────────────────────────────────────────────────────────────
function buildPrompt(article) {
  const strip = (t) =>
    (t || "").replace(/\[\+\d+\s*chars\]$/i, "").trim() || "Not provided";
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
${source}`;
}

// ── Minimal markdown → safe HTML converter ──────────────────────────────────
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
  let para = [];
  let inList = false;

  function flushP() {
    if (!para.length) return;
    html.push(`<p>${inlineMd(para.join(" "))}</p>`);
    para = [];
  }
  function closeList() {
    if (!inList) return;
    html.push("</ul>");
    inList = false;
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushP(); closeList(); continue; }

    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      flushP(); closeList();
      const lvl = h[1].length === 1 ? 2 : h[1].length + 1;
      html.push(`<h${lvl}>${inlineMd(h[2])}</h${lvl}>`);
      continue;
    }

    const li = line.match(/^[-*]\s+(.+)$/);
    if (li) {
      flushP();
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${inlineMd(li[1])}</li>`);
      continue;
    }

    closeList();
    para.push(line);
  }
  flushP(); closeList();
  return html.join("\n");
}

// ── Groq rewrite ────────────────────────────────────────────────────────────
async function rewriteWithGroq(article) {
  if (!GROQ_API_KEY) return null;
  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a careful news explainer for BRIEFXIFY. Use only the provided source facts, add useful context without inventing details, and include the required transparency note.",
          },
          { role: "user", content: buildPrompt(article) },
        ],
        temperature: 0.6,
        max_tokens: 2200,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`    ⚠ Groq ${res.status}: ${body.slice(0, 120)}`);
      if (res.status === 429) {
        const err = new Error("Groq rate limit");
        err.rateLimited = true;
        throw err;
      }
      return null;
    }
    const data = await res.json();
    const md = data.choices?.[0]?.message?.content?.trim();
    if (!md || md.length < 400) return null;
    return mdToHtml(md);
  } catch (e) {
    if (e.rateLimited) throw e;
    console.error(`    ⚠ Groq error: ${e.message}`);
    return null;
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (!GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY or GROK_API_KEY is not set.");
    process.exit(1);
  }

  console.log("🔍 Fetching all articles from the database...");
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

  console.log(`📰 Found ${articles.length} total articles.`);

  // Filter out already-summarized articles
  let pending = articles.filter((a) => !isAlreadySummarized(a.content, a.language));
  console.log(
    `✍  ${pending.length} need summarization (${articles.length - pending.length} already done).`
  );
  if (SUMMARIZE_MAX > 0 && pending.length > SUMMARIZE_MAX) {
    pending = pending.slice(0, SUMMARIZE_MAX);
    console.log(`⏳ capping this run to ${SUMMARIZE_MAX} (SUMMARIZE_MAX).`);
  }

  if (!pending.length) {
    console.log("✅ All articles already summarized! Nothing to do.");
    await prisma.$disconnect();
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const article = pending[i];
    const label = `[${i + 1}/${pending.length}]`;

    process.stdout.write(`${label} "${article.title.slice(0, 55)}…"  `);

    let html = null;
    const engine = "Groq";
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        html = await rewriteWithGroq(article);
        break;
      } catch (e) {
        if (!e.rateLimited || attempt === MAX_ATTEMPTS) {
          console.error(`    ⚠ ${e.message}`);
          break;
        }
        console.log(`⏳ rate limited; waiting ${Math.round(RATE_LIMIT_WAIT_MS / 1000)}s (attempt ${attempt}/${MAX_ATTEMPTS})`);
        await sleep(RATE_LIMIT_WAIT_MS);
        process.stdout.write(`${label} retry ${attempt + 1}/${MAX_ATTEMPTS}  `);
      }
    }

    if (html) {
      await prisma.news.update({
        where: { id: article.id },
        data: { content: html },
      });
      console.log(`✅ ${engine}`);
      success++;
    } else {
      console.log(`❌ skipped`);
      failed++;
    }

    if (i < pending.length - 1) {
      await sleep(BETWEEN_CALLS_MS);
    }
  }

  console.log(`\n🎉 Done! ${success} summarized, ${failed} failed.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Fatal error:", e);
  await prisma.$disconnect();
  process.exit(1);
});
