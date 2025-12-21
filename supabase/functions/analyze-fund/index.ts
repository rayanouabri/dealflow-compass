import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface AnalysisRequest {
  fundName?: string;
  customThesis?: {
    sectors?: string[];
    stage?: string;
    geography?: string;
    ticketSize?: string;
    description?: string;
    specificCriteria?: string;
  };
  params?: {
    numberOfStartups?: number;
    includeCompetitors?: boolean;
    includeMarketSize?: boolean;
    detailedFinancials?: boolean;
    includeMoat?: boolean;
    detailLevel?: number;
    slideCount?: number;
  };
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

// Enrich startup data with real web sources
async function enrichStartupData(startup: any): Promise<any> {
  const name = startup.name || "";
  if (!name) return startup;

  console.log(`Enriching data for startup: ${name}`);

  // Search for company info, funding, and metrics in parallel - MORE COMPREHENSIVE
  const [
    generalResults,
    fundingResults,
    metricsResults,
    financialResults,
    linkedinResults,
    crunchbaseResults,
  ] = await Promise.all([
    braveSearch(`${name} startup company official website`, 3),
    braveSearch(`${name} funding round valuation investors series A B C`, 5),
    braveSearch(`${name} ARR MRR revenue metrics customers growth 2024`, 5),
    braveSearch(`${name} CAC LTV churn NRR burn rate runway financial metrics`, 5),
    braveSearch(`${name} LinkedIn company employees team size`, 2),
    braveSearch(`${name} Crunchbase profile funding revenue`, 3),
  ]);

  // Extract URLs - combine all search results
  const allResults = [
    ...generalResults, 
    ...fundingResults, 
    ...metricsResults,
    ...financialResults,
    ...linkedinResults,
    ...crunchbaseResults
  ];
  
  const websiteUrl = generalResults.find(r => 
    !r.url.includes("linkedin") && 
    !r.url.includes("crunchbase") && 
    !r.url.includes("techcrunch") &&
    !r.url.includes("wikipedia")
  )?.url || startup.website;

  const linkedinUrl = linkedinResults.find(r => r.url.includes("linkedin.com/company"))?.url;
  const crunchbaseUrl = allResults.find(r => r.url.includes("crunchbase.com"))?.url;

  // Extract snippets for context - prioritize metrics and financial data
  const metricsSnippets = [...metricsResults, ...financialResults, ...fundingResults]
    .flatMap(r => [r.description, ...(r.extra_snippets || [])])
    .filter(Boolean);
  const allSnippets = allResults.flatMap(r => [r.description, ...(r.extra_snippets || [])]).filter(Boolean);
  
  // Combine with priority on metrics
  const enrichedContext = [...metricsSnippets, ...allSnippets].slice(0, 10).join(" | ");

  // Build sources array
  const sources: { name: string; url: string; type: string }[] = [];
  if (websiteUrl) sources.push({ name: "Site officiel", url: websiteUrl, type: "website" });
  if (linkedinUrl) sources.push({ name: "LinkedIn", url: linkedinUrl, type: "linkedin" });
  if (crunchbaseUrl) sources.push({ name: "Crunchbase", url: crunchbaseUrl, type: "crunchbase" });
  
  // Add other relevant sources
  allResults.slice(0, 5).forEach(r => {
    if (!sources.find(s => s.url === r.url)) {
      let type = "article";
      if (r.url.includes("techcrunch")) type = "press";
      else if (r.url.includes("pitchbook")) type = "data";
      sources.push({ name: r.title.substring(0, 50), url: r.url, type });
    }
  });

  return {
    ...startup,
    website: websiteUrl || startup.website,
    linkedinUrl,
    crunchbaseUrl,
    sources: sources.slice(0, 8),
    dataContext: enrichedContext,
    metricsContext: metricsSnippets.join(" | "), // Separate context for metrics
    verificationStatus: sources.length >= 2 ? "verified" : "partially_verified",
  };
}

// Enrich market data with real TAM/SAM/SOM figures
async function enrichMarketData(sector: string, geography: string): Promise<any> {
  console.log(`Enriching market data for sector: ${sector}`);
  
  const marketResults = await braveSearch(
    `${sector} market size TAM SAM 2024 2025 billion growth rate CAGR`, 
    5
  );

  const snippets = marketResults.flatMap(r => [r.description, ...(r.extra_snippets || [])]).filter(Boolean);
  
  const sources = marketResults.slice(0, 3).map(r => ({
    name: r.title.substring(0, 50),
    url: r.url,
  }));

  return {
    marketContext: snippets.join(" | "),
    marketSources: sources,
  };
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
    let requestData: AnalysisRequest;
    try {
      const bodyText = await req.text();
      if (!bodyText) {
        return new Response(JSON.stringify({ 
          error: "Request body is empty. Please provide fundName or customThesis." 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      requestData = JSON.parse(bodyText);
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(JSON.stringify({ 
        error: `Invalid JSON in request body: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fundName, customThesis, params = {} } = requestData;
    
    // Support multiple AI providers: Groq (preferred) or Gemini
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const AI_PROVIDER = GROQ_API_KEY ? "groq" : (GEMINI_API_KEY ? "gemini" : null);
    
    if (!AI_PROVIDER) {
      console.error("No AI provider configured");
      return new Response(JSON.stringify({ 
        error: "No AI provider configured. Please add either GROQ_API_KEY or GEMINI_API_KEY in Supabase Dashboard > Edge Functions > analyze-fund > Settings > Secrets.\n\n📖 Groq (Recommandé - GRATUIT) : https://console.groq.com\n📖 Gemini : https://makersuite.google.com/app/apikey",
        setupRequired: true
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const numberOfStartups = Math.min(Math.max(params.numberOfStartups || 1, 1), 5);

    console.log(`Analyzing fund: ${fundName || 'Custom Thesis'}`);
    console.log(`Generating ${numberOfStartups} startup(s)`);

    // Step 1: Search for fund investment thesis and criteria (to understand what startups to source)
    let fundThesisContext = "";
    let fundSources: { name: string; url: string }[] = [];
    let investmentCriteria = {
      sectors: [] as string[],
      stage: "",
      geography: "",
      ticketSize: "",
      focus: ""
    };
    
    if (fundName) {
      console.log(`Step 1: Analyzing fund thesis for: ${fundName}`);
      // Search for fund investment thesis and criteria
      const fundResults = await braveSearch(`${fundName} investment thesis criteria sectors stage geography ticket size`, 8);
      fundThesisContext = fundResults.map(r => `${r.title}: ${r.description}`).join("\n");
      fundSources = fundResults.slice(0, 4).map(r => ({ name: r.title.substring(0, 60), url: r.url }));
      
      // Additional search for portfolio examples to understand their focus
      const portfolioResults = await braveSearch(`${fundName} portfolio companies investments 2023 2024`, 5);
      fundThesisContext += "\n\nPORTFOLIO EXAMPLES:\n" + portfolioResults.map(r => `${r.title}: ${r.description}`).join("\n");
    }

    // Step 2: Search for market data and potential startups
    const primarySector = customThesis?.sectors?.[0] || "technology startups";
    const marketData = await enrichMarketData(primarySector, customThesis?.geography || "global");
    
    // Step 3: Search for REAL startups matching the thesis (CRITICAL for sourcing)
    console.log(`Step 3: Sourcing startups matching thesis...`);
    let startupSearchQueries: string[] = [];
    
    if (fundName && fundThesisContext) {
      // Extract key criteria from fund thesis
      const sectors = customThesis?.sectors || [];
      const stage = customThesis?.stage || "seed";
      const geography = customThesis?.geography || "global";
      
      // Build targeted search queries for real startups
      sectors.forEach(sector => {
        startupSearchQueries.push(`${sector} startup ${stage} stage ${geography} 2024`);
        startupSearchQueries.push(`${sector} company funding ${stage} round 2024`);
      });
    } else if (customThesis) {
      const sectors = customThesis.sectors || ["technology"];
      const stage = customThesis.stage || "seed";
      const geography = customThesis.geography || "global";
      sectors.forEach(sector => {
        startupSearchQueries.push(`${sector} startup ${stage} ${geography} 2024`);
      });
    }
    
    // Execute searches for real startups
    let startupSearchResults: BraveSearchResult[] = [];
    for (const query of startupSearchQueries.slice(0, 3)) {
      const results = await braveSearch(query, 5);
      startupSearchResults.push(...results);
      await new Promise(r => setTimeout(r, 500)); // Rate limit
    }
    
    const startupSearchContext = startupSearchResults
      .slice(0, 15)
      .map(r => `${r.title}: ${r.description} | URL: ${r.url}`)
      .join("\n");

    const systemPrompt = `Tu es un analyste VC SENIOR avec 15+ ans d'expérience en sourcing de startups et due diligence approfondie pour les plus grands fonds (Sequoia, a16z, Accel, etc.).

🎯 MISSION PRINCIPALE : SOURCING DE STARTUPS + DUE DILIGENCE PROFESSIONNELLE

⚠️ ATTENTION : TU NE DOIS PAS ANALYSER LE FONDS, MAIS SOURCER DES STARTUPS QUI CORRESPONDENT À SA THÈSE ⚠️

TON RÔLE :
1. COMPRENDRE la thèse d'investissement du fonds (secteurs, stade, géographie, ticket) - C'EST UNIQUEMENT POUR COMPRENDRE QUOI CHERCHER
2. SOURCER ${numberOfStartups} startup(s) RÉELLE(S) qui correspondent PARFAITEMENT à cette thèse
3. Effectuer une DUE DILIGENCE COMPLÈTE de niveau senior VC avec TOUTES les métriques chiffrées
4. Générer un rapport d'investissement prêt pour un Investment Committee

⚠️ RÈGLE CRITIQUE : DONNÉES VÉRIFIÉES + ESTIMATIONS INTELLIGENTES ⚠️

PRIORITÉ 1 - DONNÉES RÉELLES :
Tu as accès à des données de recherche web réelles ci-dessous. UTILISE CES DONNÉES en PRIORITÉ pour tes analyses.
Pour chaque information clé (TAM, SAM, SOM, ARR, MRR, valorisation, funding, traction, CAC, LTV, churn, NRR), indique TOUJOURS la source avec URL.

PRIORITÉ 2 - ESTIMATIONS INTELLIGENTES :
Si une donnée n'est PAS disponible dans les recherches web, fais une ESTIMATION INTELLIGENTE basée sur :
1. Le stade de la startup (Seed, Series A, B, etc.)
2. Le secteur (SaaS, Marketplace, Fintech, etc.)
3. Les moyennes du marché pour ce type d'entreprise
4. Les données disponibles sur la startup (funding, équipe, etc.)

FORMAT DES MÉTRIQUES :
- Si données réelles : "$2.5M ARR (source: techcrunch.com/article)"
- Si estimation : "$1.8M ARR (estimation basée sur stade Series A SaaS, moyenne marché $1-3M)"
- Si vraiment non disponible : "Non disponible (startup trop récente)"

⚠️ IMPORTANT : 
- Ne laisse JAMAIS "Non disponible" sans avoir cherché
- Fais TOUJOURS une estimation intelligente si possible
- Compare avec les moyennes du marché
- Indique clairement "(estimation)" pour les métriques estimées

${fundThesisContext ? `
=== THÈSE D'INVESTISSEMENT DU FONDS (pour comprendre quoi chercher) ===
${fundThesisContext}

⚠️ IMPORTANT : Ces informations servent UNIQUEMENT à comprendre les critères d'investissement du fonds.
Tu dois maintenant SOURCER des startups RÉELLES qui correspondent à ces critères, PAS analyser le fonds.
` : ''}

${startupSearchContext ? `
=== STARTUPS POTENTIELLES TROUVÉES (source: Brave Search) ===
${startupSearchContext}

⚠️ UTILISE CES RÉSULTATS pour identifier des startups RÉELLES à analyser.
Chaque startup doit être une entreprise EXISTANTE avec un site web, des données vérifiables.
` : ''}

=== DONNÉES MARCHÉ (source: Brave Search) ===
${marketData.marketContext}

=== MOYENNES DU MARCHÉ PAR STADE (pour estimations intelligentes) ===

SAAS (Software as a Service) :
- Seed: ARR $0-500K, MRR $0-40K, CAC $500-1500, Churn 5-10%/mois, NRR 80-100%, Marge brute 70-85%
- Series A: ARR $500K-2M, MRR $40K-170K, CAC $1000-2000, Churn 3-7%/mois, NRR 100-120%, Marge brute 75-90%
- Series B: ARR $2M-10M, MRR $170K-830K, CAC $1500-3000, Churn 2-5%/mois, NRR 110-130%, Marge brute 80-92%
- Series C+: ARR $10M+, MRR $830K+, CAC $2000-5000, Churn 1-3%/mois, NRR 120-150%, Marge brute 85-95%

MARKETPLACE :
- Seed: GMV $0-2M, Take rate 10-20%, CAC $50-200, Churn 10-20%/mois
- Series A: GMV $2M-10M, Take rate 15-25%, CAC $100-300, Churn 8-15%/mois
- Series B+: GMV $10M+, Take rate 20-30%, CAC $150-400, Churn 5-12%/mois

FINTECH :
- Seed: ARR $0-1M, CAC $200-800, Churn 4-8%/mois, NRR 90-110%
- Series A: ARR $1M-5M, CAC $500-1500, Churn 3-6%/mois, NRR 100-115%
- Series B+: ARR $5M+, CAC $800-2500, Churn 2-5%/mois, NRR 110-130%

HEALTHCARE IT :
- Seed: ARR $0-800K, CAC $1000-3000, Churn 2-5%/mois (plus bas que SaaS)
- Series A: ARR $800K-3M, CAC $2000-5000, Churn 1-4%/mois
- Series B+: ARR $3M+, CAC $3000-8000, Churn 1-3%/mois

⚠️ UTILISE CES MOYENNES pour faire des estimations intelligentes quand les données réelles ne sont pas disponibles.

${customThesis ? `
THÈSE D'INVESTISSEMENT PERSONNALISÉE:
- Secteurs: ${customThesis.sectors?.join(', ') || 'Non spécifié'}
- Stade: ${customThesis.stage || 'Non spécifié'}
- Géographie: ${customThesis.geography || 'Non spécifié'}
- Taille de ticket: ${customThesis.ticketSize || 'Non spécifié'}
- Description: ${customThesis.description || 'Non spécifiée'}
` : ''}

Tu dois répondre avec un objet JSON valide contenant:

1. "investmentThesis": Critères d'investissement du fonds (résumé concis, max 200 mots):
   - "sectors": Array des secteurs focus identifiés
   - "stage": Stade d'investissement préféré
   - "geography": Régions cibles
   - "ticketSize": Taille de ticket moyenne
   - "description": Description concise de leur thèse (max 200 mots)
   
   ⚠️ Ce champ sert UNIQUEMENT de contexte. Le focus principal doit être sur les STARTUPS.

2. "startups": Array de ${numberOfStartups} startup(s) RÉELLE(S) SOURCÉES:
   Chaque startup contient (TOUTES les données doivent être VÉRIFIÉES avec sources):
   - "name": Nom RÉEL de la startup (doit exister vraiment)
   - "tagline": Description en une ligne
   - "sector": Secteur principal
   - "stage": Stade actuel (Seed, Series A, etc.) avec source
   - "location": Siège (ville, pays)
   - "founded": Année de création
   - "problem": Problème adressé (détaillé)
   - "solution": Solution proposée (détaillée)
   - "businessModel": Modèle économique détaillé (B2B, B2C, marketplace, SaaS, etc.)
   - "competitors": Concurrents principaux avec leurs données (nom, funding, taille)
   - "moat": Avantage compétitif détaillé
   - "fundingHistory": Historique COMPLET de levées avec montants, dates, investisseurs, sources URL
   - "website": Site web RÉEL (URL complète)
   - "linkedin": URL LinkedIn de la startup
   - "crunchbaseUrl": URL Crunchbase si disponible
   - "metrics": {
       "arr": "ARR en $ avec source OU estimation (ex: '$2.5M ARR (source: techcrunch.com)' ou '$1.8M ARR (estimation basée sur stade Series A SaaS)')",
       "mrr": "MRR en $ avec source OU estimation (ex: '$200K MRR (source: ...)' ou '$150K MRR (estimation)')",
       "growth": "Croissance MoM/YoY en % avec source OU estimation",
       "customers": "Nombre de clients avec source OU estimation basée sur ARR/MRR et secteur",
       "nrr": "Net Revenue Retention en % avec source OU estimation (moyenne SaaS: 100-120%)",
       "cac": "Customer Acquisition Cost en $ avec source OU estimation (moyenne SaaS: $500-2000)",
       "ltv": "Lifetime Value en $ avec source OU estimation (calculé: LTV = ARPU / churn rate)",
       "ltvCacRatio": "Ratio LTV/CAC avec source OU estimation (bon ratio: 3:1 minimum)",
       "churn": "Taux de churn mensuel en % avec source OU estimation (moyenne SaaS: 3-7%/mois)",
       "grossMargin": "Marge brute en % avec source OU estimation (moyenne SaaS: 70-90%)",
       "burnRate": "Burn rate mensuel en $ avec source OU estimation (basé sur funding et runway)",
       "runway": "Runway en mois avec source OU estimation (calculé: cash / burn rate)",
       "valuation": "Valorisation actuelle en $ avec source URL OU estimation basée sur dernière levée"
     }
   - "team": {
       "founders": [{"name": "Nom complet", "role": "CEO/CTO/etc", "linkedin": "URL", "background": "Expérience"}],
       "teamSize": "Nombre d'employés",
       "keyHires": "Recrutements clés récents"
     }
   - "verificationStatus": "verified" | "partially_verified" | "unverified"
   - "sources": Array de toutes les sources utilisées { "name": "Nom", "url": "URL", "type": "article/crunchbase/linkedin/etc" }

4. "dueDiligenceReports": Array de ${numberOfStartups} rapport(s):
   Chaque rapport est un Array de slides:
   
   [
     {
       "title": "Executive Summary",
       "content": "Résumé détaillé avec données VÉRIFIÉES et sources citées (min 300 mots)",
       "keyPoints": ["Point 1 avec source", "Point 2 avec source", ...],
       "metrics": { 
         "valuation": "Valorisation avec source", 
         "askAmount": "Montant demandé", 
         "fitScore": "Score 1-10",
         "sources": ["source1", "source2"]
       }
     },
     {
       "title": "Market Analysis",
       "content": "Analyse marché avec TAM/SAM/SOM VÉRIFIÉS et sources (min 300 mots)",
       "keyPoints": ["Tendance 1", ...],
       "metrics": { 
         "tam": "TAM avec source (ex: $50B - Grand View Research 2024)", 
         "sam": "SAM avec source", 
         "som": "SOM avec source", 
         "cagr": "CAGR avec source",
         "sources": ["url1", "url2"]
       }
     },
     {
       "title": "Product & Technology",
       "content": "Analyse produit détaillée (min 250 mots)",
       "keyPoints": ["Force 1", ...],
       "metrics": { "techStack": "Stack technique", "patents": "Brevets", "pmfScore": "Score PMF" }
     },
     {
       "title": "Business Metrics & Traction",
       "content": "Métriques DÉTAILLÉES avec SOURCES VÉRIFIÉES et CHIFFRES PRÉCIS (min 400 mots). Inclure: ARR/MRR, croissance MoM/YoY, nombre de clients, NRR, CAC, LTV, ratio LTV/CAC, churn, burn rate, runway, unit economics, cohort analysis si disponible.",
       "keyPoints": ["ARR: $X avec source URL", "MRR: $Y avec croissance Z% MoM", "Clients: N avec source", "NRR: X% avec source", "CAC: $X avec source", "LTV: $Y avec source", "LTV/CAC: X avec source", "Churn: X% avec source", "Burn: $X/mois avec source", "Runway: X mois avec source"],
       "metrics": { 
         "arr": "ARR en $ avec source URL OU estimation. Format: '$2.5M ARR (source: ...)' ou '$1.2M ARR (estimation - Series A SaaS)'",
         "mrr": "MRR en $ avec source OU estimation. Si ARR disponible, MRR = ARR/12.",
         "mrrGrowth": "Croissance MRR en % MoM/YoY avec source OU estimation. Estime basé sur stade si non disponible.", 
         "customers": "Nombre de clients avec source OU estimation. Calcule si ARR/MRR et ARPU disponibles.", 
         "nrr": "NRR en % avec source OU estimation (moyenne SaaS par stade: Seed 80-100%, Series A 100-120%, etc.)",
         "cac": "CAC en $ avec source OU estimation (moyenne SaaS par stade: Seed $500-1500, Series A $1000-2000, etc.)",
         "ltv": "LTV en $ avec source OU estimation. Calcule: LTV = ARPU / churn rate si données disponibles.",
         "ltvCacRatio": "Ratio LTV/CAC avec source OU estimation. Calcule si LTV et CAC disponibles. Bon: 3:1+",
         "churn": "Churn mensuel en % avec source OU estimation (moyenne SaaS: Seed 5-10%, Series A 3-7%, etc.)",
         "burnRate": "Burn rate mensuel en $ avec source OU estimation. Estime basé sur équipe et stade.",
         "runway": "Runway en mois avec source OU estimation. Calcule: cash / burn rate si données disponibles.",
         "grossMargin": "Marge brute en % avec source OU estimation (SaaS typique: 70-90%)",
         "sources": ["source1", "source2", "source3"]
       }
     },
     {
       "title": "Competitive Analysis",
       "content": "Analyse concurrentielle avec données marché (min 250 mots)",
       "keyPoints": ["Avantage 1", ...],
       "metrics": { "marketShare": "Part de marché", "competitorCount": "Nb concurrents" }
     },
     {
       "title": "Team Assessment",
       "content": "Évaluation équipe avec liens LinkedIn (min 250 mots)",
       "keyPoints": ["Point 1", ...],
       "metrics": { 
         "founders": [{ "name": "Nom", "role": "Rôle", "linkedin": "URL LinkedIn" }],
         "teamSize": "Taille équipe",
         "advisors": ["Advisor 1", ...]
       }
     },
     {
       "title": "Investment Recommendation",
       "content": "Recommandation détaillée avec risques et opportunités (min 300 mots)",
       "keyPoints": ["Raison 1", "Risque 1", ...],
       "metrics": { 
         "recommendation": "INVEST" | "PASS" | "WATCH",
         "targetReturn": "Multiple cible",
         "riskLevel": "high" | "medium" | "low",
         "suggestedTicket": "Ticket suggéré"
       }
     }
   ]

5. "analysisMetadata":
   - "confidence": "high" | "medium" | "low"
   - "dataQuality": "excellent" | "good" | "fair" | "limited"
   - "verificationLevel": "fully_verified" | "mostly_verified" | "partially_verified"
   - "sources": Array de toutes les sources utilisées { "name", "url", "type" }`;

    const userPrompt = fundName 
      ? `🎯 MISSION : SOURCER ET ANALYSER DES STARTUPS POUR LE FONDS "${fundName}"

⚠️ ATTENTION : TU NE DOIS PAS ANALYSER LE FONDS "${fundName}". TU DOIS SOURCER DES STARTUPS QUI CORRESPONDENT À SA THÈSE.

ÉTAPE 1 - COMPRENDRE LA THÈSE (rapide, max 100 mots) :
Analyse rapidement la thèse d'investissement du fonds "${fundName}" pour identifier :
- Les secteurs cibles
- Le stade d'investissement préféré (Seed, Series A, etc.)
- La géographie cible
- La taille de ticket moyenne

ÉTAPE 2 - SOURCING DE STARTUPS RÉELLES (PRIORITÉ ABSOLUE) :
Identifie ${numberOfStartups} startup(s) RÉELLE(S) et VÉRIFIÉES qui correspondent PARFAITEMENT à la thèse du fonds "${fundName}".

Chaque startup doit être :
- Une entreprise RÉELLE et EXISTANTE (pas inventée)
- Correspondre aux critères du fonds (secteur, stade, géographie, ticket)
- Avoir un site web RÉEL, LinkedIn, et idéalement Crunchbase
- Avoir des données vérifiables (funding, métriques, équipe)

⚠️ UTILISE les résultats de recherche web fournis ci-dessus pour identifier des startups RÉELLES.
⚠️ Ne crée PAS de startups fictives. Si tu ne trouves pas assez de startups réelles, dis-le clairement.

ÉTAPE 3 - DUE DILIGENCE COMPLÈTE (niveau senior VC) :
Pour chaque startup sourcée, génère un rapport de due diligence PROFESSIONNEL avec TOUTES les métriques chiffrées :

OBLIGATOIRE - Métriques financières (RÉELLES ou ESTIMATIONS INTELLIGENTES) :

POUR CHAQUE MÉTRIQUE :
1. Cherche d'abord dans les données de recherche web fournies
2. Si trouvé → Utilise la donnée réelle avec source URL
3. Si NON trouvé → Fais une ESTIMATION INTELLIGENTE basée sur :
   - Le stade de la startup (Seed, Series A, B, etc.)
   - Le secteur (SaaS, Marketplace, Fintech, etc.)
   - Les moyennes du marché pour ce type d'entreprise
   - Les données disponibles (funding, équipe, etc.)

MÉTRIQUES REQUISES :
- ARR/MRR en $ (avec source OU estimation avec justification)
- Croissance MoM/YoY en % (avec source OU estimation)
- Nombre de clients (avec source OU estimation basée sur ARR/MRR moyen par client)
- NRR en % (avec source OU estimation: moyenne SaaS 100-120%)
- CAC en $ (avec source OU estimation: moyenne SaaS $500-2000)
- LTV en $ (avec source OU estimation: calculé LTV = ARPU / churn)
- Ratio LTV/CAC (avec source OU estimation: bon ratio 3:1 minimum)
- Churn mensuel en % (avec source OU estimation: moyenne SaaS 3-7%/mois)
- Burn rate mensuel en $ (avec source OU estimation basée sur funding/runtime)
- Runway en mois (avec source OU estimation: calculé cash / burn rate)
- Marge brute en % (avec source OU estimation: moyenne SaaS 70-90%)
- Valorisation en $ (avec source URL OU estimation basée sur dernière levée)

FORMAT OBLIGATOIRE :
- Donnée réelle : "$2.5M ARR (source: techcrunch.com/article)"
- Estimation : "$1.8M ARR (estimation - stade Series A SaaS, moyenne marché $1-3M)"
- Ne JAMAIS mettre "Non disponible" sans estimation

OBLIGATOIRE - Analyse marché :
- TAM/SAM/SOM en $ avec sources URL (ex: $50B TAM - Grand View Research 2024)
- CAGR en % avec source
- Tendances du marché avec sources

OBLIGATOIRE - Équipe :
- Founders avec LinkedIn, background, expérience
- Taille de l'équipe
- Recrutements clés récents

OBLIGATOIRE - Recommandation :
- INVEST / PASS / WATCH avec justification détaillée
- Multiple cible (ex: 10x en 5 ans)
- Risques identifiés
- Opportunités identifiées

IMPORTANT : 
- Utilise UNIQUEMENT les données réelles trouvées dans les recherches web
- Ne crée PAS de données fictives
- Pour chaque chiffre, indique la source avec URL
- Si une donnée n'est pas disponible, marque "Non disponible" au lieu d'inventer`
      : `🎯 MISSION : SOURCER ET ANALYSER DES STARTUPS POUR THÈSE PERSONNALISÉE

ÉTAPE 1 - SOURCING :
Identifie ${numberOfStartups} startup(s) RÉELLE(S) et VÉRIFIÉES correspondant à la thèse personnalisée fournie.
Chaque startup doit être une entreprise RÉELLE avec des données vérifiables (site web, LinkedIn, Crunchbase).

ÉTAPE 2 - DUE DILIGENCE COMPLÈTE :
Génère un rapport de due diligence PROFESSIONNEL de niveau senior VC avec TOUTES les métriques chiffrées (ARR, MRR, CAC, LTV, churn, burn rate, etc.) avec sources URL pour chaque donnée.

IMPORTANT : Utilise UNIQUEMENT les données réelles trouvées dans les recherches web. Ne crée PAS de données fictives.`;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    console.log(`Calling ${AI_PROVIDER.toUpperCase()} API...`);

    let response: Response | null = null;
    let lastErrorText = "";

    // Use Groq if available, otherwise fallback to Gemini
    if (AI_PROVIDER === "groq") {
      const groqUrl = "https://api.groq.com/openai/v1/chat/completions";
      const groqModel = Deno.env.get("GROQ_MODEL") || "llama-3.1-70b-versatile";
      
      const groqBody = {
        model: groqModel,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `${userPrompt}\n\nRéponds UNIQUEMENT avec du JSON valide, sans formatage markdown.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 32768,
        response_format: { type: "json_object" },
      };

      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          const backoffMs = Math.min(8000, 800 * Math.pow(2, attempt - 1));
          const jitterMs = Math.floor(Math.random() * 400);
          const waitMs = backoffMs + jitterMs;
          console.log(`Groq rate-limited. Retrying in ${waitMs}ms (attempt ${attempt + 1}/3)`);
          await sleep(waitMs);
        }

        response = await fetch(groqUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify(groqBody),
        });

        if (response.ok) break;

        lastErrorText = await response.text();
        console.error("Groq API error:", response.status, lastErrorText);

        if (response.status !== 429) break;
      }
    } else {
      // Gemini fallback
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

      const geminiBody = {
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\n${userPrompt}\n\nRéponds UNIQUEMENT avec du JSON valide, sans formatage markdown.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 32768,
          responseMimeType: "application/json",
        },
      };

      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          const backoffMs = Math.min(8000, 800 * Math.pow(2, attempt - 1));
          const jitterMs = Math.floor(Math.random() * 400);
          const waitMs = backoffMs + jitterMs;
          console.log(`Gemini rate-limited. Retrying in ${waitMs}ms (attempt ${attempt + 1}/3)`);
          await sleep(waitMs);
        }

        response = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(geminiBody),
        });

        if (response.ok) break;

        lastErrorText = await response.text();
        console.error("Gemini API error:", response.status, lastErrorText);

        if (response.status !== 429) break;
      }
    }

    if (!response) {
      return new Response(JSON.stringify({ error: `Failed to call ${AI_PROVIDER.toUpperCase()} API.` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      const status = response.status;
      const errorText = lastErrorText || (await response.text());

      if (status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please wait ~30-60s and retry.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (status === 403) {
        const providerName = AI_PROVIDER === "groq" ? "Groq" : "Gemini";
        const keyName = AI_PROVIDER === "groq" ? "GROQ_API_KEY" : "GEMINI_API_KEY";
        return new Response(
          JSON.stringify({
            error: `Invalid or expired ${providerName} API key. Please check your ${keyName}.`,
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (status === 400) {
        const providerName = AI_PROVIDER === "groq" ? "Groq" : "Gemini";
        let errorMessage = `Invalid request to ${providerName} API.`;
        let setupInstructions = "";
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage = `${providerName} API: ${errorData.error.message}`;
            // Détecter spécifiquement le problème de clé API manquante
            if (errorData.error.message.toLowerCase().includes("api key") || 
                errorData.error.message.toLowerCase().includes("key not found") ||
                errorData.error.message.toLowerCase().includes("invalid api key") ||
                errorData.error.message.toLowerCase().includes("unauthorized")) {
              if (AI_PROVIDER === "groq") {
                setupInstructions = "\n\n🔧 SOLUTION : Configurez GROQ_API_KEY dans Supabase Dashboard > Edge Functions > analyze-fund > Settings > Secrets.\n📖 Guide : https://console.groq.com (GRATUIT, pas de carte bancaire)";
              } else {
                setupInstructions = "\n\n🔧 SOLUTION : Configurez GEMINI_API_KEY dans Supabase Dashboard > Edge Functions > analyze-fund > Settings > Secrets.\n📖 Guide : https://makersuite.google.com/app/apikey";
              }
            }
          }
        } catch {
          // ignore
        }
        return new Response(JSON.stringify({ 
          error: errorMessage + setupInstructions,
          setupRequired: setupInstructions.length > 0
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          error: `${AI_PROVIDER === "groq" ? "Groq" : "Gemini"} API error (${status})`,
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    
    // Handle different response formats: Groq vs Gemini
    let content: string;
    if (AI_PROVIDER === "groq") {
      content = data.choices?.[0]?.message?.content || "";
    } else {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    if (!content) {
      console.error(`No content in ${AI_PROVIDER} response:`, JSON.stringify(data));
      
      if (AI_PROVIDER === "gemini" && data.candidates?.[0]?.finishReason === "SAFETY") {
        return new Response(JSON.stringify({ 
          error: "Content was blocked by safety filters. Please try a different query." 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: `No content in ${AI_PROVIDER} response` 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`${AI_PROVIDER} response received, length:`, content.length);

    let analysisResult;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      analysisResult = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      console.error("Content preview:", content.substring(0, 500));
      return new Response(JSON.stringify({ 
        error: `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : "Unknown error"}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure startups is always an array
    if (!Array.isArray(analysisResult.startups)) {
      if ((analysisResult as any).startup) {
        analysisResult.startups = [(analysisResult as any).startup];
        delete (analysisResult as any).startup;
      } else {
        analysisResult.startups = [];
      }
    }

    // Step 3: Enrich each startup with real web data
    console.log("Enriching startup data with Brave Search...");
    const enrichedStartups = await Promise.all(
      analysisResult.startups.map((s: any) => enrichStartupData(s))
    );
    analysisResult.startups = enrichedStartups;

    // Add fund sources
    if (fundSources.length > 0) {
      analysisResult.fundInfo = analysisResult.fundInfo || {};
      analysisResult.fundInfo.sources = fundSources;
    }

    // Add market sources
    if (marketData.marketSources?.length > 0) {
      analysisResult.marketSources = marketData.marketSources;
    }

    // Normalize due diligence reports into Slide[][]
    const normalizeReportToSlides = (report: any): any[] => {
      if (!report) return [];
      if (Array.isArray(report)) return report;

      if (typeof report === "object") {
        const entries = Object.entries(report)
          .filter(([k, v]) => /^slide\s*\d+/i.test(k) && v && typeof v === "object")
          .map(([k, v]) => {
            const n = parseInt(k.replace(/\D+/g, ""), 10);
            return { n: Number.isFinite(n) ? n : 0, v };
          })
          .sort((a, b) => a.n - b.n)
          .map(({ v }) => v as any);

        if (entries.length > 0) return entries;

        if ("title" in report || "content" in report) return [report];
      }

      return [];
    };

    if (!Array.isArray(analysisResult.dueDiligenceReports)) {
      if (analysisResult.dueDiligenceReport || analysisResult.pitchDeck) {
        analysisResult.dueDiligenceReports = [analysisResult.dueDiligenceReport || analysisResult.pitchDeck];
        delete analysisResult.dueDiligenceReport;
        delete analysisResult.pitchDeck;
      } else {
        analysisResult.dueDiligenceReports = [];
      }
    }

    analysisResult.dueDiligenceReports = (analysisResult.dueDiligenceReports as any[]).map((r) =>
      normalizeReportToSlides(r).map((s) => ({
        title: String((s as any).title ?? ""),
        content: String((s as any).content ?? ""),
        keyPoints: Array.isArray((s as any).keyPoints) ? (s as any).keyPoints : [],
        metrics: (s as any).metrics && typeof (s as any).metrics === "object" ? (s as any).metrics : undefined,
      }))
    );

    console.log("Analysis complete:", fundName || 'Custom Thesis');
    console.log("Startups found:", analysisResult.startups?.length || 0);
    console.log("Startups enriched with sources:", enrichedStartups.filter((s: any) => s.sources?.length > 0).length);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-fund function:", error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : JSON.stringify(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});