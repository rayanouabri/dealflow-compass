// Générateur de requêtes de sourcing biaisées France/Francophone
// Utilise new Date().getFullYear() — jamais d'année hardcodée

export interface QueryGroup {
  category: string;
  queries: string[];
}

export function buildFrenchBiasedQueries(
  sectors: string[],
  stage: string,
  geography: string,
): QueryGroup[] {
  const year = new Date().getFullYear();
  const sectorStr = sectors.length > 0 ? sectors.join(" OR ") : "deeptech startup";
  const isGlobalGeo = /global|monde|world|us|usa/i.test(geography);

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

    // 7. Presse tech FR
    {
      category: "presse_fr",
      queries: [
        `site:maddyness.com ${sectorStr} ${year}`,
        `site:frenchweb.fr ${sectorStr} startup ${year}`,
        `site:journaldunet.com ${sectorStr} startup levée ${year}`,
        `site:usine-digitale.fr ${sectorStr} startup ${year}`,
        `site:lesechos.fr ${sectorStr} startup ${stage} ${year}`,
      ],
    },

    // 8. Brevets FR
    {
      category: "brevets_fr",
      queries: [
        `site:inpi.fr brevet ${sectorStr} ${year}`,
        `site:epo.org patent ${sectorStr} France ${year}`,
        `"brevet français" OR "brevet INPI" ${sectorStr} startup ${year}`,
      ],
    },
  ];

  // 9. Global outliers (si géographie non exclusivement FR)
  if (isGlobalGeo || !geography || !/fr|france/i.test(geography)) {
    groups.push({
      category: "global_outliers",
      queries: [
        `site:ycombinator.com ${sectorStr} ${year}`,
        `site:techstars.com ${sectorStr} ${year}`,
        `site:producthunt.com ${sectorStr} ${year}`,
        `"YC" OR "Y Combinator" ${sectorStr} France OR French ${year}`,
      ],
    });
  }

  return groups;
}
