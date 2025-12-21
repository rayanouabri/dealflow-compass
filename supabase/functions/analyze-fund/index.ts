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
    
    // Use Lovable AI Gateway (pre-configured, no API key needed from user)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ 
        error: "AI service not configured. Please contact support." 
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

    console.log("Calling Lovable AI Gateway...");

    // Use Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a few moments." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Payment required, please add funds." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: `AI service error (${response.status})` 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    if (data.error) {
      console.error("AI error response:", data.error);
      return new Response(JSON.stringify({ 
        error: `AI error: ${data.error.message || JSON.stringify(data.error)}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(JSON.stringify({ 
        error: "No content in AI response" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("AI response received, length:", content.length);

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
      console.error("Failed to parse AI response:", parseError);
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
      if (analysisResult.startup) {
        analysisResult.startups = [analysisResult.startup];
        delete analysisResult.startup;
      } else {
        analysisResult.startups = [];
      }
    }

    // Ensure dueDiligenceReports is always an array
    if (!Array.isArray(analysisResult.dueDiligenceReports)) {
      if (analysisResult.dueDiligenceReport || analysisResult.pitchDeck) {
        analysisResult.dueDiligenceReports = [analysisResult.dueDiligenceReport || analysisResult.pitchDeck];
        delete analysisResult.dueDiligenceReport;
        delete analysisResult.pitchDeck;
      } else {
        analysisResult.dueDiligenceReports = [];
      }
    }

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
