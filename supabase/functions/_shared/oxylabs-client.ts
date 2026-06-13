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
export async function oxylabsSearch(query: string, count: number = 5): Promise<SearchResult[]> {
  const auth = await getOxylabsAuth();

  const request: OxylabsRequest = {
    source: "google",
    query: query,
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

// Parse Google search results from HTML
function parseGoogleResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Extract results using flexible patterns
  const resultDivs = html.match(/<div\s+class="[^"]*result[^"]*"[^>]*>[\s\S]*?(?=<div\s+class="[^"]*result|$)/gi) || [];

  for (const resultDiv of resultDivs.slice(0, 20)) {
    // Find title (h3 or a tag with result title)
    const titleMatch = resultDiv.match(/<h3[^>]*>([^<]+)<\/h3>/i) ||
                       resultDiv.match(/<a[^>]*>([^<]+)<\/a>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // Find URL
    const urlMatch = resultDiv.match(/href="([^"]+)"/);
    let url = urlMatch ? urlMatch[1] : "";

    if (url.startsWith("/url?q=")) {
      url = decodeURIComponent(url.replace("/url?q=", "").split("&")[0]);
    }

    // Find description
    const descMatch = resultDiv.match(/<span[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                      resultDiv.match(/<span[^>]*>([^<]+)<\/span>/);
    const description = descMatch ? descMatch[1].trim() : "";

    if (title && url && !url.includes("google.com")) {
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
