// LinkedIn weak signal detection
// Patterns: hiring, founder networks, exits, co-founder connections

export type LinkedInSignalType =
  | "hiring_burst"
  | "founder_profile"
  | "exit_signal"
  | "investor_connection"
  | "cofounder_pair"
  | "department_head"
  | "advisor_network";

export interface LinkedInSignal {
  type: LinkedInSignalType;
  company: string;
  url: string;
  description: string;
  strength: "weak" | "medium" | "strong"; // Based on signal type
  weight: number; // 1-5 for scoring
}

/**
 * LinkedIn Weak Signals (non-API, search-based)
 *
 * Signals:
 * 1. Hiring burst — Company hiring 10+ roles in 3 months
 * 2. Founder profile — CEO/CTO recently left corporate
 * 3. Exit signal — Founder has successful exit history
 * 4. Investor connection — Connected to VC/angel investors
 * 5. Cofounder pair — 2-3 founders with complementary backgrounds
 * 6. Department head — Recent hire of VP/Head of X = growth
 * 7. Advisor network — Multiple marquee advisors (validation)
 */

export function buildLinkedInQueries(
  sector: string,
  geography: string,
  year: number = new Date().getFullYear()
): { query: string; signalType: LinkedInSignalType; weight: number }[] {
  const isFrance = /france|french|paris/i.test(geography);
  const geoTerm = isFrance ? "France OR Paris" : geography;

  return [
    // 1. HIRING BURSTS (strong signal of growth)
    {
      query: `site:linkedin.com/company "${sector}" careers hiring ${geoTerm} ${year}`,
      signalType: "hiring_burst",
      weight: 4,
    },
    {
      query: `site:linkedin.com/company ${sector} "we're hiring" 2024 2025 ${geoTerm}`,
      signalType: "hiring_burst",
      weight: 4,
    },
    {
      query: `site:linkedin.com/company ${sector} "now hiring" engineer product manager ${geoTerm}`,
      signalType: "hiring_burst",
      weight: 4,
    },

    // 2. FOUNDER PROFILES (ex-GAFAM, academic)
    {
      query: `site:linkedin.com/in founder ${sector} "former Google" OR "ex-Facebook" OR "ex-Amazon" ${geoTerm} ${year}`,
      signalType: "founder_profile",
      weight: 5,
    },
    {
      query: `site:linkedin.com/in "founder" "startup" "${sector}" "PhD" OR "postdoc" ${geoTerm}`,
      signalType: "founder_profile",
      weight: 5,
    },
    {
      query: `site:linkedin.com/in CEO founder startup ${sector} "${geoTerm}" ${year} "founded ${year}"`,
      signalType: "founder_profile",
      weight: 4,
    },

    // 3. EXIT SIGNALS (serial entrepreneurs)
    {
      query: `site:linkedin.com/in founder ${sector} "exit" OR "acquisition" OR "IPO" ${geoTerm}`,
      signalType: "exit_signal",
      weight: 5,
    },
    {
      query: `site:linkedin.com/in entrepreneur serial founder ${sector} startup exit 2020-2024`,
      signalType: "exit_signal",
      weight: 4,
    },

    // 4. INVESTOR CONNECTIONS (already funded? VCs following?)
    {
      query: `site:linkedin.com/company ${sector} investors "Sequoia" OR "a16z" OR "Accel" OR "Bessemer" ${geoTerm}`,
      signalType: "investor_connection",
      weight: 4,
    },
    {
      query: `site:linkedin.com/company ${sector} startup "funded by" OR "backed by" ${geoTerm} ${year}`,
      signalType: "investor_connection",
      weight: 4,
    },

    // 5. COFOUNDER PAIRS (complementary skills)
    {
      query: `site:linkedin.com "${sector}" founder CEO CTO "founded together" OR "co-founded" ${geoTerm}`,
      signalType: "cofounder_pair",
      weight: 4,
    },
    {
      query: `site:linkedin.com startup ${sector} "CEO" "CTO" "COO" founders team ${geoTerm} ${year}`,
      signalType: "cofounder_pair",
      weight: 3,
    },

    // 6. DEPARTMENT HEADS (growth signal)
    {
      query: `site:linkedin.com/company ${sector} startup "VP Engineering" OR "Head of Product" OR "Chief Revenue Officer" ${geoTerm} ${year}`,
      signalType: "department_head",
      weight: 3,
    },
    {
      query: `site:linkedin.com ${sector} startup "newly hired" VP OR "Head of" ${geoTerm}`,
      signalType: "department_head",
      weight: 3,
    },

    // 7. ADVISOR NETWORKS (validation)
    {
      query: `site:linkedin.com/company ${sector} startup advisors "advisor" "mentor" ${geoTerm}`,
      signalType: "advisor_network",
      weight: 3,
    },
    {
      query: `site:linkedin.com ${sector} startup "board advisors" marquee names ${geoTerm}`,
      signalType: "advisor_network",
      weight: 4,
    },
  ];
}

/**
 * Extract structured signals from search results
 * Even without API, we can pattern-match on titles/descriptions
 */
export function extractLinkedInSignals(
  title: string,
  description: string
): LinkedInSignal | null {
  const text = `${title} ${description}`.toLowerCase();

  // Pattern: "hiring" or "we're hiring" or "now hiring" = hiring_burst
  if (
    /(?:we're |now )?hiring|recruiting|join.*team|open position/.test(text)
  ) {
    return {
      type: "hiring_burst",
      company: title.split(" ")[0] || "Unknown",
      url: "",
      description: `Active hiring: ${title}`,
      strength: /(?:we're |now )?hiring|recruiting/.test(text)
        ? "strong"
        : "medium",
      weight: 4,
    };
  }

  // Pattern: "founder", "founder" + "startup" = founder_profile
  if (/founder|ceo|chief executive/i.test(text) && /startup|founded/i.test(text)) {
    return {
      type: "founder_profile",
      company: title,
      url: "",
      description: `Founder profile: ${title}`,
      strength: /ex-google|ex-meta|ex-deepmind|phd|postdoc/i.test(text)
        ? "strong"
        : "medium",
      weight: /ex-google|ex-meta|ex-deepmind/i.test(text) ? 5 : 4,
    };
  }

  // Pattern: "exit" or "acquisition" or "IPO" = exit_signal
  if (/exit|acquisition|ipo|acquired|went public/.test(text)) {
    return {
      type: "exit_signal",
      company: title,
      url: "",
      description: `Previous exit: ${title}`,
      strength: "strong",
      weight: 5,
    };
  }

  // Pattern: "vp" or "head of" = department_head
  if /(vp|head of|chief) (engineer|product|sales|revenue|marketing)/i.test(text)) {
    return {
      type: "department_head",
      company: title,
      url: "",
      description: `Leadership hire: ${title}`,
      strength: "medium",
      weight: 3,
    };
  }

  // Pattern: "founder" x2 or "co-founder" = cofounder_pair
  if (
    (/founder/.test(text) && text.split(/founder/i).length > 2) ||
    /co-founder|cofounded|co-founded/.test(text)
  ) {
    return {
      type: "cofounder_pair",
      company: title,
      url: "",
      description: `Cofounder team: ${title}`,
      strength: "medium",
      weight: 4,
    };
  }

  // Pattern: "investor", "funded by", "backed by" = investor_connection
  if (/investor|funded by|backed by|vc|venture capital|angels/.test(text)) {
    return {
      type: "investor_connection",
      company: title,
      url: "",
      description: `Investor connection: ${title}`,
      strength: "medium",
      weight: 4,
    };
  }

  // Pattern: "advisor" or "mentor" = advisor_network
  if (/advisor|mentor|board|advisory/.test(text)) {
    return {
      type: "advisor_network",
      company: title,
      url: "",
      description: `Advisor network: ${title}`,
      strength: "weak",
      weight: 3,
    };
  }

  return null;
}
