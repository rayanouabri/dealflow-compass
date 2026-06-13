// Oxylabs Real-time Scraper API client
// Uses Bing SERP with structured parsing (parse:true) — Google blocks Oxylabs.
// Returns clean JSON (no HTML regex), ~2-3s per request.

import { logger } from "./logger.ts";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

interface OxylabsOrganicResult {
  title?: string;
  url?: string;
  desc?: string;
  pos?: number;
}

interface OxylabsParsedContent {
  parse_status_code?: number;
  results?: {
    organic?: OxylabsOrganicResult[];
    paid?: OxylabsOrganicResult[];
  };
}

interface OxylabsResponse {
  job?: { id: string; status: string };
  results?: Array<{ content: OxylabsParsedContent | string }>;
}

const OXYLABS_API = "https://realtime.oxylabs.io/v1/queries";
// Hard cap per request. The pipeline fires dozens of queries; one slow Bing
// fetch must not stall a whole batch. 9s covers the p95 (~3-6s) with margin.
const REQUEST_TIMEOUT_MS = 9000;

function getOxylabsAuth(): string {
  const user = Deno.env.get("OXYLABS_USER");
  const pass = Deno.env.get("OXYLABS_PASS");
  if (!user || !pass) {
    throw new Error("OXYLABS_USER or OXYLABS_PASS missing");
  }
  return btoa(`${user}:${pass}`);
}

// Main search — Bing SERP, structured JSON. Replaces Brave/Serper.
export async function oxylabsSearch(
  query: string,
  count = 10,
  retries = 0,
): Promise<SearchResult[]> {
  const auth = getOxylabsAuth();
  const body = {
    source: "bing_search",
    query,
    parse: true,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(OXYLABS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.warn(`[Oxylabs] HTTP ${response.status}: ${errText.slice(0, 120)}`);
        if (attempt === retries) return [];
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }

      const data: OxylabsResponse = await response.json();
      const content = data.results?.[0]?.content;

      if (!content || typeof content === "string") {
        logger.warn(`[Oxylabs] No parsed content for: ${query.slice(0, 50)}`);
        return [];
      }

      const organic = content.results?.organic ?? [];
      const results: SearchResult[] = organic
        .filter((r) => r.url && r.title)
        .map((r) => ({
          title: (r.title ?? "").trim(),
          url: (r.url ?? "").trim(),
          description: (r.desc ?? "").trim(),
        }))
        .slice(0, count);

      logger.info(`[Oxylabs] ${results.length} results for: ${query.slice(0, 50)}`);
      return results;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[Oxylabs] attempt ${attempt + 1} failed for "${query.slice(0, 40)}": ${msg}`);
      if (attempt === retries) return [];
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  return [];
}

// Batch search with bounded concurrency.
export async function oxylabsBatchSearch(
  queries: string[],
  concurrency = 6,
): Promise<Map<string, SearchResult[]>> {
  const results = new Map<string, SearchResult[]>();
  for (let i = 0; i < queries.length; i += concurrency) {
    const batch = queries.slice(i, i + concurrency);
    const settled = await Promise.all(
      batch.map(async (q) => ({ q, r: await oxylabsSearch(q) })),
    );
    for (const { q, r } of settled) results.set(q, r);
  }
  return results;
}

// Fetch a single page's visible text via Oxylabs (universal source).
// Used to mine startup-listing/aggregator pages for real company names.
// Returns plain text (HTML stripped), truncated, or "" on failure.
export async function oxylabsFetchPageText(
  url: string,
  maxChars = 12000,
): Promise<string> {
  const auth = getOxylabsAuth();
  try {
    const response = await fetch(OXYLABS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ source: "universal", url }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return "";
    const data: OxylabsResponse = await response.json();
    const content = data.results?.[0]?.content;
    if (typeof content !== "string") return "";
    // Strip scripts/styles then tags, collapse whitespace.
    const text = content
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, maxChars);
  } catch {
    return "";
  }
}
