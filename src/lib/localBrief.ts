import type { Article } from "./types";

const EN_HEADINGS = [
  "Quick Brief",
  "Why This Matters",
  "Background",
  "Key Details",
  "Possible Impact",
  "What To Watch Next",
  "Source and Transparency",
];

const HI_HEADINGS = [
  "त्वरित ब्रीफ",
  "यह क्यों महत्वपूर्ण है",
  "पृष्ठभूमि",
  "मुख्य जानकारी",
  "संभावित प्रभाव",
  "आगे क्या देखना है",
  "स्रोत और पारदर्शिता",
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanText(value: string | null | undefined): string {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\[\+\d+\s*chars\]$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceParts(value: string, language: string): string[] {
  const pattern = language === "hi" ? /(?<=[।!?])\s+/ : /(?<=[.!?])\s+/;
  return cleanText(value)
    .split(pattern)
    .map((part) => part.trim())
    .filter((part) => part.length > 28)
    .slice(0, 8);
}

function formatDate(value: string | Date, language: string): string {
  return new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function h(text: string): string {
  return `<h2>${escapeHtml(text)}</h2>`;
}

function p(text: string): string {
  return `<p>${escapeHtml(text)}</p>`;
}

function ul(items: string[]): string {
  return `<ul>\n${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}\n</ul>`;
}

function textLength(content: string | null | undefined): number {
  return cleanText(content).length;
}

export function looksLikeCompleteBriefForLanguage(
  content: string | null | undefined,
  language: string | null | undefined
): boolean {
  if (!content) return false;
  const headings = language === "hi" ? HI_HEADINGS : EN_HEADINGS;
  const hasAllHeadings = headings.every((heading) =>
    new RegExp(`<h[23]>${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h[23]>`, "i").test(content)
  );
  const hasTransparency =
    language === "hi"
      ? /BRIEFXIFY ब्रीफ AI-सहायता से तैयार/i.test(content)
      : /BRIEFXIFY brief is AI-assisted/i.test(content);

  return hasAllHeadings && hasTransparency && textLength(content) >= 1600;
}

export function needsLocalBrief(article: {
  content: string | null;
  language: string | null;
}): boolean {
  return !looksLikeCompleteBriefForLanguage(article.content, article.language);
}

export function buildLocalBrief(article: Article): string {
  const isHindi = article.language === "hi";
  const date = formatDate(article.publishedAt, article.language);
  const source = article.source || (isHindi ? "मूल स्रोत" : "the original source");
  const category = article.category || (isHindi ? "समाचार" : "news");
  const availableText = cleanText(article.content) || cleanText(article.description);
  const sentences = sentenceParts(availableText, article.language);
  const detail =
    sentences[0] ||
    cleanText(article.description) ||
    (isHindi
      ? "उपलब्ध स्रोत जानकारी में शीर्षक से आगे सीमित विवरण दिया गया है।"
      : "The available source information gives limited detail beyond the headline.");
  const second = sentences[1] || "";
  const third = sentences[2] || "";

  if (isHindi) {
    return [
      h("त्वरित ब्रीफ"),
      p(`${source} ने ${date} को ${category} श्रेणी से जुड़ी यह खबर प्रकाशित की। ${detail}`),
      p(
        second ||
          `खबर का मुख्य विषय "${article.title}" है। BRIEFXIFY ने इसे उपलब्ध स्रोत जानकारी के आधार पर संक्षिप्त और स्पष्ट रूप में तैयार किया है।`
      ),
      p(
        "जहां मूल फीड में पूरा लेख या अतिरिक्त संदर्भ उपलब्ध नहीं है, वहां यह ब्रीफ केवल सत्यापित शीर्षक, विवरण, स्रोत, श्रेणी और प्रकाशन समय तक सीमित रहता है।"
      ),
      h("यह क्यों महत्वपूर्ण है"),
      p(
        `यह खबर ${category} से जुड़े पाठकों के लिए महत्वपूर्ण है क्योंकि यह उन्हें मुख्य घटनाक्रम, स्रोत और उपलब्ध संदर्भ को जल्दी समझने में मदद करती है।`
      ),
      p(
        "तेज समाचार प्रवाह में कई रिपोर्टें छोटी जानकारी के साथ आती हैं। ऐसे में एक साफ ब्रीफ पाठक को यह तय करने में मदद करता है कि उसे मूल रिपोर्ट, आगे की कवरेज या आधिकारिक अपडेट पढ़ने की जरूरत है या नहीं।"
      ),
      h("पृष्ठभूमि"),
      p(
        third ||
          `${source} की रिपोर्ट से उपलब्ध जानकारी बताती है कि यह विषय ${category} कवरेज से जुड़ा है।`
      ),
      p(
        "इस ब्रीफ में वही तथ्य शामिल किए गए हैं जो संग्रहीत स्रोत जानकारी में उपलब्ध हैं। कोई अतिरिक्त नाम, आंकड़ा, बयान या परिणाम जोड़ा नहीं गया है।"
      ),
      h("मुख्य जानकारी"),
      ul([
        `शीर्षक: ${article.title}`,
        `स्रोत: ${source}`,
        `प्रकाशित: ${date}`,
        `श्रेणी: ${category}`,
        `उपलब्ध स्रोत विवरण: ${detail}`,
        article.url
          ? "मूल रिपोर्ट का लिंक लेख पेज पर उपलब्ध है।"
          : "संग्रहीत जानकारी में मूल रिपोर्ट का लिंक उपलब्ध नहीं है।",
      ]),
      h("संभावित प्रभाव"),
      p(
        "इस खबर का असर संबंधित पाठकों, संस्थाओं या समुदायों पर इस बात से तय होगा कि मूल स्रोत और आगे की रिपोर्टिंग में क्या अतिरिक्त जानकारी सामने आती है।"
      ),
      p(
        "यदि मामला नीति, बाजार, सार्वजनिक सुरक्षा, तकनीक, स्वास्थ्य, खेल या मनोरंजन से जुड़ा है, तो आगे की पुष्टि और संदर्भ पाठकों के लिए और उपयोगी होंगे।"
      ),
      h("आगे क्या देखना है"),
      p(
        "पाठकों को आगे की रिपोर्टिंग, आधिकारिक बयान, स्रोत में अपडेट, सुधार और अन्य भरोसेमंद प्रकाशनों से मिलने वाले अतिरिक्त संदर्भ पर नजर रखनी चाहिए।"
      ),
      p("पूरी जानकारी और ताजा बदलावों के लिए मूल स्रोत पढ़ना सबसे बेहतर रहेगा।"),
      h("स्रोत और पारदर्शिता"),
      p(`स्रोत: ${source}`),
      p(
        "यह BRIEFXIFY ब्रीफ AI-सहायता से तैयार किया गया है और सार्वजनिक रूप से उपलब्ध समाचार स्रोत जानकारी पर आधारित है। यह त्वरित समझ के लिए लिखा गया है और मूल रिपोर्ट की जगह नहीं लेता। पूरे संदर्भ के लिए मूल स्रोत पढ़ें।"
      ),
    ].join("\n");
  }

  return [
    h("Quick Brief"),
    p(`${source} published this ${category} story on ${date}. ${detail}`),
    p(
      second ||
        `The main subject of the report is "${article.title}". BRIEFXIFY has rewritten the available source information into a concise reader brief.`
    ),
    p(
      "Where the original feed does not include a full article body or extra context, this brief stays within the verified headline, description, source, category, and publication time."
    ),
    h("Why This Matters"),
    p(
      `This story matters for readers following ${category} updates because it gives them the core development, source, and available context in one place.`
    ),
    p(
      "Fast-moving news feeds often publish limited metadata first. A clear brief helps readers decide whether to follow the original report, wait for follow-up coverage, or look for official updates."
    ),
    h("Background"),
    p(
      third ||
        `The information available from ${source} places this story inside the wider ${category} news cycle.`
    ),
    p(
      "This brief uses only the facts stored from the public source information. It does not add unsupported names, figures, quotes, claims, or outcomes."
    ),
    h("Key Details"),
    ul([
      `Headline: ${article.title}`,
      `Source: ${source}`,
      `Published: ${date}`,
      `Category: ${category}`,
      `Available source detail: ${detail}`,
      article.url
        ? "The original report is linked on the article page."
        : "No original report link is available in the stored article data.",
    ]),
    h("Possible Impact"),
    p(
      "The possible impact depends on what the original source and later reporting add to the public record. Readers should treat this as a structured brief, not a replacement for the full report."
    ),
    p(
      "If the story involves policy, markets, public safety, technology, health, sport, or entertainment, confirmed follow-up details will be important for understanding who is affected and how."
    ),
    h("What To Watch Next"),
    p(
      "Watch for follow-up reporting, official statements, source updates, corrections, and added context from reliable publishers. These updates can clarify timelines, affected groups, and next steps."
    ),
    p("For complete context and the newest changes, readers should open the original source when available."),
    h("Source and Transparency"),
    p(`Source: ${source}`),
    p(
      "This BRIEFXIFY brief is AI-assisted and based on publicly available news source information. It is written for quick understanding and does not replace the original report. Read the original source for full context."
    ),
  ].join("\n");
}
