// Weak signal query generators for early-stage startup detection
// All queries use site: operators or platform-specific patterns compatible
// with Serper/Brave (no direct API access needed).

export type WeakSignalCategory =
  | "github"
  | "producthunt"
  | "wellfound"
  | "job_board"
  | "arxiv_hal"
  | "pappers"
  | "conference"
  | "show_hn";

export interface WeakSignalQueryGroup {
  category: WeakSignalCategory;
  weight: number;
  queries: string[];
  resultsPerQuery: number;
}

export function buildWeakSignalQueries(
  sector: string,
  geography: string,
  year: number = new Date().getFullYear(),
): WeakSignalQueryGroup[] {
  const isFrance = /france|french|paris/i.test(geography);

  return [
    // 1. GitHub activity
    {
      category: "github",
      weight: 4,
      resultsPerQuery: 5,
      queries: [
        `site:github.com ${sector} "new organization" OR "founded" ${year}`,
        `site:github.com ${sector} startup repository "pre-seed" OR "seed" ${year}`,
        `github.com ${sector} "ex-Google" OR "ex-Meta" OR "ex-DeepMind" founder ${year}`,
        `site:github.com/orgs ${sector} ${isFrance ? "France Paris" : geography} ${year}`,
      ],
    },

    // 2. ProductHunt
    {
      category: "producthunt",
      weight: 3,
      resultsPerQuery: 5,
      queries: [
        `site:producthunt.com ${sector} ${year} "just launched" OR "new product"`,
        `site:producthunt.com ${sector} ${geography} maker ${year}`,
        `producthunt.com/posts ${sector} "day 1" OR "launched today" ${year}`,
      ],
    },

    // 3. Wellfound/AngelList
    {
      category: "wellfound",
      weight: 3,
      resultsPerQuery: 5,
      queries: [
        `site:wellfound.com ${sector} ${geography} "seed" OR "pre-seed" ${year}`,
        `site:angel.co/company ${sector} ${geography} founded:${year}`,
        `wellfound.com startup ${sector} ${geography} "raising" OR "fundraising" ${year}`,
      ],
    },

    // 4. Job board first postings
    {
      category: "job_board",
      weight: 2,
      resultsPerQuery: 5,
      queries: isFrance
        ? [
            `site:welcometothejungle.com ${sector} startup "1 offre" OR "2 offres" ${year}`,
            `site:lever.co ${sector} ${geography} "hiring" "engineer" ${year}`,
            `welcometothejungle ${sector} startup Paris "première embauche" OR "premier recrutement" ${year}`,
            `site:otta.com ${sector} startup ${year} "small team" OR "early team"`,
          ]
        : [
            `site:lever.co ${sector} startup ${geography} "engineer" ${year}`,
            `site:greenhouse.io ${sector} startup ${geography} hiring ${year}`,
            `site:otta.com ${sector} startup ${geography} "small team" ${year}`,
            `site:workable.com ${sector} startup ${geography} hiring engineer ${year}`,
          ],
    },

    // 5. arXiv/HAL
    {
      category: "arxiv_hal",
      weight: 4,
      resultsPerQuery: 5,
      queries: isFrance
        ? [
            `site:hal.science ${sector} "spin-off" OR "startup" OR "entreprise" ${year}`,
            `site:arxiv.org ${sector} "startup" OR "company" author France ${year}`,
            `hal.science thèse ${sector} "application industrielle" OR "création d'entreprise" ${year}`,
            `arxiv.org ${sector} "we propose" "company" France ${year}`,
          ]
        : [
            `site:arxiv.org ${sector} "startup" OR "company" author ${geography} ${year}`,
            `arxiv.org ${sector} "we present" "product" OR "company" ${geography} ${year}`,
          ],
    },

    // 6. Pappers / KBIS
    {
      category: "pappers",
      weight: 3,
      resultsPerQuery: 5,
      queries: isFrance
        ? [
            `site:pappers.fr ${sector} "créée en ${year}" OR "immatriculée en ${year}"`,
            `pappers.fr société ${sector} ${year} "capital initial" "Île-de-France" OR "Paris"`,
            `infogreffe.fr ${sector} startup ${year} immatriculation`,
            `societe.com ${sector} ${year} "date de création"`,
          ]
        : [
            `site:find-and-update.company-information.service.gov.uk ${sector} ${year} "incorporated"`,
            `companieshouse.gov.uk ${sector} startup ${year} "date of incorporation"`,
          ],
    },

    // 7. Conference speakers
    {
      category: "conference",
      weight: 2,
      resultsPerQuery: 5,
      queries: [
        `"VivaTech" ${year} speaker ${sector} startup founder`,
        `"Web Summit" ${year} speaker ${sector} startup ${geography}`,
        `"NeurIPS" OR "ICML" OR "ICLR" ${year} ${sector} "startup" founder ${geography}`,
        `"Slush" OR "Hello Tomorrow" ${year} ${sector} startup pitch winner`,
        isFrance
          ? `"Big Data Paris" OR "Paris AI" ${year} speaker startup ${sector}`
          : `"TechCrunch Disrupt" ${year} ${sector} startup speaker ${geography}`,
      ],
    },

    // 8. Show HN
    {
      category: "show_hn",
      weight: 3,
      resultsPerQuery: 5,
      queries: [
        `site:news.ycombinator.com "Show HN" ${sector} ${year}`,
        `"Show HN" ${sector} startup ${geography} ${year} site:ycombinator.com`,
        `hacker news "Show HN" ${sector} "I built" ${year}`,
        `site:news.ycombinator.com "Ask HN: Who wants to hire" ${sector} ${year}`,
      ],
    },
  ];
}

export function filterByStage(
  groups: WeakSignalQueryGroup[],
  stage: string,
): WeakSignalQueryGroup[] {
  const isVeryEarly = /pre-?seed|amorçage/i.test(stage);
  const isEarly = /seed|early/i.test(stage);

  if (isVeryEarly) {
    return groups;
  }
  if (isEarly) {
    return groups.filter(g => g.category !== "pappers");
  }
  return groups.filter(g =>
    ["conference", "producthunt", "wellfound"].includes(g.category)
  );
}
