// One-off backfill for currently pending BRIEFXIFY briefs.
//
// This does not call Gemini and is not part of the future automation path.
// It creates conservative source-metadata briefs for rows that are not already
// in the stored BRIEFXIFY brief format.

import { PrismaClient } from "@prisma/client";
import "./env.mjs";

const prisma = new PrismaClient();

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

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\[\+\d+\s*chars\]$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sentence(value, fallback) {
  const text = cleanText(value);
  return text || fallback;
}

function formatDate(date, language) {
  return new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function html(parts) {
  return parts.filter(Boolean).join("\n");
}

function p(text) {
  return `<p>${escapeHtml(text)}</p>`;
}

function h(text) {
  return `<h2>${escapeHtml(text)}</h2>`;
}

function ul(items) {
  return `<ul>\n${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}\n</ul>`;
}

function englishBrief(article) {
  const detail = sentence(
    article.description || article.content,
    "The available source metadata gives limited detail beyond the headline."
  );
  const date = formatDate(article.publishedAt, article.language);
  const source = article.source || "the original source";
  const category = article.category || "news";

  return html([
    h("Quick Brief"),
    p(`${source} reported this ${category} story on ${date}. ${detail}`),
    p(
      "This brief is based on the stored source metadata available to BRIEFXIFY at publication time. When the original feed provides limited body text, the summary stays close to the verified headline, source, category, and description instead of adding unsupported detail."
    ),
    h("Why This Matters"),
    p(
      `The story matters because it belongs to the ${category} feed and may affect readers following updates from ${source}. The available details help readers quickly understand the subject and decide whether to open the original report for full context.`
    ),
    h("Background"),
    p(
      "News feeds often provide a headline, short description, image, source name, and publication time rather than the complete article body. BRIEFXIFY uses those fields to create a concise overview while keeping the original source linked for readers who need the full report."
    ),
    h("Key Details"),
    ul([
      `Category: ${category}`,
      `Source: ${source}`,
      `Published: ${date}`,
      `Available source detail: ${detail}`,
      article.url
        ? "The original report is linked on the article page."
        : "No original URL is available in the stored metadata.",
    ]),
    h("Possible Impact"),
    p(
      "The likely impact depends on the full facts in the original report. Based on the available metadata, this item is most relevant to readers tracking the topic, the named source, and related developments in the same category."
    ),
    h("What To Watch Next"),
    p(
      "Readers should watch for follow-up reporting, official updates, and additional context from the original publisher or other reliable sources. If the source updates the article, the original link remains the best place for complete details."
    ),
    h("Source and Transparency"),
    p(`Source: ${source}`),
    p(
      "This BRIEFXIFY brief is AI-assisted and based on publicly available news source information. It is written for quick understanding and does not replace the original report. Read the original source for full context."
    ),
  ]);
}

function hindiBrief(article) {
  const detail = sentence(
    article.description || article.content,
    "उपलब्ध स्रोत जानकारी में शीर्षक से आगे सीमित विवरण दिया गया है।"
  );
  const date = formatDate(article.publishedAt, article.language);
  const source = article.source || "मूल स्रोत";
  const category = article.category || "समाचार";

  return html([
    h("त्वरित ब्रीफ"),
    p(`${source} ने ${date} को ${category} श्रेणी से जुड़ी यह खबर प्रकाशित की। ${detail}`),
    p(
      "यह ब्रीफ BRIEFXIFY में उपलब्ध स्रोत मेटाडेटा पर आधारित है। जब मूल फीड में पूरा लेख उपलब्ध नहीं होता, तो सारांश शीर्षक, स्रोत, श्रेणी, तारीख और उपलब्ध विवरण तक ही सीमित रहता है।"
    ),
    h("यह क्यों महत्वपूर्ण है"),
    p(
      `यह खबर ${category} श्रेणी को फॉलो करने वाले पाठकों के लिए उपयोगी हो सकती है। उपलब्ध जानकारी पाठकों को विषय जल्दी समझने और जरूरत पड़ने पर मूल रिपोर्ट पढ़ने में मदद करती है।`
    ),
    h("पृष्ठभूमि"),
    p(
      "समाचार फीड कई बार पूरा लेख नहीं देते और केवल शीर्षक, छोटा विवरण, तस्वीर, स्रोत और प्रकाशन समय भेजते हैं। BRIEFXIFY उन्हीं उपलब्ध तथ्यों से संक्षिप्त ब्रीफ तैयार करता है और पूरे संदर्भ के लिए मूल स्रोत का लिंक रखता है।"
    ),
    h("मुख्य जानकारी"),
    ul([
      `श्रेणी: ${category}`,
      `स्रोत: ${source}`,
      `प्रकाशित: ${date}`,
      `उपलब्ध स्रोत विवरण: ${detail}`,
      article.url
        ? "लेख पेज पर मूल रिपोर्ट का लिंक उपलब्ध है।"
        : "संग्रहीत मेटाडेटा में मूल URL उपलब्ध नहीं है।",
    ]),
    h("संभावित प्रभाव"),
    p(
      "इस खबर का वास्तविक प्रभाव मूल रिपोर्ट में दिए गए पूरे तथ्यों पर निर्भर करता है। उपलब्ध जानकारी के आधार पर यह आइटम इसी विषय, स्रोत और श्रेणी से जुड़े अपडेट देखने वाले पाठकों के लिए प्रासंगिक है।"
    ),
    h("आगे क्या देखना है"),
    p(
      "पाठकों को आगे की रिपोर्टिंग, आधिकारिक अपडेट और भरोसेमंद स्रोतों से आने वाला अतिरिक्त संदर्भ देखना चाहिए। पूरी जानकारी के लिए मूल स्रोत पढ़ना सबसे बेहतर रहेगा।"
    ),
    h("स्रोत और पारदर्शिता"),
    p(`स्रोत: ${source}`),
    p(
      "यह BRIEFXIFY ब्रीफ AI-सहायता से तैयार किया गया है और सार्वजनिक रूप से उपलब्ध समाचार स्रोत जानकारी पर आधारित है। यह त्वरित समझ के लिए लिखा गया है और मूल रिपोर्ट की जगह नहीं लेता। पूरे संदर्भ के लिए मूल स्रोत पढ़ें।"
    ),
  ]);
}

async function main() {
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

  const pending = articles.filter(
    (article) => !isAlreadySummarized(article.content, article.language)
  );

  console.log(`${pending.length} pending articles will be backfilled.`);
  let updated = 0;

  for (const article of pending) {
    const content =
      article.language === "hi" ? hindiBrief(article) : englishBrief(article);
    await prisma.news.update({
      where: { id: article.id },
      data: { content },
    });
    updated++;
    console.log(`[${updated}/${pending.length}] ${article.title.slice(0, 70)}`);
  }

  console.log(`Done. Backfilled ${updated} articles.`);
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
