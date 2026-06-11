// Moteur de scoring multi-critères pour la sélection de startups VC
import type { SourcingCandidate } from "./dedup-ranker.ts";

export interface ScoringWeights {
  thesisFit: number;         // 0.30 — adéquation thèse
  signalDiversity: number;   // 0.15 — diversité des signaux
  sourceCorroboration: number; // 0.10 — corroboration multi-sources
  frenchEcosystem: number;   // 0.13 — bonus biais FR
  timing: number;            // 0.10 — "why now"
  teamQuality: number;       // 0.12 — qualité de l'équipe
  competitivePosition: number; // 0.07 — moat / différenciation
  recency: number;           // 0.05 — fraîcheur des signaux
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  thesisFit: 0.30,
  signalDiversity: 0.15,
  sourceCorroboration: 0.10,
  frenchEcosystem: 0.13,
  timing: 0.10,
  teamQuality: 0.12,
  competitivePosition: 0.07,
  recency: 0.05,
};

export function buildContextualWeights(geography: string): ScoringWeights {
  const isFrench = /france|french|paris|fr\b/i.test(geography);
  if (isFrench) return DEFAULT_WEIGHTS;
  // For non-French geographies, redistribute frenchEcosystem bonus to thesisFit and teamQuality
  return {
    thesisFit: 0.40,
    signalDiversity: 0.15,
    sourceCorroboration: 0.10,
    frenchEcosystem: 0,
    timing: 0.10,
    teamQuality: 0.17,
    competitivePosition: 0.07,
    recency: 0.05,
  };
}

export interface CriteriaScores {
  thesisFit: number;
  signalDiversity: number;
  sourceCorroboration: number;
  frenchEcosystem: number;
  timing: number;
  teamQuality: number;
  competitivePosition: number;
  recency: number;
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
  const signalTypesCount = candidate.categories.size;
  const signalSummary = signalTypesCount >= 3 ? `⚡ CROSS-SIGNAL CORROBORATION: ${signalTypesCount} types de signaux détectés` : `Signal type: ${categories || "standard"}`;

  return `Tu es un analyste VC senior. Évalue cette startup par rapport à la thèse du fonds ci-dessous.

## Thèse du fonds
${JSON.stringify(thesis, null, 2)}

## Startup candidate
- Nom : ${candidate.name}
- URL : ${candidate.url}
- Sources : ${candidate.sources.join(", ")}
- Catégories de signal : ${categories}
- Nombre de mentions : ${candidate.mentionCount}
- Année signal le plus récent : ${candidate.signalYear || "inconnue"}
- Bonus corroboration croisée : ${candidate.crossSignalBonus > 0 ? `+${candidate.crossSignalBonus}` : "0"}
- ${signalSummary}
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
    "competitivePosition": <0-100>,
    "recency": <0-100>
  },
  "weakSignalSummary": "<résumé des signaux faibles détectés>",
  "redFlags": ["<flag1>", ...],
  "whyNow": "<explication courte>",
  "whyThisStartup": "<3 raisons clés>",
  "comparables": ["<comparable1>", ...],
  "riskLevel": "low" | "medium" | "high"
}

Sois strict, sceptique, et basé sur les données disponibles. Utilise la dimension "recency" pour évaluer la fraîcheur et l'actualité des signaux détectés.

IMPORTANT — adéquation au profil : si la startup correspond à un "exclusionKeywords" de la thèse (agence, ESN, conseil, holding, fonds, média, distributeur...) ou ne correspond PAS à "idealCompanyProfile.definition", mets "thesisFit" <= 20 et ajoute un redFlag "hors-profil". Ne récompense un thesisFit élevé que si l'entreprise matche le type d'entreprise visé.`;
}

// Variante BATCHÉE : score N candidats en UN SEUL appel IA (économise le quota).
// Retour attendu : { "rankings": [ { "index": <i>, "scores": {...}, ... } ] }
export function buildBatchScoringPrompt(
  candidates: SourcingCandidate[],
  thesis: unknown,
): string {
  const list = candidates
    .map((c, i) => {
      const cats = Array.from(c.categories).join(", ") || "standard";
      const desc = c.descriptions.slice(0, 3).join(" | ").slice(0, 300);
      return `### [${i}] ${c.name}
- URL : ${c.url}
- Sources : ${c.sources.join(", ")}
- Signaux : ${cats} (mentions: ${c.mentionCount}, année: ${c.signalYear || "?"})
- Descriptions : ${desc}`;
    })
    .join("\n\n");

  return `Tu es un analyste VC senior. Évalue CHAQUE startup ci-dessous par rapport à la thèse du fonds, en un seul passage.

## Thèse du fonds
${JSON.stringify(thesis, null, 2)}

## Candidats (${candidates.length})
${list}

## Instructions
Réponds UNIQUEMENT en JSON valide :
{
  "rankings": [
    {
      "index": <numéro entre crochets du candidat>,
      "scores": {
        "thesisFit": <0-100>, "signalDiversity": <0-100>, "sourceCorroboration": <0-100>,
        "frenchEcosystem": <0-100>, "timing": <0-100>, "teamQuality": <0-100>,
        "competitivePosition": <0-100>, "recency": <0-100>
      },
      "redFlags": ["<flag>", ...],
      "whyNow": "<court>",
      "whyThisStartup": "<3 raisons clés>",
      "comparables": ["<comparable>", ...],
      "riskLevel": "low" | "medium" | "high"
    }
  ]
}
Inclus TOUS les candidats. Sois strict et sceptique.
RÈGLE STRICTE : si un candidat matche un "exclusionKeywords" (agence, ESN, conseil, holding, fonds, média, distributeur) ou ne correspond PAS à "idealCompanyProfile.definition", "thesisFit" <= 20 + redFlag "hors-profil". Récompense un thesisFit élevé seulement si le type d'entreprise correspond vraiment.
RÈGLE ANTI-BRUIT : si le "candidat" n'est manifestement PAS une entreprise commerciale unique (titre d'article de presse, programme/accélérateur, réseau, alliance, organisme public, page de rubrique), mets thesisFit <= 5, riskLevel "high" et redFlag "pas une entreprise". Un nom qui ressemble à un fragment de titre ("Two X-backed companies...", "Startups") est du bruit.
RÈGLE STADE : si la thèse indique stage.min >= "serie-a" et que le candidat est manifestement en phase seed/pré-seed (premier tour, <5 employés, "out of stealth", "just launched"), penalise thesisFit de 30 pts et ajoute redFlag "stade trop précoce".
RÈGLE DEEPTECH vs LOGICIEL : si la thèse mentionne "deeptech", "sciences dures", "hardware", "matériaux", "photonique", "quantique", "biotech" OU que "idealCompanyProfile.businessModel" contient "hardware" — alors une entreprise dont le produit est EXCLUSIVEMENT du logiciel (SaaS cloud, infra AI, orchestrateur, marketplace, plateforme software) n'est PAS deeptech. Mets thesisFit <= 30 et redFlag "logiciel pur vs deeptech hardware".
DIFFÉRENCIE les candidats : les scores doivent refléter les écarts de preuves entre eux (traction publique, équipe identifiée, produit décrit, simple immatriculation...). Ne donne JAMAIS la même grille de scores à plusieurs candidats — départage-les.`;
}
