import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface QARequest {
  question: string;
  startupData: any;
  investmentThesis?: any;
  fundName?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

serve(async (req) => {
  // Handle CORS preflight requests FIRST
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
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

    const { question, startupData, investmentThesis, fundName, conversationHistory = [] } = requestData;

    if (!question || !question.trim()) {
      return new Response(JSON.stringify({ 
        error: "Question is required." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!startupData || !startupData.name) {
      return new Response(JSON.stringify({ 
        error: "Startup data is required." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Gemini API (preferred) or Groq
    const GEMINI_API_KEY = Deno.env.get("GEMINI_KEY_2");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const AI_PROVIDER = GEMINI_API_KEY ? "gemini" : (GROQ_API_KEY ? "groq" : null);

    if (!AI_PROVIDER) {
      return new Response(JSON.stringify({ 
        error: "No AI provider configured. Please add GEMINI_KEY_2 or GROQ_API_KEY in Supabase Dashboard > Edge Functions > ai-qa > Settings > Secrets.",
        setupRequired: true
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // Build conversation history context
    const historyContext = conversationHistory.length > 0
      ? `\nHISTORIQUE DE LA CONVERSATION:\n${conversationHistory.map((msg, idx) => 
          `${msg.role === "user" ? "Utilisateur" : "Assistant"}: ${msg.content}`
        ).join("\n")}\n`
      : "";

    const systemPrompt = `Tu es un assistant expert en analyse de startups pour AI-VC. Réponds aux questions sur les startups analysées en utilisant UNIQUEMENT les données fournies. Cite les sources quand disponibles. Si une information manque, dis-le clairement. Fournis des analyses structurées et professionnelles.`;

    const userPrompt = `${startupContext}

${metricsContext}

${thesisContext}

${historyContext}

QUESTION: ${question}`;

    let answer = "";
    let sources: Array<{ name: string; url: string }> = [];

    if (AI_PROVIDER === "gemini") {
      // Use Gemini API
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
      
      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\n${userPrompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
      }

      const geminiData = await geminiResponse.json();
      answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, je n'ai pas pu générer de réponse.";

      // Extract sources from the answer if mentioned
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = answer.match(urlRegex) || [];
      sources = urls.map((url, idx) => ({
        name: `Source ${idx + 1}`,
        url: url,
      }));

    } else if (AI_PROVIDER === "groq") {
      // Use Groq API
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
            ...conversationHistory.map(msg => ({
              role: msg.role === "user" ? "user" : "assistant",
              content: msg.content,
            })),
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
      }

      const groqData = await groqResponse.json();
      answer = groqData.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse.";

      // Extract sources from the answer if mentioned
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = answer.match(urlRegex) || [];
      sources = urls.map((url, idx) => ({
        name: `Source ${idx + 1}`,
        url: url,
      }));
    }

    return new Response(
      JSON.stringify({
        answer,
        sources,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

