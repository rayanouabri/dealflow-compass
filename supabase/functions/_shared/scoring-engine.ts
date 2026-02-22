// Moteur de scoring multi-critères pour la sélection de startups VC
import type { SourcingCandidate } from "./dedup-ranker.ts";

export interface ScoringWeights {
  thesisFit: number;         // 0.30 — adéquation thèse
  signalDiversity: number;   // 0.15 — diversité des signaux
  sourceCorroboration: number; // 0.10 — corroboration multi-sources
  frenchEcosystem: number;   // 0.15 — bonus biais FR
  timing: number;            // 0.10 — "why now"
  teamQuality: number;       // 0.12 — qualité de l'équipe
  competitivePosition: number; // 0.08 — moat / différenciation
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  thesisFit: 0.30,
  signalDiversity: 0.15,
  sourceCorroboration: 0.10,
  frenchEcosystem: 0.15,
  timing: 0.10,
  teamQuality: 0.12,
  competitivePosition: 0.08,
};

export interface CriteriaScores {
  thesisFit: number;
  signalDiversity: number;
  sourceCorroboration: number;
  frenchEcosystem: number;
  timing: number;
  teamQuality: number;
  competitivePosition: number;
}

// Calcule le score pondéré (0-100)
export function computeWeightedScore(
  scores: CriteriaScores,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): number {
  let total = 0;
  for (const key of Object.keys(weights) as (keyof ScoringWeights)[]) {
    total += (scores[key] ?? 0) * weights[key];
  }
  return Math.round(total);
}

// Construit le prompt de scoring pour l'IA
export function buildScoringPrompt(
  candidate: SourcingCandidate,
  thesis: unknown,
): string {
  const descriptions = candidate.descriptions.slice(0, 5).join("\n");
  const categories = Array.from(candidate.categories).join(", ");

  return `Tu es un analyste VC senior. Évalue cette startup par rapport à la thèse du fonds ci-dessous.

## Thèse du fonds
${JSON.stringify(thesis, null, 2)}

## Startup candidate
- Nom : ${candidate.name}
- URL : ${candidate.url}
- Sources : ${candidate.sources.join(", ")}
- Catégories de signal : ${categories}
- Nombre de mentions : ${candidate.mentionCount}
- Descriptions :
${descriptions}

## Instructions
Réponds UNIQUEMENT en JSON valide avec ce schéma :
{
  "scores": {
    "thesisFit": <0-100>,
    "signalDiversity": <0-100>,
    "sourceCorroboration": <0-100>,
    "frenchEcosystem": <0-100>,
    "timing": <0-100>,
    "teamQuality": <0-100>,
    "competitivePosition": <0-100>
  },
  "redFlags": ["<flag1>", ...],
  "whyNow": "<explication courte>",
  "whyThisStartup": "<3 raisons clés>",
  "comparables": ["<comparable1>", ...],
  "riskLevel": "low" | "medium" | "high"
}

Sois strict, sceptique, et basé sur les données disponibles.`;
}
