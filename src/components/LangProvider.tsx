"use client";

// Language context. Seeded server-side from the `lang` cookie (passed as
// `initial`) so the first client render matches SSR — no hydration flash.
// Switching writes the cookie and reloads the current page so all server and
// client state restarts in the selected language.

import { createContext, useContext, useCallback, useState } from "react";
import { Lang, LANG_COOKIE, makeT } from "@/lib/i18n";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({
  initial,
  children,
}: {
  initial: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initial);

  const setLang = useCallback(
    (l: Lang) => {
      if (l === lang) return;
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      try {
        localStorage.setItem(LANG_COOKIE, l);
      } catch {}
      setLangState(l);
      window.location.reload();
    },
    [lang]
  );

  return (
    <Ctx.Provider value={{ lang, setLang, t: makeT(lang) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback for any component rendered outside the provider.
    return { lang: "en", setLang: () => {}, t: makeT("en") };
  }
  return ctx;
}
