// Lightweight i18n. Two locales: English ("en") and Hindi ("hi").
// The chosen locale lives in a cookie (`lang`) so server components can render
// the right copy + pull the right-language news on first paint.

export type Lang = "en" | "hi";
export const LANGS: Lang[] = ["en", "hi"];
export const LANG_COOKIE = "lang";

export function normalizeLang(v: string | null | undefined): Lang {
  return v === "hi" ? "hi" : "en";
}

export const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  hi: "हिंदी",
};

type Dict = Record<string, string>;

const en: Dict = {
  "nav.home": "Home",
  "nav.search": "Search",
  "hero.tagline1": "The world,",
  "hero.tagline2": "rendered in light.",
  "hero.subtitle":
    "A living feed of what matters — India to orbit, markets to machines. Trending stories from every corner, continuously synced.",
  "hero.searchPlaceholder": "Search breaking stories, topics, sources…",
  "hero.scroll": "Trending",
  "trending.badge": "Trending now",
  "trending.title1": "What the world is",
  "trending.title2": "reading",
  "trending.subtitle":
    "The highest-signal stories across every category, ranked live by recency, source weight and engagement.",
  "feed.end": "You’ve reached the edge of the aurora ✦",
  "feed.empty": "No articles yet — the next sync will fill this in.",
  "category.badge": "Category",
  "category.subtitle": "The latest {label} stories, ranked and continuously updated.",
  "article.back": "Back to feed",
  "article.minRead": "min read",
  "article.views": "views",
  "article.viewOriginal": "View original at {source}",
  "article.related1": "More to",
  "article.related2": "explore",
  "search.results": "Search results",
  "search.title": "Search Aurora News",
  "search.none": "No matching stories found.",
  "search.showing": "Showing top matches",
  "search.all": "All",
  "footer.tagline":
    "A futuristic, AI-curated news platform. Continuously synced trending stories from every corner of the world.",
  "footer.categories": "Categories",
  "footer.platform": "Platform",
  "footer.updated": "Updated automatically every 6 hours.",
  "footer.madeBy": "Made by :",
  "search.placeholder": "Search the future of news…",
  "search.recent": "Recent",
  "search.trending": "Trending searches",
  "search.seeAll": "See all results for",
  "search.noQuick": "No quick matches — press Enter for a full search.",
  "lang.label": "Language",
};

const hi: Dict = {
  "nav.home": "होम",
  "nav.search": "खोजें",
  "hero.tagline1": "दुनिया,",
  "hero.tagline2": "रोशनी में सजी।",
  "hero.subtitle":
    "जो मायने रखता है उसकी जीवंत फ़ीड — भारत से अंतरिक्ष तक, बाज़ार से मशीनों तक। हर कोने की ट्रेंडिंग ख़बरें, लगातार अपडेट।",
  "hero.searchPlaceholder": "ताज़ा ख़बरें, विषय, स्रोत खोजें…",
  "hero.scroll": "ट्रेंडिंग",
  "trending.badge": "अभी ट्रेंडिंग",
  "trending.title1": "दुनिया क्या",
  "trending.title2": "पढ़ रही है",
  "trending.subtitle":
    "हर श्रेणी की सबसे अहम ख़बरें — ताज़गी, स्रोत और लोकप्रियता के आधार पर लाइव रैंक।",
  "feed.end": "आप ऑरोरा के छोर तक पहुँच गए ✦",
  "feed.empty": "अभी कोई ख़बर नहीं — अगला सिंक इसे भर देगा।",
  "category.badge": "श्रेणी",
  "category.subtitle": "नवीनतम {label} ख़बरें, रैंक की हुई और लगातार अपडेट।",
  "article.back": "फ़ीड पर वापस",
  "article.minRead": "मिनट पढ़ें",
  "article.views": "बार देखा गया",
  "article.viewOriginal": "{source} पर मूल देखें",
  "article.related1": "और भी",
  "article.related2": "पढ़ें",
  "search.results": "खोज परिणाम",
  "search.title": "ऑरोरा न्यूज़ खोजें",
  "search.none": "कोई मिलती-जुलती ख़बर नहीं मिली।",
  "search.showing": "शीर्ष परिणाम दिखाए जा रहे हैं",
  "search.all": "सभी",
  "footer.tagline":
    "एक भविष्यवादी, AI-संचालित न्यूज़ प्लेटफ़ॉर्म। दुनिया के हर कोने से लगातार अपडेट होती ट्रेंडिंग ख़बरें।",
  "footer.categories": "श्रेणियाँ",
  "footer.platform": "प्लेटफ़ॉर्म",
  "footer.updated": "हर 6 घंटे में स्वतः अपडेट।",
  "footer.madeBy": "द्वारा निर्मित :",
  "search.placeholder": "ख़बरों का भविष्य खोजें…",
  "search.recent": "हाल ही में",
  "search.trending": "ट्रेंडिंग खोजें",
  "search.seeAll": "सभी परिणाम देखें",
  "search.noQuick": "कोई त्वरित मिलान नहीं — पूरी खोज के लिए Enter दबाएँ।",
  "lang.label": "भाषा",
};

const DICTS: Record<Lang, Dict> = { en, hi };

// Category labels per locale.
export const CATEGORY_LABELS: Record<Lang, Record<string, string>> = {
  en: {
    india: "India", world: "World", sports: "Sports", ai: "AI",
    technology: "Technology", economy: "Economy", crime: "Crime",
    entertainment: "Entertainment", science: "Science", health: "Health",
  },
  hi: {
    india: "भारत", world: "विश्व", sports: "खेल", ai: "एआई",
    technology: "तकनीक", economy: "अर्थव्यवस्था", crime: "अपराध",
    entertainment: "मनोरंजन", science: "विज्ञान", health: "स्वास्थ्य",
  },
};

export function catLabel(lang: Lang, slug: string): string {
  return CATEGORY_LABELS[lang]?.[slug] ?? CATEGORY_LABELS.en[slug] ?? slug;
}

/** Translate a key, with optional {placeholder} interpolation. */
export function t(lang: Lang, key: string, vars?: Record<string, string>): string {
  let s = DICTS[lang]?.[key] ?? DICTS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}

/** Curried translator for a fixed locale: const tr = makeT(lang). */
export function makeT(lang: Lang) {
  return (key: string, vars?: Record<string, string>) => t(lang, key, vars);
}
