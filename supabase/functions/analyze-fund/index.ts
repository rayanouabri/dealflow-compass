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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body with error handling
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
    
    // Use Google Gemini API directly
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(JSON.stringify({ 
        error: "GEMINI_API_KEY not configured. Please add it in your secrets." 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const numberOfStartups = Math.min(Math.max(params.numberOfStartups || 1, 1), 5);

    console.log(`Analyzing fund: ${fundName || 'Custom Thesis'}`);
    console.log(`Generating ${numberOfStartups} startup(s)`);

    const systemPrompt = `Tu es un analyste VC senior expert en sourcing et due diligence, avec une connaissance approfondie de l'écosystème mondial du capital-risque et des startups.

⚠️ RÈGLE ABSOLUE #1 : MAXIMISER LA VÉRACITÉ ⚠️
- TOUTES les informations doivent être RÉELLES et VÉRIFIABLES
- Si tu n'es pas CERTAIN d'une information, indique "Non vérifié" ou "Estimation basée sur..."
- Ne JAMAIS inventer de données, noms, chiffres ou faits

MISSION: Aider un fonds VC à identifier et analyser des startups qui correspondent à leur thèse d'investissement.

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
   - "website": Site web
   - "headquarters": Siège social
   - "foundedYear": Année de création
   - "aum": Assets Under Management (si connu)
   - "keyPartners": Array des partners principaux
   - "notablePortfolio": Array de 5-10 investissements notables

2. "investmentThesis": Critères d'investissement:
   - "sectors": Array des secteurs focus
   - "stage": Stade d'investissement préféré
   - "geography": Régions cibles
   - "ticketSize": Taille de ticket moyenne
   - "description": Description détaillée de leur thèse
   - "differentiators": Ce qui distingue ce fonds
   - "valueAdd": Valeur ajoutée pour les startups

3. "startups": Array de ${numberOfStartups} startup(s) identifiée(s):
   Chaque startup contient:
   - "name": Nom de la startup
   - "tagline": Description en une ligne
   - "sector": Secteur principal
   - "stage": Stade actuel
   - "location": Siège
   - "founded": Année de création
   - "problem": Problème adressé
   - "solution": Solution proposée
   - "businessModel": Modèle économique
   - "competitors": Concurrents principaux
   - "moat": Avantage compétitif
   - "fundingHistory": Historique de levées
   - "website": Site web

4. "dueDiligenceReports": Array de ${numberOfStartups} rapport(s) de due diligence:
   Chaque rapport contient ${params.slideCount || 8} slides:
   
   Slide 1: Executive Summary
   - "title": "Investment Opportunity Summary"
   - "content": Résumé exécutif détaillé (minimum 250 mots)
   - "keyPoints": 4-6 points clés
   - "metrics": { "valuation", "askAmount", "fitScore", "useOfFunds" }
   
   Slide 2: Market Analysis
   - "title": "Market Opportunity & Timing"
   - "content": Analyse de marché approfondie (minimum 250 mots)
   - "keyPoints": 5-7 tendances
   - "metrics": { "tam", "sam", "som", "cagr" }
   
   Slide 3: Product & Technology
   - "title": "Product-Market Fit Analysis"
   - "content": Analyse produit détaillée (minimum 250 mots)
   - "keyPoints": 5-7 forces
   - "metrics": { "techStack", "patents", "pmfScore" }
   
   Slide 4: Traction & Metrics
   - "title": "Business Metrics & Traction"
   - "content": Métriques business (minimum 250 mots)
   - "keyPoints": 6-8 jalons
   - "metrics": { "arr", "mrrGrowth", "customers", "nrr" }
   
   Slide 5: Competitive Landscape
   - "title": "Competitive Analysis"
   - "content": Analyse concurrentielle (minimum 250 mots)
   - "keyPoints": 5-7 avantages
   - "metrics": { "marketShare", "competitorCount", "differentiationScore" }
   
   Slide 6: Strategic Fit
   - "title": "Strategic Fit Analysis"
   - "content": Analyse d'alignement (minimum 200 mots)
   - "keyPoints": 4-6 synergies
   - "metrics": { "portfolioSynergies", "fitScore" }
   
   Slide 7: Team Assessment
   - "title": "Founding Team & Execution"
   - "content": Évaluation équipe (minimum 250 mots)
   - "keyPoints": 5-7 points
   - "metrics": { "founders", "teamScore", "advisors" }
   
   Slide 8: Investment Recommendation
   - "title": "Investment Thesis & Recommendation"
   - "content": Recommandation détaillée (minimum 300 mots)
   - "keyPoints": 6-8 raisons et risques
   - "metrics": { "recommendation", "targetReturn", "riskLevel", "suggestedTicket" }

5. "analysisMetadata":
   - "confidence": "high" | "medium" | "low"
   - "dataQuality": "excellent" | "good" | "fair" | "limited"
   - "verificationLevel": "fully_verified" | "mostly_verified" | "partially_verified"`;

    const userPrompt = fundName 
      ? `Analyse le fonds de capital-risque "${fundName}" et identifie ${numberOfStartups} startup(s) qui correspondent à leur thèse d'investissement. Génère un rapport de due diligence complet pour chaque startup.`
      : `Identifie ${numberOfStartups} startup(s) qui correspondent à la thèse d'investissement personnalisée fournie. Génère un rapport de due diligence complet pour chaque startup.`;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    console.log("Calling Gemini API...");

    // Use Google Gemini API directly
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
        temperature: 0.3,
        maxOutputTokens: 16384,
        responseMimeType: "application/json",
      },
    };

    // Retry on 429 (rate limit) with exponential backoff + jitter
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

      // Retry only on 429
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
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage = `Gemini API: ${errorData.error.message}`;
          }
        } catch {
          // ignore
        }
        return new Response(JSON.stringify({ error: errorMessage }), {
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
    
    // Extract content from Gemini response format
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error("No content in Gemini response:", JSON.stringify(data));
      
      // Check for safety blocking
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

    // Normalize due diligence reports into Slide[][]
    const normalizeReportToSlides = (report: any): any[] => {
      if (!report) return [];
      if (Array.isArray(report)) return report;

      // Common case: {"Slide 1": {...}, "Slide 2": {...}}
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

        // Fallback: if it already looks like a slide object
        if ("title" in report || "content" in report) return [report];
      }

      return [];
    };

    // Ensure dueDiligenceReports is always an array of reports
    if (!Array.isArray(analysisResult.dueDiligenceReports)) {
      if (analysisResult.dueDiligenceReport || analysisResult.pitchDeck) {
        analysisResult.dueDiligenceReports = [analysisResult.dueDiligenceReport || analysisResult.pitchDeck];
        delete analysisResult.dueDiligenceReport;
        delete analysisResult.pitchDeck;
      } else {
        analysisResult.dueDiligenceReports = [];
      }
    }

    // Convert each report into a Slide[] array
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
