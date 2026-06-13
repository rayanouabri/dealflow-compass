// Oxylabs Real-time Scraper API client
// Replaces Brave, Serper - full documentation at https://developers.oxylabs.io/

import { logger } from "./logger.ts";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

interface OxylabsRequest {
  source: "universal" | "google" | "bing" | "linkedin" | "amazon";
  url?: string;
  query?: string;
  render?: "html" | "headless_browser";
}

interface OxylabsResponse {
  job: {
    id: string;
    status: "pending" | "running" | "done" | "failed";
  };
  results?: Array<{
    content: string;
  }>;
}

const OXYLABS_API = "https://realtime.oxylabs.io/v1/queries";

async function getOxylabsAuth(): Promise<string> {
  const user = Deno.env.get("OXYLABS_USER");
  const pass = Deno.env.get("OXYLABS_PASS");
  if (!user || !pass) {
    throw new Error("OXYLABS_USER or OXYLABS_PASS missing");
  }
  return btoa(`${user}:${pass}`);
}

// Main search function - replaces Brave/Serper
// NOTE: Google blocks Oxylabs, so we use Bing instead
export async function oxylabsSearch(query: string, count: number = 5): Promise<SearchResult[]> {
  const auth = await getOxylabsAuth();

  // Use Bing since Google blocks Oxylabs
  // Bing expects + for spaces, not %20
  const bingQuery = query.replace(/ /g, "+");
  const searchUrl = `https://www.bing.com/search?q=${bingQuery}`;

  const request: OxylabsRequest = {
    source: "bing",
    url: searchUrl,
    render: "html",
  };

  try {
    const response = await fetch(OXYLABS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`[Oxylabs] HTTP ${response.status}:`, error);
      throw new Error(`Oxylabs HTTP ${response.status}`);
    }

    const data: OxylabsResponse = await response.json();

    if (data.job?.status === "failed") {
      throw new Error("Oxylabs job failed");
    }

    if (!data.results || data.results.length === 0) {
      logger.warn(`[Oxylabs] No results for query: ${query}`);
      return [];
    }

    const html = data.results[0].content || "";
    const results = parseGoogleResults(html);

    logger.info(`[Oxylabs] Found ${results.length} results for: ${query.substring(0, 50)}`);
    return results.slice(0, count);
  } catch (err) {
    logger.error(`[Oxylabs] Search failed for "${query}":`, err);
    throw err;
  }
}

// Parse Bing search results from HTML
function parseGoogleResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Bing search results are in <li> with data-bm attributes
  const listItems = html.match(/<li[^>]*data-bm[^>]*>[\s\S]*?(?=<\/li>)/gi) || [];

  for (const item of listItems.slice(0, 20)) {
    // Find title in <h2> or <a>
    const titleMatch = item.match(/<h2[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i) ||
                       item.match(/<a[^>]*title="([^"]+)"/i) ||
                       item.match(/<h2[^>]*>([^<]+)<\/h2>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // Find URL - Bing uses href attribute
    const urlMatch = item.match(/<a[^>]*href="([^"]+)"/);
    let url = urlMatch ? urlMatch[1] : "";

    // Skip Bing's own pages and tracking links
    if (url.startsWith("/") || url.includes("bing.com") || !url.startsWith("http")) {
      continue;
    }

    // Find description
    const descMatch = item.match(/<p[^>]*>([^<]+)<\/p>/i);
    const description = descMatch ? descMatch[1].trim() : "";

    if (title && url) {
      results.push({ title, url, description });
    }
  }

  return results;
}

// Batch search for multiple queries
export async function oxylabsBatchSearch(queries: string[]): Promise<Map<string, SearchResult[]>> {
  const results = new Map<string, SearchResult[]>();

  // Process in batches to avoid overwhelming the API
  const batchSize = 3;
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);

    const promises = batch.map(async (q) => {
      try {
        const searchResults = await oxylabsSearch(q);
        return { query: q, results: searchResults };
      } catch (err) {
        logger.warn(`Batch search failed for "${q}":`, err);
        return { query: q, results: [] };
      }
    });

    const batchResults = await Promise.all(promises);
    for (const { query: q, results: res } of batchResults) {
      results.set(q, res);
    }

    // Delay between batches
    if (i + batchSize < queries.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return results;
}
