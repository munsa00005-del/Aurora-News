import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractFullContent } from "@/lib/extract";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TEMP_TOKEN = "41a5666672b20ae522aaf99c7406882e3f105f850addc9e4";

type RepairArticle = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  category: string;
  source: string;
  url: string | null;
  publishedAt: Date;
  language: string;
};

function authorized(req: NextRequest) {
  return (req.headers.get("authorization") || "") === `Bearer ${TEMP_TOKEN}`;
}

function isAlreadySummarized(
  content: string | null | undefined,
  language: string | null | undefined
) {
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

function cleanText(value: string | null | undefined) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\[\+\d+\s*chars\]$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function textLength(content: string | null | undefined) {
  return cleanText(content).length;
}

function isWeakBrief(article: Pick<RepairArticle, "content" | "language">) {
  const content = article.content || "";
  if (!isAlreadySummarized(content, article.language)) return true;
  if (/\[\+\d+\s*chars\]/i.test(content)) return true;
  if (textLength(content) < 700) return true;
  return /available source metadata|stored source metadata|source metadata|उपलब्ध स्रोत मेटाडेटा|संग्रहीत मेटाडेटा|मूल फीड में पूरा लेख उपलब्ध नहीं|शीर्षक, स्रोत, श्रेणी, तारीख/i.test(
    content
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function h(text: string) {
  return `<h2>${escapeHtml(text)}</h2>`;
}

function p(text: string) {
  return `<p>${escapeHtml(text)}</p>`;
}

function ul(items: string[]) {
  return `<ul>\n${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}\n</ul>`;
}

function splitSentences(text: string, language: string) {
  const normalized = cleanText(text);
  if (!normalized) return [];
  const pattern = language === "hi" ? /(?<=[।!?])\s+/ : /(?<=[.!?])\s+/;
  return normalized
    .split(pattern)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35)
    .slice(0, 14);
}

function formatDate(date: Date, language: string) {
  return new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function extractedText(html: string | null) {
  return cleanText(html).slice(0, 10000);
}

async function sourceText(article: RepairArticle) {
  if (!article.url) return "";
  const html = await extractFullContent(article.url);
  return extractedText(html);
}

function buildBrief(article: RepairArticle, source: string) {
  const isHindi = article.language === "hi";
  const sentences = splitSentences(
    source || article.description || article.content || article.title,
    article.language
  );
  const detail =
    sentences[0] ||
    cleanText(article.description || article.content) ||
    article.title;
  const second = sentences[1] || "";
  const third = sentences[2] || "";
  const bullets = sentences.slice(0, 6);
  const date = formatDate(article.publishedAt, article.language);

  if (isHindi) {
    return [
      h("त्वरित ब्रीफ"),
      p(`${article.source} ने ${date} को यह रिपोर्ट प्रकाशित की। ${detail}`),
      second ? p(second) : "",
      h("यह क्यों महत्वपूर्ण है"),
      p(
        `यह खबर ${article.category} श्रेणी से जुड़े पाठकों के लिए उपयोगी है क्योंकि यह मूल रिपोर्ट में उपलब्ध मुख्य घटनाक्रम, संबंधित पक्षों और आगे की स्थिति को जल्दी समझने में मदद करती है।`
      ),
      h("पृष्ठभूमि"),
      p(
        third ||
          "मूल रिपोर्ट में उपलब्ध जानकारी के आधार पर यह मामला अपने क्षेत्र और विषय से जुड़े पाठकों के लिए प्रासंगिक है।"
      ),
      h("मुख्य जानकारी"),
      ul(
        bullets.length
          ? bullets
          : [
              `स्रोत: ${article.source}`,
              `प्रकाशित: ${date}`,
              `श्रेणी: ${article.category}`,
              `मुख्य विषय: ${article.title}`,
            ]
      ),
      h("संभावित प्रभाव"),
      p(
        "इस खबर का असर संबंधित लोगों, संस्थाओं या पाठकों पर इस बात से तय होगा कि आगे मूल स्रोत, आधिकारिक पक्ष या अन्य भरोसेमंद रिपोर्टिंग में क्या अतिरिक्त जानकारी सामने आती है।"
      ),
      h("आगे क्या देखना है"),
      p(
        "पाठकों को आगे की रिपोर्टिंग, आधिकारिक अपडेट, संबंधित पक्षों की प्रतिक्रिया और मूल स्रोत में होने वाले बदलावों पर नजर रखनी चाहिए।"
      ),
      h("स्रोत और पारदर्शिता"),
      p(`स्रोत: ${article.source}`),
      p(
        "यह BRIEFXIFY ब्रीफ AI-सहायता से तैयार किया गया है और सार्वजनिक रूप से उपलब्ध समाचार स्रोत जानकारी पर आधारित है। यह त्वरित समझ के लिए लिखा गया है और मूल रिपोर्ट की जगह नहीं लेता। पूरे संदर्भ के लिए मूल स्रोत पढ़ें।"
      ),
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    h("Quick Brief"),
    p(`${article.source} published this report on ${date}. ${detail}`),
    second ? p(second) : "",
    h("Why This Matters"),
    p(
      `This story is relevant for readers following ${article.category} updates because it brings together the main development, the parties involved, and the details available from the original report.`
    ),
    h("Background"),
    p(
      third ||
        "Based on the original report information available to BRIEFXIFY, the story is connected to the broader category and source coverage shown on this page."
    ),
    h("Key Details"),
    ul(
      bullets.length
        ? bullets
        : [
            `Source: ${article.source}`,
            `Published: ${date}`,
            `Category: ${article.category}`,
            `Main topic: ${article.title}`,
          ]
    ),
    h("Possible Impact"),
    p(
      "The impact will depend on what additional reporting, official updates, or responses from involved parties add to the public record."
    ),
    h("What To Watch Next"),
    p(
      "Readers should watch for follow-up reporting, official statements, corrections, and any updates from the original publisher."
    ),
    h("Source and Transparency"),
    p(`Source: ${article.source}`),
    p(
      "This BRIEFXIFY brief is AI-assisted and based on publicly available news source information. It is written for quick understanding and does not replace the original report. Read the original source for full context."
    ),
  ]
    .filter(Boolean)
    .join("\n");
}

function limitFrom(req: NextRequest) {
  const parsed = Number(req.nextUrl.searchParams.get("limit") || 10);
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(Math.max(Math.floor(parsed), 1), 25);
}

async function weakArticles() {
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
  const scoped = articles.filter((article) =>
    ["hi", "en"].includes(article.language)
  );
  return {
    total: scoped.length,
    weak: scoped.filter(isWeakBrief),
  };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { total, weak } = await weakArticles();
  return NextResponse.json({
    ok: true,
    total,
    pending: weak.length,
    completed: total - weak.length,
  });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const { total, weak } = await weakArticles();
  const selected = weak.slice(0, limitFrom(req));
  let updated = 0;
  let extracted = 0;
  const results: Array<{
    id: string;
    language: string;
    status: "updated";
    extracted: boolean;
    title: string;
  }> = [];

  for (const article of selected) {
    const source = await sourceText(article);
    const content = buildBrief(article, source);
    await prisma.news.update({
      where: { id: article.id },
      data: { content },
    });
    updated++;
    if (source) extracted++;
    results.push({
      id: article.id,
      language: article.language,
      status: "updated",
      extracted: Boolean(source),
      title: article.title.slice(0, 80),
    });
  }

  return NextResponse.json({
    ok: true,
    total,
    pendingBefore: weak.length,
    processed: selected.length,
    updated,
    extracted,
    remaining: Math.max(weak.length - updated, 0),
    durationMs: Date.now() - started,
    results,
  });
}
