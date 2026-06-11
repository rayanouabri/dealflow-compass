// Connecteur GitHub Search API — gratuit. Sans token : 10 req/min (suffisant).
// Avec GITHUB_TOKEN (optionnel) : 30 req/min. Détecte repos/orgs récents = signal produit.
// Doc: https://docs.github.com/rest/search/search#search-repositories

import { logger } from "./logger.ts";
import type { SearchResult } from "./search-client.ts";

const GH_BASE = "https://api.github.com/search/repositories";

export interface GitHubOrg {
  owner: string;
  ownerUrl: string;
  repo: string;
  description: string;
  stars: number;
  createdAt: string;
}

interface GitHubQueryOptions {
  terms?: string[];
  sinceDays?: number;
  minStars?: number;
  maxResults?: number;
}

// Recherche les repos récents (proxy de startups en construction).
export async function searchGitHub(
  opts: GitHubQueryOptions = {},
): Promise<GitHubOrg[]> {
  const terms = (opts.terms ?? []).filter(Boolean).slice(0, 3);
  if (terms.length === 0) terms.push("AI");
  const sinceDays = opts.sinceDays ?? 365;
  const minStars = opts.minStars ?? 10;
  const maxResults = opts.maxResults ?? 20;
  const since = new Date(Date.now() - sinceDays * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const token = Deno.env.get("GITHUB_TOKEN");
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "dealflow-compass",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const seen = new Set<string>();
  const out: GitHubOrg[] = [];
  const perTerm = Math.ceil(maxResults / terms.length);

  for (const term of terms) {
    const q = `${term} created:>${since} stars:>=${minStars}`;
    const url = `${GH_BASE}?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${perTerm}`;
    try {
      const resp = await fetch(url, { headers });
      if (resp.status === 403) {
        logger.warn("GitHub rate limit", { term });
        break; // inutile d'insister sans token
      }
      if (!resp.ok) {
        logger.warn("GitHub erreur", { status: resp.status, term });
        continue;
      }
      const data = await resp.json();
      for (const item of data.items ?? []) {
        const owner = item.owner?.login;
        if (!owner || seen.has(owner)) continue;
        // Comptes personnels = projets perso/hobby, pas des startups. Les
        // vraies sociétés publient sous une organisation GitHub.
        if (item.owner?.type !== "Organization") continue;
        // Écarte le bruit pédagogique (listes, cours, roadmaps) — pas des startups.
        const haystack = `${item.full_name ?? ""} ${item.description ?? ""}`;
        if (
          /awesome|interview|roadmap|tutorial|\bcourse\b|cheat.?sheet|study|\bnotes\b|\bbook\b|list-of|\bguide\b|examples?\b|learning/i
            .test(haystack)
        ) {
          continue;
        }
        seen.add(owner);
        out.push({
          owner,
          ownerUrl: item.owner?.html_url ?? `https://github.com/${owner}`,
          repo: item.name ?? "",
          description: item.description ?? "",
          stars: item.stargazers_count ?? 0,
          createdAt: item.created_at ?? "",
        });
      }
    } catch (err) {
      logger.warn("GitHub exception", { error: String(err), term });
    }
  }

  logger.info("GitHub Search", { found: out.length });
  return out;
}

export function githubToSearchResults(
  orgs: GitHubOrg[],
): (SearchResult & { category: string })[] {
  return orgs.map((o) => ({
    title: o.owner,
    // ownerUrl groupe les repos d'une même org sous un seul candidat
    url: o.ownerUrl,
    description: `GitHub ${o.owner}/${o.repo} (${o.stars}★, créé ${o.createdAt.slice(0, 10)}): ${o.description}`,
    extra_snippets: [],
    source: "github",
    category: "github",
  }));
}
