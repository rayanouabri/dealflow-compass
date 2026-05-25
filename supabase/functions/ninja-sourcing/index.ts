import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildWeakSignalQueries, filterByStage } from "../_shared/weak-signals.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface NinjaSourcingRequest {
  customThesis?: {
    sectors?: string[];
    stage?: string;
    geography?: string;
    ticketSize?: string;
    description?: string;
    specificCriteria?: string;
  };
  fundName?: string;
  numberOfStartups?: number;
}

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  extra_snippets?: string[];
}

async function serperSearch(query: string, count: number, apiKey: string): Promise<BraveSearchResult[]> {
  try {
    console.log(`[Serper] Searching: ${query.substring(0, 50)}...`);
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: Math.min(count, 20),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Serper] Error ${response.status}: ${errorText.substring(0, 200)}`);
      return [];
    }

    const data = await response.json();
    const results = (data.organic || []).slice(0, count).map((r: any) => ({
      title: r.title || "",
      url: r.link || "",
      description: r.snippet || "",
      extra_snippets: [],
    }));
    console.log(`[Serper] Found ${results.length} results`);
    return results;
  } catch (error) {
    console.error("[Serper] Failed:", error);
    return [];
  }
}

async function braveSearchFallback(query: string, count: number = 5): Promise<BraveSearchResult[]> {
  const BRAVE_API_KEY = Deno.env.get("BRAVE_API_KEY");
  if (!BRAVE_API_KEY) {
    console.warn("BRAVE_API_KEY not configured - skipping web search");
    return [];
  }

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&text_decorations=false&result_filter=web`;

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "X-Subscription-Token": BRAVE_API_KEY,
      },
    });

    if (!response.ok) {
      console.error("Brave Search error:", response.status, await response.text());
      return [];
    }

    const data = await response.json();
    return (data.web?.results || []).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      description: r.description || "",
      extra_snippets: r.extra_snippets || [],
    }));
  } catch (error) {
    console.error("Brave Search failed:", error);
    return [];
  }
}

async function braveSearch(query: string, count: number = 5): Promise<BraveSearchResult[]> {
  const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY") || Deno.env.get("serper_api");
  const BRAVE_API_KEY = Deno.env.get("BRAVE_API_KEY");

  if (SERPER_API_KEY) {
    return serperSearch(query, count, SERPER_API_KEY);
  }

  if (BRAVE_API_KEY) {
    return braveSearchFallback(query, count);
  }

  console.warn("No search API configured (SERPER_API_KEY or BRAVE_API_KEY)");
  return [];
}

// 1. SOURCING PAR LES TALENTS (Signal RH)
// Détecte les entreprises qui recrutent massivement sur des postes critiques
async function sourceByTalentSignals(sectors: string[], geography: string): Promise<BraveSearchResult[]> {
  const criticalRoles = [
    "CTO",
    "VP Engineering",
    "Head of AI",
    "Chief Data Officer",
    "VP Product",
    "Lead Developer",
    "Head of R&D",
  ];

  const queries: string[] = [];
  
  for (const sector of sectors) {
    for (const role of criticalRoles.slice(0, 4)) {
      queries.push(`${sector} startup "${role}" hiring ${geography} 2024 2025`);
    }
    // Signaux de recrutement massif (indicateur de croissance)
    queries.push(`${sector} startup hiring spree ${geography} team growing 2024 2025`);
    queries.push(`${sector} startup first hire CTO co-founder ${geography} 2024 2025`);
  }

  const allResults: BraveSearchResult[] = [];
  for (const query of queries.slice(0, 10)) {
    const results = await braveSearch(query, 3);
    allResults.push(...results);
  }

  return allResults;
}

// 2. SOURCING PAR LA PROPRIÉTÉ INTELLECTUELLE (IP)
// Cherche les brevets et les citations de brevets par des géants
async function sourceByIP(sectors: string[], geography: string): Promise<BraveSearchResult[]> {
  const queries: string[] = [];
  
  for (const sector of sectors) {
    queries.push(`${sector} patent filed ${geography} 2024 2025`);
    queries.push(`${sector} new patent application INPI EPO ${geography} 2024 2025`);
    queries.push(`new ${sector} technology patent pending startup ${geography}`);
    queries.push(`"patent pending" ${sector} startup founder ${geography} 2024`);
    queries.push(`site:patents.google.com ${sector} ${geography} 2024`);
  }

  const allResults: BraveSearchResult[] = [];
  for (const query of queries.slice(0, 10)) {
    const results = await braveSearch(query, 3);
    allResults.push(...results);
  }

  return allResults;
}

// 3. ANALYSE DES SPINOFFS UNIVERSITAIRES ET INCUBATEURS
// Scrape les sites de laboratoires, incubateurs et thèses
async function sourceUniversitySpinoffs(sectors: string[], geography: string): Promise<BraveSearchResult[]> {
  const queries: string[] = [];
  
  const universities = geography === "europe" || geography === "france"
    ? ["CNRS", "CEA", "INRIA", "Polytechnique", "CentraleSupélec", "Max Planck", "ETH Zurich", "Cambridge"]
    : ["MIT", "Stanford", "Harvard", "Berkeley", "Caltech"];

  const incubators = geography === "europe" || geography === "france"
    ? ["Station F", "Agoranov", "WILCO", "Euratechnologies", "Paris&Co", "Schoolab"]
    : ["Y Combinator", "Techstars", "500 Global", "Plug and Play"];

  for (const sector of sectors) {
    // Spin-offs universitaires
    for (const uni of universities.slice(0, 4)) {
      queries.push(`${uni} ${sector} spin-off startup founder 2024 2025`);
      queries.push(`${sector} PhD thesis startup founder ${uni} 2024`);
    }
    // Incubateurs/accélérateurs
    for (const incub of incubators.slice(0, 3)) {
      queries.push(`"${incub}" ${sector} startup cohort batch 2024 2025`);
    }
    // Thèses CIFRE et grants
    queries.push(`"thèse CIFRE" ${sector} startup founder 2024`);
    queries.push(`"ERC grant" OR "EIC Accelerator" ${sector} startup ${geography} 2024`);
    queries.push(`"i-Lab" OR "i-Nov" ${sector} lauréat startup 2024 2025`);
    queries.push(`"French Tech Seed" ${sector} startup 2024 2025`);
  }

  const allResults: BraveSearchResult[] = [];
  for (const query of queries.slice(0, 15)) {
    const results = await braveSearch(query, 3);
    allResults.push(...results);
  }

  return allResults;
}

// 4. LOOKALIKE VECTORIEL
// Utilise l'IA pour trouver des entreprises similaires (via descriptions de produits)
async function sourceByLookalike(referenceCompany: string, geography: string, maxEmployees: number = 50): Promise<BraveSearchResult[]> {
  const queries = [
    `startup similar to ${referenceCompany} ${geography} less than ${maxEmployees} employees`,
    `company like ${referenceCompany} ${geography} startup`,
    `${referenceCompany} competitor alternative ${geography} startup`,
  ];

  const allResults: BraveSearchResult[] = [];
  for (const query of queries) {
    const results = await braveSearch(query, 5);
    allResults.push(...results);
  }

  return allResults;
}

// 5. SIGNAUX FAIBLES (8 catégories)
// GitHub, ProductHunt, Wellfound, Job Boards, arXiv/HAL, Pappers, Conférences, Show HN
async function sourceByWeakSignals(sectors: string[], geography: string, stage: string = "seed"): Promise<BraveSearchResult[]> {
  const year = new Date().getFullYear();
  const allQueryGroups = buildWeakSignalQueries(sectors[0] || "tech", geography, year);
  const filteredGroups = filterByStage(allQueryGroups, stage);

  const allResults: BraveSearchResult[] = [];

  // Limit to 3 queries per category to stay within budget
  for (const group of filteredGroups) {
    const selectedQueries = group.queries.slice(0, 3);
    for (const query of selectedQueries) {
      const results = await braveSearch(query, group.resultsPerQuery);
      // Tag results with category
      const taggedResults = results.map(r => ({
        ...r,
        extra_snippets: [...(r.extra_snippets || []), `[${group.category.toUpperCase()}]`],
      }));
      allResults.push(...taggedResults);
    }
  }

  return allResults;
}

// 6. SHOW HN
// Détecte les entrepreneurs qui partagent leurs projets sur Hacker News
async function sourceByShowHN(sectors: string[], geography: string): Promise<BraveSearchResult[]> {
  const queries = [
    `site:news.ycombinator.com "Show HN" ${sectors[0] || "tech"} startup 2024 2025`,
    `"Show HN" ${sectors[0] || "tech"} startup ${geography} founder 2024`,
    `hacker news "Show HN" "I built" ${sectors[0] || "tech"} 2024`,
    `site:news.ycombinator.com "Show HN" ${sectors[1] || "saas"} startup 2024`,
  ];

  const allResults: BraveSearchResult[] = [];
  for (const query of queries) {
    const results = await braveSearch(query, 4);
    const taggedResults = results.map(r => ({
      ...r,
      extra_snippets: [...(r.extra_snippets || []), "[SHOW_HN]"],
    }));
    allResults.push(...taggedResults);
  }

  return allResults;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const requestData: NinjaSourcingRequest = await req.json();
    const { customThesis, fundName, numberOfStartups = 5 } = requestData;

    // Extract thesis parameters
    const sectors = customThesis?.sectors || ["SaaS", "AI", "Fintech"];
    const geography = customThesis?.geography || "global";
    const stage = customThesis?.stage || "seed";

    console.log("Starting Ninja Sourcing with:", { sectors, geography, stage });

    // Run all sourcing methods in parallel
    const [
      talentResults,
      ipResults,
      spinoffResults,
      lookalikeResults,
      weakSignalResults,
      showHnResults,
    ] = await Promise.all([
      sourceByTalentSignals(sectors, geography),
      sourceByIP(sectors, geography),
      sourceByUniversitySpinoffs(sectors, geography),
      fundName ? sourceByLookalike(fundName, geography) : Promise.resolve([]),
      sourceByWeakSignals(sectors, geography, stage),
      sourceByShowHN(sectors, geography),
    ]);

    // Combine all results
    const allResults = [
      ...talentResults,
      ...ipResults,
      ...spinoffResults,
      ...lookalikeResults,
      ...weakSignalResults,
      ...showHnResults,
    ];

    // Extract unique company names from results
    const companies = new Set<string>();
    for (const result of allResults) {
      // Try to extract company names from titles and descriptions
      const text = `${result.title} ${result.description}`;
      // Simple extraction - look for patterns like "Company Name" or "CompanyName"
      const companyPatterns = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(startup|company|tech|inc|ltd)/gi);
      if (companyPatterns) {
        companyPatterns.forEach(match => {
          const company = match.replace(/\s+(startup|company|tech|inc|ltd)/gi, '').trim();
          if (company.length > 2 && company.length < 50) {
            companies.add(company);
          }
        });
      }
    }

    // Use AI to analyze and structure the results
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_KEY_2");
    const AI_PROVIDER = GROQ_API_KEY ? "groq" : (GEMINI_API_KEY ? "gemini" : null);

    if (!AI_PROVIDER) {
      return new Response(JSON.stringify({
        error: "No AI provider configured",
        companies: Array.from(companies).slice(0, numberOfStartups),
        sources: allResults.slice(0, 20),
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt for AI to structure the ninja-sourced companies
    const systemPrompt = `Tu es un expert en sourcing de startups pour fonds VC. Tu utilises des méthodes "Ninja" pour trouver des entreprises AVANT qu'elles ne soient sur Crunchbase ou Pitchbook.

OBJECTIF : Trouver des startups INCONNUES, pas encore médiatisées, détectées via des signaux faibles.

Analyse les résultats de recherche suivants et identifie ${numberOfStartups} startup(s) prometteuse(s) qui correspondent aux critères :
- Secteurs: ${sectors.join(", ")}
- Géographie: ${geography}
- Stade: ${stage}

12 SIGNAUX FAIBLES À PRIORISER (par ordre de force) :
1. Brevets récents (GitHub + Patents Google / INPI / EPO) → innovation validée
2. arXiv/HAL + spin-off recherche → deeptech talent
3. Pappers (immatriculation récente) → startup légale confirmée
4. GitHub orgs/repos (ex-GAFAM founders, "new organization") → product validation
5. ProductHunt launches + Show HN → product-market fit early signal
6. Wellfound/AngelList (seed/pre-seed) → fundraising stage signal
7. Incubateurs de prestige (Station F, YC, Techstars, Agoranov) → vetting externe
8. Conférences (VivaTech, Web Summit, NeurIPS) → visibility & validation
9. Job boards early (1-5 offres) → team building signal
10. Recrutement clés (CTO, VP Eng) → growth & scaling signal
11. Concours innovation (i-Lab, i-Nov, EIC, French Tech) → official recognition
12. Thèses CIFRE / ERC Grants → academic + entrepreneurial hybrid

Pour chaque startup identifiée, fournis :
- Nom de l'entreprise
- Description (2-3 phrases basées sur les signaux trouvés)
- Type de signal détecté (talent, IP, spinoff, incubateur, concours)
- Score de potentiel (1-10) avec justification
- Stade estimé (pre-seed, seed, series A)

Format JSON avec un array "startups" contenant des objets avec : name, description, signalType, potential, estimatedStage.`;

    const userPrompt = `Résultats de sourcing Ninja :

${allResults.slice(0, 30).map((r, i) => `${i + 1}. ${r.title}\n   ${r.description}\n   ${r.url}`).join('\n\n')}

Entreprises potentielles détectées : ${Array.from(companies).slice(0, 20).join(", ")}

Identifie ${numberOfStartups} startup(s) les plus prometteuses et structure-les en JSON.`;

    let structuredResults: any = { startups: [] };

    if (AI_PROVIDER === "groq") {
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mixtral-8x7b-32768",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      });

      if (groqResponse.ok) {
        const data = await groqResponse.json();
        const content = data.choices?.[0]?.message?.content || "{}";
        try {
          structuredResults = JSON.parse(content);
        } catch (e) {
          console.error("Failed to parse Groq JSON:", e);
        }
      }
    } else if (AI_PROVIDER === "gemini") {
      const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro";
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      
      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}\n\nRéponds UNIQUEMENT en JSON valide avec un objet contenant un array "startups".` }]
          }],
          generationConfig: {
            temperature: 0.7,
            response_mime_type: "application/json",
          },
        }),
      });

      if (geminiResponse.ok) {
        const data = await geminiResponse.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        try {
          structuredResults = JSON.parse(content);
        } catch (e) {
          console.error("Failed to parse Gemini JSON:", e);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      startups: structuredResults.startups || [],
      sources: allResults.slice(0, 30),
      methods: {
        talentSignals: talentResults.length,
        ip: ipResults.length,
        spinoffs: spinoffResults.length,
        weakSignals: weakSignalResults.length,
        showHn: showHnResults.length,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Ninja Sourcing error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

