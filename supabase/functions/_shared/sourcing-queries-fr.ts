// Générateur de requêtes de sourcing biaisées France/Francophone
// Utilise new Date().getFullYear() — jamais d'année hardcodée

export interface QueryGroup {
  category: string;
  queries: string[];
}

export interface PrecisionOptions {
  // Termes produit/techno précis (techKeywords + mustHaveKeywords de l'ICP)
  precisionTerms?: string[];
  // Types d'acteurs à exclure du sourcing (exclusionKeywords de l'ICP)
  exclusionTerms?: string[];
}

export function buildFrenchBiasedQueries(
  sectors: string[],
  stage: string,
  geography: string,
  opts: PrecisionOptions = {},
): QueryGroup[] {
  const year = new Date().getFullYear();
  const sectorStr = sectors.length > 0 ? sectors.join(" OR ") : "deeptech startup";
  const isGlobalGeo = /global|monde|world|us|usa/i.test(geography);

  // Termes précis (type d'entreprise) et opérateurs d'exclusion
  const precisionTerms = (opts.precisionTerms ?? []).filter(Boolean).slice(0, 6);
  const precisionStr = precisionTerms.length > 0
    ? precisionTerms.map((t) => `"${t}"`).join(" OR ")
    : "";
  // Opérateurs d'exclusion appliqués aux requêtes web larges (pas aux site: officiels)
  const negStr = (opts.exclusionTerms ?? [])
    .filter(Boolean)
    .slice(0, 6)
    .map((t) => `-"${t}"`)
    .join(" ");

  const groups: QueryGroup[] = [
    // 1. Écosystème French Tech
    {
      category: "french_tech",
      queries: [
        `site:lafrenchtech.com ${sectorStr} ${year}`,
        `next40 OR ft120 ${sectorStr} startup ${year}`,
        `"french tech" ${sectorStr} "série A" OR "seed" OR "levée de fonds" ${year}`,
        `"communauté french tech" ${sectorStr} ${year}`,
      ],
    },

    // 2. Bpifrance & subventions
    {
      category: "bpifrance",
      queries: [
        `site:bpifrance.fr ${sectorStr} ${year}`,
        `"i-Nov" OR "i-Lab" ${sectorStr} lauréat ${year}`,
        `"French Tech Seed" ${sectorStr} ${year}`,
        `"France 2030" OR "PIA" ${sectorStr} startup ${year}`,
        `bpifrance financement "${sectorStr}" ${year}`,
      ],
    },

    // 3. Incubateurs & accélérateurs FR
    {
      category: "incubateurs_fr",
      queries: [
        `"Station F" ${sectorStr} startup ${year}`,
        `"Agoranov" ${sectorStr} startup ${year}`,
        `"WILCO" OR "Euratechnologies" ${sectorStr} startup ${year}`,
        `"SATT" OR "LINKSIUM" OR "Toulouse Tech Transfer" ${sectorStr} ${year}`,
        `"Paris&Co" OR "Schoolab" ${sectorStr} startup ${year}`,
      ],
    },

    // 4. Universités & Laboratoires
    {
      category: "universites_labs",
      queries: [
        `"CNRS" OR "CEA" OR "INRIA" ${sectorStr} startup spinoff ${year}`,
        `"Polytechnique" OR "ENS" OR "CentraleSupélec" ${sectorStr} startup fondateur ${year}`,
        `"thèse CIFRE" ${sectorStr} startup ${year}`,
        `"spin-off" OR "deeptech" université France ${sectorStr} ${year}`,
        `INRIA startup incubation ${sectorStr} ${year}`,
      ],
    },

    // 5. Grants EU
    {
      category: "eu_grants",
      queries: [
        `"EIC Accelerator" ${sectorStr} France ${year}`,
        `"Horizon Europe" ${sectorStr} France startup ${year}`,
        `"EIT" OR "EIC" ${sectorStr} France laureate ${year}`,
        `"SME Instrument" OR "Pathfinder" ${sectorStr} France ${year}`,
      ],
    },

    // 6. Signaux LinkedIn & Talent
    {
      category: "talent_signals",
      queries: [
        `site:linkedin.com/company ${sectorStr} Paris "hiring" OR "recrutement" ${year}`,
        `"co-founders" OR "cofondateurs" ${sectorStr} France ${year}`,
        `"alumni X" OR "alumni HEC" OR "alumni Polytechnique" startup ${sectorStr} ${year}`,
        `"Head of" OR "VP Engineering" OR "CTO" ${sectorStr} startup Paris ${year}`,
      ],
    },

    // 7. Brevets FR
    {
      category: "brevets_fr",
      queries: [
        `site:inpi.fr brevet ${sectorStr} ${year}`,
        `site:epo.org patent ${sectorStr} France ${year}`,
        `"brevet français" OR "brevet INPI" ${sectorStr} startup ${year}`,
      ],
    },
  ];

  // 9. Signaux early-stage (seed / pre-seed)
  const isEarly = /seed|pre.?seed|amorçage|early/i.test(stage);
  if (isEarly) {
    groups.push({
      category: "early_signals",
      queries: [
        `"concours i-Lab" OR "concours i-Nov" ${sectorStr} lauréat ${year}`,
        `"French Tech Seed" OR "French Tech Tremplin" ${sectorStr} ${year}`,
        `"thèse CIFRE" ${sectorStr} startup fondateur ${year}`,
        `"EIC Pathfinder" OR "ERC Starting Grant" ${sectorStr} France ${year}`,
        `"résidence startup" OR "programme incubation" ${sectorStr} ${year}`,
        `"premier recrutement" OR "cofondateur technique" ${sectorStr} startup ${year}`,
        `"hackathon" OR "concours innovation" ${sectorStr} startup gagnant ${year}`,
        `"PhD founder" OR "chercheur fondateur" ${sectorStr} France ${year}`,
      ],
    });
  }

  // 10. Global outliers (si géographie non exclusivement FR)
  // Note : ProductHunt/YC/HN sont couverts par les connecteurs structurés
  // (hn-algolia, github) — inutile de les requêter via le web ici.
  if (isGlobalGeo || !geography || !/fr|france/i.test(geography)) {
    groups.push({
      category: "global_outliers",
      queries: [
        `${sectorStr} startup "raised seed" OR "pre-seed round" ${year}`,
        `${sectorStr} startup "we are building" OR "launching" founder ${year}`,
      ],
    });
  }

  // 0. Requêtes haute précision sur le TYPE d'entreprise (ICP)
  // Placées en tête pour prioriser les candidats strictement on-thesis.
  if (precisionStr) {
    const geoTerm = isGlobalGeo ? geography : "France OR Paris";
    groups.unshift({
      category: "icp_precision",
      queries: [
        `${precisionStr} startup ${geoTerm} ${year} ${negStr}`.trim(),
        `${precisionStr} (${sectorStr}) startup "${stage}" ${year} ${negStr}`.trim(),
        `${precisionStr} startup "levée de fonds" OR "seed" France ${year} ${negStr}`.trim(),
        `site:linkedin.com/company ${precisionStr} startup ${geoTerm} ${year}`,
      ],
    });
  }

  // Applique les exclusions aux requêtes web larges (réduit le bruit sans coût)
  if (negStr) {
    const noisyCategories = new Set([
      "french_tech",
      "talent_signals",
      "presse_fr",
      "global_outliers",
    ]);
    for (const g of groups) {
      if (noisyCategories.has(g.category)) {
        g.queries = g.queries.map((q) =>
          q.includes("site:") ? q : `${q} ${negStr}`.trim()
        );
      }
    }
  }

  return groups;
}
