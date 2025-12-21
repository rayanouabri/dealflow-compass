import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  // Search for company info, funding, and metrics in parallel
  const [
    generalResults,
    fundingResults,
    linkedinResults,
  ] = await Promise.all([
    braveSearch(`${name} startup company official website`, 3),
    braveSearch(`${name} startup funding round valuation ARR revenue`, 3),
    braveSearch(`${name} startup LinkedIn company`, 2),
  ]);

  // Extract URLs
  const allResults = [...generalResults, ...fundingResults, ...linkedinResults];
  
  const websiteUrl = generalResults.find(r => 
    !r.url.includes("linkedin") && 
    !r.url.includes("crunchbase") && 
    !r.url.includes("techcrunch") &&
    !r.url.includes("wikipedia")
  )?.url || startup.website;

  const linkedinUrl = linkedinResults.find(r => r.url.includes("linkedin.com/company"))?.url;
  const crunchbaseUrl = allResults.find(r => r.url.includes("crunchbase.com"))?.url;

  // Extract snippets for context
  const allSnippets = allResults.flatMap(r => [r.description, ...(r.extra_snippets || [])]).filter(Boolean);

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
    sources: sources.slice(0, 6),
    dataContext: allSnippets.slice(0, 5).join(" | "),
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === "") {
      console.error("GEMINI_API_KEY not configured");
      return new Response(JSON.stringify({ 
        error: "GEMINI_API_KEY not configured. Please add it in Supabase Dashboard > Edge Functions > analyze-fund > Settings > Secrets.\n\n📖 Guide : https://github.com/rayanouabri/dealflow-compass/blob/main/GEMINI_SETUP.md",
        setupRequired: true
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const numberOfStartups = Math.min(Math.max(params.numberOfStartups || 1, 1), 5);

    console.log(`Analyzing fund: ${fundName || 'Custom Thesis'}`);
    console.log(`Generating ${numberOfStartups} startup(s)`);

    // Step 1: Search for real fund information if fundName provided
    let fundContext = "";
    let fundSources: { name: string; url: string }[] = [];
    
    if (fundName) {
      console.log(`Searching for fund info: ${fundName}`);
      const fundResults = await braveSearch(`${fundName} venture capital portfolio investments thesis`, 5);
      fundContext = fundResults.map(r => `${r.title}: ${r.description}`).join("\n");
      fundSources = fundResults.slice(0, 4).map(r => ({ name: r.title.substring(0, 60), url: r.url }));
    }

    // Step 2: Search for market data
    const primarySector = customThesis?.sectors?.[0] || "technology startups";
    const marketData = await enrichMarketData(primarySector, customThesis?.geography || "global");

    const systemPrompt = `Tu es un analyste VC senior expert en sourcing et due diligence.

⚠️ RÈGLE CRITIQUE : DONNÉES VÉRIFIÉES UNIQUEMENT ⚠️
Tu as accès à des données de recherche web réelles ci-dessous. UTILISE CES DONNÉES pour tes analyses.
Pour chaque information clé (TAM, SAM, SOM, ARR, valorisation), indique la source.
Si une donnée n'est pas vérifiable, marque-la clairement comme "Estimation" ou "Non vérifié".

${fundContext ? `
=== DONNÉES RÉELLES SUR LE FONDS (source: Brave Search) ===
${fundContext}
` : ''}

=== DONNÉES MARCHÉ (source: Brave Search) ===
${marketData.marketContext}

${customThesis ? `
THÈSE D'INVESTISSEMENT PERSONNALISÉE:
- Secteurs: ${customThesis.sectors?.join(', ') || 'Non spécifié'}
- Stade: ${customThesis.stage || 'Non spécifié'}
- Géographie: ${customThesis.geography || 'Non spécifié'}
- Taille de ticket: ${customThesis.ticketSize || 'Non spécifié'}
- Description: ${customThesis.description || 'Non spécifiée'}
` : ''}

Tu dois répondre avec un objet JSON valide contenant:

1. "fundInfo": Informations sur le fonds:
   - "officialName": Nom officiel
   - "website": Site web officiel (URL réelle)
   - "headquarters": Siège social
   - "foundedYear": Année de création
   - "aum": Assets Under Management avec source
   - "keyPartners": Array des partners principaux
   - "notablePortfolio": Array de 5-10 investissements notables RÉELS
   - "sources": Array de sources utilisées { "name", "url" }

2. "investmentThesis": Critères d'investissement:
   - "sectors": Array des secteurs focus
   - "stage": Stade d'investissement préféré
   - "geography": Régions cibles
   - "ticketSize": Taille de ticket moyenne
   - "description": Description détaillée de leur thèse
   - "differentiators": Ce qui distingue ce fonds
   - "valueAdd": Valeur ajoutée pour les startups

3. "startups": Array de ${numberOfStartups} startup(s) RÉELLE(S):
   Chaque startup contient:
   - "name": Nom RÉEL de la startup
   - "tagline": Description en une ligne
   - "sector": Secteur principal
   - "stage": Stade actuel (Seed, Series A, etc.)
   - "location": Siège
   - "founded": Année de création
   - "problem": Problème adressé
   - "solution": Solution proposée
   - "businessModel": Modèle économique
   - "competitors": Concurrents principaux
   - "moat": Avantage compétitif
   - "fundingHistory": Historique de levées avec sources
   - "website": Site web RÉEL
   - "metrics": {
       "arr": "ARR si disponible (avec source)",
       "growth": "Croissance MoM/YoY",
       "customers": "Nombre de clients",
       "nrr": "Net Revenue Retention"
     }
   - "verificationStatus": "verified" | "partially_verified" | "unverified"

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
       "content": "Métriques avec SOURCES VÉRIFIÉES (min 300 mots)",
       "keyPoints": ["Métrique 1 avec source", ...],
       "metrics": { 
         "arr": "ARR avec source", 
         "mrrGrowth": "Croissance MRR", 
         "customers": "Clients", 
         "nrr": "NRR",
         "sources": ["source1"]
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
      ? `Analyse le fonds "${fundName}" et identifie ${numberOfStartups} startup(s) RÉELLE(S) qui correspondent à leur thèse. Génère un rapport de due diligence avec des données VÉRIFIÉES et des SOURCES pour chaque métrique importante.`
      : `Identifie ${numberOfStartups} startup(s) RÉELLE(S) correspondant à la thèse. Génère un rapport avec données VÉRIFIÉES et SOURCES.`;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    console.log("Calling Gemini API...");

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

    let response: Response | null = null;
    let lastErrorText = "";

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

    if (!response) {
      return new Response(JSON.stringify({ error: "Failed to call Gemini API." }), {
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
        return new Response(
          JSON.stringify({
            error: "Invalid or expired Gemini API key. Please check your GEMINI_API_KEY.",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (status === 400) {
        let errorMessage = "Invalid request to Gemini API.";
        let setupInstructions = "";
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage = `Gemini API: ${errorData.error.message}`;
            // Détecter spécifiquement le problème de clé API manquante
            if (errorData.error.message.toLowerCase().includes("api key") || 
                errorData.error.message.toLowerCase().includes("key not found") ||
                errorData.error.message.toLowerCase().includes("invalid api key")) {
              setupInstructions = "\n\n🔧 SOLUTION : Configurez GEMINI_API_KEY dans Supabase Dashboard > Edge Functions > analyze-fund > Settings > Secrets. Guide complet : https://github.com/rayanouabri/dealflow-compass/blob/main/GEMINI_SETUP.md";
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
          error: `Gemini API error (${status})`,
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error("No content in Gemini response:", JSON.stringify(data));
      
      if (data.candidates?.[0]?.finishReason === "SAFETY") {
        return new Response(JSON.stringify({ 
          error: "Content was blocked by safety filters. Please try a different query." 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: "No content in AI response" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Gemini response received, length:", content.length);

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