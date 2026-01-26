import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Search using Brave Search API
async function braveSearch(query: string, count: number = 5): Promise<BraveSearchResult[]> {
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

// 1. SOURCING PAR LES TALENTS (Signal RH)
// Détecte les entreprises qui recrutent massivement sur des postes critiques
async function sourceByTalentSignals(sectors: string[], geography: string): Promise<BraveSearchResult[]> {
  const criticalRoles = [
    "Head of Photonics",
    "Quantum Lead",
    "Chief Technology Officer",
    "VP Engineering",
    "Head of AI",
    "Chief Data Officer",
    "VP Product",
  ];

  const queries: string[] = [];
  
  for (const sector of sectors) {
    for (const role of criticalRoles) {
      queries.push(`${role} ${sector} ${geography} hiring jobs 2024`);
      queries.push(`${sector} startup ${role} recruitment ${geography} 2024`);
    }
  }

  const allResults: BraveSearchResult[] = [];
  for (const query of queries.slice(0, 10)) { // Limiter pour éviter trop de requêtes
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
    queries.push(`${sector} patent filed ${geography} 2023 2024`);
    queries.push(`${sector} patent cited by Intel Tesla Google ${geography}`);
    queries.push(`new ${sector} technology patent application ${geography}`);
  }

  const allResults: BraveSearchResult[] = [];
  for (const query of queries.slice(0, 8)) {
    const results = await braveSearch(query, 3);
    allResults.push(...results);
  }

  return allResults;
}

// 3. ANALYSE DES SPINOFFS UNIVERSITAIRES
// Scrape les sites de laboratoires et thèses pour trouver des chercheurs qui fondent
async function sourceUniversitySpinoffs(sectors: string[], geography: string): Promise<BraveSearchResult[]> {
  const queries: string[] = [];
  
  const universities = geography === "europe" 
    ? ["CNRS", "CEA", "INRIA", "Max Planck", "ETH Zurich", "Cambridge", "Oxford"]
    : ["MIT", "Stanford", "Harvard", "Berkeley", "Caltech"];

  for (const sector of sectors) {
    for (const uni of universities.slice(0, 5)) {
      queries.push(`${uni} ${sector} spin-off startup founded researcher`);
      queries.push(`${sector} PhD thesis startup founder ${uni}`);
      queries.push(`${uni} lab ${sector} startup commercialization`);
    }
  }

  const allResults: BraveSearchResult[] = [];
  for (const query of queries.slice(0, 10)) {
    const results = await braveSearch(query, 2);
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
    ] = await Promise.all([
      sourceByTalentSignals(sectors, geography),
      sourceByIP(sectors, geography),
      sourceByUniversitySpinoffs(sectors, geography),
    ]);

    // Combine all results
    const allResults = [
      ...talentResults,
      ...ipResults,
      ...spinoffResults,
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

Analyse les résultats de recherche suivants et identifie ${numberOfStartups} startup(s) prometteuse(s) qui correspondent aux critères :
- Secteurs: ${sectors.join(", ")}
- Géographie: ${geography}
- Stade: ${stage}

Pour chaque startup identifiée, fournis :
- Nom de l'entreprise
- Description (basée sur les signaux trouvés : recrutement, brevets, spinoff universitaire)
- Raison pour laquelle elle a été trouvée (signal RH, IP, spinoff, etc.)
- Potentiel d'investissement

Format JSON avec un array "startups" contenant des objets avec : name, description, signalType, potential.`;

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

