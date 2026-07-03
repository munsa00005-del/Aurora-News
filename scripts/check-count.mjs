import { PrismaClient } from "@prisma/client";
import "./env.mjs";

const p = new PrismaClient();
try {
  const count = await p.news.count();
  const unsummarized = await p.news.count({
    where: {
      OR: [
        { content: null },
        {
          AND: [
            { content: { not: { contains: "Key Takeaways" } } },
            { content: { not: { contains: "Why This Matters" } } },
          ],
        },
      ],
    },
  });
  console.log(`TOTAL:${count}`);
  console.log(`UNSUMMARIZED:${unsummarized}`);
} catch (e) {
  console.log(`ERROR:${e.message}`);
} finally {
  await p.$disconnect();
}
