// Client IA : Gemini REST uniquement.
// Les fallbacks Vertex (VERTEX_AI_TOKEN jamais configuré, modèle retiré) et
// Groq (modèle décommissionné) étaient des maillons morts : ils ne faisaient
// qu'ajouter de la latence et masquer la cause racine des erreurs.
// Lit les clés depuis Deno.env — jamais hardcodé.
import { logger } from "./logger.ts";
import { getCachedSearch, setCachedSearch } from "./search-cache.ts";

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  // Si fourni : la réponse est servie/mise en cache (search_cache, préfixe
  // "ai|") — les inputs identiques ne consomment plus de quota free-tier.
  cacheKey?: string;
  cacheTtlDays?: number;
  // Garde de forme : un résultat qui ne passe pas n'est ni mis en cache ni
  // servi depuis le cache (évite d'empoisonner le cache avec un JSON tronqué).
  validate?: (result: unknown) => boolean;
  // Surcharge du modèle pour cet appel (ex: "gemini-2.5-pro" pour la thèse).
  model?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Garde-fou free tier ---------------------------------------------------
// Réserve un appel IA dans le compteur journalier (RPC service-role). Au-delà
// du plafond (AI_DAILY_LIMIT, défaut 240 — free tier 2.5-flash = 250/jour),
// on refuse AVANT de contacter Gemini : le quota Google n'est jamais dépassé.
export async function reserveAiCall(): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return; // env locale incomplète : ne pas bloquer
  const limit = Number(Deno.env.get("AI_DAILY_LIMIT") ?? "240");
  try {
    const res = await fetch(`${url}/rest/v1/rpc/increment_ai_usage`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!res.ok) return; // le compteur ne doit jamais casser l'app
    const calls = await res.json();
    if (typeof calls === "number" && calls > limit) {
      throw new Error(
        `Budget IA journalier épuisé (${calls}/${limit}, free tier). Réessayez demain ou ajoutez une clé GEMINI_KEY_2.`,
      );
    }
    if (typeof calls === "number" && calls % 25 === 0) {
      logger.info("Budget IA journalier", { calls, limit });
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Budget IA")) throw err;
    // Erreur réseau du compteur : non bloquant
  }
}

// Extrait le retryDelay (secondes) d'un corps d'erreur 429 Gemini.
// Présent sur les 429 de rythme (RPM) — absent/énorme sur les 429 de quota
// journalier ou de facturation.
function parseRetryDelaySec(body: string): number | null {
  const m = body.match(/retryDelay["']?\s*:\s*["']?(\d+)/);
  return m ? Number(m[1]) : null;
}

// --- Gemini REST ---
async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  opts: AIOptions,
): Promise<string> {
  // Rotation de clés : 9 clés distribuent le quota journalier et le RPM.
  // Sélection aléatoire initiale pour équilibrer la charge ; sur 429 (quota
  // épuisé sur une clé) → on bascule sur les suivantes.
  const allKeys = [
    Deno.env.get("GEMINI_API_KEY"),
    Deno.env.get("GEMINI_KEY_2"),
    Deno.env.get("GEMINI_KEY_3"),
    Deno.env.get("GEMINI_KEY_4"),
    Deno.env.get("GEMINI_KEY_5"),
    Deno.env.get("GEMINI_KEY_6"),
    Deno.env.get("GEMINI_KEY_7"),
    Deno.env.get("GEMINI_KEY_8"),
    Deno.env.get("GEMINI_KEY_9"),
  ].filter((k): k is string => !!k);
  const uniqueKeys = [...new Set(allKeys)];
  if (uniqueKeys.length === 0) throw new Error("GEMINI_API_KEY manquant");
  // Mélanger pour distribuer la charge sur les 9 clés (RPM équilibré)
  const shuffled = [...uniqueKeys].sort(() => Math.random() - 0.5);

  const model = opts.model ?? Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash";

  const baseBudget = opts.maxTokens ?? 4096;
  const isFlash = /flash/.test(model);
  const isPro = /pro/.test(model);
  const generationConfig: any = {
    temperature: opts.temperature ?? 0.3,
    maxOutputTokens: baseBudget,
    ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
  };
  // Flash 2.5 : désactive thinking (thinkingBudget: 0 garanti le budget JSON).
  // Pro 2.5 : thinking obligatoire — on alloue un budget minimal (1024) et
  // augmente le budget de sortie pour absorber les tokens COT.
  if (isFlash) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  } else if (isPro) {
    generationConfig.thinkingConfig = { thinkingBudget: 1024 };
    generationConfig.maxOutputTokens = baseBudget + 2048;
  }

  const body: any = {
    contents: [
      { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
    ],
    generationConfig,
  };

  await reserveAiCall();

  let lastTxt = "";
  // Clé en header (pas en query string) : les URLs finissent dans les logs
  // d'erreurs fetch et les proxies, pas les headers.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  for (const key of shuffled) {
    let rateWaits = 0;
    // Retry sur 5xx (transitoire) et 429 de rythme (RPM, avec retryDelay) ;
    // sur 429 de quota journalier → clé suivante.
    for (let attempt = 0; attempt < 4; attempt++) {
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
      if ((resp.status === 503 || resp.status >= 500) && attempt < 3) {
        await sleep(800 * Math.pow(2, attempt)); // 0.8s, 1.6s, 3.2s
        continue;
      }
      if (resp.status === 429) {
        // 429 de rythme (free tier RPM) : Google indique quand réessayer.
        const delaySec = parseRetryDelaySec(lastTxt);
        if (delaySec !== null && delaySec <= 40 && rateWaits < 2) {
          rateWaits++;
          logger.info("Gemini 429 RPM — attente retryDelay", { delaySec });
          await sleep((delaySec + 1) * 1000);
          continue;
        }
        break; // quota journalier/facturation sur cette clé → clé suivante
      }
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
  // Cache : un input identique (même thèse de fonds, mêmes candidats) ne
  // reconsomme pas de quota free-tier.
  if (opts.cacheKey) {
    const cached = await getCachedSearch<unknown>(`ai|${opts.cacheKey}`, 1);
    if (cached && cached.length > 0 && (!opts.validate || opts.validate(cached[0]))) {
      logger.info("Cache IA hit", { cacheKey: opts.cacheKey });
      return cached[0];
    }
  }

  let result: unknown;
  const raw = await callGemini(systemPrompt, userPrompt, { ...opts, jsonMode: true });
  if (raw.trim()) {
    try {
      result = extractJson(raw);
    } catch {
      logger.warn("Réponse IA non-JSON — retry budget doublé", { preview: raw.slice(0, 120) });
    }
  }
  if (result === undefined) {
    // Retry unique (réponse vide ou JSON irrécupérable) avec budget doublé :
    // la cause la plus fréquente est la troncature MAX_TOKENS.
    await sleep(500);
    const raw2 = await callGemini(systemPrompt, userPrompt, {
      ...opts,
      maxTokens: (opts.maxTokens ?? 4096) * 2,
      jsonMode: true,
    });
    result = extractJson(raw2);
  }

  if (
    opts.cacheKey && result !== undefined && result !== null &&
    (!opts.validate || opts.validate(result))
  ) {
    await setCachedSearch(`ai|${opts.cacheKey}`, 1, [result], opts.cacheTtlDays ?? 7);
  }
  return result;
}
