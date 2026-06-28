// Deterministic mock article generator.
// Used so the UI renders rich content before the database is seeded with real
// GNews data, and as a graceful fallback when the DB is unreachable.

import { CATEGORIES } from "./categories";
import { slugify, hash } from "./utils";
import type { Article } from "./types";

interface Seed {
  title: string;
  description: string;
  source: string;
}

const SEEDS: Record<string, Seed[]> = {
  india: [
    { title: "India's Chandrayaan-4 Mission Clears Final Design Review Ahead of 2027 Launch", description: "ISRO confirmed the sample-return lander passed integration testing, setting up an ambitious lunar south-pole campaign.", source: "The Times of India" },
    { title: "Monsoon Arrives Early Across Kerala, IMD Forecasts Above-Normal Rainfall", description: "The southwest monsoon hit the coast four days ahead of schedule, easing fears for the kharif sowing season.", source: "The Hindu" },
    { title: "Union Budget Doubles Allocation for Semiconductor Fabrication Incentives", description: "The new outlay aims to anchor at least two advanced fabs on Indian soil by the end of the decade.", source: "Hindustan Times" },
    { title: "Bengaluru Metro Phase 3 Breaks Ground, Promising 44km of New Lines", description: "Officials say the expansion will connect the airport corridor to the tech belt by 2029.", source: "NDTV" },
    { title: "Indian Women's Cricket Team Seals Historic Series Win in Australia", description: "A clinical bowling display in the decider handed India its first bilateral T20 series victory down under.", source: "The Indian Express" },
  ],
  world: [
    { title: "Global Leaders Reach Landmark Agreement on Cross-Border AI Safety Standards", description: "Forty nations endorsed a framework for evaluating frontier models before public release.", source: "Reuters" },
    { title: "Historic Peace Talks Resume After Months of Diplomatic Deadlock", description: "Negotiators expressed cautious optimism following the first face-to-face session in over a year.", source: "BBC" },
    { title: "European Union Finalizes Sweeping Clean-Energy Grid Investment", description: "The €300bn package targets a fully interconnected continental grid by 2035.", source: "The Guardian" },
    { title: "Record Heatwave Prompts Emergency Measures Across Southern Hemisphere", description: "Authorities opened cooling centers as temperatures shattered seasonal records.", source: "Al Jazeera" },
  ],
  sports: [
    { title: "Underdog Club Stuns Champions in Last-Minute Cup Final Thriller", description: "A stoppage-time strike sealed one of the competition's greatest upsets in decades.", source: "ESPN" },
    { title: "Sprinter Shatters 200m World Record at Continental Championships", description: "The blistering run took two-hundredths off a mark that had stood for six years.", source: "BBC Sport" },
    { title: "Grand Slam Final Set as Two Rising Stars Reach First Major Decider", description: "Both players are guaranteed a maiden Grand Slam title after dispatching seeded opponents.", source: "ESPN" },
  ],
  ai: [
    { title: "New Open-Weight Model Matches Frontier Systems on Reasoning Benchmarks", description: "Researchers released the weights under a permissive license, intensifying the open-vs-closed debate.", source: "TechCrunch" },
    { title: "Hospitals Roll Out AI Diagnostic Assistant That Flags Rare Conditions Early", description: "A multi-center trial reported a meaningful jump in early-detection rates for under-diagnosed diseases.", source: "Wired" },
    { title: "Chipmaker Unveils Inference Accelerator Promising 4x Efficiency Gains", description: "The architecture targets the surging cost of serving large language models at scale.", source: "The Verge" },
    { title: "Regulators Publish First Audit Guidelines for High-Risk AI Systems", description: "The voluntary standard outlines documentation and red-teaming expectations for deployers.", source: "Reuters" },
  ],
  technology: [
    { title: "Foldable Laptops Hit the Mainstream as Major Brands Ship New Lineups", description: "Improved hinges and brighter OLED panels are finally making the form factor practical.", source: "The Verge" },
    { title: "Quantum Startup Demonstrates Error-Corrected Logical Qubit Milestone", description: "The result edges the field closer to fault-tolerant, commercially useful machines.", source: "Wired" },
    { title: "Browser Makers Agree on Standard to Kill Off Third-Party Tracking Cookies", description: "The shared proposal promises privacy gains without breaking ad-supported sites.", source: "TechCrunch" },
  ],
  economy: [
    { title: "Central Banks Signal Coordinated Shift Toward Rate Cuts as Inflation Cools", description: "Markets rallied on expectations of looser policy heading into the next quarter.", source: "Bloomberg" },
    { title: "Global Trade Volumes Rebound to Pre-Slowdown Levels, Data Shows", description: "A pickup in manufacturing orders led the broad-based recovery.", source: "Reuters" },
    { title: "Renewable Investment Overtakes Fossil Fuels for First Time Worldwide", description: "Falling costs and policy support drove a record year of clean-energy financing.", source: "Bloomberg" },
  ],
  crime: [
    { title: "International Operation Dismantles Major Cybercrime Network Across Six Nations", description: "Coordinated raids seized infrastructure linked to widespread ransomware attacks.", source: "Reuters" },
    { title: "Landmark Verdict Delivered in High-Profile Financial Fraud Trial", description: "The court handed down sentences following a years-long investigation into the scheme.", source: "BBC" },
  ],
  entertainment: [
    { title: "Indie Film Sweeps Top Honors at International Festival, Stunning Critics", description: "The micro-budget drama walked away with three of the night's biggest awards.", source: "The Guardian" },
    { title: "Reunion Tour Becomes Highest-Grossing Concert Run in History", description: "Surging demand pushed the band to add a third leg of stadium dates.", source: "Rolling Stone" },
    { title: "Streaming Giant's Animated Series Breaks First-Week Viewing Records", description: "The hand-drawn epic drew praise for its ambitious world-building and score.", source: "Variety" },
  ],
  science: [
    { title: "Astronomers Capture Sharpest-Ever Image of a Planet Forming Around a Star", description: "The observation offers a rare real-time glimpse into planetary birth.", source: "Nature" },
    { title: "Breakthrough Gene Therapy Restores Partial Vision in Clinical Trial", description: "Participants with an inherited disorder showed durable improvements a year on.", source: "Science" },
    { title: "Deep-Sea Expedition Discovers Dozens of Species New to Science", description: "Researchers documented vibrant ecosystems thriving near hydrothermal vents.", source: "National Geographic" },
  ],
  health: [
    { title: "Universal Flu Vaccine Candidate Shows Broad Protection in Early Trials", description: "The shot targets conserved viral structures, hinting at multi-season immunity.", source: "Reuters Health" },
    { title: "Large Study Links Daily Movement Breaks to Major Cardiovascular Benefits", description: "Even brief, frequent activity offset the risks of prolonged sitting.", source: "The Guardian" },
    { title: "New Guidelines Lower Recommended Screening Age for Common Cancer", description: "Experts cited rising early-onset cases in updating the long-standing advice.", source: "BBC Health" },
  ],
};

const HOUR = 36e5;

function imageFor(slug: string): string {
  // Picsum provides stable, seeded photos — good enough for a visual preview.
  return `https://picsum.photos/seed/${encodeURIComponent(slug)}/1200/800`;
}

let cache: Article[] | null = null;

export function mockArticles(): Article[] {
  if (cache) return cache;
  const now = Date.now();
  const out: Article[] = [];
  let i = 0;

  for (const cat of CATEGORIES) {
    const seeds = SEEDS[cat.slug] ?? [];
    seeds.forEach((s, idx) => {
      const ageHours = (i * 1.7 + idx * 3.1) % 72; // spread over ~3 days
      const publishedAt = new Date(now - ageHours * HOUR);
      const slug = slugify(s.title, s.title);
      const views = Math.floor(((hash(slug) % 900) + 50) * (1 + (72 - ageHours) / 72) * 12);
      out.push({
        id: `mock_${i}`,
        title: s.title,
        description: s.description,
        content: paragraphs(s.title, s.description),
        image: imageFor(slug),
        source: s.source,
        sourceUrl: "#",
        category: cat.slug,
        slug,
        url: `https://example.com/${slug}`,
        featured: idx === 0 && ["india", "world", "ai", "technology"].includes(cat.slug),
        views,
        publishedAt: publishedAt.toISOString(),
        createdAt: publishedAt.toISOString(),
        trendingScore: 0,
      });
      i++;
    });
  }

  // Compute a lightweight trending score for ordering in mock mode.
  cache = out
    .map((a) => ({
      ...a,
      trendingScore: Number(
        (
          Math.pow(0.5, ((now - new Date(a.publishedAt).getTime()) / HOUR) / 18) *
          (1 + Math.log1p(a.views) / 6) *
          100
        ).toFixed(2)
      ),
    }))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return cache;
}

function paragraphs(title: string, desc: string): string {
  const lead = `${desc} The development, reported on ${new Date().toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" }
  )}, has drawn attention from analysts and the public alike.`;
  const body = [
    `Observers noted that the story marks a significant moment, with implications likely to unfold over the coming weeks. Officials close to the matter described the situation as "evolving rapidly" while urging measured expectations.`,
    `Independent commentators highlighted both the opportunities and the risks involved. "${title}" — the headline itself captures a shift many had anticipated but few expected to arrive so soon.`,
    `Further updates are expected as more details emerge. Aurora News will continue to follow this story and provide verified information as it becomes available.`,
  ];
  return [lead, ...body].join("\n\n");
}
