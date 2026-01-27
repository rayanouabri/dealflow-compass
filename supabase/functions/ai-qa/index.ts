import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://ai-vc-sourcing.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

interface QARequest {
  question: string;
  startupData: any;
  investmentThesis?: any;
  fundName?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  extra_snippets?: string[];
}

// Fonction pour valider et nettoyer une URL
function validateAndCleanUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  let cleanUrl = url.trim();
  
  // Enlever les caractères de fin de phrase et de ponctuation
  cleanUrl = cleanUrl.replace(/[.,;:!?)\]\}]+$/, '');
  
  // Enlever les caractères de début de phrase
  cleanUrl = cleanUrl.replace(/^[(\[\{]+/, '');
  
  // S'assurer que l'URL commence par http:// ou https://
  if (!cleanUrl.match(/^https?:\/\//i)) {
    if (cleanUrl.startsWith('www.')) {
      cleanUrl = 'https://' + cleanUrl;
    } else if (cleanUrl.includes('.') && !cleanUrl.includes(' ')) {
      cleanUrl = 'https://' + cleanUrl;
    } else {
      return null; // URL invalide
    }
  }
  
  // Valider le format d'URL
  try {
    const urlObj = new URL(cleanUrl);
    // S'assurer que c'est un domaine valide (pas juste un chemin)
    if (!urlObj.hostname || urlObj.hostname.length < 3) return null;
    // Rejeter les URLs locales ou invalides
    if (urlObj.hostname === 'localhost' || 
        urlObj.hostname.startsWith('127.') || 
        urlObj.hostname.startsWith('192.') ||
        urlObj.hostname.startsWith('10.') ||
        urlObj.hostname === '0.0.0.0') {
      return null;
    }
    // Rejeter les URLs avec des caractères invalides
    if (cleanUrl.includes(' ') || cleanUrl.includes('\n') || cleanUrl.includes('\t')) {
      return null;
    }
    return cleanUrl;
  } catch {
    return null;
  }
}

async function braveSearch(query: string, count: number = 4): Promise<BraveSearchResult[]> {
  const key = Deno.env.get("BRAVE_API_KEY");
  if (!key) return [];
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&text_decorations=false&result_filter=web`,
      { headers: { "Accept": "application/json", "X-Subscription-Token": key } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.web?.results || []).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      description: r.description || "",
      extra_snippets: r.extra_snippets || [],
    }));
  } catch {
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight requests FIRST
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders(req)
    });
  }

  try {
    let requestData: QARequest;
    try {
      const bodyText = await req.text();
      if (!bodyText) {
        return new Response(JSON.stringify({ 
          error: "Request body is empty. Please provide a question." 
        }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      requestData = JSON.parse(bodyText);
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(JSON.stringify({ 
        error: `Invalid JSON in request body: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}` 
      }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { question, startupData, investmentThesis, fundName, conversationHistory = [] } = requestData;

    if (!question || !question.trim()) {
      return new Response(JSON.stringify({ 
        error: "Question is required." 
      }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!startupData || !startupData.name) {
      return new Response(JSON.stringify({ 
        error: "Startup data is required." 
      }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Configuration AI : Gemini ou Vertex AI
    const AI_PROVIDER = (Deno.env.get("AI_PROVIDER") || "gemini").toLowerCase();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_KEY_2") || Deno.env.get("GEMINI_API_KEY");
    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro";
    const VERTEX_AI_PROJECT = Deno.env.get("VERTEX_AI_PROJECT_ID");
    const VERTEX_AI_LOCATION = Deno.env.get("VERTEX_AI_LOCATION") || "us-central1";
    const VERTEX_AI_MODEL = Deno.env.get("VERTEX_AI_MODEL") || "gemini-pro";
    
    const getAIEndpoint = () => {
      if (AI_PROVIDER === "vertex") {
        if (!VERTEX_AI_PROJECT) {
          throw new Error("VERTEX_AI_PROJECT_ID requis pour Vertex AI");
        }
        return {
          url: `https://${VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_AI_PROJECT}/locations/${VERTEX_AI_LOCATION}/publishers/google/models/${VERTEX_AI_MODEL}:generateContent`,
          headers: { "Content-Type": "application/json" },
        };
      } else {
        if (!GEMINI_API_KEY) {
          throw new Error("GEMINI_API_KEY requis pour Gemini");
        }
        return {
          url: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
          headers: { "Content-Type": "application/json" },
        };
      }
    };
    
    try {
      getAIEndpoint(); // Test config
    } catch (configError) {
      const errorMsg = configError instanceof Error ? configError.message : String(configError);
      return new Response(JSON.stringify({ 
        error: `Configuration AI invalide: ${errorMsg}\n\nPour Gemini: GEMINI_KEY_2 ou GEMINI_API_KEY\nPour Vertex AI: VERTEX_AI_PROJECT_ID\nModèle: ${AI_PROVIDER === "vertex" ? VERTEX_AI_MODEL : GEMINI_MODEL}`,
        setupRequired: true
      }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Build context from startup data
    const startupContext = `
INFORMATIONS SUR LA STARTUP ANALYSÉE :

Nom: ${startupData.name}
Secteur: ${startupData.sector || "Non spécifié"}
Stade: ${startupData.stage || "Non spécifié"}
Localisation: ${startupData.location || "Non spécifié"}
Fondée en: ${startupData.founded || "Non spécifié"}
Taille de l'équipe: ${startupData.teamSize || "Non spécifié"}

${startupData.problem ? `Problème résolu: ${startupData.problem}` : ''}
${startupData.solution ? `Solution: ${startupData.solution}` : ''}
${startupData.businessModel ? `Modèle économique: ${startupData.businessModel}` : ''}
${startupData.competitors ? `Concurrents: ${startupData.competitors}` : ''}
${startupData.moat ? `Avantage concurrentiel: ${startupData.moat}` : ''}
`;

    // Extract metrics from due diligence report if available
    let metricsContext = "";
    if (startupData.dueDiligenceReport && Array.isArray(startupData.dueDiligenceReport)) {
      const metricsSlide = startupData.dueDiligenceReport.find(
        (slide: any) => slide.title?.toLowerCase().includes("metrics") || 
                      slide.title?.toLowerCase().includes("traction") ||
                      slide.title?.toLowerCase().includes("business")
      );
      if (metricsSlide) {
        metricsContext = `
MÉTRIQUES FINANCIÈRES ET DE TRACTION:
${JSON.stringify(metricsSlide.metrics || {}, null, 2)}
${metricsSlide.content || ''}
`;
      }
    }

    const thesisContext = investmentThesis ? `
THÈSE D'INVESTISSEMENT DU FONDS ${fundName || ''}:
Secteurs cibles: ${investmentThesis.sectors?.join(", ") || "Non spécifié"}
Stade: ${investmentThesis.stage || "Non spécifié"}
Géographie: ${investmentThesis.geography || "Non spécifié"}
Taille de ticket: ${investmentThesis.ticketSize || "Non spécifié"}
Description: ${investmentThesis.description || "Non spécifié"}
` : "";

    const historyContext = conversationHistory.length > 0
      ? `\nHISTORIQUE DE LA CONVERSATION:\n${conversationHistory.map((msg) => 
          `${msg.role === "user" ? "Utilisateur" : "Assistant"}: ${msg.content}`
        ).join("\n")}\n`
      : "";

    // Couches Brave : actualités, funding, question ciblée
    const name = startupData.name || "";
    const braveQueries = [
      `${name} startup news 2024 2025`,
      `${name} funding valuation investors`,
    ];
    const qLower = question.toLowerCase().trim();
    if (qLower.length > 10 && !qLower.includes("?")) {
      braveQueries.push(`${name} ${question.slice(0, 60).trim()}`);
    }
    let braveContext = "";
    const allBraveResults: BraveSearchResult[] = [];
    for (const q of braveQueries.slice(0, 3)) {
      const results = await braveSearch(q, 4);
      allBraveResults.push(...results);
      await new Promise((r) => setTimeout(r, 350));
    }
    if (allBraveResults.length > 0) {
      braveContext = `\n\nRECHERCHE WEB (Brave) - données récentes sur ${name}:\n${allBraveResults
        .slice(0, 10)
        .map((r) => `[${r.title}] ${r.description} | ${r.url}`)
        .join("\n")}`;
    }

    const systemPrompt = `Tu es l'assistant IA d'AI-VC, expert en analyse de startups. Tu réponds aux questions sur les startups en t'appuyant sur :
1. Les données d'analyse fournies (métriques, thèse, due diligence).
2. Les résultats de recherche web (Brave) quand présents — cite les URLs quand tu t'en sers.

RÈGLES IMPORTANTES :
- Réfléchis avant de répondre. Structure ta réponse clairement.
- Cite TOUJOURS les sources (URLs complètes) quand tu utilises des données web.
- Inclus au moins 3-5 sources URL valides dans ta réponse quand tu utilises des données web.
- N'utilise JAMAIS de formatage markdown (**bold**, *italic*, etc.) - écris en texte brut.
- Si une info manque, dis-le clairement.
- Reste professionnel et factuel.
- Les URLs doivent être complètes (https://...) et valides.`;

    const userPrompt = `${startupContext}
${metricsContext}
${thesisContext}
${braveContext}
${historyContext}

QUESTION: ${question}`;

    const aiEndpoint = getAIEndpoint();
    const aiRes = await fetch(aiEndpoint.url, {
      method: "POST",
      headers: aiEndpoint.headers,
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: {
          temperature: 0.5,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`${AI_PROVIDER === "vertex" ? "Vertex AI" : "Gemini"} API error: ${aiRes.status} - ${errText}`);
    }

    const aiData = await aiRes.json();
    let answer = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, je n'ai pas pu générer de réponse.";

    // Nettoyer le markdown de la réponse
    answer = answer
      .replace(/\*\*(.*?)\*\*/g, '$1') // Enlever **bold**
      .replace(/\*(.*?)\*/g, '$1') // Enlever *italic*
      .replace(/__(.*?)__/g, '$1') // Enlever __bold__
      .replace(/_(.*?)_/g, '$1') // Enlever _italic_
      .replace(/~~(.*?)~~/g, '$1') // Enlever ~~strikethrough~~
      .replace(/`([^`]+)`/g, '$1') // Enlever `code inline`
      .replace(/```[\s\S]*?```/g, '') // Enlever blocs de code
      .trim();

    // Extraire les URLs de la réponse avec regex amélioré
    const urlRegex = /(https?:\/\/[^\s)\],;:!?<>\n\r\t]+)/gi;
    const foundUrls = answer.match(urlRegex) || [];
    const validUrls: string[] = [];
    const sources: Array<{ name: string; url: string }> = [];
    
    // Valider et nettoyer les URLs trouvées dans la réponse
    for (const url of foundUrls) {
      const cleanUrl = validateAndCleanUrl(url);
      if (cleanUrl && !validUrls.includes(cleanUrl)) {
        validUrls.push(cleanUrl);
        // Extraire un nom de domaine lisible
        try {
          const urlObj = new URL(cleanUrl);
          const domain = urlObj.hostname.replace('www.', '').split('.')[0];
          const domainName = domain.charAt(0).toUpperCase() + domain.slice(1);
          sources.push({ 
            name: domainName || `Source ${sources.length + 1}`, 
            url: cleanUrl 
          });
        } catch {
          sources.push({ name: `Source ${sources.length + 1}`, url: cleanUrl });
        }
      }
    }

    // PRIORITÉ : Ajouter des sources Brave valides (au moins 5-8 sources)
    if (allBraveResults.length > 0) {
      for (const r of allBraveResults.slice(0, 10)) {
        if (r.url && sources.length < 10) {
          const cleanUrl = validateAndCleanUrl(r.url);
          if (cleanUrl && !validUrls.includes(cleanUrl)) {
            validUrls.push(cleanUrl);
            // Utiliser le titre si disponible, sinon le domaine
            let sourceName = r.title?.slice(0, 60).trim();
            if (!sourceName || sourceName.length < 3) {
              try {
                const urlObj = new URL(cleanUrl);
                sourceName = urlObj.hostname.replace('www.', '').split('.')[0];
                sourceName = sourceName.charAt(0).toUpperCase() + sourceName.slice(1);
              } catch {
                sourceName = `Source web ${sources.length + 1}`;
              }
            }
            sources.push({ 
              name: sourceName || "Source web", 
              url: cleanUrl 
            });
          }
        }
      }
    }

    // Si toujours pas assez de sources, compléter avec plus de résultats Brave
    if (sources.length < 5 && allBraveResults.length > 0) {
      for (const r of allBraveResults.slice(5)) {
        if (r.url && sources.length < 10) {
          const cleanUrl = validateAndCleanUrl(r.url);
          if (cleanUrl && !validUrls.includes(cleanUrl)) {
            validUrls.push(cleanUrl);
            const title = r.title?.slice(0, 60).trim() || 
              cleanUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].replace(/\./g, ' ');
            sources.push({ 
              name: title || `Source ${sources.length + 1}`, 
              url: cleanUrl 
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        answer,
        sources,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("AI Q&A error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});

