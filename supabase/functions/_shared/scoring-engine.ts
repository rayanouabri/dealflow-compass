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

// Poids rééquilibrés vers les FONDAMENTAUX VC. Avant, signalDiversity +
// sourceCorroboration pesaient 0.20 (= proxys de visibilité/notoriété : "à quel
// point c'est trouvable", pas "à quel point c'est un bon deal"). On les réduit et
// on muscle équipe / moat-produit / marché. thesisFit reste l'ancre de pertinence
// (filtre stade/secteur) sans écraser la qualité d'investissement.
export const DEFAULT_WEIGHTS: ScoringWeights = {
  thesisFit: 0.32,             // adéquation thèse (stade/secteur/géo/ICP) — pertinence
  teamQuality: 0.18,           // équipe complémentaire (tech + business) + exécution
  competitivePosition: 0.16,   // produit innovant + MOAT réel
  timing: 0.13,                // marché porteur + why now
  frenchEcosystem: 0.10,       // ancrage géo
  signalDiversity: 0.05,       // évidence (mineur)
  sourceCorroboration: 0.03,   // corroboration (mineur)
  recency: 0.03,               // fraîcheur
};

export function buildContextualWeights(geography: string): ScoringWeights {
  const isFrench = /france|french|paris|fr\b/i.test(geography);
  if (isFrench) return DEFAULT_WEIGHTS;
  // For non-French geographies, further boost thesisFit to compensate for weaker geographic signal
  return {
    thesisFit: 0.35,
    teamQuality: 0.20,
    competitivePosition: 0.18,
    timing: 0.14,
    frenchEcosystem: 0,
    signalDiversity: 0.05,
    sourceCorroboration: 0.03,
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

  return `Tu es un analyste VC senior. Évalue STRICTEMENT cette startup par rapport à la thèse du fonds.
⚠️ IMPORTANT : Un score thesisFit faible (< 40) si la startup ne matche PAS directement les critères clés (secteur, stage, géographie).

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
Réponds UNIQUEMENT en JSON valide. IMPORTANT : thesisFit DOIT être bas (20-40) si la startup ne matche pas clairement les secteurs/stage clés.
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

## Ce que mesure chaque dimension (juge comme un VC, pas comme un annuaire)
- thesisFit : adéquation à la thèse (stade, secteur, géo, ICP) = filtre de pertinence.
- teamQuality : ÉQUIPE COMPLÉMENTAIRE (profil tech + profil business/go-to-market), track record des fondateurs, capacité à exécuter et recruter. Équipe mono-profil ou sans signal d'exécution = bas.
- competitivePosition : PRODUIT INNOVANT + MOAT RÉEL (IP/brevet, techno différenciante, effets de réseau, coût de switch, données propriétaires). "A un produit" ne suffit pas ; sans avantage défendable identifiable = bas.
- timing : MARCHÉ PORTEUR (taille, croissance) + why now (catalyseur réglementaire/techno/usage). Marché petit/stagnant ou sans catalyseur = bas.
- signalDiversity / sourceCorroboration / recency : qualité de la PREUVE disponible (mineur) — NE JAMAIS confondre avec la qualité du deal.

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
RÈGLE B2C CONSOMMATEUR : si le candidat vend un produit physique directement au consommateur final (montre connectée/smartwatch, bijou, vêtement, alimentaire, cosmétique, jeu, objet décoratif), mets thesisFit <= 10 pour tout fonds VC B2B/deeptech et ajoute redFlag "produit B2C hors-cible". Un produit santé destiné au grand public (step tracker, montre GPS, etc.) n'est PAS deeptech VC.
RÈGLE DEEPTECH vs LOGICIEL : si la thèse mentionne "deeptech", "sciences dures", "hardware", "matériaux", "photonique", "quantique", "biotech" OU que "idealCompanyProfile.businessModel" contient "hardware" — alors une entreprise dont le produit est EXCLUSIVEMENT du logiciel (SaaS cloud, infra AI, orchestrateur, marketplace, plateforme software) n'est PAS deeptech. Mets thesisFit <= 30 et redFlag "logiciel pur vs deeptech hardware".
RÈGLE FILIALE/PRODUIT : si l'URL du candidat est une SOUS-PAGE d'un autre site (pattern: autreentreprise.com/nom-candidat, ex: wso2.com/bijira, oracle.com/java, salesforce.com/products/...) — c'est un produit d'un grand groupe, pas une startup autonome. Mets thesisFit <= 10 et redFlag "produit filiale non-autonome".
RÈGLE PREUVE INSUFFISANTE (CRUCIAL) : si le SEUL signal d'un candidat est une immatriculation au registre (catégorie "insee" ou "insee_named", URL annuaire-entreprises/pappers/societe.com) SANS aucune description de produit, équipe, traction ou site web — c'est une coquille non vérifiable. On ne connaît que sa raison sociale et son code d'activité. Mets thesisFit <= 45 MÊME si le nom évoque le secteur (un nom n'est pas une preuve d'adéquation), teamQuality <= 20, competitivePosition <= 20, et ajoute redFlag "preuve insuffisante : simple immatriculation". Ne classe JAMAIS une coquille registre au-dessus d'une startup avec produit/traction décrits.
RÈGLE STADE / MATURITÉ (LA PLUS IMPORTANTE) : la thèse vise les stades "stage.min" à "stage.max" (voir la thèse ci-dessus). Un fonds early-stage cherche des PÉPITES PEU CONNUES correspondant à ce stade, PAS les stars déjà financées. Si un candidat est manifestement PLUS AVANCÉ que stage.max — licorne, entreprise cotée en bourse, valorisation > 1 Md€, levées cumulées très supérieures au ticket du stade visé (ex: > 100 M€ levés pour une thèse seed/serie-a/serie-b), OU nom mondialement connu du grand public (ex pour IA/deeptech FR : Mistral AI, Doctolib, BlaBlaCar, Dataiku, Contentsquare, Back Market) — alors il est HORS-CIBLE. Mets thesisFit <= 15, riskLevel "high", redFlag "hors-stade : trop avancé/trop financé pour ce fonds".
RÈGLE ANTI-NOTORIÉTÉ : la notoriété n'est JAMAIS un signal positif. Ne donne pas un thesisFit élevé à une entreprise simplement parce qu'elle est célèbre ou souvent citée. Une licorne ultra-connue pour une thèse early = MISMATCH, pas un top pick. Privilégie une startup discrète mais parfaitement au stade et au secteur visés plutôt qu'une référence du secteur déjà trop avancée.
DIFFÉRENCIE les candidats : les scores doivent refléter les écarts de preuves entre eux (traction publique, équipe identifiée, produit décrit, simple immatriculation...). Ne donne JAMAIS la même grille de scores à plusieurs candidats — départage-les.
OBJECTIF : le meilleur candidat est le plus PERTINENT POUR UN VC — équipe complémentaire + produit innovant à moat réel + marché porteur, AU stade/secteur visé. Ni la notoriété ni l'obscurité ne sont un critère : seule compte la qualité d'investissement. Un inconnu excellent (équipe + moat + marché) bat une star tangentielle ; mais un inconnu sans équipe/moat/marché identifiables n'est pas un bon pick pour autant — sois exigeant sur les 3 fondamentaux.`;
}
