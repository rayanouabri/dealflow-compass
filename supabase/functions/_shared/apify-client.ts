// Apify — Google Search Results Scraper (actor apify/google-search-scraper).
// Donne des résultats GOOGLE (qu'Oxylabs ne peut pas scraper) → couverture FR
// supérieure à Bing, et requêtes ciblées (portfolios d'accélérateurs, LinkedIn,
// Pappers/Bodacc, lauréats Bpifrance/ADEME). ~10-20s par requête (lance un
// navigateur), donc on l'utilise pour quelques requêtes à fort signal, pas en masse.
import { logger } from "./logger.ts";

export interface ApifySearchResult {
  title: string;
  url: string;
  description: string;
}

const ENDPOINT =
  "https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items";

// Exécute N requêtes Google en un seul run (l'actor accepte un \n-separated list).
export async function apifyGoogleSearch(
  queries: string[],
  opts: { resultsPerQuery?: number; timeoutMs?: number } = {},
): Promise<ApifySearchResult[]> {
  const token = Deno.env.get("APIFY_TOKEN");
  if (!token || queries.length === 0) return [];
  const resultsPerPage = opts.resultsPerQuery ?? 10;
  const timeoutMs = opts.timeoutMs ?? 55000;

  try {
    const resp = await fetch(`${ENDPOINT}?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queries: queries.join("\n"),
        resultsPerPage,
        maxPagesPerQuery: 1,
        countryCode: "fr",
        languageCode: "fr",
        saveHtml: false,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) {
      logger.warn(`[Apify] HTTP ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    const out: ApifySearchResult[] = [];
    for (const page of Array.isArray(data) ? data : []) {
      for (const r of page?.organicResults ?? []) {
        if (r?.url && r?.title) {
          out.push({
            title: String(r.title),
            url: String(r.url),
            description: String(r.description ?? r.snippet ?? ""),
          });
        }
      }
    }
    logger.info(`[Apify] ${out.length} results for ${queries.length} queries`);
    return out;
  } catch (err) {
    logger.warn(`[Apify] search failed`, { error: String(err) });
    return [];
  }
}
