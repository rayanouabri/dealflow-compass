// Listicle/aggregator mining : les pages de bases de données startups (F6S,
// Seedtable, EU-Startups, Dealroom...) sont des LISTES de vraies startups
// finançables. Le pipeline les jetait (DIRECTORY_HOSTS). Ici on les EXPLOITE :
// on récupère le texte de la page et on en extrait les noms d'entreprises via
// un seul appel IA, filtrés sur la thèse. Source de candidats de haute qualité.

import { callAI } from "./ai-client.ts";
import { logger } from "./logger.ts";
import { oxylabsFetchPageText } from "./oxylabs-client.ts";
import type { SearchResult } from "./search-client.ts";
import type { SourcingCandidate } from "./dedup-ranker.ts";

// Domaines qui curent de vraies startups (à miner, pas à jeter).
const MINEABLE_HOSTS = [
  "f6s.com",
  "seedtable.com",
  "ai-startups.pro",
  "eu-startups.com",
  "growthlist.co",
  "dealroom.co",
  "sifted.eu",
  "tracxn.com",
  "startuphub.ai",
  "failory.com",
  "wellfound.com",
  "maddyness.com",
];

function mineableHost(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const hit = MINEABLE_HOSTS.find((d) => host === d || host.endsWith("." + d));
    return hit ? host : null;
  } catch {
    return null;
  }
}

export async function mineListicles(
  webResults: SearchResult[],
  thesis: any,
  opts: { maxPages?: number } = {},
): Promise<SourcingCandidate[]> {
  const maxPages = opts.maxPages ?? 3;

  // Une page par hôte agrégateur, dans l'ordre de pertinence du SERP.
  const seenHosts = new Set<string>();
  const urls: string[] = [];
  for (const r of webResults) {
    const host = mineableHost(r.url);
    if (!host || seenHosts.has(host)) continue;
    seenHosts.add(host);
    urls.push(r.url);
    if (urls.length >= maxPages) break;
  }
  if (urls.length === 0) return [];

  const pages = await Promise.all(
    urls.map(async (u) => ({ url: u, text: await oxylabsFetchPageText(u, 10000) })),
  );
  const usable = pages.filter((p) => p.text.length > 300);
  if (usable.length === 0) return [];

  const icp = thesis?.idealCompanyProfile ?? {};
  const systemPrompt =
    `Tu es analyste VC. On te donne le TEXTE BRUT de pages web qui listent des startups. ` +
    `Extrais les VRAIES startups/scale-ups nommées (entreprises autonomes finançables en equity). ` +
    `EXCLURE : investisseurs/VC, agrégateurs, médias, catégories, grands groupes cotés. ` +
    `Ne garde que celles cohérentes avec le profil cible.

Profil cible : ${JSON.stringify({
      sectors: thesis?.sectors,
      definition: icp.definition,
      mustHave: icp.mustHaveKeywords,
      exclusion: icp.exclusionKeywords,
    })}

Réponds UNIQUEMENT en JSON :
{"companies":[{"name":"<nom commercial>","description":"<1 phrase>","relevance":<0-100>}]}
Maximum 25 entreprises, les plus pertinentes d'abord.`;

  const userPrompt = usable
    .map((p, i) => `=== Page ${i + 1} (${p.url}) ===\n${p.text}`)
    .join("\n\n")
    .slice(0, 24000);

  try {
    const res = (await Promise.race([
      callAI(systemPrompt, userPrompt, { temperature: 0.1, maxTokens: 4096 }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("mineListicles AI timeout")), 22000)
      ),
    ])) as any;

    const companies = res?.companies;
    if (!Array.isArray(companies)) return [];

    const currentYear = new Date().getFullYear();
    const out: SourcingCandidate[] = [];
    for (const c of companies) {
      if (!c?.name || typeof c.name !== "string") continue;
      const name = c.name.trim().slice(0, 80);
      if (name.length < 2) continue;
      const relevance = typeof c.relevance === "number" ? c.relevance : 60;
      const candidate = {
        name,
        url: "",
        descriptions: c.description ? [String(c.description).slice(0, 250)] : [],
        mentionCount: 1,
        categories: new Set<string>(["web_curated"]),
        sources: ["oxylabs"],
        // Base 30 + bonus pertinence (jusqu'à +20) → 30-50, au-dessus des
        // coquilles registre (≈25) mais sous les candidats multi-signaux.
        score: 30 + Math.min(20, Math.round(relevance / 5)),
        recencyScore: 7,
        signalYear: currentYear,
        crossSignalBonus: 0,
      } as SourcingCandidate;
      (candidate as any).aiRelevance = relevance;
      out.push(candidate);
    }

    logger.info("listicle mining", {
      pages: usable.length,
      extracted: out.length,
    });
    return out;
  } catch (err) {
    logger.warn("listicle mining échoué", { error: String(err) });
    return [];
  }
}

// Fusionne les candidats minés dans la liste rankée, en dédupliquant par nom
// normalisé (évite les doublons avec les entrées INSEE/web existantes).
export function mergeMinedCandidates(
  ranked: SourcingCandidate[],
  mined: SourcingCandidate[],
): SourcingCandidate[] {
  if (mined.length === 0) return ranked;
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
  const existing = new Map<string, SourcingCandidate>();
  for (const c of ranked) existing.set(norm(c.name), c);

  const fresh: SourcingCandidate[] = [];
  for (const m of mined) {
    const key = norm(m.name);
    const hit = existing.get(key);
    if (hit) {
      // Corrobore un candidat existant : ajoute le signal web_curated.
      hit.categories.add("web_curated");
      if (m.descriptions[0] && !hit.descriptions.includes(m.descriptions[0])) {
        hit.descriptions.push(m.descriptions[0]);
      }
      hit.score += 8;
    } else {
      existing.set(key, m);
      fresh.push(m);
    }
  }
  // Minés en tête (haute qualité), puis le reste trié par score.
  return [...fresh, ...ranked].sort((a, b) => b.score - a.score);
}
