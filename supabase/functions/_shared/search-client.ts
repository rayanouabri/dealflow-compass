// Client de recherche unifié : Oxylabs Real-time API
import { logger } from "./logger.ts";
import { getCachedSearch, setCachedSearch } from "./search-cache.ts";
import {
  oxylabsSearch as oxylabsWebSearch,
  oxylabsLinkedInSearch,
} from "./oxylabs-client.ts";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  extra_snippets?: string[];
  source?: "oxylabs" | "insee" | "hn" | "github";
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Oxylabs unified search with retry logic
export async function oxylabsSearchWrapper(
  query: string,
  count = 10,
  retries = 2,
): Promise<SearchResult[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const results = await oxylabsWebSearch(query, count);
      return results.map((r) => ({
        ...r,
        source: "oxylabs" as const,
      }));
    } catch (err) {
      logger.error(`Oxylabs search attempt ${attempt + 1} failed:`, err);
      if (attempt === retries) return [];
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
  return [];
}

// Legacy names for backward compatibility
export const braveSearch = oxylabsSearchWrapper;
export const serperSearch = oxylabsSearchWrapper;

// Oxylabs unified search with caching
export async function searchAll(
  query: string,
  count = 10,
): Promise<SearchResult[]> {
  const cacheQuery = `all|${query}`;
  const cached = await getCachedSearch<SearchResult>(cacheQuery, count);
  if (cached) return cached;

  const results = await oxylabsSearchWrapper(query, count);

  if (results.length > 0) {
    await setCachedSearch(cacheQuery, count, results);
  }

  return results;
}
