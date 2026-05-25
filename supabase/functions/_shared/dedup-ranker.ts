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
}

const SIGNAL_WEIGHTS: Record<string, number> = {
  ip: 4,
  spinoff: 3,
  university: 3,
  talent: 3,
  incubator: 2,
  grant: 2,
  press: 1,
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

  // Scoring pondéré : sum(signal_weights) × min(mentionCount, 15)
  // Filtre bruit : skip si mentionCount < 2 ET categories < 2
  const candidates: SourcingCandidate[] = [];
  for (const c of byUrl.values()) {
    // Filter noise
    if (c.mentionCount < 2 && c.categories.size < 2) {
      continue;
    }

    // Weighted score
    let weight = 0;
    for (const cat of c.categories) {
      weight += (SIGNAL_WEIGHTS[cat] ?? 1);
    }
    const cappedMentions = Math.min(c.mentionCount, 15); // Diminishing returns
    c.score = weight * cappedMentions;
    candidates.push(c);
  }

  return candidates.sort((a, b) => b.score - a.score);
}
