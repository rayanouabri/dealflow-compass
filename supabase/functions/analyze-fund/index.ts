import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fundName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Analyzing fund: ${fundName}`);

    const systemPrompt = `Tu es un analyste VC senior avec une connaissance approfondie de l'écosystème mondial du capital-risque.
Tu dois rechercher et analyser un fonds VC de manière RIGOUREUSE et FACTUELLE.

INSTRUCTIONS CRITIQUES:
1. Recherche les informations RÉELLES et VÉRIFIABLES sur le fonds
2. Inclus des SOURCES et RÉFÉRENCES pour chaque information clé
3. Si tu ne trouves pas d'information vérifiable, indique "Non vérifié" ou "Estimation basée sur..."
4. Utilise ta connaissance des fonds VC réels (Sequoia, a16z, Accel, Index, Balderton, etc.)

Tu dois répondre avec un objet JSON valide contenant:

1. "fundInfo": Informations vérifiées sur le fonds:
   - "officialName": Nom officiel complet
   - "website": Site web officiel (si connu)
   - "headquarters": Siège social
   - "foundedYear": Année de création
   - "aum": Assets Under Management (si connu)
   - "teamSize": Taille de l'équipe d'investissement
   - "keyPartners": Array des partners principaux avec leurs noms
   - "notablePortfolio": Array de 5-10 investissements notables RÉELS
   - "recentNews": Array de 2-3 actualités récentes ou deals
   - "sources": Array des sources utilisées pour ces informations

2. "investmentThesis": Critères d'investissement:
   - "sectors": Array des secteurs focus (basé sur leur portfolio réel)
   - "stage": Stade d'investissement préféré
   - "geography": Régions cibles
   - "ticketSize": Taille de ticket moyenne
   - "description": Description détaillée de leur thèse
   - "differentiators": Ce qui distingue ce fonds des autres
   - "valueAdd": Valeur ajoutée pour les startups (réseau, expertise, etc.)

3. "startup": Startup fictive mais RÉALISTE qui correspond parfaitement:
   - "name": Nom de la startup
   - "tagline": Description en une ligne
   - "sector": Secteur principal
   - "stage": Stade actuel
   - "location": Siège
   - "founded": Année de création
   - "teamSize": Nombre d'employés
   - "problem": Problème adressé (détaillé)
   - "solution": Solution proposée (détaillée)
   - "businessModel": Modèle économique
   - "competitors": Concurrents principaux
   - "moat": Avantage compétitif

4. "pitchDeck": Array de 8 slides détaillés:
   Slide 1: Title & The Ask
   - "title": "Executive Summary"
   - "content": Résumé exécutif complet
   - "keyPoints": Points clés
   - "metrics": { "askAmount": montant, "valuation": valorisation, "useOfFunds": allocation }
   
   Slide 2: The Problem
   - "title": "Market Problem"
   - "content": Description détaillée du problème
   - "keyPoints": Points de douleur
   - "metrics": { "marketPainSize": taille du problème, "currentSolutions": solutions actuelles }
   
   Slide 3: The Solution
   - "title": "Our Solution"
   - "content": Description de la solution
   - "keyPoints": Fonctionnalités clés
   - "metrics": { "techStack": technologies, "patents": brevets si applicable }
   
   Slide 4: Market Size
   - "title": "Market Opportunity"
   - "content": Analyse de marché
   - "keyPoints": Tendances
   - "metrics": { "tam": TAM en $, "sam": SAM en $, "som": SOM en $, "cagr": croissance % }
   
   Slide 5: Traction & Metrics
   - "title": "Traction"
   - "content": Métriques de performance
   - "keyPoints": Jalons atteints
   - "metrics": { "arr": ARR, "mrrGrowth": croissance MRR %, "customers": nb clients, "nrr": Net Revenue Retention % }
   
   Slide 6: Why This Fund
   - "title": "Strategic Fit with ${fundName}"
   - "content": Pourquoi ce fonds spécifiquement (basé sur leur thèse RÉELLE)
   - "keyPoints": Synergies avec leur portfolio
   - "metrics": { "portfolioSynergies": entreprises portfolio similaires }
   
   Slide 7: Team
   - "title": "The Team"
   - "content": Présentation de l'équipe fondatrice
   - "keyPoints": Background et expertise
   - "metrics": { "founders": nb fondateurs, "advisors": advisors notables }
   
   Slide 8: Investment Recommendation
   - "title": "Investment Thesis"
   - "content": Recommandation d'investissement
   - "keyPoints": Raisons d'investir
   - "metrics": { "targetReturn": multiple cible, "exitStrategy": stratégie de sortie }

5. "analysisMetadata": Métadonnées de l'analyse:
   - "confidence": Niveau de confiance dans les données (high/medium/low)
   - "dataQuality": Qualité des données trouvées
   - "limitations": Limitations de l'analyse
   - "lastUpdated": Date de dernière mise à jour des infos`;

    const userPrompt = `Analyse le fonds de capital-risque "${fundName}" de manière APPROFONDIE et FACTUELLE.

ÉTAPES D'ANALYSE:
1. Identifie le fonds exact (vérifie l'orthographe, trouve le nom officiel)
2. Recherche leurs investissements récents et historiques
3. Analyse leur thèse d'investissement basée sur leur portfolio RÉEL
4. Identifie leurs partners et leur expertise
5. Génère une startup qui correspondrait PARFAITEMENT à leur thèse
6. Crée un pitch deck professionnel et convaincant

IMPORTANT:
- Sois FACTUEL - n'invente pas de données sur le fonds
- Cite tes sources quand possible
- Indique ton niveau de confiance pour chaque information
- La startup peut être fictive mais doit être RÉALISTE et correspondre exactement à leur thèse

Réponds UNIQUEMENT avec du JSON valide, sans formatage markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

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

    console.log("Analysis complete for:", fundName);
    console.log("Fund info found:", analysisResult.fundInfo?.officialName || "N/A");
    console.log("Confidence level:", analysisResult.analysisMetadata?.confidence || "N/A");

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-fund function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});