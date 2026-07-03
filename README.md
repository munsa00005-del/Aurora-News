# BRIEFXIFY

A premium, futuristic, AI-curated news platform. Cinematic animated background,
interactive 3D globe, glassmorphism cards, infinite scroll, and a fully
automated GNews → PostgreSQL sync pipeline.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**,
**Prisma + PostgreSQL**, **Framer Motion**, **GSAP**, and **react-three-fiber**.

## Features

- **Cinematic homepage** — fullscreen hero, interactive globe, animated logo,
  global search, breaking-news ticker, scroll-triggered storytelling.
- **Living animated background** — mouse-reactive gradient mesh, aurora waves,
  floating particles, light rays (single performant canvas).
- **Trending feed** — all categories combined, ranked by a live algorithm
  (recency × category weight × source weight × engagement) with infinite scroll.
- **10 category pages** — India (20), World (10), Sports/AI/Tech/Economy/Crime/
  Entertainment (8), Science/Health (7), each with infinite scroll.
- **Article pages** — large hero, reading progress, reading time, view counter,
  related news.
- **Global search** — instant suggestions, trending searches, history, category
  filters (⌘K / Ctrl-K anywhere).
- **Automated news** — GNews sync every 6 hours, dedupe (URL + title hash),
  in-place content refresh, sync logs.

## Local development

Requires Node 18.18+. No Docker/sudo needed — a userspace embedded Postgres
boots automatically.

```bash
cp .env.example .env        # then paste your free GNews API key
npm install
npm run dev                 # auto-starts Postgres + pushes schema
npm run sync                # (optional) pull real articles right now
```

Set `GROQ_API_KEY` to enable BRIEFXIFY' on-page original report rewrite for
articles. The app caches each generated report in the article content field.

Open http://localhost:3000.

## Deploying to Vercel (live, free)

This is a full-stack app (SSR + Postgres + cron), so it runs on Vercel — **not**
GitHub Pages. Steps:

### 1. Push to GitHub
```bash
git remote add origin https://github.com/<you>/orbitnews.git
git push -u origin main
```

### 2. Create a cloud Postgres
Use a free **[Neon](https://neon.tech)** or **[Supabase](https://supabase.com)**
database. Copy its connection string (the pooled URL for serverless).

### 3. Import the repo on [vercel.com/new](https://vercel.com/new)
Add these **Environment Variables** in the Vercel project settings:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | your Neon/Supabase connection string |
| `GNEWS_API_KEY` | your GNews key |
| `GROQ_API_KEY` | your Groq API key |
| `GROQ_MODEL` | `llama-3.1-8b-instant` |
| `CRON_SECRET` | a long random string |
| `AUTH_SECRET` | a long random string |
| `NEXT_PUBLIC_SITE_URL` | your `https://<project>.vercel.app` URL |
| `NEXT_PUBLIC_SITE_NAME` | `BRIEFXIFY` |

### 4. Initialize the database schema (one-time)
With `DATABASE_URL` pointing at your cloud DB:
```bash
npx prisma db push
```

### 5. Deploy & seed
Vercel builds automatically. After the first deploy, populate articles by
calling the cron endpoint once:
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://<project>.vercel.app/api/cron/sync
```

### Scheduled syncs
`vercel.json` registers a cron at `/api/cron/sync` every 6 hours.
> **Note:** Vercel's **Hobby (free)** plan runs cron jobs **once per day** max.
> For true 6-hour syncs, either upgrade to Pro, or point a free external cron
> (e.g. [cron-job.org](https://cron-job.org)) at the URL above with the Bearer
> header.

## Tech notes

- **Trending algorithm** — `src/lib/trending.ts`
- **Sync engine** — `src/lib/sync.ts` (fetch → dedupe → upsert → log → re-score)
- **Self-hosted scheduler** — `src/instrumentation.ts` (interval-based; Vercel
  uses the cron route instead)
- Secrets are never committed — see `.gitignore`. Use `.env.example` as the
  template.
