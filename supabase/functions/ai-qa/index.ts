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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_KEY_2") || Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ 
        error: "Gemini non configuré. Ajoutez GEMINI_KEY_2 ou GEMINI_API_KEY dans Supabase > Edge Functions > ai-qa > Settings > Secrets.",
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

Règles : Réfléchis avant de répondre. Structure ta réponse (titres, listes si pertinent). Cite les sources (URLs) quand tu utilises des données web. Si une info manque, dis-le clairement. Reste professionnel et factuel.`;

    const userPrompt = `${startupContext}
${metricsContext}
${thesisContext}
${braveContext}
${historyContext}

QUESTION: ${question}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API error: ${geminiRes.status} - ${errText}`);
    }

    const geminiData = await geminiRes.json();
    let answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, je n'ai pas pu générer de réponse.";

    const urlRegex = /(https?:\/\/[^\s)]+)/g;
    const urls = answer.match(urlRegex) || [];
    const sources: Array<{ name: string; url: string }> = urls.map((url, idx) => ({
      name: `Source ${idx + 1}`,
      url: url,
    }));
    const uniqueUrls = [...new Set(urls)];
    if (uniqueUrls.length < 3 && allBraveResults.length > 0) {
      for (const r of allBraveResults.slice(0, 5)) {
        if (r.url && !uniqueUrls.includes(r.url)) {
          sources.push({ name: r.title?.slice(0, 50) || "Brave", url: r.url });
          uniqueUrls.push(r.url);
          if (uniqueUrls.length >= 5) break;
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

