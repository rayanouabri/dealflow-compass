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
  // Rotation de clés : on cumule le quota journalier de plusieurs clés gratuites.
  // Sur 429 (quota épuisé sur une clé) → on bascule sur la clé suivante.
  const keys = [
    Deno.env.get("GEMINI_API_KEY"),
    Deno.env.get("GEMINI_KEY_2"),
    Deno.env.get("GEMINI_KEY_3"),
  ].filter((k): k is string => !!k);
  const uniqueKeys = [...new Set(keys)];
  if (uniqueKeys.length === 0) throw new Error("GEMINI_API_KEY manquant");

  // Lit le modèle configuré (cohérent avec le reste du projet) — gemini-1.5
  // est retiré par Google. Défaut sur 2.5-flash.
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

  const generationConfig: any = {
    temperature: opts.temperature ?? 0.3,
    maxOutputTokens: opts.maxTokens ?? 4096,
    ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
  };
  // Sur les modèles flash 2.5, le "thinking" peut consommer tout le budget de
  // sortie et renvoyer une réponse vide. On le désactive pour garantir le JSON.
  if (/2\.5-flash/.test(model)) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const body: any = {
    contents: [
      { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
    ],
    generationConfig,
  };

  let lastTxt = "";
  // Clé en header (pas en query string) : les URLs finissent dans les logs
  // d'erreurs fetch et les proxies, pas les headers.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  for (const key of uniqueKeys) {
    // Retry sur 503 (transitoire) ; sur 429 (quota) on passe à la clé suivante.
    for (let attempt = 0; attempt < 3; attempt++) {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        const data = await resp.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      }

      lastTxt = await resp.text();
      if (resp.status === 503 && attempt < 2) {
        await sleep(800 * Math.pow(2, attempt)); // 0.8s, 1.6s
        continue;
      }
      if (resp.status === 429) break; // quota épuisé sur cette clé → clé suivante
      throw new Error(`Gemini ${resp.status}: ${lastTxt}`);
    }
  }
  throw new Error(`Gemini échec (toutes clés en quota): ${lastTxt}`);
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

  // On agrège les erreurs de chaque provider : ne remonter que la dernière
  // masquait la cause racine (ex: quota Gemini caché derrière "GROQ_API_KEY
  // manquant" parce que Groq était le dernier maillon de la chaîne).
  const errors: string[] = [];

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
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${fn.name}: ${msg.slice(0, 300)}`);
      logger.warn(`Provider ${fn.name} échoué — fallback`, { error: String(err) });
    }
  }

  throw new Error(
    `Tous les providers IA ont échoué — ${errors.join(" | ") || "aucune réponse exploitable"}`,
  );
}
