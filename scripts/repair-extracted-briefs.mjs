// Repair metadata-only BRIEFXIFY briefs by extracting the original article page
// first, then generating a fresh English/Hindi brief from the fuller source text.
//
// Usage:
//   node scripts/repair-extracted-briefs.mjs
//
// Environment:
//   GEMINI_API_KEYS or GEMINI_API_KEY
//   REPAIR_MAX=20             optional cap
//   REPAIR_LANGUAGE=hi|en     optional language filter
//   REPAIR_BETWEEN_MS=1800    optional delay between updates

import { PrismaClient } from "@prisma/client";
import { extract } from "@extractus/article-extractor";
import sanitizeHtml from "sanitize-html";
import "./env.mjs";

const prisma = new PrismaClient();

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_KEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
  .split(",")
  .map((key) => key.trim())
  .filter(Boolean);
const REPAIR_MAX = Number(process.env.REPAIR_MAX || 0);
const REPAIR_LANGUAGE = (process.env.REPAIR_LANGUAGE || "").trim();
const BETWEEN_MS = Number(process.env.REPAIR_BETWEEN_MS || 1800);
const EXTRACT_TIMEOUT_MS = Number(process.env.REPAIR_EXTRACT_TIMEOUT_MS || 14000);
const MAX_SOURCE_CHARS = Number(process.env.REPAIR_SOURCE_CHARS || 10000);
const SKIP_GEMINI = process.env.REPAIR_SKIP_GEMINI === "1";

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

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\[\+\d+\s*chars\]$/i, "")
    .replace(/\s+/g, " ")
    .trim();
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

function isWeakMetadataBrief(article) {
  const content = article.content || "";
  if (!isAlreadySummarized(content, article.language)) return true;
  return /available source metadata|stored source metadata|source metadata|उपलब्ध स्रोत मेटाडेटा|संग्रहीत मेटाडेटा|मूल फीड में पूरा लेख उपलब्ध नहीं|शीर्षक, स्रोत, श्रेणी, तारीख/i.test(
    content
  );
}

function escapeHtml(text) {
  return String(text || "")
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

  return sanitizeHtml(html.join("\n"), {
    allowedTags: ["p", "h2", "h3", "h4", "ul", "li", "strong", "em"],
  });
}

async function extractSourceText(url) {
  if (!url) return "";
  try {
    const data = await Promise.race([
      extract(url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("extract timeout")), EXTRACT_TIMEOUT_MS)
      ),
    ]);
    const text = cleanText(data?.content || "");
    return text.length >= 250 ? text.slice(0, MAX_SOURCE_CHARS) : "";
  } catch (error) {
    console.log(`extract failed: ${String(error.message || error).slice(0, 120)}`);
    return "";
  }
}

function buildPrompt(article, extractedText) {
  const isHindi = article.language === "hi";
  const detail = cleanText(article.description || article.content) || "Not provided";
  const source = [
    `Title: ${article.title}`,
    `Description: ${detail}`,
    extractedText ? `Extracted original article text: ${extractedText}` : "",
    `Category: ${article.category}`,
    `Published at: ${article.publishedAt.toISOString()}`,
    `Original source: ${article.source}`,
    article.url ? `Original URL: ${article.url}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const languageRules = isHindi
    ? `Language rules:
- Write the entire output in natural, fluent Hindi using Devanagari script.
- Keep source names, brand names, URLs, and unavoidable proper nouns as commonly written.
- Use these exact Markdown H2 headings in this order:
  ## त्वरित ब्रीफ
  ## यह क्यों महत्वपूर्ण है
  ## पृष्ठभूमि
  ## मुख्य जानकारी
  ## संभावित प्रभाव
  ## आगे क्या देखना है
  ## स्रोत और पारदर्शिता
- End the final section with exactly:
  स्रोत: ${article.source}
  यह BRIEFXIFY ब्रीफ AI-सहायता से तैयार किया गया है और सार्वजनिक रूप से उपलब्ध समाचार स्रोत जानकारी पर आधारित है। यह त्वरित समझ के लिए लिखा गया है और मूल रिपोर्ट की जगह नहीं लेता। पूरे संदर्भ के लिए मूल स्रोत पढ़ें।`
    : `Language rules:
- Write the entire output in English.
- Use these exact Markdown H2 headings in this order:
  ## Quick Brief
  ## Why This Matters
  ## Background
  ## Key Details
  ## Possible Impact
  ## What To Watch Next
  ## Source and Transparency
- End the final section with exactly:
  Source: ${article.source}
  This BRIEFXIFY brief is AI-assisted and based on publicly available news source information. It is written for quick understanding and does not replace the original report. Read the original source for full context.`;

  return `Write a fresh BRIEFXIFY news brief from the source material below. Use the extracted original article text when available; use the short feed description only to fill gaps. Do not copy long passages. Do not invent facts, quotes, numbers, dates, names, or outcomes.

${languageRules}

Style:
- 450 to 750 words.
- Clear, human, neutral news explainer tone.
- Explain what happened, why it matters, key facts, likely impact, and what readers should watch next.
- If a fact is not available from the provided material, say that the detail is not available from the provided source information.
- Do not mention prompts, extraction, metadata, scraping, or automation except in the required transparency note.
- Output clean Markdown only.

Source material:
${source}`;
}

function validBrief(html, language) {
  if (language === "hi") {
    return (
      /<h[23]>त्वरित ब्रीफ<\/h[23]>/i.test(html) &&
      /<h[23]>यह क्यों महत्वपूर्ण है<\/h[23]>/i.test(html) &&
      /BRIEFXIFY ब्रीफ AI-सहायता से तैयार/i.test(html)
    );
  }
  return (
    /<h[23]>Quick Brief<\/h[23]>/i.test(html) &&
    /<h[23]>Why This Matters<\/h[23]>/i.test(html) &&
    /BRIEFXIFY brief is AI-assisted/i.test(html)
  );
}

function splitSentences(text, language) {
  const normalized = cleanText(text);
  if (!normalized) return [];
  const pattern = language === "hi" ? /(?<=[।!?])\s+/ : /(?<=[.!?])\s+/;
  return normalized
    .split(pattern)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35)
    .slice(0, 14);
}

function listHtml(items) {
  return `<ul>\n${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}\n</ul>`;
}

function paragraph(text) {
  return `<p>${escapeHtml(text)}</p>`;
}

function heading(text) {
  return `<h2>${escapeHtml(text)}</h2>`;
}

function buildExtractiveBrief(article, extractedText) {
  const isHindi = article.language === "hi";
  const sentences = splitSentences(extractedText || article.description || article.content, article.language);
  const detail = sentences[0] || cleanText(article.description || article.content) || article.title;
  const second = sentences[1] || "";
  const third = sentences[2] || "";
  const bullets = sentences.slice(0, 6);
  const date = new Intl.DateTimeFormat(isHindi ? "hi-IN" : "en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(article.publishedAt);

  if (isHindi) {
    return [
      heading("त्वरित ब्रीफ"),
      paragraph(`${article.source} ने ${date} को यह रिपोर्ट प्रकाशित की। ${detail}`),
      second ? paragraph(second) : "",
      heading("यह क्यों महत्वपूर्ण है"),
      paragraph(
        `यह खबर ${article.category} श्रेणी से जुड़े पाठकों के लिए उपयोगी है क्योंकि यह मूल रिपोर्ट में सामने आए मुख्य घटनाक्रम, संबंधित पक्षों और आगे की स्थिति को जल्दी समझने में मदद करती है।`
      ),
      heading("पृष्ठभूमि"),
      paragraph(
        third ||
          "मूल रिपोर्ट में उपलब्ध जानकारी के आधार पर यह मामला अपने क्षेत्र और विषय से जुड़े पाठकों के लिए प्रासंगिक है।"
      ),
      heading("मुख्य जानकारी"),
      listHtml(
        bullets.length
          ? bullets
          : [
              `स्रोत: ${article.source}`,
              `प्रकाशित: ${date}`,
              `श्रेणी: ${article.category}`,
              `मुख्य विषय: ${article.title}`,
            ]
      ),
      heading("संभावित प्रभाव"),
      paragraph(
        "इस खबर का असर संबंधित लोगों, संस्थाओं या पाठकों पर इस बात से तय होगा कि आगे मूल स्रोत, आधिकारिक पक्ष या अन्य भरोसेमंद रिपोर्टिंग में क्या अतिरिक्त जानकारी सामने आती है।"
      ),
      heading("आगे क्या देखना है"),
      paragraph(
        "पाठकों को आगे की रिपोर्टिंग, आधिकारिक अपडेट, संबंधित पक्षों की प्रतिक्रिया और मूल स्रोत में होने वाले बदलावों पर नजर रखनी चाहिए।"
      ),
      heading("स्रोत और पारदर्शिता"),
      paragraph(`स्रोत: ${article.source}`),
      paragraph(
        "यह BRIEFXIFY ब्रीफ AI-सहायता से तैयार किया गया है और सार्वजनिक रूप से उपलब्ध समाचार स्रोत जानकारी पर आधारित है। यह त्वरित समझ के लिए लिखा गया है और मूल रिपोर्ट की जगह नहीं लेता। पूरे संदर्भ के लिए मूल स्रोत पढ़ें।"
      ),
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    heading("Quick Brief"),
    paragraph(`${article.source} published this report on ${date}. ${detail}`),
    second ? paragraph(second) : "",
    heading("Why This Matters"),
    paragraph(
      `This story is relevant for readers following ${article.category} updates because it brings together the main development, the parties involved, and the details available from the original report.`
    ),
    heading("Background"),
    paragraph(
      third ||
        "Based on the original report information available to BRIEFXIFY, the story is connected to the broader category and source coverage shown on this page."
    ),
    heading("Key Details"),
    listHtml(
      bullets.length
        ? bullets
        : [
            `Source: ${article.source}`,
            `Published: ${date}`,
            `Category: ${article.category}`,
            `Main topic: ${article.title}`,
          ]
    ),
    heading("Possible Impact"),
    paragraph(
      "The impact will depend on what additional reporting, official updates, or responses from involved parties add to the public record."
    ),
    heading("What To Watch Next"),
    paragraph(
      "Readers should watch for follow-up reporting, official statements, corrections, and any updates from the original publisher."
    ),
    heading("Source and Transparency"),
    paragraph(`Source: ${article.source}`),
    paragraph(
      "This BRIEFXIFY brief is AI-assisted and based on publicly available news source information. It is written for quick understanding and does not replace the original report. Read the original source for full context."
    ),
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateBrief(article, extractedText) {
  if (SKIP_GEMINI) return buildExtractiveBrief(article, extractedText);

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
                  "You are a careful BRIEFXIFY news editor. Use only the provided source facts. Write in the requested language and include the required transparency note.",
              },
            ],
          },
          contents: [{ role: "user", parts: [{ text: buildPrompt(article, extractedText) }] }],
          generationConfig: { temperature: 0.45, maxOutputTokens: 2200 },
        }),
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.error) {
      const status = data?.error?.status || data?.error?.code || res.status;
      const message = data?.error?.message || res.statusText;
      console.log(`gemini ${status}: ${String(message).slice(0, 160)}`);
      continue;
    }
    const markdown = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();
    if (!markdown || markdown.length < 500) continue;
    const html = mdToHtml(markdown);
    if (validBrief(html, article.language)) return html;
  }
  return extractedText ? buildExtractiveBrief(article, extractedText) : null;
}

async function main() {
  if (!GEMINI_KEYS.length) {
    console.error("GEMINI_API_KEYS or GEMINI_API_KEY is not set.");
    process.exit(1);
  }

  const where = REPAIR_LANGUAGE ? { language: REPAIR_LANGUAGE } : {};
  const articles = await prisma.news.findMany({
    where,
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

  let pending = articles.filter(isWeakMetadataBrief);
  if (REPAIR_MAX > 0) pending = pending.slice(0, REPAIR_MAX);

  console.log(`Repairing ${pending.length} weak briefs.`);
  let updated = 0;
  let failed = 0;
  let extracted = 0;

  for (let index = 0; index < pending.length; index++) {
    const article = pending[index];
    process.stdout.write(
      `[${index + 1}/${pending.length}] ${article.language} ${article.title.slice(0, 70)}... `
    );
    const extractedText = await extractSourceText(article.url);
    if (extractedText) extracted++;
    const html = await generateBrief(article, extractedText);
    if (!html) {
      failed++;
      console.log("failed");
    } else {
      await prisma.news.update({
        where: { id: article.id },
        data: { content: html },
      });
      updated++;
      console.log(extractedText ? "updated extracted" : "updated feed-only");
    }
    if (index < pending.length - 1) await sleep(BETWEEN_MS);
  }

  console.log(`Done. ${updated} updated, ${failed} failed, ${extracted} extracted.`);
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
