// Client de recherche unifié : SearXNG (auto-hébergé) + Brave Search + Serper, avec déduplication et rate limiting
import { logger } from "./logger.ts";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  extra_snippets?: string[];
  source?: "brave" | "serper" | "searxng";
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// SearXNG — moteur de recherche auto-hébergé, illimité et gratuit
// Déploiement : voir docs/SEARXNG_SETUP.md
// Variable d'env : SEARXNG_URL (ex: https://search.mondomaine.com)
export async function searxngSearch(
  query: string,
  count = 10,
  retries = 2,
): Promise<SearchResult[]> {
  const SEARXNG_URL = Deno.env.get("SEARXNG_URL");
  if (!SEARXNG_URL) {
    logger.warn("SEARXNG_URL non configuré — skip SearXNG");
    return [];
  }

  const base = SEARXNG_URL.replace(/\/$/, "");

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const params = new URLSearchParams({
        q: query,
        format: "json",
        engines: "google,bing,duckduckgo,brave",
        language: "fr-FR",
        pageno: "1",
      });

      const resp = await fetch(`${base}/search?${params}`, {
        headers: {
          Accept: "application/json",
          // Header custom pour identifier l'appelant (utile pour les logs SearXNG)
          "X-Requested-With": "dealflow-compass",
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (resp.status === 429 || resp.status === 503) {
        const wait = Math.pow(2, attempt) * 1000;
        logger.warn(`SearXNG ${resp.status} — attente ${wait}ms`, { query });
        await sleep(wait);
        continue;
      }

      if (!resp.ok) {
        logger.error("SearXNG erreur", { status: resp.status, query });
        return [];
      }

      const data = await resp.json();
      // SearXNG retourne { results: [{ title, url, content, engines[] }] }
      return (data.results ?? [])
        .slice(0, count)
        .map((r: any) => ({
          title: r.title ?? "",
          url: r.url ?? "",
          description: r.content ?? "",
          extra_snippets: [],
          source: "searxng" as const,
        }));
    } catch (err) {
      logger.error("SearXNG exception", { error: String(err), query });
      if (attempt === retries) return [];
      await sleep(Math.pow(2, attempt) * 500);
    }
  }
  return [];
}

// Brave Search API
export async function braveSearch(
  query: string,
  count = 10,
  retries = 2,
): Promise<SearchResult[]> {
  const BRAVE_API_KEY = Deno.env.get("BRAVE_API_KEY");
  if (!BRAVE_API_KEY) {
    logger.warn("BRAVE_API_KEY non configuré — skip Brave Search");
    return [];
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
        query,
      )}&count=${count}&text_decorations=false&result_filter=web`;

      const resp = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": BRAVE_API_KEY,
        },
      });

      if (resp.status === 429) {
        const wait = Math.pow(2, attempt) * 1000;
        logger.warn(`Brave 429 — attente ${wait}ms`, { query });
        await sleep(wait);
        continue;
      }

      if (!resp.ok) {
        logger.error("Brave Search erreur", { status: resp.status, query });
        return [];
      }

      const data = await resp.json();
      return (data.web?.results ?? []).map((r: any) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        description: r.description ?? "",
        extra_snippets: r.extra_snippets ?? [],
        source: "brave" as const,
      }));
    } catch (err) {
      logger.error("Brave Search exception", { error: String(err), query });
      if (attempt === retries) return [];
      await sleep(Math.pow(2, attempt) * 500);
    }
  }
  return [];
}

// Serper (Google Search) API
export async function serperSearch(
  query: string,
  count = 10,
  retries = 2,
): Promise<SearchResult[]> {
  const SERPER_API_KEY =
    Deno.env.get("SERPER_API_KEY") ?? Deno.env.get("serper_api");
  if (!SERPER_API_KEY) {
    logger.warn("SERPER_API_KEY non configuré — skip Serper Search");
    return [];
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": SERPER_API_KEY,
        },
        body: JSON.stringify({ q: query, num: count }),
      });

      if (resp.status === 429) {
        const wait = Math.pow(2, attempt) * 1000;
        logger.warn(`Serper 429 — attente ${wait}ms`, { query });
        await sleep(wait);
        continue;
      }

      if (!resp.ok) {
        logger.error("Serper Search erreur", { status: resp.status, query });
        return [];
      }

      const data = await resp.json();
      return (data.organic ?? []).map((r: any) => ({
        title: r.title ?? "",
        url: r.link ?? "",
        description: r.snippet ?? "",
        extra_snippets: [],
        source: "serper" as const,
      }));
    } catch (err) {
      logger.error("Serper Search exception", { error: String(err), query });
      if (attempt === retries) return [];
      await sleep(Math.pow(2, attempt) * 500);
    }
  }
  return [];
}

// SearXNG en priorité (illimité), puis Brave, puis Serper en fallback.
// Déduplique les URLs cross-sources.
export async function searchAll(
  query: string,
  count = 10,
): Promise<SearchResult[]> {
  // Essai SearXNG en premier si configuré
  const searxngResults = await searxngSearch(query, count);

  // Si SearXNG donne assez de résultats, on s'arrête là (économise les quotas API)
  if (searxngResults.length >= Math.floor(count * 0.7)) {
    return searxngResults.slice(0, count);
  }

  // Fallback : compléter avec Brave + Serper
  const remaining = count - searxngResults.length;
  const [braveResults, serperResults] = await Promise.all([
    braveSearch(query, remaining),
    serperSearch(query, remaining),
  ]);

  const seen = new Set<string>(
    searxngResults.map((r) => r.url.toLowerCase().replace(/\/$/, "")),
  );
  const merged: SearchResult[] = [...searxngResults];

  for (const r of [...braveResults, ...serperResults]) {
    const key = r.url.toLowerCase().replace(/\/$/, "");
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }

  return merged.slice(0, count);
}
