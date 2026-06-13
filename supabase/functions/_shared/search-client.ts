// Client de recherche unifié : Oxylabs Real-time API
import { getCachedSearch, setCachedSearch } from "./search-cache.ts";
import { oxylabsSearch as oxylabsWebSearch } from "./oxylabs-client.ts";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  extra_snippets?: string[];
  source?: "oxylabs" | "insee" | "hn" | "github";
}

// Oxylabs unified search (retry + timeout handled inside the client)
export async function oxylabsSearchWrapper(
  query: string,
  count = 10,
): Promise<SearchResult[]> {
  const results = await oxylabsWebSearch(query, count);
  return results.map((r) => ({ ...r, source: "oxylabs" as const }));
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
