import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import AuroraBackground from "@/components/AuroraBackground";
import Navbar from "@/components/Navbar";
import SearchOverlay from "@/components/SearchOverlay";
import Footer from "@/components/Footer";
import { LangProvider } from "@/components/LangProvider";
import { normalizeLang, LANG_COOKIE } from "@/lib/i18n";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Aurora News";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — The world, rendered in light`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "A premium, AI-curated futuristic news platform. Trending stories across India, World, Sports, AI, Technology, Economy, Crime, Entertainment, Science and Health — continuously synced.",
  keywords: [
    "news",
    "trending news",
    "AI news",
    "world news",
    "India news",
    "technology",
    "futuristic news platform",
  ],
  openGraph: {
    title: SITE_NAME,
    description: "The world, rendered in light. AI-curated trending news.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: SITE_NAME },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const lang = normalizeLang(cookies().get(LANG_COOKIE)?.value);
  return (
    <html lang={lang} className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen antialiased">
        <LangProvider initial={lang}>
          <AuroraBackground />
          <Navbar />
          <SearchOverlay />
          <main className="relative z-10">{children}</main>
          <Footer lang={lang} />
        </LangProvider>
      </body>
    </html>
  );
}
