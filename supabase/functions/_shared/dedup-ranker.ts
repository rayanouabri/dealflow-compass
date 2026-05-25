// Déduplication et ranking des résultats de sourcing
import type { SearchResult } from "./search-client.ts";

export interface SourcingCandidate {
  name: string;
  url: string;
  descriptions: string[];
  mentionCount: number;
  categories: Set<string>;
  sources: string[];
  score: number;
  recencyScore: number;
  signalYear: number | null;
  crossSignalBonus: number;
}

const SIGNAL_WEIGHTS: Record<string, number> = {
  ip: 4,
  spinoff: 3,
  university: 3,
  talent: 3,
  incubator: 2,
  grant: 2,
  press: 1,
  github: 4,
  arxiv_hal: 4,
  pappers: 3,
  producthunt: 3,
  wellfound: 3,
  show_hn: 3,
  job_board: 2,
  conference: 2,
};

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.toLowerCase());
    // Retire www. et le slash final
    return (u.hostname.replace(/^www\./, "") + u.pathname).replace(/\/$/, "");
  } catch {
    return url.toLowerCase().replace(/^www\./, "").replace(/\/$/, "");
  }
}

export function extractCompanyName(title: string, url: string): string {
  // Supprime les suffixes courants de titres
  let name = title
    .replace(/\s*[|\-–—]\s*.+$/, "")  // "Acme - Homepage" → "Acme"
    .replace(/\s*:.*$/, "")            // "Acme: About" → "Acme"
    .replace(/\s+\|\s+.*$/, "")
    .replace(/["«»]/g, "")             // Guillemets français
    .trim();

  if (name.length > 60 || name.length < 2) {
    // Fallback : domaine principal
    try {
      name = new URL(url).hostname
        .replace(/^www\./, "")
        .split(".")[0]
        .replace(/-/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2"); // camelCase → spaced
    } catch {
      name = url;
    }
  }

  return name;
}

function computeRecencyScore(descriptions: string[]): { score: number; year: number | null } {
  const text = descriptions.join(" ");
  const currentYear = new Date().getFullYear();

  // Extract years from descriptions
  const years = text.match(/\b(202[4-9]|203\d)\b/g);
  if (!years || years.length === 0) return { score: 1, year: null };

  const latestYear = Math.max(...years.map(Number));
  const yearDiff = currentYear - latestYear;

  // Scoring: 2024 = 10, 2023 = 7, 2022 = 4, earlier = 1
  let score = 1;
  if (yearDiff === 0) score = 10;
  else if (yearDiff === 1) score = 7;
  else if (yearDiff === 2) score = 4;

  return { score, year: latestYear };
}

function computeCrossSignalBonus(categories: Set<string>): number {
  const highValueSignals = ["github", "arxiv_hal", "pappers", "show_hn", "ip", "spinoff", "producthunt", "wellfound", "university", "talent"];
  const highValueCount = Array.from(categories).filter(cat => highValueSignals.includes(cat)).length;

  if (highValueCount >= 4) return 25;
  if (highValueCount === 3) return 15;
  if (highValueCount === 2) return 5;
  return 0;
}

// Regroupe les résultats par startup et calcule les scores
export function deduplicateAndRank(
  results: (SearchResult & { category?: string })[],
): SourcingCandidate[] {
  const byUrl = new Map<string, SourcingCandidate>();

  for (const r of results) {
    if (!r.url) continue;

    const normUrl = normalizeUrl(r.url);
    // Domaine racine pour regrouper (ex: acme.com/team et acme.com/blog)
    const hostname = normUrl.split("/")[0];

    if (!byUrl.has(hostname)) {
      byUrl.set(hostname, {
        name: extractCompanyName(r.title, r.url),
        url: r.url,
        descriptions: [],
        mentionCount: 0,
        categories: new Set(),
        sources: [],
        score: 0,
        recencyScore: 0,
        signalYear: null,
        crossSignalBonus: 0,
      });
    }

    const candidate = byUrl.get(hostname)!;
    candidate.mentionCount += 1;

    if (r.description) candidate.descriptions.push(r.description);
    if (r.category) candidate.categories.add(r.category);
    if (r.source && !candidate.sources.includes(r.source)) {
      candidate.sources.push(r.source);
    }
  }

  // Scoring pondéré avec recency + cross-signal bonus
  const candidates: SourcingCandidate[] = [];
  for (const c of byUrl.values()) {
    // Compute recency score and year
    const { score: recencyScore, year: signalYear } = computeRecencyScore(c.descriptions);
    c.recencyScore = recencyScore;
    c.signalYear = signalYear;

    // Compute cross-signal bonus
    c.crossSignalBonus = computeCrossSignalBonus(c.categories);

    // Filter noise with relaxed rules for high-value signals
    const hasHighValueSignal = Array.from(c.categories).some(cat =>
      ["github", "arxiv_hal", "pappers", "show_hn"].includes(cat)
    );
    if (c.mentionCount < 2 && c.categories.size < 2 && !hasHighValueSignal) {
      continue;
    }

    // Weighted score: (sum_weights × min(mentions, 15)) + recencyScore + crossSignalBonus
    let weight = 0;
    for (const cat of c.categories) {
      weight += (SIGNAL_WEIGHTS[cat] ?? 1);
    }
    const cappedMentions = Math.min(c.mentionCount, 15); // Diminishing returns
    c.score = weight * cappedMentions + c.recencyScore + c.crossSignalBonus;
    candidates.push(c);
  }

  return candidates.sort((a, b) => b.score - a.score);
}
