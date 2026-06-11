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
    `(recherche web, registre d'entreprises, GitHub, Hacker News).

Tâche : identifier les candidats qui sont de VRAIES STARTUPS ou SCALE-UPS susceptibles d'être ` +
    `financées en equity par un fonds de venture capital, selon le profil cible ci-dessous. ` +
    `Normaliser leur nom commercial. Si deux entrées désignent la même société, n'en garder qu'une.

Profil cible : ${JSON.stringify({
      definition: icp.definition,
      businessModel: icp.businessModel,
      mustHave: icp.mustHaveKeywords,
      exclusion: icp.exclusionKeywords,
    })}

RÈGLE isCompany=false (exclure) :
- Comptes/personnes GitHub, dépôts open-source sans société derrière
- Laboratoires/universités, institutions académiques
- Programmes de formation (masters, MS, MBA, bootcamps)
- Réseaux institutionnels (SATT, incubateurs, pôles de compétitivité, agences publiques)
- Pages d'articles, classements, agrégateurs, annuaires
- Grandes entreprises cotées en bourse ou avec >500 employés — trop matures pour le VC early
- Sous-pages de grands groupes : si l'URL suit le pattern autreentreprise.com/nom-candidat (ex: wso2.com/bijira, microsoft.com/azure, sap.com/products/...), c'est une FONCTIONNALITÉ ou filiale, pas une startup autonome → isCompany: false

RÈGLE relevance (crucial) :
- relevance 70-100 : startup/scale-up avec technologie propre clairement dans le profil cible
- relevance 40-69 : entreprise plausiblement on-thesis mais peu de signal qualité ou signal ambigu
- relevance 10-39 : entreprise réelle mais secteur ou modèle différent du profil cible
- relevance 0-9 : marque grand public, enseigne retail/luxe/bijouterie/mode/restauration/e-commerce B2C — MÊME si elles utilisent de la technologie, elles ne sont PAS des startups VC deeptech

Réponds UNIQUEMENT en JSON :
{"entities":[{"idx":<index d'origine fourni>,"name":"<nom commercial propre>","isCompany":<true|false>,"relevance":<0-100>,"reason":"<raison courte>"}]}
Inclus TOUS les candidats dans ta réponse (même ceux avec isCompany:false).`;

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
      maxTokens: 3072,
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

    // Priorise la pertinence IA, puis le score de signal
    kept.sort(
      (a, b) =>
        ((b as any).aiRelevance ?? 0) - ((a as any).aiRelevance ?? 0) ||
        b.score - a.score,
    );

    // Garde-fou primaire : si moins de 3 vraies entreprises identifiées, on garde
    // les candidats bruts — le cleanup a été trop agressif.
    if (kept.length < 3) return candidates;

    // Filtre par pertinence minimale : ne garder que les candidats avec relevance >= 30
    // (une marque B2C/retail/luxury score typiquement 0-15 sur un profil deeptech VC).
    // Garde-fou secondaire : si moins de 3 candidats passent le seuil, on prend
    // les top 6 sans seuil — mieux avoir des candidats imparfaits que rien.
    const RELEVANCE_MIN = 30;
    const highRelevance = kept.filter(
      (c) => ((c as any).aiRelevance ?? 0) >= RELEVANCE_MIN,
    );
    const finalKept = highRelevance.length >= 3 ? highRelevance : kept.slice(0, 6);

    // Les candidats non analysés (au-delà de `limit`) restent en fin de liste
    const tail = candidates.slice(limit);
    logger.info("entity cleanup", {
      analyzed: subset.length,
      kept: finalKept.length,
      dropped: subset.length - finalKept.length,
      belowThreshold: kept.length - highRelevance.length,
    });
    return [...finalKept, ...tail];
  } catch (err) {
    logger.warn("entity cleanup échoué — candidats bruts conservés", {
      error: String(err),
    });
    return candidates;
  }
}
