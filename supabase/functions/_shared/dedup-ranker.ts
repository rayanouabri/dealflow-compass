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

// Normalise une URL pour la déduplication
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.toLowerCase());
    // Retire www. et le slash final
    return (u.hostname.replace(/^www\./, "") + u.pathname).replace(/\/$/, "");
  } catch {
    return url.toLowerCase().replace(/^www\./, "").replace(/\/$/, "");
  }
}

// Extrait un nom d'entreprise plausible depuis le titre d'un résultat
function extractCompanyName(title: string, url: string): string {
  // Supprime les suffixes courants de titres
  let name = title
    .replace(/\s*[|\-–—]\s*.+$/, "")  // "Acme - Homepage" → "Acme"
    .replace(/\s*:.*$/, "")            // "Acme: About" → "Acme"
    .replace(/\s+\|\s+.*$/, "")
    .trim();

  if (name.length > 60 || name.length < 2) {
    // Fallback : domaine principal
    try {
      name = new URL(url).hostname
        .replace(/^www\./, "")
        .split(".")[0]
        .replace(/-/g, " ");
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

  // Score = diversité de catégories × nombre de mentions
  for (const c of byUrl.values()) {
    c.score = c.categories.size * c.mentionCount;
  }

  return Array.from(byUrl.values()).sort((a, b) => b.score - a.score);
}
