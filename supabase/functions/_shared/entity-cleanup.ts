// Couche de résolution d'entités : un appel IA qui nettoie les candidats bruts
// du sourcing (web + registre + GitHub + HN). Filtre le bruit (comptes perso,
// repos sans société, labos, articles), normalise les noms, note la pertinence.
// Robuste : retourne les candidats inchangés si l'IA échoue.

import { callAI } from "./ai-client.ts";
import { logger } from "./logger.ts";
import type { SourcingCandidate } from "./dedup-ranker.ts";

export async function resolveEntities(
  candidates: SourcingCandidate[],
  thesis: unknown,
  limit = 30,
): Promise<SourcingCandidate[]> {
  const subset = candidates.slice(0, limit);
  if (subset.length < 3) return candidates;

  const icp = (thesis as any)?.idealCompanyProfile ?? {};
  const systemPrompt =
    `Tu es analyste VC. On te donne des candidats issus d'un sourcing automatique ` +
    `(recherche web, registre d'entreprises, GitHub, Hacker News). Beaucoup sont du BRUIT : ` +
    `comptes GitHub personnels, dépôts open-source sans société, laboratoires/universités, ` +
    `pages d'articles ou de classements, agrégateurs, simples outils sans entreprise derrière.

Tâche : ne garder QUE les vraies entreprises/startups, normaliser leur nom commercial, ` +
    `et noter leur adéquation au profil cible. Si deux entrées désignent la même société, n'en garder qu'une.

Profil cible : ${JSON.stringify({
      definition: icp.definition,
      businessModel: icp.businessModel,
      mustHave: icp.mustHaveKeywords,
      exclusion: icp.exclusionKeywords,
    })}

Réponds UNIQUEMENT en JSON :
{"entities":[{"idx":<index d'origine fourni>,"name":"<nom commercial propre>","isCompany":<true|false>,"relevance":<0-100>,"reason":"<raison courte>"}]}
Mets isCompany:false (ou n'inclus pas) pour : comptes/personnes, repos sans société, labos, articles/listicles, agrégateurs.`;

  const userPrompt = `Candidats :\n${
    subset
      .map(
        (c, i) =>
          `[${i}] ${c.name} | ${c.url} | ${Array.from(c.categories).join(",")} | ${
            (c.descriptions[0] || "").slice(0, 120)
          }`,
      )
      .join("\n")
  }`;

  try {
    const res = (await callAI(systemPrompt, userPrompt, {
      temperature: 0.1,
      maxTokens: 2048,
    })) as any;
    const ents = res?.entities;
    if (!Array.isArray(ents) || ents.length === 0) return candidates;

    const kept: SourcingCandidate[] = [];
    const seenIdx = new Set<number>();
    for (const e of ents) {
      const idx = e?.idx;
      if (typeof idx !== "number" || idx < 0 || idx >= subset.length) continue;
      if (seenIdx.has(idx)) continue;
      if (e.isCompany === false) continue;
      seenIdx.add(idx);
      const c = subset[idx];
      if (typeof e.name === "string" && e.name.trim()) {
        c.name = e.name.trim().slice(0, 80);
      }
      (c as any).aiRelevance = typeof e.relevance === "number" ? e.relevance : 50;
      (c as any).aiReason = typeof e.reason === "string" ? e.reason : "";
      kept.push(c);
    }

    if (kept.length < 3) return candidates; // garde-fou : cleanup trop agressif

    // Priorise la pertinence IA, puis le score de signal
    kept.sort(
      (a, b) =>
        ((b as any).aiRelevance ?? 0) - ((a as any).aiRelevance ?? 0) ||
        b.score - a.score,
    );

    // Les candidats non analysés (au-delà de `limit`) restent en fin de liste
    const tail = candidates.slice(limit);
    logger.info("entity cleanup", {
      analyzed: subset.length,
      kept: kept.length,
      dropped: subset.length - kept.length,
    });
    return [...kept, ...tail];
  } catch (err) {
    logger.warn("entity cleanup échoué — candidats bruts conservés", {
      error: String(err),
    });
    return candidates;
  }
}
