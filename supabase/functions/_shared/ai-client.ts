// Client IA unifié : Groq, Gemini REST, Vertex AI
// Lit les clés depuis Deno.env — jamais hardcodé
import { logger } from "./logger.ts";

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Groq ---
async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  opts: AIOptions,
): Promise<string> {
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY manquant");

  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 4096,
      ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Groq ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// --- Gemini REST ---
async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  opts: AIOptions,
): Promise<string> {
  const GEMINI_API_KEY =
    Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GEMINI_KEY_2");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY manquant");

  const model = "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const body: any = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
      },
    ],
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      maxOutputTokens: opts.maxTokens ?? 4096,
      ...(opts.jsonMode
        ? { responseMimeType: "application/json" }
        : {}),
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  );
}

// --- Vertex AI ---
async function callVertex(
  systemPrompt: string,
  userPrompt: string,
  opts: AIOptions,
): Promise<string> {
  const projectId = Deno.env.get("VERTEX_AI_PROJECT_ID");
  const location = Deno.env.get("VERTEX_AI_LOCATION") ?? "us-central1";
  const token = Deno.env.get("VERTEX_AI_TOKEN");
  if (!projectId || !token) throw new Error("VERTEX_AI_PROJECT_ID ou VERTEX_AI_TOKEN manquant");

  const model = "gemini-1.5-flash";
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature: opts.temperature ?? 0.3,
        maxOutputTokens: opts.maxTokens ?? 4096,
      },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Vertex ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  );
}

// Extrait le JSON d'une réponse texte (gère les blocs ```json```)
function extractJson(raw: string): unknown {
  const clean = raw.trim();
  // Bloc code markdown
  const mdMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) return JSON.parse(mdMatch[1].trim());
  // JSON brut
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  const firstBracket = clean.indexOf("[");
  const lastBracket = clean.lastIndexOf("]");

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
  }
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    return JSON.parse(clean.slice(firstBracket, lastBracket + 1));
  }
  throw new Error("Aucun JSON détecté dans la réponse IA");
}

// Point d'entrée unifié avec fallback automatique
export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  opts: AIOptions = {},
): Promise<unknown> {
  const provider =
    (Deno.env.get("AI_PROVIDER") ?? "gemini").toLowerCase();

  const providers = provider === "groq"
    ? [callGroq, callGemini, callVertex]
    : provider === "vertex"
    ? [callVertex, callGemini, callGroq]
    : [callGemini, callGroq, callVertex]; // gemini par défaut

  let lastError: Error | null = null;

  for (const fn of providers) {
    try {
      const raw = await fn(systemPrompt, userPrompt, { ...opts, jsonMode: true });
      if (!raw.trim()) continue;
      try {
        return extractJson(raw);
      } catch {
        // Retry avec le même provider (JSON mal formé)
        await sleep(500);
        const raw2 = await fn(systemPrompt, userPrompt, { ...opts, jsonMode: true });
        return extractJson(raw2);
      }
    } catch (err) {
      lastError = err as Error;
      logger.warn(`Provider ${fn.name} échoué — fallback`, { error: String(err) });
    }
  }

  throw lastError ?? new Error("Tous les providers IA ont échoué");
}
