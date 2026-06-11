// Client IA : Gemini REST uniquement.
// Les fallbacks Vertex (VERTEX_AI_TOKEN jamais configuré, modèle retiré) et
// Groq (modèle décommissionné) étaient des maillons morts : ils ne faisaient
// qu'ajouter de la latence et masquer la cause racine des erreurs.
// Lit les clés depuis Deno.env — jamais hardcodé.
import { logger } from "./logger.ts";

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Gemini REST ---
async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  opts: AIOptions,
): Promise<string> {
  // Rotation de clés : on cumule le quota journalier de plusieurs clés.
  // Sur 429 (quota épuisé sur une clé) → on bascule sur la clé suivante.
  const keys = [
    Deno.env.get("GEMINI_API_KEY"),
    Deno.env.get("GEMINI_KEY_2"),
    Deno.env.get("GEMINI_KEY_3"),
  ].filter((k): k is string => !!k);
  const uniqueKeys = [...new Set(keys)];
  if (uniqueKeys.length === 0) throw new Error("GEMINI_API_KEY manquant");

  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

  const generationConfig: any = {
    temperature: opts.temperature ?? 0.3,
    maxOutputTokens: opts.maxTokens ?? 4096,
    ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
  };
  // Sur les modèles flash 2.5, le "thinking" peut consommer tout le budget de
  // sortie et renvoyer une réponse vide. On le désactive pour garantir le JSON.
  // (Les modèles 3.x gèrent leur thinking séparément — ne pas forcer.)
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
    // Retry sur 5xx (transitoire) ; sur 429 (quota) on passe à la clé suivante.
    for (let attempt = 0; attempt < 3; attempt++) {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        const data = await resp.json();
        // parts[-1] : les modèles "thinking" peuvent renvoyer plusieurs parts,
        // le texte final est toujours la dernière.
        const parts = data.candidates?.[0]?.content?.parts ?? [];
        const textParts = parts
          .filter((p: any) => typeof p?.text === "string" && !p?.thought)
          .map((p: any) => p.text);
        return textParts.join("") || "";
      }

      lastTxt = await resp.text();
      if ((resp.status === 503 || resp.status >= 500) && attempt < 2) {
        await sleep(800 * Math.pow(2, attempt)); // 0.8s, 1.6s
        continue;
      }
      if (resp.status === 429) break; // quota épuisé sur cette clé → clé suivante
      throw new Error(`Gemini ${resp.status}: ${lastTxt.slice(0, 400)}`);
    }
  }
  throw new Error(`Gemini: toutes les clés en quota (429) — ${lastTxt.slice(0, 400)}`);
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

// Point d'entrée unifié. Un seul provider (Gemini) avec rotation de clés ;
// un retry après JSON mal formé.
export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  opts: AIOptions = {},
): Promise<unknown> {
  const raw = await callGemini(systemPrompt, userPrompt, { ...opts, jsonMode: true });
  if (raw.trim()) {
    try {
      return extractJson(raw);
    } catch {
      logger.warn("Réponse IA non-JSON — retry", { preview: raw.slice(0, 120) });
    }
  }
  // Retry unique (réponse vide ou JSON mal formé)
  await sleep(500);
  const raw2 = await callGemini(systemPrompt, userPrompt, { ...opts, jsonMode: true });
  return extractJson(raw2);
}
