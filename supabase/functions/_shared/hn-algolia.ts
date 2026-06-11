// Connecteur Hacker News (Algolia Search API) — gratuit, sans clé.
// Détecte les "Show HN" / "Launch HN" : produits et startups early-stage.
// Doc: https://hn.algolia.com/api

import { logger } from "./logger.ts";
import type { SearchResult } from "./search-client.ts";

const HN_BASE = "https://hn.algolia.com/api/v1/search";

export interface HNStartup {
  name: string;
  url: string;
  itemUrl: string;
  description: string;
  points: number;
  comments: number;
  createdAt: string;
}

interface HNQueryOptions {
  terms?: string[]; // mots-clés produit/secteur
  sinceDays?: number;
  maxResults?: number;
}

function cleanName(title: string): string {
  // "Show HN: Acme – an AI tool for X" → "Acme"
  let t = title.replace(/^\s*(show|launch|ask)\s+hn:?\s*/i, "");
  t = t.split(/\s+[–—\-|:]\s+/)[0]; // coupe à la première séparation
  return t.replace(/["«»]/g, "").trim().slice(0, 80);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Recherche les posts Show HN récents correspondant aux termes.
export async function searchHackerNews(
  opts: HNQueryOptions = {},
): Promise<HNStartup[]> {
  const terms = (opts.terms ?? []).filter(Boolean).slice(0, 3);
  if (terms.length === 0) terms.push("startup");
  const sinceDays = opts.sinceDays ?? 365;
  const maxResults = opts.maxResults ?? 20;
  const sinceTs = Math.floor((Date.now() - sinceDays * 86_400_000) / 1000);

  const seen = new Set<string>();
  const out: HNStartup[] = [];

  for (const term of terms) {
    const url = `${HN_BASE}?query=${encodeURIComponent(term)}&tags=show_hn&numericFilters=${encodeURIComponent(
      `created_at_i>${sinceTs}`,
    )}&hitsPerPage=${Math.ceil(maxResults / terms.length)}`;
    try {
      const resp = await fetch(url, { headers: { Accept: "application/json" } });
      if (!resp.ok) {
        logger.warn("HN Algolia erreur", { status: resp.status, term });
        continue;
      }
      const data = await resp.json();
      for (const hit of data.hits ?? []) {
        const id = String(hit.objectID ?? "");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const title = hit.title ?? "";
        if (!title) continue;
        out.push({
          name: cleanName(title),
          url: hit.url || `https://news.ycombinator.com/item?id=${id}`,
          itemUrl: `https://news.ycombinator.com/item?id=${id}`,
          description: stripHtml(`${title}. ${hit.story_text ?? ""}`).slice(0, 300),
          points: hit.points ?? 0,
          comments: hit.num_comments ?? 0,
          createdAt: hit.created_at ?? "",
        });
      }
    } catch (err) {
      logger.warn("HN Algolia exception", { error: String(err), term });
    }
  }

  logger.info("HN Algolia", { found: out.length });
  return out;
}

export function hnToSearchResults(
  startups: HNStartup[],
): (SearchResult & { category: string })[] {
  return startups.map((s) => ({
    title: s.name,
    url: s.url,
    // La date est incluse pour que le scoring de récence la détecte.
    description: `${s.description} (Show HN ${s.createdAt.slice(0, 10)}: ${s.points} points, ${s.comments} commentaires)`,
    extra_snippets: [],
    source: "hn",
    category: "show_hn",
  }));
}
