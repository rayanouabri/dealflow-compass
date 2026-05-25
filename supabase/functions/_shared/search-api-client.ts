// Unified search API client with Serper primary + Brave fallback

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  source?: string;
  extra_snippets?: string[];
}

interface SearchOptions {
  resultsPerQuery?: number;
  retryOnFailure?: boolean;
  timeoutMs?: number;
}

export class SearchAPIClient {
  private serperKey: string | undefined;
  private braveKey: string | undefined;

  constructor() {
    this.serperKey = Deno.env.get("SERPER_API_KEY") || Deno.env.get("serper_api");
    this.braveKey = Deno.env.get("BRAVE_API_KEY");
  }

  private isConfigured(): boolean {
    return !!(this.serperKey || this.braveKey);
  }

  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const { resultsPerQuery = 10, retryOnFailure = true, timeoutMs = 8000 } = options;

    if (!this.isConfigured()) {
      console.warn("No search API configured (SERPER_API_KEY or BRAVE_API_KEY)");
      return [];
    }

    // Try Serper first (better for structured data)
    if (this.serperKey) {
      try {
        const results = await this.searchSerper(query, resultsPerQuery, timeoutMs);
        if (results.length > 0) {
          return results;
        }
      } catch (error) {
        console.warn(`Serper search failed: ${error}`);
        if (!retryOnFailure) throw error;
      }
    }

    // Fallback to Brave
    if (this.braveKey) {
      try {
        return await this.searchBrave(query, resultsPerQuery, timeoutMs);
      } catch (error) {
        console.error(`Both search APIs failed: ${error}`);
        throw error;
      }
    }

    return [];
  }

  private async searchSerper(
    query: string,
    count: number,
    timeoutMs: number
  ): Promise<SearchResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": this.serperKey!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: query,
          num: Math.min(count, 20),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Serper API ${response.status}`);
      }

      const data = await response.json();
      return (data.organic || [])
        .slice(0, count)
        .map((r: any) => ({
          title: r.title || "",
          url: r.link || "",
          description: r.snippet || "",
          source: "serper",
        }));
    } finally {
      clearTimeout(timeout);
    }
  }

  private async searchBrave(
    query: string,
    count: number,
    timeoutMs: number
  ): Promise<SearchResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&text_decorations=false&result_filter=web`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": this.braveKey!,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Brave API ${response.status}`);
      }

      const data = await response.json();
      return (data.web?.results || []).map((r: any) => ({
        title: r.title || "",
        url: r.url || "",
        description: r.description || "",
        source: "brave",
        extra_snippets: r.extra_snippets || [],
      }));
    } finally {
      clearTimeout(timeout);
    }
  }

  // Batch search with smart rate-limiting
  async searchBatch(
    queries: string[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const delayMs = 1100; // Respect rate limits

    for (const query of queries) {
      try {
        const batchResults = await this.search(query, options);
        results.push(...batchResults);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } catch (error) {
        console.warn(`Batch search failed for "${query}": ${error}`);
      }
    }

    return results;
  }
}

// Singleton
let client: SearchAPIClient | null = null;

export function getSearchClient(): SearchAPIClient {
  if (!client) {
    client = new SearchAPIClient();
  }
  return client;
}
