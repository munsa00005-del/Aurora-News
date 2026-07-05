import { PrismaClient } from "@prisma/client";
import "./env.mjs";

const p = new PrismaClient();

function isSummarized(content, language) {
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

try {
  const articles = await p.news.findMany({
    orderBy: { publishedAt: "desc" },
    select: {
      title: true,
      content: true,
      language: true,
      category: true,
      source: true,
      publishedAt: true,
    },
  });
  const pending = articles.filter(
    (article) => !isSummarized(article.content, article.language)
  );
  const byLanguage = {};
  const byCategory = {};
  for (const article of pending) {
    byLanguage[article.language] = (byLanguage[article.language] || 0) + 1;
    byCategory[article.category] = (byCategory[article.category] || 0) + 1;
  }

  console.log(`TOTAL:${articles.length}`);
  console.log(`SUMMARIZED:${articles.length - pending.length}`);
  console.log(`UNSUMMARIZED:${pending.length}`);
  console.log(`BY_LANGUAGE:${JSON.stringify(byLanguage)}`);
  console.log(`BY_CATEGORY:${JSON.stringify(byCategory)}`);
  if (pending.length) {
    console.log("LATEST_UNSUMMARIZED:");
    for (const article of pending.slice(0, 10)) {
      console.log(
        `- [${article.language}/${article.category}] ${article.title} (${article.source}, ${article.publishedAt.toISOString()})`
      );
    }
  }
} catch (e) {
  console.log(`ERROR:${e.message}`);
} finally {
  await p.$disconnect();
}
