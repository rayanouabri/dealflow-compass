// Advanced IP & Patent Signal Detection
// Covers: Google Patents, INPI, EPO, inventor networks, tech innovation signals

export type IPSignalType =
  | "patent_filed"
  | "patent_granted"
  | "patent_citation"
  | "trademark"
  | "inventor_movement"
  | "tech_journal"
  | "github_innovation";

export interface IPSignal {
  type: IPSignalType;
  inventor: string; // Person's name
  organization: string; // Company
  url: string;
  description: string;
  strength: "weak" | "medium" | "strong";
  weight: number; // 1-5
  year: number;
}

/**
 * IP & Patent Weak Signals (search-based, no API needed)
 *
 * 1. Patent filed (2024) — Innovation in progress
 * 2. Patent granted (2023-2024) — Validated technology
 * 3. Patent citations (granted patents citing startup) — Tech validation
 * 4. Trademark registration — Brand protection = serious intent
 * 5. Inventor movement — Top researcher leaves lab → startup
 * 6. Tech journal publication — Research validation before product
 * 7. GitHub innovation — Open-source IP, trending repos from startups
 */

export function buildIPPatentQueries(
  sector: string,
  geography: string,
  year: number = new Date().getFullYear()
): { query: string; signalType: IPSignalType; weight: number }[] {
  const isFrance = /france|french|paris/i.test(geography);

  return [
    // === GOOGLE PATENTS ===
    {
      query: `site:patents.google.com ${sector} "filed" "${year}" assignee`,
      signalType: "patent_filed",
      weight: 4,
    },
    {
      query: `site:patents.google.com ${sector} "granted" "${year - 1}" OR "${year}" startup`,
      signalType: "patent_granted",
      weight: 4,
    },
    {
      query: `site:patents.google.com ${sector} ${geography} inventor "${year}"`,
      signalType: "patent_filed",
      weight: 4,
    },

    // === INPI (France) ===
    ...(isFrance
      ? [
          {
            query: `site:inpi.fr ${sector} "brevet" "${year - 1}" "${year}"`,
            signalType: "patent_filed" as const,
            weight: 4,
          },
          {
            query: `site:inpi.fr ${sector} "marque" startup "enregistrée" "${year}"`,
            signalType: "trademark" as const,
            weight: 3,
          },
          {
            query: `INPI ${sector} France patent filing ${year}`,
            signalType: "patent_filed" as const,
            weight: 4,
          },
        ]
      : []),

    // === EPO (Europe) ===
    {
      query: `site:espacenet.com ${sector} "filing date" ${year - 1} ${year}`,
      signalType: "patent_filed",
      weight: 4,
    },
    {
      query: `site:epo.org ${sector} application ${geography} ${year}`,
      signalType: "patent_filed",
      weight: 4,
    },

    // === PATENT CITATIONS (deep innovation signal) ===
    {
      query: `site:patents.google.com "${sector}" "cited by" startup ${year}`,
      signalType: "patent_citation",
      weight: 5,
    },
    {
      query: `patents "${sector}" application "references" innovation ${year}`,
      signalType: "patent_citation",
      weight: 4,
    },

    // === TRADEMARK REGISTRATION ===
    {
      query: `site:uspto.gov "${sector}" trademark "registered" ${year}`,
      signalType: "trademark",
      weight: 3,
    },
    {
      query: `site:inpi.fr OR site:epo.org "${sector}" marque enregistrée ${year}`,
      signalType: "trademark",
      weight: 3,
    },

    // === INVENTOR MOVEMENT (researcher → founder) ===
    {
      query: `${sector} inventor "left" OR "founded" startup PhD researcher ${geography}`,
      signalType: "inventor_movement",
      weight: 5,
    },
    {
      query: `${sector} professor researcher "spin-off" OR "startup" ${geography} ${year}`,
      signalType: "inventor_movement",
      weight: 5,
    },
    {
      query: `researcher inventor ${sector} "now founder" OR "co-founder" startup`,
      signalType: "inventor_movement",
      weight: 4,
    },

    // === TECH JOURNAL PUBLICATIONS (research → commercialization) ===
    {
      query: `site:arxiv.org ${sector} "abstract" startup application ${year}`,
      signalType: "tech_journal",
      weight: 3,
    },
    {
      query: `site:scholar.google.com ${sector} ${year - 1} ${year} "start-up" OR "startup"`,
      signalType: "tech_journal",
      weight: 3,
    },
    {
      query: `${sector} research paper "commercial application" OR "product" ${year}`,
      signalType: "tech_journal",
      weight: 3,
    },

    // === GITHUB INNOVATION (open-source startups) ===
    {
      query: `site:github.com ${sector} startup "trending" repositories ${year}`,
      signalType: "github_innovation",
      weight: 3,
    },
    {
      query: `site:github.com/${sector}-startup OR site:github.com/org-${sector} ${year}`,
      signalType: "github_innovation",
      weight: 3,
    },
    {
      query: `github ${sector} repository "1000 stars" OR "2000 stars" ${year}`,
      signalType: "github_innovation",
      weight: 3,
    },
  ];
}

/**
 * Extract IP signals from search results
 */
export function extractIPSignals(
  title: string,
  description: string,
  url: string
): IPSignal | null {
  const text = `${title} ${description}`.toLowerCase();
  const year = new Date().getFullYear();

  // Pattern: "patent" + "filed" OR "application" = patent_filed
  if (/patent.*filed|patent application|patent.*pending/i.test(text)) {
    return {
      type: "patent_filed",
      inventor: extractInventor(title),
      organization: extractOrganization(title),
      url,
      description: `Patent filed: ${title}`,
      strength: "strong",
      weight: 4,
      year,
    };
  }

  // Pattern: "patent" + "granted" OR "issued" = patent_granted
  if (/patent.*granted|patent.*issued|patent.*approved/i.test(text)) {
    return {
      type: "patent_granted",
      inventor: extractInventor(title),
      organization: extractOrganization(title),
      url,
      description: `Patent granted: ${title}`,
      strength: "strong",
      weight: 4,
      year: extractYear(title) || year,
    };
  }

  // Pattern: "trademark" + "registered" = trademark
  if (/trademark.*registered|marque.*enregistr|brand.*protection/i.test(text)) {
    return {
      type: "trademark",
      inventor: "",
      organization: extractOrganization(title),
      url,
      description: `Trademark registered: ${title}`,
      strength: "medium",
      weight: 3,
      year: extractYear(title) || year,
    };
  }

  // Pattern: researcher/professor + "startup" OR "founded" = inventor_movement
  if (
    /(professor|researcher|phd|postdoc|inventor)/i.test(text) &&
    /startup|founded|co-founder|spinoff/i.test(text)
  ) {
    return {
      type: "inventor_movement",
      inventor: extractInventor(title),
      organization: extractOrganization(title),
      url,
      description: `Researcher → founder: ${title}`,
      strength: /former.*professor|left.*lab/.test(text) ? "strong" : "medium",
      weight: 5,
      year,
    };
  }

  // Pattern: "arxiv" OR "scholar.google" OR "research paper" = tech_journal
  if (/arxiv|scholar|research paper|journal|publication|published/i.test(text)) {
    return {
      type: "tech_journal",
      inventor: extractInventor(title),
      organization: extractOrganization(title),
      url,
      description: `Research publication: ${title}`,
      strength: "medium",
      weight: 3,
      year: extractYear(title) || year,
    };
  }

  // Pattern: "github" + "stars" OR "trending" OR "open source" = github_innovation
  if (
    /github|open source|repository|repo/.test(text) &&
    /star|trending|popular|fork/i.test(text)
  ) {
    return {
      type: "github_innovation",
      inventor: extractInventor(title),
      organization: extractOrganization(title),
      url,
      description: `GitHub innovation: ${title}`,
      strength: /1000 stars|2000 stars|trending/i.test(text)
        ? "strong"
        : "medium",
      weight: 3,
      year,
    };
  }

  // Pattern: "cited by" = patent_citation
  if (/cited by|citation|references/i.test(text)) {
    return {
      type: "patent_citation",
      inventor: extractInventor(title),
      organization: extractOrganization(title),
      url,
      description: `Patent cited: ${title}`,
      strength: "strong",
      weight: 5,
      year: extractYear(title) || year,
    };
  }

  return null;
}

// === HELPERS ===

function extractInventor(text: string): string {
  // Try to extract name from patterns like "John Doe" or "J. Doe"
  const match = text.match(
    /(?:by |inventor: |author: |filed by )([A-Z][a-z]+ (?:[A-Z][a-z]+)?)/
  );
  return match ? match[1] : "";
}

function extractOrganization(text: string): string {
  // Try to extract company/org from patterns
  const match = text.match(
    /(?:at |assignee: |from |company: |org: )([A-Za-z][A-Za-z0-9\s]+?)(?:\s*[,;]|\s*$)/
  );
  return match ? match[1].trim() : text.split(" ")[0] || "";
}

function extractYear(text: string): number | null {
  const match = text.match(/\b(202[0-9]|202[0-9])\b/);
  return match ? parseInt(match[1]) : null;
}
