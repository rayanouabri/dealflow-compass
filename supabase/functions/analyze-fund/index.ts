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
    numberOfStartups?: number; // Nombre de startups à générer (1-5)
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
    
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      return new Response(JSON.stringify({ 
        error: "GEMINI_API_KEY is not configured. Please add it in Supabase Dashboard > Functions > analyze-fund > Settings > Secrets" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const numberOfStartups = Math.min(Math.max(params.numberOfStartups || 1, 1), 5); // Entre 1 et 5

    console.log(`Analyzing: ${fundName || 'Custom Thesis'}, Generating ${numberOfStartups} startup(s)`);

    // RÈGLE #1 : MAXIMISER LA VÉRACITÉ
    const systemPrompt = `Tu es un analyste VC senior expert en sourcing et due diligence, avec une connaissance approfondie de l'écosystème mondial du capital-risque et des startups.

⚠️ RÈGLE ABSOLUE #1 : MAXIMISER LA VÉRACITÉ ⚠️
- TOUTES les informations doivent être RÉELLES et VÉRIFIABLES
- Si tu n'es pas CERTAIN d'une information, indique "Non vérifié" ou "Estimation basée sur..."
- TOUJOURS citer des SOURCES pour chaque information clé
- Ne JAMAIS inventer de données, noms, chiffres ou faits
- Si une startup n'existe pas réellement, indique clairement que c'est une suggestion basée sur des critères

MISSION: Aider un fonds VC à identifier et analyser des startups RÉELLES qui correspondent parfaitement à leur thèse d'investissement.

INSTRUCTIONS CRITIQUES:
1. Recherche les informations RÉELLES et VÉRIFIABLES uniquement
2. Analyse leur thèse d'investissement (fournie ou basée sur leur portfolio réel)
3. Identifie des STARTUPS RÉELLES qui correspondent à leur thèse (utilise ta connaissance de l'écosystème startup réel)
4. Effectue une due diligence approfondie avec VÉRIFICATION des faits
5. Inclus des SOURCES et RÉFÉRENCES pour chaque information clé
6. Indique le niveau de confiance pour chaque donnée (high/medium/low)
7. Si information non vérifiable, marque clairement comme "Non vérifié" ou "Estimation"

${customThesis ? `
THÈSE D'INVESTISSEMENT PERSONNALISÉE FOURNIE:
- Secteurs: ${customThesis.sectors?.join(', ') || 'Non spécifié'}
- Stade: ${customThesis.stage || 'Non spécifié'}
- Géographie: ${customThesis.geography || 'Non spécifié'}
- Taille de ticket: ${customThesis.ticketSize || 'Non spécifié'}
- Description: ${customThesis.description || 'Non spécifiée'}
- Critères spécifiques: ${customThesis.specificCriteria || 'Aucun'}
` : ''}

Tu dois répondre avec un objet JSON valide contenant:

1. "fundInfo": Informations vérifiées sur le fonds (si fundName fourni):
   - "officialName": Nom officiel complet (VÉRIFIÉ)
   - "website": Site web officiel (VÉRIFIÉ)
   - "headquarters": Siège social (VÉRIFIÉ)
   - "foundedYear": Année de création (VÉRIFIÉ)
   - "aum": Assets Under Management (si connu et VÉRIFIÉ, sinon null)
   - "teamSize": Taille de l'équipe d'investissement (si connu et VÉRIFIÉ)
   - "keyPartners": Array des partners principaux avec leurs noms (VÉRIFIÉS)
   - "notablePortfolio": Array de 5-10 investissements notables RÉELS (VÉRIFIÉS)
   - "recentNews": Array de 2-3 actualités récentes ou deals (VÉRIFIÉS)
   - "sources": Array des sources utilisées pour ces informations (URLs, noms de sources)

2. "investmentThesis": Critères d'investissement:
   - "sectors": Array des secteurs focus (basé sur portfolio réel OU thèse personnalisée)
   - "stage": Stade d'investissement préféré
   - "geography": Régions cibles
   - "ticketSize": Taille de ticket moyenne
   - "description": Description détaillée de leur thèse
   - "differentiators": Ce qui distingue ce fonds des autres
   - "valueAdd": Valeur ajoutée pour les startups
   - "customCriteria": Critères spécifiques fournis (si applicable)

3. "startups": Array de ${numberOfStartups} startup(s) RÉELLE(s) identifiée(s) qui correspondent parfaitement:
   Chaque startup doit contenir:
   - "name": Nom réel de la startup (DOIT EXISTER RÉELLEMENT)
   - "tagline": Description en une ligne (basé sur info réelle)
   - "sector": Secteur principal (VÉRIFIÉ)
   - "stage": Stade actuel (basé sur levées réelles VÉRIFIÉES)
   - "location": Siège réel (VÉRIFIÉ)
   - "founded": Année de création réelle (VÉRIFIÉE)
   - "teamSize": Nombre d'employés (si connu et VÉRIFIÉ)
   - "problem": Problème adressé (basé sur info réelle)
   - "solution": Solution proposée (basé sur info réelle)
   - "businessModel": Modèle économique réel
   - "competitors": Concurrents principaux réels (VÉRIFIÉS)
   - "moat": Avantage compétitif identifié (basé sur faits réels)
   - "fundingHistory": Historique de levées RÉEL (si connu, avec dates et montants VÉRIFIÉS)
   - "revenue": Revenus estimés ou ARR (si disponible et VÉRIFIÉ, sinon null)
   - "website": Site web de la startup (VÉRIFIÉ)
   - "linkedin": LinkedIn de la startup (si disponible)
   - "verificationStatus": "verified" | "partially_verified" | "estimated"
   - "sources": Array des sources pour cette startup

4. "dueDiligenceReports": Array de ${numberOfStartups} rapport(s) de due diligence (un par startup):
   Chaque rapport contient ${params.slideCount || 8} slides avec CONTENU DÉTAILLÉ (minimum 200 mots par slide):
   Slide 1: Executive Summary
   - "title": "Investment Opportunity Summary"
   - "content": Résumé exécutif DÉTAILLÉ (minimum 300 mots OBLIGATOIRE) avec données VÉRIFIÉES uniquement. DÉVELOPPE chaque point avec contexte, exemples, chiffres précis. Inclure: contexte marché approfondi, positionnement unique détaillé, traction avec métriques précises, équipe avec backgrounds, opportunité d'investissement argumentée, risques principaux analysés, recommandation synthétique justifiée
   - "keyPoints": 4-6 points clés vérifiés et détaillés
   - "metrics": { "valuation": valorisation estimée (si vérifiée), "askAmount": montant recherché (si vérifié), "fitScore": score de correspondance (1-10), "useOfFunds": allocation détaillée }
   
   Slide 2: Market Analysis
   - "title": "Market Opportunity & Timing"
   - "content": Analyse APPROFONDIE (minimum 350 mots OBLIGATOIRE) avec données de marché RÉELLES. DÉVELOPPE chaque aspect avec chiffres, sources, comparaisons. Inclure: taille du marché (TAM/SAM/SOM) avec calculs détaillés, croissance historique et projetée avec projections, tendances sectorielles approfondies, timing d'entrée justifié, drivers de croissance analysés, segments cibles détaillés, géographie avec opportunités régionales, réglementation et impacts
   - "keyPoints": 5-7 tendances vérifiées et détaillées
   - "metrics": { "tam": TAM en $ (si vérifié), "sam": SAM en $ (si vérifié), "som": SOM en $ (si vérifié), "cagr": croissance % (si vérifié), "marketGrowth": croissance annuelle %, "addressableMarket": marché adressable en $ }
   
   Slide 3: Product & Technology
   - "title": "Product-Market Fit Analysis"
   - "content": Analyse DÉTAILLÉE (minimum 350 mots OBLIGATOIRE) basée sur faits réels. DÉVELOPPE chaque aspect technique avec précision. Inclure: description technique approfondie avec détails, architecture détaillée, différenciateurs technologiques expliqués, avantages compétitifs argumentés, roadmap produit avec timeline, IP/brevets avec statut, intégrations et écosystème, scalabilité analysée, barrières à l'entrée identifiées
   - "keyPoints": 5-7 forces vérifiées et détaillées
   - "metrics": { "techStack": technologies réelles, "patents": brevets si applicable et vérifiés, "pmfScore": score product-market fit (1-10), "techMaturity": niveau de maturité technique }
   
   Slide 4: Traction & Metrics
   - "title": "Business Metrics & Traction"
   - "content": Analyse COMPLÈTE (minimum 350 mots OBLIGATOIRE) avec métriques RÉELLES uniquement. DÉVELOPPE avec chiffres précis, tendances, analyses. Inclure: historique de croissance avec courbes et dates, métriques financières détaillées avec calculs, cohortes clients analysées, unit economics détaillés, efficacité marketing mesurée, rétention avec taux précis, expansion revenue quantifiée, pipeline avec probabilités, contrats signés avec montants, partenariats stratégiques détaillés
   - "keyPoints": 6-8 jalons VÉRIFIÉS et détaillés avec dates et montants
   - "metrics": { "arr": ARR (si vérifié), "mrrGrowth": croissance MRR % (si vérifié), "customers": nb clients (si vérifié), "nrr": Net Revenue Retention % (si vérifié), "cac": Customer Acquisition Cost (si vérifié), "ltv": Lifetime Value (si vérifié), "ltvCacRatio": ratio LTV/CAC, "paybackPeriod": période de récupération en mois }
   
   Slide 5: Competitive Landscape
   - "title": "Competitive Analysis"
   - "content": Analyse APPROFONDIE (minimum 350 mots OBLIGATOIRE) avec concurrents RÉELS uniquement. DÉVELOPPE chaque concurrent avec comparaisons détaillées. Inclure: mapping concurrentiel détaillé avec positions, positionnement relatif analysé, forces/faiblesses de chaque concurrent détaillées, différenciateurs clés argumentés, barrières à l'entrée identifiées, risques de substitution évalués, stratégie de différenciation expliquée
   - "keyPoints": 5-7 avantages vérifiés avec comparaisons détaillées
   - "metrics": { "marketShare": part de marché estimée (si vérifiée), "competitorCount": nombre de concurrents RÉELS identifiés, "competitivePosition": position (leader/challenger/niche), "differentiationScore": score de différenciation (1-10) }
   
   Slide 6: Strategic Fit
   - "title": "Strategic Fit Analysis"
   - "content": Analyse DÉTAILLÉE (minimum 300 mots OBLIGATOIRE) de correspondance avec la thèse. DÉVELOPPE chaque point d'alignement. Inclure: alignement avec secteurs cibles détaillé, stade d'investissement justifié, géographie avec opportunités, taille de ticket appropriée, synergies avec portfolio existant concrètes, valeur ajoutée du fond expliquée, cas d'usage de collaboration détaillés, risques de conflit identifiés
   - "keyPoints": 4-6 synergies vérifiées avec exemples concrets
   - "metrics": { "portfolioSynergies": entreprises portfolio similaires RÉELLES (liste), "fitScore": score de fit (1-10), "sectorAlignment": alignement sectoriel %, "stageAlignment": alignement stade % }
   
   Slide 7: Team Assessment
   - "title": "Founding Team & Execution"
   - "content": Évaluation APPROFONDIE (minimum 350 mots OBLIGATOIRE) basée sur profils RÉELS. DÉVELOPPE chaque profil avec détails. Inclure: background détaillé de chaque fondateur avec parcours, expérience pertinente expliquée, track record quantifié, complémentarité de l'équipe analysée, capacité d'exécution démontrée, réseau détaillé, advisors avec rôles, conseil d'administration composé, gaps identifiés avec solutions
   - "keyPoints": 5-7 points sur le background vérifié avec détails
   - "metrics": { "founders": nb fondateurs (vérifié), "teamScore": score équipe (1-10), "advisors": advisors notables RÉELS (liste), "yearsExperience": années d'expérience moyenne, "previousExits": sorties précédentes }
   
   Slide 8: Investment Recommendation
   - "title": "Investment Thesis & Recommendation"
   - "content": Recommandation DÉTAILLÉE (minimum 400 mots OBLIGATOIRE) basée sur données VÉRIFIÉES. DÉVELOPPE chaque aspect avec argumentation complète. Inclure: synthèse des forces détaillée, opportunités de création de valeur quantifiées, risques détaillés avec mitigation pour chacun, conditions d'investissement recommandées justifiées, structure de deal expliquée, post-money valuation avec calculs, dilution analysée, use of funds détaillé, milestones attendus avec timeline, stratégie de sortie avec multiples comparables et scénarios
   - "keyPoints": 6-8 raisons vérifiées, risques identifiés avec mitigation, conditions recommandées
   - "metrics": { "recommendation": "Strong Buy" | "Buy" | "Pass", "targetReturn": multiple cible (si estimé), "riskLevel": "Low" | "Medium" | "High", "suggestedTicket": montant suggéré, "valuation": valorisation pré/post-money, "ownershipTarget": % de participation cible }

5. "analysisMetadata": Métadonnées de l'analyse:
   - "confidence": Niveau de confiance global (high/medium/low)
   - "dataQuality": Qualité des données trouvées ("excellent" | "good" | "fair" | "limited")
   - "verificationLevel": Niveau de vérification ("fully_verified" | "mostly_verified" | "partially_verified")
   - "limitations": Limitations de l'analyse (ce qui n'a pas pu être vérifié)
   - "lastUpdated": Date de dernière mise à jour des infos
   - "sources": Sources principales utilisées pour la recherche
   - "disclaimers": Array des avertissements sur les données non vérifiées`;

    const userPrompt = fundName 
      ? `Analyse le fonds de capital-risque "${fundName}" et identifie ${numberOfStartups} startup(s) RÉELLE(s) qui correspondent à leur thèse d'investissement.

ÉTAPES D'ANALYSE STRICTES:
1. Identifie le fonds exact (vérifie l'orthographe, trouve le nom officiel) - VÉRIFIÉ
2. Recherche leurs investissements récents et historiques RÉELS pour comprendre leur thèse - VÉRIFIÉ
3. Analyse leur thèse d'investissement basée sur leur portfolio RÉEL - VÉRIFIÉ
4. Identifie leurs partners et leur expertise sectorielle - VÉRIFIÉ
5. Recherche ${numberOfStartups} STARTUP(S) RÉELLE(S) qui correspondent PARFAITEMENT à leur thèse - DOIT EXISTER RÉELLEMENT
6. Effectue une due diligence approfondie avec VÉRIFICATION des faits pour chaque startup
7. Génère un rapport d'investissement professionnel avec recommandation basée sur données VÉRIFIÉES`
      : `Analyse et identifie ${numberOfStartups} startup(s) RÉELLE(s) qui correspondent à la thèse d'investissement personnalisée fournie.

ÉTAPES D'ANALYSE STRICTES:
1. Utilise la thèse d'investissement personnalisée fournie
2. Recherche ${numberOfStartups} STARTUP(S) RÉELLE(S) qui correspondent PARFAITEMENT aux critères - DOIT EXISTER RÉELLEMENT
3. Effectue une due diligence approfondie avec VÉRIFICATION des faits pour chaque startup
4. Génère un rapport d'investissement professionnel avec recommandation basée sur données VÉRIFIÉES`;

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}\n\nIMPORTANT ABSOLU:
- Sois FACTUEL - n'invente JAMAIS de données
- Les startups DOIVENT être RÉELLES (utilise ta connaissance de l'écosystème startup réel)
- Cite TOUJOURS tes sources quand possible (URLs, noms de sources)
- Indique le niveau de confiance pour chaque information
- Si une information n'est pas vérifiable, marque-la clairement
- Le rapport doit être orienté INVESTISSEUR avec données VÉRIFIÉES
- Focus sur: sourcing réel, due diligence factuelle, analyse de risque basée sur faits, recommandation éclairée
- ⚠️ CONTENU DÉTAILLÉ OBLIGATOIRE: Chaque slide DOIT contenir MINIMUM 250-350 mots de contenu substantiel et développé. INTERDIT de faire des slides avec seulement 3 lignes ou des paragraphes courts. Chaque slide doit être un véritable rapport d'analyse avec:
  * Contexte détaillé et approfondi
  * Exemples concrets et chiffres précis
  * Analyse critique et argumentation développée
  * Implications et perspectives
  * Comparaisons et benchmarks quand pertinent
- ARGUMENTAIRE ÉTOFFÉ: Développe CHAQUE point avec exemples détaillés, données précises, contexte complet, analyse approfondie. Ne fais JAMAIS de listes à puces courtes sans développement.
- SOURCES: Inclus des URLs réelles (Crunchbase, LinkedIn, site web, articles de presse, etc.) dans les champs "sources"

Réponds UNIQUEMENT avec du JSON valide, sans formatage markdown.`;

    // Use Google Gemini API directly (free tier: 15 requests/minute)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.3, // Réduit pour plus de précision
          topK: 20,
          topP: 0.9,
          maxOutputTokens: 16384, // Augmenté pour plusieurs startups
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Gemini free tier allows 15 requests/minute. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 400) {
        return new Response(JSON.stringify({ error: "Invalid API key or request. Please check your GEMINI_API_KEY." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: `Gemini API error: ${errorText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("Raw AI response length:", content.length);

    // Parse the JSON response
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
      console.error("Content was:", content.substring(0, 1000));
      throw new Error("Failed to parse AI analysis response");
    }

    // Validation: Vérifier que les startups sont bien dans un array
    if (!Array.isArray(analysisResult.startups)) {
      // Si c'est un seul objet, le convertir en array
      if (analysisResult.startup) {
        analysisResult.startups = [analysisResult.startup];
        delete analysisResult.startup;
      } else {
        analysisResult.startups = [];
      }
    }

    // Validation: Vérifier que les rapports sont bien dans un array
    if (!Array.isArray(analysisResult.dueDiligenceReports)) {
      // Si c'est un seul rapport, le convertir en array
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
    console.log("Confidence level:", analysisResult.analysisMetadata?.confidence || "N/A");
    console.log("Verification level:", analysisResult.analysisMetadata?.verificationLevel || "N/A");

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
    
    const errorDetails = error instanceof Error && error.stack 
      ? { message: errorMessage, stack: error.stack }
      : { message: errorMessage };
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: process.env.DENO_ENV === 'development' ? errorDetails : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
