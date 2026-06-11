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

  const baseBudget = opts.maxTokens ?? 4096;
  const isFlash25 = /2\.5-flash/.test(model);
  const generationConfig: any = {
    temperature: opts.temperature ?? 0.3,
    // Les modèles 3.x consomment leurs tokens de "thinking" SUR le budget de
    // sortie : sans marge, le JSON est tronqué en plein milieu (vérifié en
    // E2E : une thèse coupée après le tableau sectors). On ajoute la marge.
    maxOutputTokens: isFlash25 ? baseBudget : baseBudget + 4096,
    ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
  };
  // Sur les modèles flash 2.5, le "thinking" peut consommer tout le budget de
  // sortie et renvoyer une réponse vide. On le désactive pour garantir le JSON.
  if (isFlash25) {
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
        const candidate = data.candidates?.[0];
        if (candidate?.finishReason === "MAX_TOKENS") {
          logger.warn("Gemini : sortie tronquée (MAX_TOKENS)", { model });
        }
        // Les modèles "thinking" peuvent renvoyer plusieurs parts ; on ne
        // garde que les parts texte non-thought.
        const parts = candidate?.content?.parts ?? [];
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

// Répare un JSON tronqué : ferme les chaînes/objets/tableaux restés ouverts.
// Indispensable avec les modèles thinking dont la sortie peut être coupée.
function salvageJson(s: string): string | null {
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === "\\" && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") stack.push("}");
    else if (c === "[") stack.push("]");
    else if (c === "}" || c === "]") stack.pop();
  }
  if (stack.length === 0 && !inStr) return null; // déjà équilibré : rien à réparer
  let out = s.replace(/,\s*$/, "");
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, "");
  while (stack.length) out += stack.pop();
  return out;
}

// Extrait le JSON d'une réponse texte (gère les blocs ```json``` et la troncature)
function extractJson(raw: string): unknown {
  const clean = raw.trim();
  // Bloc code markdown
  const mdMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) return JSON.parse(mdMatch[1].trim());

  const firstBrace = clean.indexOf("{");
  const firstBracket = clean.indexOf("[");

  // Objet JSON (cas nominal) — y compris tronqué : on tente la réparation
  // AVANT de retomber sur un fragment (un tableau interne complet n'est PAS
  // une réponse valide, cf. bug thèse → ["Deeptech",...]).
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = clean.lastIndexOf("}");
    const slice = lastBrace > firstBrace
      ? clean.slice(firstBrace, lastBrace + 1)
      : clean.slice(firstBrace);
    try { return JSON.parse(slice); } catch { /* réparations */ }
    try { return JSON.parse(slice.replace(/,(\s*[}\]])/g, "$1")); } catch { /* salvage */ }
    const salvaged = salvageJson(clean.slice(firstBrace));
    if (salvaged) return JSON.parse(salvaged);
    throw new Error("JSON objet irrécupérable dans la réponse IA");
  }

  if (firstBracket !== -1) {
    const lastBracket = clean.lastIndexOf("]");
    const slice = lastBracket > firstBracket
      ? clean.slice(firstBracket, lastBracket + 1)
      : clean.slice(firstBracket);
    try { return JSON.parse(slice); } catch { /* salvage */ }
    const salvaged = salvageJson(clean.slice(firstBracket));
    if (salvaged) return JSON.parse(salvaged);
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
      logger.warn("Réponse IA non-JSON — retry budget doublé", { preview: raw.slice(0, 120) });
    }
  }
  // Retry unique (réponse vide ou JSON irrécupérable) avec budget doublé :
  // la cause la plus fréquente est la troncature MAX_TOKENS.
  await sleep(500);
  const raw2 = await callGemini(systemPrompt, userPrompt, {
    ...opts,
    maxTokens: (opts.maxTokens ?? 4096) * 2,
    jsonMode: true,
  });
  return extractJson(raw2);
}
