import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCachedSearch, setCachedSearch } from "../_shared/search-cache.ts";
import { searchAll } from "../_shared/search-client.ts";
import { reserveAiCall, getGeminiKeys } from "../_shared/ai-client.ts";

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

interface DueDiligenceRequest {
  phase?: "search" | "analyze";
  jobId?: string;
  companyName?: string;
  companyWebsite?: string;
  additionalContext?: string;
}

interface WebSearchResult {
  title: string;
  url: string;
  description: string;
  extra_snippets?: string[];
}

// Fonction pour valider et nettoyer une URL
function validateAndCleanUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  let cleanUrl = url.trim();
  
  cleanUrl = cleanUrl.replace(/[.,;:!?)\]\}]+$/, '');
  cleanUrl = cleanUrl.replace(/^[(\[\{]+/, '');
  
  if (!cleanUrl.match(/^https?:\/\//i)) {
    if (cleanUrl.startsWith('www.')) {
      cleanUrl = 'https://' + cleanUrl;
    } else if (cleanUrl.includes('.') && !cleanUrl.includes(' ')) {
      cleanUrl = 'https://' + cleanUrl;
    } else {
      return null;
    }
  }
  
  try {
    const urlObj = new URL(cleanUrl);
    if (!urlObj.hostname || urlObj.hostname.length < 3) return null;
    if (urlObj.hostname === 'localhost' || 
        urlObj.hostname.startsWith('127.') || 
        urlObj.hostname.startsWith('192.') ||
        urlObj.hostname.startsWith('10.') ||
        urlObj.hostname === '0.0.0.0') {
      return null;
    }
    if (cleanUrl.includes(' ') || cleanUrl.includes('\n') || cleanUrl.includes('\t')) {
      return null;
    }
    return cleanUrl;
  } catch {
    return null;
  }
}

// Recherche web via Oxylabs (Bing SERP) — cache géré dans search-client.
async function webSearch(query: string, count: number = 20): Promise<WebSearchResult[]> {
  return await searchAll(query, count);
}

// Robust JSON parsing function
function parseJSONResponse(content: string): any {
  let cleanContent = content.trim();

  if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
  if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
  if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);
  cleanContent = cleanContent.trim();

  const firstBrace = cleanContent.indexOf('{');
  const lastBrace = cleanContent.lastIndexOf('}');
  if (firstBrace > 0 || lastBrace < cleanContent.length - 1) {
    if (firstBrace >= 0 && lastBrace >= 0 && lastBrace > firstBrace) {
      cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
    }
  }

  // Pass 1: direct parse
  try { return JSON.parse(cleanContent); } catch { /* try repairs */ }
  // Pass 2: strip trailing commas
  try { return JSON.parse(cleanContent.replace(/,(\s*[}\]])/g, '$1')); } catch { /* try harder */ }
  // Pass 3: best-effort salvage — truncate to last balanced position then close open structures
  try {
    const salvaged = salvageJSON(cleanContent);
    if (salvaged) return JSON.parse(salvaged);
  } catch { /* fall through */ }

  throw new Error(`Failed to parse JSON (len=${cleanContent.length}): unrepairable malformation`);
}

// Salvage partial/malformed JSON: walks the string, tracks string state and bracket depth,
// truncates at the last position where the document was structurally valid, then closes
// any still-open arrays/objects so the result parses.
function salvageJSON(s: string): string | null {
  let depthCurly = 0;
  let depthSquare = 0;
  let inString = false;
  let escape = false;
  const stack: string[] = []; // tracks "{" and "["
  let lastSafeEnd = -1;       // last char index where stack was empty (only at the very end of root)
  let lastSafePostComma = -1; // index just after a comma at depth==1 (safe truncation inside root object)
  let rootOpened = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (c === '{') { stack.push('{'); depthCurly++; if (!rootOpened) rootOpened = true; }
    else if (c === '[') { stack.push('['); depthSquare++; }
    else if (c === '}') { if (stack[stack.length - 1] === '{') { stack.pop(); depthCurly--; } }
    else if (c === ']') { if (stack[stack.length - 1] === '[') { stack.pop(); depthSquare--; } }
    else if (c === ',' && stack.length === 1 && stack[0] === '{') {
      // safe truncation point right after a comma inside the root object
      lastSafePostComma = i;
    }

    if (rootOpened && stack.length === 0) lastSafeEnd = i;
  }

  if (lastSafeEnd >= 0) return s.slice(0, lastSafeEnd + 1);

  // Truncate at last comma at root depth, then close all open structures
  const cutoff = lastSafePostComma > 0 ? lastSafePostComma : s.length;
  let truncated = s.slice(0, cutoff).replace(/,\s*$/, "");
  // Re-walk to know the remaining open stack
  const reStack: string[] = [];
  let inStr = false, esc = false;
  for (let i = 0; i < truncated.length; i++) {
    const c = truncated[i];
    if (esc) { esc = false; continue; }
    if (c === '\\' && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') reStack.push('}');
    else if (c === '[') reStack.push(']');
    else if (c === '}' || c === ']') reStack.pop();
  }
  // If we're inside a string when truncated, close it first
  if (inStr) truncated += '"';
  // Close every remaining open structure
  while (reStack.length) truncated += reStack.pop();
  return truncated;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders(req) 
    });
  }

  try {
    let requestData: DueDiligenceRequest;
    try {
      const bodyText = await req.text();
      if (!bodyText) {
        return new Response(JSON.stringify({ 
          error: "Request body is empty. Please provide companyName." 
        }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      requestData = JSON.parse(bodyText);
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        error: `Invalid JSON in request body` 
      }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const phase = requestData.phase;
    const jobId = requestData.jobId;
    let companyName = requestData.companyName?.trim() || "";
    const companyWebsite = requestData.companyWebsite?.trim() || undefined;
    const additionalContext = requestData.additionalContext?.trim() || undefined;

    if (phase === "analyze") {
      if (!jobId) {
        return new Response(JSON.stringify({ error: "jobId requis pour phase analyze" }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
    } else if (!companyName || companyName.length < 2) {
      return new Response(JSON.stringify({ 
        error: "Company name is required (minimum 2 characters)" 
      }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Configuration AI — Gemini uniquement (le code Vertex, jamais actif, a été retiré).
    // Rotation de clés (même logique qu'ai-client.ts) : sur 429 on bascule sur
    // la clé suivante pour cumuler les quotas journaliers.
    const GEMINI_KEYS = getGeminiKeys();
    const GEMINI_API_KEY = GEMINI_KEYS[0];
    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash";
    // Le thinking se décompte de maxOutputTokens → sur un modèle flash il peut
    // tronquer le gros rapport DD. thinkingBudget:0 est honoré sur 2.5-flash ET
    // 3.x-flash (vérifié : thoughtsTokenCount=0) → on le désactive sur tout flash.
    const GEMINI_THINKING = /flash/.test(GEMINI_MODEL)
      ? { thinkingConfig: { thinkingBudget: 0 } }
      : {};

    // Clé en header (pas en query string) : les URLs finissent dans les logs, pas les headers.
    const getAIEndpoint = async () => {
      if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY requis");
      }
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
      };
    };

    // Appel Gemini auxiliaire (gap / critique / approfondissement) AVEC rotation
    // des clés : ordre aléatoire + bascule sur 429, pour ne pas marteler une seule
    // clé (l'appel principal du draft a déjà sa propre boucle de rotation).
    const geminiDD = async (promptText: string, maxTokens: number): Promise<string> => {
      const body = JSON.stringify({ contents: [{ parts: [{ text: promptText }] }], generationConfig: { temperature: 0.15, maxOutputTokens: maxTokens, responseMimeType: "application/json", ...GEMINI_THINKING } });
      const keys = (GEMINI_KEYS.length ? [...GEMINI_KEYS] : [GEMINI_API_KEY]).sort(() => Math.random() - 0.5);
      // Fallback de modèle : si le principal sature (503) sur toutes les clés, on
      // bascule sur gemini-2.5-flash (stable, forte capacité).
      const models = [...new Set([GEMINI_MODEL, "gemini-2.5-flash"])];
      await reserveAiCall();
      for (const mdl of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent`;
        for (const k of keys) {
          try {
            const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": k as string }, body });
            if (r.ok) {
              const d = await r.json();
              const parts = d.candidates?.[0]?.content?.parts ?? [];
              return parts.filter((p: any) => typeof p?.text === "string" && !p?.thought).map((p: any) => p.text).join("") || "";
            }
            const status = r.status;
            await r.text();
            if (status === 429) continue; // quota sur cette clé → clé suivante
            break; // 5xx/4xx → modèle de repli
          } catch (_) { /* clé suivante */ }
        }
      }
      return "";
    };

    // Vérification configuration
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({
        error: "GEMINI_API_KEY manquante.",
        setupRequired: true
      }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    
    const OXYLABS_USER = Deno.env.get("OXYLABS_USER");
    if (phase !== "analyze" && !OXYLABS_USER) {
      return new Response(JSON.stringify({
        error: "Recherche web non configurée. Ajoutez OXYLABS_USER / OXYLABS_PASS.",
        setupRequired: true
      }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ========== PHASE ANALYZE : charger le job et lancer l'IA uniquement ==========
    if (phase === "analyze" && jobId) {
      const phaseStart = Date.now();
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: "Configuration Supabase manquante (phase analyze)" }), {
          status: 500,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const jobRes = await fetch(`${SUPABASE_URL}/rest/v1/due_diligence_jobs?id=eq.${encodeURIComponent(jobId)}&select=*`, {
        headers: { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      });
      if (!jobRes.ok) {
        const errText = await jobRes.text();
        console.error("[DD] Erreur lecture job:", jobRes.status, errText);
        return new Response(JSON.stringify({ error: `Erreur base de données (lecture job): ${jobRes.status}` }), {
          status: 500,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const jobList = await jobRes.json();
      const job = Array.isArray(jobList) ? jobList[0] : null;
      if (!job) {
        const raw = JSON.stringify(jobList).slice(0, 200);
        console.error("[DD] Réponse inattendue depuis DB:", raw);
        return new Response(JSON.stringify({ error: "Job introuvable (jobId invalide ou expiré)" }), {
          status: 404,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (job.status === "analyze_done") {
        return new Response(JSON.stringify({ error: "Ce job a déjà été analysé" }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (job.status !== "search_done") {
        return new Response(JSON.stringify({ error: `Job non prêt pour l'analyse (statut: ${job.status})` }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      companyName = job.company_name || "";
      // search_context peut être vide si aucun résultat de recherche ; l'IA analysera avec ses connaissances
      const analyzeContext = job.search_context || `ENTREPRISE À ANALYSER: ${companyName}`;
      const analyzeSearchCount = job.search_results_count || 0;

      // Cache rapport (3 j) : re-générer la DD de la même société brûlerait
      // 3-4 appels IA free-tier pour un résultat quasi identique.
      // Version dans la clé : un changement de prompt/version invalide
      // automatiquement les anciens rapports cachés (sinon servis 3 j).
      const reportCacheKey = `ddreport|v4|${companyName.toLowerCase().trim()}`;
      const cachedReport = await getCachedSearch<any>(`ai|${reportCacheKey}`, 1);
      if (cachedReport && cachedReport.length > 0 && cachedReport[0]?.company) {
        console.log(`[DD] Rapport servi depuis le cache pour: ${companyName}`);
        await fetch(`${SUPABASE_URL}/rest/v1/due_diligence_jobs?id=eq.${encodeURIComponent(jobId)}`, {
          method: "PATCH",
          headers: { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ result: cachedReport[0], status: "analyze_done", updated_at: new Date().toISOString() }),
        });
        return new Response(JSON.stringify(cachedReport[0]), {
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }

      const systemPromptAnalyze = `Tu es un analyste VC senior spécialisé en due diligence avec 20 ans d'expérience.
Tu dois produire un rapport de due diligence COMPLET et PROFESSIONNEL sur l'entreprise "${companyName}".

═══════════════════════════════════════════════════════════════════
DISCIPLINE D'ANALYSE VC — LIS ET APPLIQUE AVANT TOUT (le plus important)
═══════════════════════════════════════════════════════════════════
Un mauvais rapport DÉCRIT (fiche Wikipédia rangée par rubriques). Un bon rapport
ANALYSE : il construit un raisonnement où chaque fait en éclaire un autre et tout
converge vers UNE question — « à ce prix, avec cette équipe, sur ce marché, est-ce
que je peux faire x10, et qu'est-ce qui me ferait changer d'avis ? ». Applique :

1. DÉMONTRE, ne décris pas. CHAQUE argument important (positif OU négatif) doit
   être PROUVÉ : un chiffre, une date, un nom (brevet, client, concurrent, montant,
   investisseur, métrique), un fait vérifiable — JAMAIS un adjectif seul. Interdit :
   « acteur majeur », « technologie innovante », « équipe de haut niveau », « bonne
   traction », « marché porteur » SANS la preuve chiffrée juste après. Si tu écris
   « ils ont des récompenses / des brevets / des partenariats », tu DOIS les NOMMER
   un par un avec l'année et la source. La densité d'adjectifs est le symptôme d'une
   analyse creuse : remplace chaque adjectif par le FAIT qui le justifie.
2. RECENCY. Utilise l'info LA PLUS RÉCENTE (année en cours / dernière en date). La
   presse ancienne est piégeuse : un round annoncé récemment PRIME sur d'anciens
   chiffres. Vérifie montants/rounds/dates/fondateurs ; si deux sources se
   contredisent, prends la plus récente et signale la contradiction. Ne confonds
   JAMAIS Série A et Série B, ni l'année de fondation.
   DATE DU JOUR : ${new Date().toLocaleDateString("fr-FR", { dateStyle: "long" })}.
   Calcule TOUTE estimation temporelle (runway, mois restants, « prochaine levée
   d'ici… », âge de la société) À PARTIR D'AUJOURD'HUI — jamais à partir de la date
   du dernier round connu. Si un runway estimé depuis un ancien tour serait DÉJÀ
   ÉCOULÉ à la date du jour : soit la société a relevé depuis (cherche-le et
   utilise-le), soit c'est un RISQUE DE TRÉSORERIE à signaler. N'écris JAMAIS une
   échéance déjà passée (ex : « lever d'ici fin 2025 » alors qu'on est après) comme
   si elle était future ; recalcule au présent.
3. NOTORIÉTÉ ≠ ARGUMENT. Ne sois pas flatteur parce que la boîte est connue. La
   notoriété n'est jamais une preuve de qualité d'investissement.
4. THÈSE FALSIFIABLE. Énonce un PARI mesurable et réfutable, pas du conditionnel
   prudent : « Nous parions que [métrique précise] atteint [seuil] avant [date], que
   c'est LE facteur différenciant, et si c'est vrai la boîte vaut [X]. » Pas de
   « prometteur / potentiel de rupture » sans engagement.
5. CORRÉLE LES SECTIONS. Ne les traite pas en silos : relie-les. Ex : techno = pari
   de physique → le risque dominant est technique → donc l'équipe (labos, PhD) est
   LE moat, pas un bonus ; burn × runway × coût du prochain jalon → la boîte
   atteint-elle le palier qui la dé-risque AVANT de devoir relever ? Chaque section
   doit parler aux autres.
6. LES CHIFFRES QUI DÉCIDENT. burn, runway, revenus (MRR/ARR), valorisation,
   cap table, dilution, % de détention visé. Si une de ces données manque, ce n'est
   PAS une estimation désinvolte : c'est le RISQUE n°1 et une priorité de DD. Tu ne
   peux PAS être « high confidence » si la moitié des chiffres déterminants manque —
   abaisse confidenceLevel en conséquence.
7. MÉCANIQUE DU DEAL (ce qu'on achète vraiment). prix d'entrée, valorisation
   post-money, % obtenu pour le ticket, qui mène le tour, tour compétitif ou non,
   préférences de liquidation, siège au board, pro-rata. Le rendement vient du PRIX
   et de l'OWNERSHIP, pas seulement d'avoir raison sur la boîte. Une excellente
   société au mauvais prix = mauvais investissement.
8. MODÈLE DE RETOUR chiffré. Fais un back-of-envelope : à quelle valo de sortie, par
   quelle voie (M&A par qui ? IPO ?), avec quelle dilution sur les tours futurs,
   j'obtiens un fund-returner ? CITE des COMPARABLES DE SORTIE NOMMÉS et leur issue
   réelle (ex deep tech quantique : IonQ, Rigetti, D-Wave entrés en bourse par SPAC
   puis largement effondrés → risque de sortie élevé). « 10-20x » sans calcul = nul.
9. BEAR CASE SPÉCIFIQUE. Steelman la raison de NE PAS investir, propre à CETTE boîte
   (critique technique/marché falsifiable), pas du risque générique (« concurrence
   intense », « délais longs ») qui s'applique à n'importe quelle deep tech.
10. ÉQUIPE — une vraie évaluation. Ces fondateurs ont-ils déjà CONSTRUIT ET LIVRÉ,
    ou seulement fait de la recherche ? Peuvent-ils scaler (recruter 100+, lever
    100M+) ? Manque-t-il un profil commercial / go-to-market (VP Sales, biz dev) ?
    L'absence d'un profil GTM sur une boîte qui doit vendre à des grands comptes est
    un FLAG à relever explicitement.
11. RECHERCHE PRIMAIRE / avantage informationnel. Quand c'est possible, distingue le
    public (presse, Crunchbase) du jugement : quels appels de référence faire (ex-
    employés, clients, concurrents, directeurs de thèse des fondateurs), quels vrais
    papiers lire (Nature/PRX/arXiv), quels brevets examiner. Les diligencePriorities
    doivent inclure ces vérifications NON-publiques.
12. DÉCISION CONDITIONNELLE. Pas un verdict figé. « On investit SI [conditions
    précises : prix < Z, jalon X avant date Y, siège d'observateur] ; on passe SI
    [...] ; et voici les 2-3 questions dont la réponse INVERSERAIT la décision. »

FRAMEWORKS À UTILISER (cite-les quand pertinent) :
- Valorisation : MULTIPLES par secteur (EV/Revenue LTM indicatif : Fintech ~4.5x,
  Enterprise SW ~4.8x, MedTech ~5.4x, Foodtech ~2.5x, Mobility ~3.2x, Proptech ~4.3x)
  et par business model (Abonnement ~4.8x, Commission ~3.7x) ; DCF si mature (WACC
  ~35% pre-seed, 30% seed, 25% série A, 20% série B) ; VCM (reverse-engineering) si
  pré-revenu. Soustrais la dette nette.
- Métriques : MRR/ARR (ARR=12×MRR), CAC, LTV, LTV/CAC cible ≥ 3:1, churn, burn (gross
  vs net), runway, CAC payback, NRR, GMV/take rate (marketplace). Compare aux
  benchmarks du stade.
- Marché : TAM > SAM > SOM (top-down ET bottom-up).
- Term sheet : liquidation preference, anti-dilution, pro-rata, board, option pool
  (10-20%), drag/tag-along — mentionne ce qui sera à négocier.

MÉTHODE PAR LEVIER (déduis-la du secteur, applique à CETTE boîte) :
- LA MÉTRIQUE QUI EST LE PRODUIT : identifie l'UNIQUE métrique dont dépend toute la
  valeur (ex : taux de survie à 3 ans pour la reforestation ; nb de qubits logiques /
  fidélité pour le quantique ; NRR/rétention pour le SaaS ; CAC/LTV pour le B2C ; taux
  de défaut pour le lending). Fais-en le PIVOT de la thèse ET du bear. Si ce chiffre
  manque, c'est LA priorité de DD n°1 — pas un détail.
- MOAT = PREUVE CHIFFRÉE, pas une étiquette. "Base de données", "partenariat",
  "techno avancée" ne sont PAS des moats tant qu'ils ne sont pas quantifiés : IP nommée
  (brevet + statut + n°/date), données propriétaires accumulées (volume, années
  d'avance), exclusivités contractuelles, coûts de switch, avance techno mesurée. Si tu
  ne peux pas le chiffrer, écris que le moat est NON PROUVÉ à ce stade.
- BUSINESS MODEL → MULTIPLE DE SORTIE : déduis si les revenus sont SaaS/récurrents
  (multiple élevé) ou services/projets/hardware (multiple BAS, 2-4x revenu). Le
  returnModel DOIT en tenir compte — appliquer un multiple SaaS à une boîte de services
  est une erreur grossière. Tranche ce point, ne le laisse pas en question ouverte.
- SUBSTITUT LE MOINS CHER : nomme l'alternative la moins chère (ex : régénération
  naturelle assistée vs reforestation active ; build interne vs achat) et affronte-la
  dans le bear case.
- COHÉRENCE DES CHIFFRES : si le total levé ≠ somme des tours, si un "CA" dépasse le
  financement, si les dates/années ne collent pas → SIGNALE l'incohérence (un VC ne
  gobe pas un chiffre incohérent).
- CLIENT NOMMÉ : pour un B2B qui revendique de la traction, exige au moins UN client
  nommé + ordre de grandeur du contrat ; sinon traite l'absence de logo comme un flag.

⚠️ RÈGLES CRITIQUES :

1. SOURCES OBLIGATOIRES — MAIS PAS DANS LE TEXTE :
   - NE JAMAIS mettre d'URLs ou de "(Source: ...)" dans les champs texte (overview, tagline, keyHighlights, keyRisks, description, etc.). Le texte doit rester lisible et professionnel.
   - Chaque information doit avoir une source : place TOUTES les sources UNIQUEMENT dans les tableaux "sources" de chaque section ET dans "allSources" avec { "name": "Titre court (ex: Crunchbase, Article Maddyness)", "url": "URL exacte", "type": "article|crunchbase|linkedin|official|press|other", "relevance": "Information clé extraite" }.
   - Minimum 15–25 entrées dans "allSources". Utilise TOUTES les URLs pertinentes des résultats de recherche fournis.
   - Si une information n'a PAS de source dans les données fournies, indique "Non disponible" dans le texte (sans URL).
   - NE JAMAIS inventer de données ou d'URLs.

2. DONNÉES VÉRIFIÉES ET ESTIMATIONS :
   - Priorité aux informations trouvées dans les recherches. Les URLs doivent être exactement celles trouvées.
   - Si une information n'est PAS trouvée (métriques, fondateurs, multiple cible, ticket suggéré, etc.) : fournis une ESTIMATION en t'appuyant sur des sociétés comparables ou des standards du secteur, et précise TOUJOURS que c'est une estimation. Exemples : "Estimation (secteur deep tech Seed) : 2-3x", "Non disponible (estimation : 5-7 ans)", "Fondateur : [nom si trouvé] ; sinon Estimation (profil type CEO early-stage) : ...".
   - Pour team.founders : remplis name, role, background, linkedin dès que trouvé ; sinon "Non disponible" ou "Estimation (profil typique) : ...".
   - Pour investmentRecommendation : targetReturn, investmentHorizon, suggestedTicket doivent TOUJOURS être remplis. Si pas de donnée : "Non disponible" ou "Estimation : [fourchette ou description]".
   - keyMilestones : chaque élément doit avoir "milestone" (chaîne de caractères, pas un objet) et optionnellement "date". partnerships et awards : tableaux de CHAÎNES uniquement (ex: ["Partenaire A", "Prix X"]), jamais d'objets.

3. EXHAUSTIVITÉ — AUCUNE SECTION MINIMALE :
   - Chaque section doit être RÉELLEMENT REMPLIE. Interdire les sections vagues ou une seule ligne "Non disponible" sans effort d'analyse.
   - MARCHÉ (market) : Analyse COMPLÈTE obligatoire : TAM/SAM/SOM avec chiffres et sources ou estimations (ex: "TAM estimé 50B$ en 2030, CAGR 8%"). Inclure : évolution du marché (croissance estimée, tendances), problèmes et défis du secteur, régulation, acteurs clés. Si données absentes : estimation explicite "Estimation (benchmarks secteur) : ...".
   - ÉQUIPE (team) : Pour CHAQUE fondateur : name, role, background (parcours, formation, expériences passées), linkedin si trouvé. overview = synthèse de la complémentarité et de la capacité à exécuter. teamSize, culture, hiringTrends remplis (ou estimation). Ne pas laisser "Non disponible" sans avoir cherché dans les recherches.
   - TRACTION (traction) : customers.count, customers.notable, customers.segments TOUJOURS remplis : soit données trouvées, soit "Estimation d'après contexte : [ex: clients miniers, institutions]" ou "Non identifié dans les recherches (secteur B2B early-stage)". partnerships et awards : listes remplies à partir des recherches ; si rien trouvé : ["Aucun partenariat identifié"] / ["Aucun prix identifié"] plutôt qu'un champ vide.
   - Autres sections (product, competition, financials, risks, opportunities) : même exigence d'exhaustivité ; privilégier estimation + mention "estimation" plutôt que "Non disponible" seul.

3bis. PROFONDEUR & SPÉCIFICITÉ (un mémo de VC, pas un résumé Wikipédia) :
   - QUANTITÉ MINIMALE par liste : keyHighlights ≥ 4, keyRisks ≥ 4, market.trends ≥ 4, competition.competitors ≥ 3, growthOpportunities ≥ 3, investmentRecommendation.keyQuestions ≥ 4, suggestedNextSteps ≥ 3, product.keyFeatures ≥ 3, et CHAQUE catégorie de risques (market/execution/financial/competitive/regulatory) ≥ 3 points.
   - SPÉCIFICITÉ : chaque point doit être CONCRET et porter une info actionnable — un chiffre, une date, un nom (investisseur, client, concurrent, technologie, brevet), un % ou une fourchette. Bannis les généralités creuses ("bonne équipe", "marché porteur") : remplace-les par le FAIT précis qui les justifie.
   - market.analysis : ≥ 150 mots, doit quantifier (taille, CAGR, segments) ET citer 2-3 acteurs/comparables nommés ET expliciter le problème de marché résolu.
   - competition.competitors : 3 à 5 concurrents, en INCLUANT les acteurs MAJEURS/incumbents pertinents comme menace (nommés — ex pour le quantique : IBM, Google, IonQ, PsiQuantum, Quandela — pas seulement de petits acteurs), CHACUN avec funding (montant/round si connu, sinon "Estimation : ...") + 2-3 strengths + 2-3 weaknesses spécifiques et non vides. Mieux vaut 3 concurrents détaillés que 7 noms aux forces/faiblesses vides — ne liste JAMAIS un concurrent sans remplir ses strengths ET weaknesses. competition.moat doit expliquer POURQUOI le moat tient (IP, effets de réseau, coût de switch, avance techno chiffrée).
   - team : pour chaque fondateur, background détaillé (formation, employeurs passés, réalisations) ; overview = thèse explicite sur la capacité d'exécution.
   - financials : reconstituer fundingHistory (rounds, montants, dates, investisseurs nommés) même partiellement ; estimer burn/runway et logique de valorisation quand pertinent (marqué "estimation").
   - investmentRecommendation.rationale : raisonnement de VC structuré (thèse, ce qui doit être vrai pour gagner, ce qui peut tuer le deal) ; strengths/weaknesses chiffrés ; suggestedNextSteps = actions de DD concrètes (qui appeler, quels chiffres demander, quelle clause).
   - Business model & go-to-market : couvre explicitement le modèle de revenus / pricing dans product.valueProposition, et la stratégie d'acquisition / GTM dans opportunities.
   - COMITÉ D'INVESTISSEMENT (investmentCommittee) — OBLIGATOIRE et le plus important : c'est l'analyse FINE attendue d'un associé de VC. PAS une redite des forces/faiblesses. Argumente : bull case et bear case chiffrés et probabilisés, les vrais débats du comité (les DEUX côtés), ce qui doit être vrai, les critères rédhibitoires, une vue valorisation, les priorités de DD à fort enjeu, un niveau de conviction et un verdict défendu. Si tu manques de place, RACCOURCIS les autres sections mais ne supprime JAMAIS investmentCommittee.

4. FORMAT DU RAPPORT :
   Tu dois retourner un objet JSON avec la structure suivante (tous les champs sont requis):

{
  "company": {
    "name": "Nom officiel de l'entreprise",
    "tagline": "Description courte (SANS URL, texte seul)",
    "website": "URL du site officiel (trouvée dans les recherches)",
    "linkedinUrl": "URL LinkedIn (trouvée dans les recherches)",
    "crunchbaseUrl": "URL Crunchbase (trouvée dans les recherches)",
    "founded": "Année de création (texte seul)",
    "headquarters": "Siège social (texte seul)",
    "sector": "Secteur d'activité",
    "stage": "Stade (Seed, Series A, etc.)",
    "employeeCount": "Nombre d'employés (texte seul)"
  },
  "executiveSummary": {
    "overview": "Résumé de l'entreprise en 200 mots, texte seul SANS aucune URL ni (Source: ...). Les sources vont dans allSources.",
    "keyHighlights": ["Point fort 1", "Point fort 2", ...],
    "keyRisks": ["Risque 1", "Risque 2", ...],
    "recommendation": "INVEST | WATCH | PASS",
    "confidenceLevel": "high | medium | low"
  },
  "product": { "description": "...", "valueProposition": "...", "technology": "...", "patents": "...", "keyFeatures": [], "sources": [] },
  "market": { "tam": "... (chiffre + évolution si dispo)", "sam": "...", "som": "...", "cagr": "...", "trends": ["tendance 1", "..."], "analysis": "Analyse complète : taille marché, croissance estimée, problèmes/défis du secteur, régulation, acteurs.", "sources": [] },
  "competition": { "landscape": "...", "competitors": [], "competitiveAdvantage": "...", "moat": "...", "sources": [] },
  "financials": { "fundingHistory": [], "totalFunding": "...", "latestValuation": "...", "metrics": {}, "sources": [] },
  "team": { "overview": "Synthèse équipe et complémentarité des profils.", "founders": [{"name": "...", "role": "...", "background": "Parcours détaillé, formation, expériences.", "linkedin": "url ou vide"}], "keyExecutives": [], "teamSize": "...", "culture": "...", "hiringTrends": "...", "sources": [] },
  "traction": { "overview": "...", "keyMilestones": [ { "date": "YYYY ou texte", "milestone": "texte seul (obligatoire)" } ], "customers": { "count": "Nombre ou estimation (ex: '10-50' / 'Estimation: early adopters')", "notable": ["client 1 si trouvé", "sinon estimation courte"], "segments": "Segments cibles (ex: minier, institutions)" }, "partnerships": ["nom partenaire ou 'Aucun identifié'"], "awards": ["prix ou 'Aucun identifié'"], "sources": [] },
  "risks": { "marketRisks": [], "executionRisks": [], "financialRisks": [], "competitiveRisks": [], "regulatoryRisks": [], "mitigations": [], "overallRiskLevel": "...", "sources": [] },
  "opportunities": { "growthOpportunities": [], "marketExpansion": "...", "productExpansion": "...", "strategicValue": "...", "sources": [] },
  "investmentRecommendation": { "recommendation": "...", "rationale": "...", "strengths": [], "weaknesses": [], "keyQuestions": [], "suggestedNextSteps": [], "targetReturn": "texte (obligatoire; si inconnu: 'Non disponible' ou 'Estimation: ...')", "investmentHorizon": "texte (obligatoire)", "suggestedTicket": "texte (obligatoire)" },
  "investmentCommittee": {
    "thesis": "LE PARI, falsifiable et chiffré (1-3 phrases). Forme : « Nous parions que [métrique précise] atteint [seuil] avant [date], que c'est LE facteur différenciant, et si c'est vrai la boîte vaut [X]. » Pas de conditionnel prudent.",
    "thesisFitAnalysis": "Adéquation au mandat (stade, secteur, géo, type de moat/retour). Raisonnement d'associé, pas un oui/non.",
    "bullCase": "Scénario haussier ARGUMENTÉ (chemin vers 10x+) : hypothèses à réaliser (marché, exécution, moat) + ordre de grandeur de l'upside.",
    "bearCase": "Scénario baissier SPÉCIFIQUE à CETTE boîte (steelman le non) : les 2-3 façons les plus probables de perdre, classées. Inclure au moins UNE critique technique/marché falsifiable propre au dossier — PAS du risque générique.",
    "dealMechanics": "Ce qu'on achète : prix d'entrée / valorisation post-money, % obtenu pour le ticket suggéré, qui mène le tour, tour compétitif ?, préférences de liquidation, board, pro-rata. Si ces données manquent, dis-le explicitement et classe-les en priorité de DD (ne pas inventer).",
    "returnModel": "Back-of-envelope du retour : valo de sortie visée, voie (M&A par qui / IPO), dilution sur les tours futurs, % d'ownership → multiple. CITE 2-3 COMPARABLES DE SORTIE NOMMÉS avec leur issue RÉELLE, dont OBLIGATOIREMENT au moins un comparable CAUTIONNAIRE du secteur (ex deep tech quantique : IonQ, Rigetti, D-Wave entrés en bourse par SPAC puis largement effondrés — pertinent pour le risque de sortie) en plus d'un éventuel comparable haussier. Un chiffre de retour SANS calcul ni comparables est interdit.",
    "keyDebates": ["Les vrais débats du comité — chaque point avec les DEUX côtés (pour/contre), pas une banalité."],
    "whatMustBeTrue": ["Conditions NÉCESSAIRES pour que la thèse tienne (hypothèses critiques à valider)."],
    "killCriteria": ["Signaux qui INVALIDERAIENT le deal (deal-breakers)."],
    "valuationView": "Valorisation/point d'entrée : raisonnable au stade ? multiple implicite vs comparables du secteur (cf frameworks), dilution attendue, prix vs potentiel.",
    "diligencePriorities": ["Les 3-4 vérifications qui CHANGERAIENT LE PLUS la décision, incluant au moins une recherche PRIMAIRE non-publique (appel de référence : ex-employé, client, concurrent, directeur de thèse ; lecture de brevet/papier). Pas une checklist générique."],
    "convictionLevel": "high | medium | low (NE PAS mettre high si les chiffres déterminants — burn, runway, valo, % — manquent)",
    "verdict": "DÉCISION CONDITIONNELLE en 3-5 phrases, comme un associé en comité : on investit SI [conditions précises : prix < Z, jalon X avant date Y, siège d'observateur...] ; on passe SI [...] ; + les 1-2 questions dont la réponse inverserait la décision."
  },
  "allSources": [ { "name": "...", "url": "...", "type": "article|crunchbase|linkedin|official|press|other", "relevance": "..." } ],
  "dataQuality": { "overallScore": "...", "dataAvailability": {}, "limitations": [], "sourcesCount": "..." }
}

Réponds UNIQUEMENT avec du JSON valide.`;

      const sleepAnalyze = (ms: number) => new Promise((r) => setTimeout(r, ms));
      // 4 gap queries (was 8) — keeps gap1 phase under ~10s so main AI has budget
      const MAX_GAP_QUERIES_DD = 6;
      const GAP_QUERY_MIN_LEN = 8;
      const GAP_QUERY_MAX_LEN = 120;
      const extractJsonObject = (raw: string): string | null => {
        const noMarkdown = raw.replace(/```json?\s*/gi, "").trim();
        const start = noMarkdown.indexOf("{");
        if (start === -1) return null;
        let depth = 0;
        let end = -1;
        for (let i = start; i < noMarkdown.length; i++) {
          if (noMarkdown[i] === "{") depth++;
          if (noMarkdown[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
        }
        return end > start ? noMarkdown.slice(start, end + 1) : null;
      };
      let enrichedAnalyzeContext = analyzeContext;

      // ——— SYSTÉMATIQUE : requêtes obligatoires sur les lacunes récurrentes ———
      // (équipe, IP/brevets, financements RÉCENTS, concurrents nommés, traction).
      // Ciblées car ce sont les champs le plus souvent vides ou périmés.
      const ddYear = new Date().getFullYear();
      // Nom entre guillemets : décisif pour la précision (les noms ambigus comme
      // "Alice & Bob" renvoient sinon du bruit) et pour faire remonter le round récent.
      const q = `"${companyName}"`;
      const systematicGroups: { label: string; queries: string[] }[] = [
        { label: "ÉQUIPE & FONDATEURS (noms, parcours, LinkedIn)", queries: [
          `${q} founders CEO CTO background`,
          `${q} founding team linkedin`,
          `${q} fondateurs équipe dirigeante parcours`,
        ] },
        { label: `FINANCEMENTS — PRENDRE LE PLUS RÉCENT (${ddYear}/${ddYear - 1}), il ÉCRASE l'ancien`, queries: [
          `${q} latest funding round ${ddYear} ${ddYear - 1}`,
          `${q} Series B C D raised million ${ddYear - 1} ${ddYear} investors`,
          `${q} levée de fonds ${ddYear - 1} ${ddYear} montant valorisation`,
          `${q} total funding raised to date`,
        ] },
        { label: "ACTUALITÉ RÉCENTE (derniers développements, partenariats, programmes)", queries: [
          `${q} news ${ddYear} ${ddYear - 1}`,
          `${q} announcement partnership program ${ddYear}`,
        ] },
        { label: "IP / BREVETS (à NOMMER un par un avec lien)", queries: [
          `site:patents.google.com ${companyName}`,
          `${q} patent brevet espacenet filed granted`,
        ] },
        { label: "CONCURRENTS (nommés + leurs financements)", queries: [
          `${q} competitors alternatives`,
          `${q} vs competitor funding market share`,
        ] },
        { label: "TRACTION / RÉCOMPENSES / PARTENARIATS / PUBLICATIONS", queries: [
          `${q} customers partnership award prize ${ddYear}`,
          `${q} revenue traction publication results`,
        ] },
      ];
      try {
        const allQ = systematicGroups.flatMap((g) => g.queries);
        const settled = await Promise.all(allQ.map((q) => webSearch(q, 6).catch(() => [])));
        let idx = 0;
        const blocks: string[] = [];
        const seenSysUrl = new Set<string>();
        for (const g of systematicGroups) {
          const lines: string[] = [];
          for (let k = 0; k < g.queries.length; k++) {
            for (const r of settled[idx++] ?? []) {
              if (r?.url && !seenSysUrl.has(r.url)) {
                seenSysUrl.add(r.url);
                const line = `${r.title || ""}: ${r.description || ""} | ${r.url}`.trim();
                if (line.length > 20) lines.push(line);
              }
            }
          }
          if (lines.length > 0) blocks.push(`--- ${g.label} ---\n${lines.join("\n")}`);
        }
        if (blocks.length > 0) {
          // Bloc systématique EN PREMIER avec autorité de récence : il contient
          // l'info la plus fraîche (dernier round, etc.) et doit primer sur les
          // résultats plus anciens et abondants ci-dessous.
          enrichedAnalyzeContext = `=== RECHERCHES SYSTÉMATIQUES (PRIORITÉ ABSOLUE — info la PLUS RÉCENTE ; tout chiffre/round/date ici ÉCRASE les données plus anciennes des « AUTRES RÉSULTATS ») ===\n${blocks.join("\n\n").slice(0, 6500)}\n\n=== AUTRES RÉSULTATS DE RECHERCHE ===\n${analyzeContext}`;
          console.log(`[DueDiligence] Systématiques: ${seenSysUrl.size} résultats`);
        }
      } catch (sysErr) {
        console.warn("[DueDiligence] Requêtes systématiques ignorées:", sysErr);
      }

      try {
        const contextExtract = typeof enrichedAnalyzeContext === "string" ? enrichedAnalyzeContext.slice(0, 7000) : "";
        const gapPrompt = `Tu es un analyste VC. Contexte de recherche pour une due diligence sur "${companyName}".

CONTEXTE :
${contextExtract}

TÂCHE : Identifie 4 à 6 thèmes où les infos sont ENCORE INSUFFISANTES ou seulement EFFLEURÉES (objectif : APPROFONDIR pour être précis, pas juste compléter). Cible en priorité : (1) la MÉTRIQUE qui est le produit (ex taux de survie, rétention, fidélité), (2) IP/brevets précis, (3) financements RÉCENTS + valorisation + cap table, (4) clients/traction chiffrés et NOMMÉS, (5) concurrents nommés + financements, (6) marché (TAM/SAM, CAGR, régulation). Pour chaque thème, 1 à 2 requêtes web en ANGLAIS, courtes et précises (avec "${companyName}").
Réponds UNIQUEMENT : {"gaps":[{"label":"...","queries":["query1","query2"]}]}. 4 à 6 gaps, 2 queries chacun.`;

        const gapText = await geminiDD(gapPrompt, 2048);
        {
          let gaps: { queries?: string[] }[] = [];
          if (gapText) {
            const jsonStr = extractJsonObject(gapText);
            if (jsonStr) {
              try {
                const parsed = JSON.parse(jsonStr);
                gaps = Array.isArray(parsed?.gaps) ? parsed.gaps : [];
              } catch (_) {}
            }
          }
          const allQueries: string[] = [];
          for (const g of gaps.slice(0, 4)) {
            const qs = (Array.isArray(g.queries) ? g.queries : []).map((x: string) => String(x).trim().slice(0, GAP_QUERY_MAX_LEN)).filter((x: string) => x.length >= GAP_QUERY_MIN_LEN);
            allQueries.push(...qs.slice(0, 2));
          }
          const seenQ = new Set<string>();
          const uniqueQueries = allQueries.filter((q) => {
            const k = q.toLowerCase().replace(/\s+/g, " ");
            if (seenQ.has(k)) return false;
            seenQ.add(k);
            return true;
          }).slice(0, MAX_GAP_QUERIES_DD);
          if (uniqueQueries.length > 0) {
            // Parallel gap searches (cache makes most a no-op anyway). Was sequential with 1200ms delays.
            const extraLines: string[] = [];
            const seenUrl = new Set<string>();
            const gapResults = await Promise.all(uniqueQueries.map(q => webSearch(q, 6).catch(() => [])));
            for (const results of gapResults) {
              for (const r of results) {
                if (r?.url && !seenUrl.has(r.url)) {
                  seenUrl.add(r.url);
                  const line = `${r.title || ""}: ${r.description || ""} | ${r.url}`.trim();
                  if (line.length > 20) extraLines.push(line);
                }
              }
            }
            const extraContext = extraLines.join("\n").slice(0, 4500);
            if (extraContext) {
              // Append (ne PAS écraser les recherches systématiques déjà ajoutées).
              enrichedAnalyzeContext += `\n\n=== RECHERCHES COMPLÉMENTAIRES (lacunes — à utiliser en priorité) ===\n${extraContext}`;
              console.log(`[DueDiligence] Enrichissement 1: ${uniqueQueries.length} requêtes`);
            }
          }
        }
      } catch (gapErr) {
        console.warn("[DueDiligence] Boucle lacunes ignorée:", gapErr);
      }

      const userPromptAnalyze = `Effectue une due diligence COMPLÈTE sur l'entreprise "${companyName}".

Voici TOUTES les données collectées par nos recherches web. Utilise-les pour produire un rapport exhaustif :

${enrichedAnalyzeContext}

⚠️ MÉTHODE D'EXTRACTION (suis-la AVANT d'écrire le rapport) :
1. Parcours TOUS les résultats ci-dessus, ligne par ligne. Chaque ligne a la forme "Titre: Description | URL".
2. Pour CHAQUE fait à remplir dans le rapport (nom fondateur, date de levée, montant, employés, clients, partenaires…), CHERCHE d'abord dans les résultats. Si tu vois une info, UTILISE-LA. Si tu ne vois rien, alors seulement estime ou marque "Non disponible".
3. AVANT d'écrire "Non disponible" pour un champ, fais une dernière passe : re-lis les résultats avec ce champ en tête. Les fondateurs sont souvent mentionnés dans les titres LinkedIn, Crunchbase, articles de presse. Les levées dans les articles "raises" / "secures" / "annonce". Les clients dans les case studies.
4. NE T'AUTOCENSURE PAS : si un fait est mentionné UNE SEULE FOIS dans un seul résultat, c'est suffisant pour l'inclure (avec sa source).

⚠️ RAPPELS CRITIQUES :
1. NE METS AUCUNE URL dans le texte. Toutes les URLs vont UNIQUEMENT dans "sources" et "allSources".
2. allSources : 15–25 entrées minimum. N'invente AUCUNE URL — elles DOIVENT venir des résultats fournis.
3. INTERDIT D'HALLUCINER : ne dis JAMAIS un fait qui n'est PAS dans les résultats. Si une donnée n'apparaît pas dans les recherches et n'est pas une estimation explicitement marquée, NE LA MENTIONNE PAS.
4. INTERDIT DE DIRE "NON DISPONIBLE" SI L'INFO EST DANS LES RÉSULTATS : avant de marquer un champ "Non disponible", grep mentalement le contenu pour le mot-clé correspondant (ex: "CEO", "founder", "raised", "Series", "employees", "customers").
5. MARCHÉ : si TAM/SAM/SOM ne sont pas dans les résultats, fournis une estimation explicite "Estimation (benchmarks secteur X, géographie Y) : ..." avec source de l'estimation.
6. ÉQUIPE : chaque fondateur avec name, role, background détaillé, linkedin (URL exacte trouvée). Si le résultat dit "founded by X and Y" → tu DOIS lister X et Y.
7. TRACTION : customers/partnerships/awards en listes de chaînes. Si rien trouvé : ["Aucun identifié dans les recherches"] (pas vide, pas null).
8. keyMilestones[].milestone, partnerships[], awards[] : chaînes uniquement. targetReturn, investmentHorizon, suggestedTicket toujours remplis.
9. Sois EXHAUSTIF : aucune section ne doit rester superficielle ou vide.
${enrichedAnalyzeContext !== analyzeContext ? "\n10. Utilise OBLIGATOIREMENT la section « RECHERCHES COMPLÉMENTAIRES » pour compléter les données manquantes." : ""}

Réponds UNIQUEMENT avec du JSON valide.`;

      const aiEndpoint = await getAIEndpoint();
      // 16384 max output: enough for a complete DD report, fast enough to fit Supabase's 150s budget
      const aiBody = {
        contents: [{ parts: [{ text: `${systemPromptAnalyze}\n\n${userPromptAnalyze}` }] }],
        generationConfig: { temperature: 0.1, topP: 0.9, topK: 40, maxOutputTokens: 22000, responseMimeType: "application/json" as const, ...GEMINI_THINKING },
      };

      // Retry on transient Gemini errors (503 overload, 500/502/504) + rotation
      // de clés sur 429 (quota épuisé sur une clé → clé suivante, sans attente).
      // Total wait: 2s + 5s sur les transitoires; leaves the 150s budget intact.
      const sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);
      let response: Response | null = null;
      let lastErrText = "";
      let lastStatus = 0;
      let keyIdx = 0;
      let transientWaits = 0;
      const maxAttempts = 3 + GEMINI_KEYS.length;
      await reserveAiCall();
      // Fallback de modèle : si gemini-3.5-flash est saturé (503) sur toutes les
      // clés, on bascule sur gemini-2.5-flash (stable, forte capacité). Même
      // prompt → même qualité ; ça évite l'erreur "modèle surchargé" en prod.
      const ddModels = [...new Set([GEMINI_MODEL, "gemini-2.5-flash"])];
      modelLoop:
      for (const mdl of ddModels) {
        const mdlUrl = `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent`;
        keyIdx = 0;
        transientWaits = 0;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const headers = { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEYS[keyIdx] };
          const r = await fetch(mdlUrl, { method: "POST", headers, body: JSON.stringify(aiBody) });
          if (r.ok) { response = r; break modelLoop; }
          lastStatus = r.status;
          lastErrText = await r.text();
          console.warn(`[DD analyze] Gemini HTTP ${r.status} model=${mdl} key#${keyIdx} attempt ${attempt + 1}: ${lastErrText.slice(0, 120)}`);
          if (r.status === 429) {
            if (keyIdx < GEMINI_KEYS.length - 1) { keyIdx++; continue; } // quota → clé suivante
            break; // toutes les clés en quota → modèle de repli
          }
          if (!TRANSIENT_STATUSES.has(r.status)) break;        // erreur permanente → modèle de repli
          if (transientWaits >= 1) break;                       // 5xx persistant → bascule rapide vers le repli
          await sleepMs(1200);
          transientWaits++;
        }
        if (ddModels.length > 1) console.warn(`[DD analyze] bascule modèle de repli (après ${mdl})`);
      }
      if (!response) {
        const hint = lastStatus === 503
          ? "Le modèle IA est temporairement surchargé. Réessayez dans 1-2 minutes."
          : "Erreur API IA temporaire. Réessayez dans quelques instants.";
        return new Response(JSON.stringify({ error: `${hint} (HTTP ${lastStatus})`, detail: lastErrText.slice(0, 200) }), {
          status: 503,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const data = await response.json();
      const content: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!content) {
        return new Response(JSON.stringify({ error: "Réponse IA vide" }), {
          status: 500,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      let dueDiligenceResult = parseJSONResponse(content);
      // Extraire les URLs des "(Source: url)" pour les mettre dans allSources (pas de perte de sources)
      const SOURCE_REGEX = /\(Source:\s*([^)]+)\)/gi;
      const extracted: { name: string; url: string }[] = [];
      function extractUrlsFromString(str: string): void {
        if (typeof str !== "string" || str.startsWith("http")) return;
        let m: RegExpExecArray | null;
        SOURCE_REGEX.lastIndex = 0;
        while ((m = SOURCE_REGEX.exec(str)) !== null) {
          const part = m[1];
          part.split(/[\s,]+/).map((u: string) => u.trim()).filter((u: string) => u.startsWith("http")).forEach((url: string) => {
            const cleaned = validateAndCleanUrl(url);
            if (cleaned && !extracted.some((e) => e.url === cleaned)) {
              try {
                extracted.push({ name: new URL(cleaned).hostname.replace(/^www\./, ""), url: cleaned });
              } catch {
                extracted.push({ name: "Source", url: cleaned });
              }
            }
          });
        }
      }
      function walkExtract(obj: any): void {
        if (!obj) return;
        if (typeof obj === "string") {
          extractUrlsFromString(obj);
          return;
        }
        if (Array.isArray(obj)) { obj.forEach(walkExtract); return; }
        if (typeof obj === "object") {
          for (const k of Object.keys(obj)) {
            if (k === "sources" || k === "allSources") continue;
            walkExtract(obj[k]);
          }
        }
      }
      walkExtract(dueDiligenceResult);
      if (extracted.length > 0) {
        dueDiligenceResult.allSources = dueDiligenceResult.allSources || [];
        const existingUrls = new Set((dueDiligenceResult.allSources as any[]).map((s: any) => s.url));
        extracted.forEach((e) => {
          if (!existingUrls.has(e.url)) {
            (dueDiligenceResult.allSources as any[]).push({ name: e.name, url: e.url, type: "other", relevance: "Extrait du rapport" });
            existingUrls.add(e.url);
          }
        });
      }
      // Nettoyer le texte : retirer TOUS les "(Source: ...)" (même si l'URL contient des parenthèses)
      function stripSourceFromString(str: string): string {
        if (!str || typeof str !== "string") return str;
        if (str.startsWith("http")) return validateAndCleanUrl(str) || str;
        let s = str;
        let prev = "";
        while (prev !== s) {
          prev = s;
          const lower = s.toLowerCase();
          const idx = lower.indexOf("(source:");
          if (idx === -1) break;
          const end = s.indexOf(")", idx);
          if (end === -1) break;
          s = s.slice(0, idx).trimEnd() + " " + s.slice(end + 1).trimStart();
        }
        return s.replace(/\s{2,}/g, " ").trim();
      }
      const stripSrc = (o: any): any => {
        if (!o) return o;
        if (typeof o === "string") return stripSourceFromString(o);
        if (Array.isArray(o)) return o.map(stripSrc);
        if (typeof o === "object") {
          const out: any = {};
          for (const k of Object.keys(o)) {
            if (k === "sources" || k === "allSources") { out[k] = o[k]; continue; }
            out[k] = stripSrc(o[k]);
          }
          return out;
        }
        return o;
      };
      const cleanUrlsAnalyze = (obj: any): any => {
        if (!obj) return obj;
        if (typeof obj === "string") return obj.startsWith("http") ? (validateAndCleanUrl(obj) || obj) : obj;
        if (Array.isArray(obj)) return obj.map(cleanUrlsAnalyze);
        if (typeof obj === "object") { const c: any = {}; for (const k of Object.keys(obj)) c[k] = cleanUrlsAnalyze(obj[k]); return c; }
        return obj;
      };
      dueDiligenceResult = cleanUrlsAnalyze(stripSrc(dueDiligenceResult));
      // Normaliser champs qui doivent être des chaînes (éviter [object Object] côté frontend)
      const toStr = (v: any): string => {
        if (v == null) return "";
        if (typeof v === "string") return v;
        if (typeof v === "object" && v !== null) return (v.milestone ?? v.name ?? v.title ?? v.description ?? v.text ?? v.label ?? "").toString() || JSON.stringify(v).slice(0, 200);
        return String(v);
      };
      if (dueDiligenceResult.traction) {
        if (Array.isArray(dueDiligenceResult.traction.keyMilestones)) {
          dueDiligenceResult.traction.keyMilestones = dueDiligenceResult.traction.keyMilestones.map((m: any) => ({
            date: typeof m?.date === "string" ? m.date : "",
            milestone: toStr(m?.milestone ?? m),
          })).filter((m: any) => m.milestone);
        }
        if (Array.isArray(dueDiligenceResult.traction.partnerships)) {
          dueDiligenceResult.traction.partnerships = dueDiligenceResult.traction.partnerships.map((p: any) => toStr(p));
        }
        if (Array.isArray(dueDiligenceResult.traction.awards)) {
          dueDiligenceResult.traction.awards = dueDiligenceResult.traction.awards.map((a: any) => toStr(a));
        }
        if (dueDiligenceResult.traction.customers?.notable && Array.isArray(dueDiligenceResult.traction.customers.notable)) {
          dueDiligenceResult.traction.customers.notable = dueDiligenceResult.traction.customers.notable.map((n: any) => toStr(n));
        }
      }
      if (dueDiligenceResult.investmentRecommendation) {
        const ir = dueDiligenceResult.investmentRecommendation;
        if (!ir.targetReturn || typeof ir.targetReturn !== "string") ir.targetReturn = "Non disponible";
        if (!ir.investmentHorizon || typeof ir.investmentHorizon !== "string") ir.investmentHorizon = "Non disponible";
        if (!ir.suggestedTicket || typeof ir.suggestedTicket !== "string") ir.suggestedTicket = "Non disponible";
      }
      // L'IA remplit parfois les "sources" de section mais laisse allSources
      // vide : on agrège déterministiquement (dédup par URL), le front affiche
      // allSources dans l'onglet Sources.
      const aggregateSectionSources = (root: any): void => {
        const all: any[] = Array.isArray(root.allSources) ? root.allSources : [];
        const seen = new Set(all.map((s: any) => s?.url).filter(Boolean));
        const visit = (node: any): void => {
          if (!node || typeof node !== "object") return;
          if (Array.isArray(node)) { node.forEach(visit); return; }
          for (const k of Object.keys(node)) {
            if (k === "allSources") continue;
            if (k === "sources" && Array.isArray(node[k])) {
              for (const src of node[k]) {
                const u = src?.url;
                if (typeof u === "string" && u.startsWith("http") && !seen.has(u)) {
                  seen.add(u);
                  all.push({
                    name: typeof src?.name === "string" ? src.name : u,
                    url: u,
                    type: typeof src?.type === "string" ? src.type : "other",
                    relevance: typeof src?.relevance === "string" ? src.relevance : "",
                  });
                }
              }
            } else {
              visit(node[k]);
            }
          }
        };
        visit(root);
        root.allSources = all;
        if (root.dataQuality && (root.dataQuality.sourcesCount == null || root.dataQuality.sourcesCount === "")) {
          root.dataQuality.sourcesCount = String(all.length);
        }
      };
      aggregateSectionSources(dueDiligenceResult);

      dueDiligenceResult.metadata = { companyName, generatedAt: new Date().toISOString(), searchResultsCount: analyzeSearchCount, aiProvider: "gemini", aiModel: GEMINI_MODEL };

      // ——— APPROFONDISSEMENT OBLIGATOIRE : couche Gemini de CRITIQUE du brouillon
      // → recherches ciblées (parallèles) → réécriture qui CREUSE les points clés
      // (chiffres + exemples + sources). Plus de gate de complétude : on creuse
      // toujours. Rotation des clés via geminiDD. round2Context est conservé pour
      // la vérification anti-hallucination des sources plus bas.
      let round2Context = "";
      const ROUND2_BUDGET_MS = 92_000;
      try {
        // Garde anti-546 (ressources/wall-time) : si le brouillon a déjà mangé le
        // budget (ex : fallbacks 503 répétés), on saute l'approfondissement et on
        // renvoie le brouillon — déjà complet — plutôt que de risquer un crash.
        if (Date.now() - phaseStart > 72_000) {
          console.warn("[DueDiligence] Approfondissement sauté (budget compute serré)");
          throw new Error("skip-deepdive");
        }
        const draftSummary = JSON.stringify(dueDiligenceResult).slice(0, 9000);
        const critiquePrompt = `Tu es un VC senior qui relit ce BROUILLON de due diligence sur "${companyName}" pour le DURCIR.
BROUILLON (extrait) : ${draftSummary}

Liste 5 à 8 points traités EN SURFACE ou affirmés SANS PREUVE (chiffre/date/nom/source manquant), classés par importance pour la DÉCISION d'investissement. Cible en priorité : la MÉTRIQUE qui est le produit, le MOAT (IP/brevets précis, données propriétaires), la valorisation/cap table/dilution, les CLIENTS nommés + contrats, les CONCURRENTS nommés + financements, le MODÈLE DE RETOUR (multiple réaliste SaaS vs services), le BEAR CASE spécifique. Pour CHAQUE point, 1 à 2 requêtes web en anglais, courtes et précises (avec "${companyName}").
Réponds UNIQUEMENT : {"gaps":[{"label":"...","queries":["q1","q2"]}]}. 5 à 8 gaps.`;
        const critiqueText = await geminiDD(critiquePrompt, 2048);
        let gaps2: { queries?: string[] }[] = [];
        const jsonC = extractJsonObject(critiqueText || "");
        if (jsonC) { try { gaps2 = JSON.parse(jsonC)?.gaps ?? []; } catch (_) {} }
        const q2: string[] = [];
        for (const g of gaps2.slice(0, 8)) {
          const qs = (Array.isArray(g.queries) ? g.queries : []).map((x: string) => String(x).trim().slice(0, 120)).filter((x: string) => x.length >= 8);
          q2.push(...qs.slice(0, 2));
        }
        const seenQ2 = new Set<string>();
        const uniqueQ2 = q2.filter((x) => { const k = x.toLowerCase().replace(/\s+/g, " "); if (seenQ2.has(k)) return false; seenQ2.add(k); return true; }).slice(0, 6);
        if (uniqueQ2.length > 0) {
          const lines2: string[] = [];
          const seenU2 = new Set<string>();
          const res2 = await Promise.all(uniqueQ2.map((qq) => webSearch(qq, 6).catch(() => [])));
          for (const results of res2) for (const r of results) {
            if (r?.url && !seenU2.has(r.url)) { seenU2.add(r.url); const line = `${r.title || ""}: ${r.description || ""} | ${r.url}`.trim(); if (line.length > 20) lines2.push(line); }
          }
          round2Context = lines2.join("\n").slice(0, 5000);
        }
        if (round2Context && (Date.now() - phaseStart) < ROUND2_BUDGET_MS) {
          const enrichPrompt = `Tu es un VC senior. Voici un BROUILLON de DD (JSON) et des DONNÉES COMPLÉMENTAIRES issues de recherches ciblées sur ses points faibles. Produis une VERSION APPROFONDIE du JSON COMPLET (MÊME structure, ne supprime aucune section, aucune URL dans le texte).

MISSION :
1) APPROFONDIS chaque point qui était en surface avec les nouvelles données : chiffres précis, exemples nommés, dates. Intègre les financements/brevets/clients/concurrents trouvés ; en cas de contradiction, garde la donnée LA PLUS RÉCENTE. DATE DU JOUR : ${new Date().toLocaleDateString("fr-FR", { dateStyle: "long" })} — recalcule runway/âge/« prochaine levée » à partir d'AUJOURD'HUI ; une échéance déjà passée est soit dépassée (risque trésorerie), soit la preuve d'un tour non encore intégré.
2) DÉMONTRE : remplace toute formule générique par le fait chiffré/daté/nommé qui la prouve, sinon retire-la. Nomme les brevets/récompenses/partenariats un par un.
3) RIGUEUR VC : moat quantifié (IP/données, sinon "non prouvé") ; returnModel = multiple cohérent (SaaS vs services) + comparables de sortie NOMMÉS dont un cautionnaire ; bearCase spécifique falsifiable incluant le substitut le moins cher ; thesis = pari falsifiable chiffré ; dealMechanics = prix/%/termes ou priorité DD ; signale les incohérences de chiffres.
4) Chaque section remplit son tableau "sources" (URLs des données utilisées). Si burn/runway/valo/% manquent → confidenceLevel plus bas + diligencePriorities.

BROUILLON ACTUEL :
${JSON.stringify(dueDiligenceResult).slice(0, 22000)}

DONNÉES COMPLÉMENTAIRES :
${round2Context}

Réponds UNIQUEMENT avec le JSON complet approfondi.`;
          const enrichText = await geminiDD(enrichPrompt, 18000);
          if (enrichText) {
            let enriched = parseJSONResponse(enrichText);
            if (enriched && typeof enriched === "object") {
              enriched = cleanUrlsAnalyze(stripSrc(enriched));
              if (enriched.traction?.keyMilestones) {
                enriched.traction.keyMilestones = (enriched.traction.keyMilestones as any[]).map((m: any) => ({ date: typeof m?.date === "string" ? m.date : "", milestone: toStr(m?.milestone ?? m) })).filter((m: any) => m.milestone);
              }
              if (enriched.investmentRecommendation) {
                const ir = enriched.investmentRecommendation;
                if (!ir.targetReturn || typeof ir.targetReturn !== "string") ir.targetReturn = "Non disponible";
                if (!ir.investmentHorizon || typeof ir.investmentHorizon !== "string") ir.investmentHorizon = "Non disponible";
                if (!ir.suggestedTicket || typeof ir.suggestedTicket !== "string") ir.suggestedTicket = "Non disponible";
              }
              enriched.metadata = dueDiligenceResult.metadata;
              aggregateSectionSources(enriched);
              dueDiligenceResult = enriched;
              console.log("[DueDiligence] Approfondissement appliqué");
            }
          }
        } else if (!round2Context) {
          console.log("[DueDiligence] Approfondissement : aucune requête de creusage générée");
        } else {
          console.warn(`[DueDiligence] Réécriture d'approfondissement sautée (budget: ${Math.round((Date.now() - phaseStart) / 1000)}s)`);
        }
      } catch (round2Err) {
        console.warn("[DueDiligence] Approfondissement ignoré:", round2Err);
      }

      // ——— Vérification anti-hallucination des sources ———
      // Chaque URL citée dans le rapport doit exister dans les résultats de
      // recherche réellement fournis à l'IA. Les URLs inventées sont retirées
      // et dataQuality est recalculé déterministiquement (l'auto-évaluation de
      // l'IA n'est pas fiable).
      const normalizeSrcUrl = (u: string): string =>
        u.toLowerCase()
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "")
          .replace(/[.,;:)\]]+$/, "")
          .replace(/\/$/, "");
      const allowedUrls = new Set<string>();
      for (const m of `${enrichedAnalyzeContext}\n${round2Context}`.matchAll(/https?:\/\/[^\s|"<>)]+/gi)) {
        allowedUrls.add(normalizeSrcUrl(m[0]));
      }
      if (allowedUrls.size > 0) {
        let removedCount = 0;
        const isVerified = (src: any): boolean => {
          const u = typeof src?.url === "string" ? src.url : "";
          return u.startsWith("http") && allowedUrls.has(normalizeSrcUrl(u));
        };
        const filterSources = (node: any): void => {
          if (!node || typeof node !== "object") return;
          if (Array.isArray(node)) { node.forEach(filterSources); return; }
          for (const k of Object.keys(node)) {
            if ((k === "sources" || k === "allSources") && Array.isArray(node[k])) {
              const kept = node[k].filter(isVerified);
              removedCount += node[k].length - kept.length;
              node[k] = kept;
            } else {
              filterSources(node[k]);
            }
          }
        };
        filterSources(dueDiligenceResult);
        // Ré-agrège les sources de section (toutes vérifiées) dans allSources
        aggregateSectionSources(dueDiligenceResult);

        const verifiedCount = Array.isArray(dueDiligenceResult.allSources)
          ? dueDiligenceResult.allSources.length
          : 0;
        const dq = (dueDiligenceResult.dataQuality && typeof dueDiligenceResult.dataQuality === "object")
          ? dueDiligenceResult.dataQuality
          : {};
        dq.sourcesCount = String(verifiedCount);
        dq.overallScore = verifiedCount >= 15
          ? "excellent"
          : verifiedCount >= 8
          ? "good"
          : verifiedCount >= 4
          ? "fair"
          : "limited";
        const limitations: string[] = Array.isArray(dq.limitations)
          ? dq.limitations.map((l: any) => String(l))
          : [];
        if (removedCount > 0) {
          limitations.push(
            `${removedCount} source(s) citée(s) non retrouvée(s) dans les recherches — retirée(s) du rapport`,
          );
        }
        if (analyzeSearchCount < 10) {
          limitations.push(
            `Recherches web limitées (${analyzeSearchCount} résultats) — fiabilité réduite, croiser avec d'autres bases`,
          );
        }
        dq.limitations = limitations;
        dueDiligenceResult.dataQuality = dq;
        if (removedCount > 0) {
          console.log(`[DD] Vérification sources: ${removedCount} URL(s) non vérifiable(s) retirée(s), ${verifiedCount} conservée(s)`);
        }
      }

      // Cache 3 j : une nouvelle DD de la même société est servie sans IA.
      if (dueDiligenceResult?.company) {
        await setCachedSearch(`ai|${reportCacheKey}`, 1, [dueDiligenceResult], 3);
      }

      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/due_diligence_jobs?id=eq.${encodeURIComponent(jobId)}`, {
        method: "PATCH",
        headers: { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ result: dueDiligenceResult, status: "analyze_done", updated_at: new Date().toISOString() }),
      });
      if (!patchRes.ok) {
        const patchErr = await patchRes.text();
        console.warn("[DD] PATCH status analyze_done échoué:", patchRes.status, patchErr);
      }
      return new Response(JSON.stringify(dueDiligenceResult), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    console.log(`Starting Due Diligence for: ${companyName}`);
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // ============================================
    // PHASE 1: RECHERCHES MASSIVES ET PARALLÈLES
    // ============================================
    
    // Phase 1 seule = tout le budget ~150s pour la recherche.
    // Liste élaguée des quasi-doublons (-8 requêtes ≈ -20 % de crédits par DD
    // non cachée) ; années dynamiques — jamais hardcodées.
    const yearNow = new Date().getFullYear();
    const searchQueries = [
      `${companyName} company overview about`,
      `${companyName} startup official website`,
      `"${companyName}" company profile business`,
      `${companyName} funding round investment ${yearNow - 1} ${yearNow}`,
      `${companyName} series A B C funding valuation investors`,
      `${companyName} raised million funding round`,
      `${companyName} levée de fonds investisseurs`,
      `${companyName} revenue ARR MRR metrics`,
      `${companyName} customers clients users growth`,
      `${companyName} traction growth rate metrics ${yearNow}`,
      `${companyName} milestones achievements key events`,
      `${companyName} partnerships deals clients`,
      `${companyName} key metrics KPIs unit economics`,
      `${companyName} founders CEO CTO team LinkedIn`,
      `${companyName} founder CEO name background biography`,
      `${companyName} leadership team executives background`,
      `${companyName} employees headcount team size`,
      `${companyName} fondateurs équipe management`,
      `${companyName} product technology platform`,
      `${companyName} solution features how it works`,
      `${companyName} technology stack patents`,
      `${companyName} competitors market landscape`,
      `${companyName} industry market TAM SAM`,
      `${companyName} competitive advantage moat`,
      `${companyName} market size opportunity`,
      `${companyName} news latest ${yearNow - 1} ${yearNow}`,
      `${companyName} press release announcement`,
      `${companyName} partenariat accord`,
      `${companyName} LinkedIn company page`,
      `${companyName} Crunchbase profile`,
      `${companyName} challenges risks concerns`,
      `${companyName} reviews reputation`,
      `${companyName} awards prizes recognition`,
      `${companyName} récompenses prix concours`,
    ];
    
    // Si le site web est fourni, l'ajouter aux recherches
    if (companyWebsite) {
      searchQueries.push(`site:${companyWebsite} about`);
      searchQueries.push(`site:${companyWebsite} team`);
    }
    
    // Contexte additionnel comme requête
    if (additionalContext) {
      searchQueries.push(`${companyName} ${additionalContext}`);
    }

    // Phase 1 seule : plus de résultats par requête, délai raisonnable pour rester sous 150s
    const allSearchResults: WebSearchResult[] = [];
    const RESULTS_PER_QUERY = 20;
    const batchSize = 3;
    const BATCH_DELAY_MS = 650;

    for (let i = 0; i < searchQueries.length; i += batchSize) {
      const batch = searchQueries.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(query => webSearch(query, RESULTS_PER_QUERY))
      );
      batchResults.forEach(results => allSearchResults.push(...results));
      if (i + batchSize < searchQueries.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    console.log(`Total search results collected: ${allSearchResults.length}`);

    // Dédupliquer les résultats par URL
    const uniqueResults = new Map<string, WebSearchResult>();
    allSearchResults.forEach(result => {
      if (result.url && !uniqueResults.has(result.url)) {
        uniqueResults.set(result.url, result);
      }
    });
    const dedupedResults = Array.from(uniqueResults.values());
    console.log(`Unique results after deduplication: ${dedupedResults.length}`);

    // Organiser les résultats par catégorie pour le prompt
    const categorizeResults = (results: WebSearchResult[]) => {
      const categories: Record<string, WebSearchResult[]> = {
        funding: [],
        metrics: [],
        team: [],
        product: [],
        market: [],
        news: [],
        linkedin: [],
        crunchbase: [],
        official: [],
        other: [],
      };
      
      results.forEach(r => {
        const url = r.url.toLowerCase();
        const title = r.title.toLowerCase();
        const desc = r.description.toLowerCase();
        
        if (url.includes('linkedin.com')) {
          categories.linkedin.push(r);
        } else if (url.includes('crunchbase.com')) {
          categories.crunchbase.push(r);
        } else if (title.includes('funding') || title.includes('raised') || desc.includes('series') || desc.includes('valuation') || desc.includes('investor')) {
          categories.funding.push(r);
        } else if (title.includes('revenue') || desc.includes('arr') || desc.includes('mrr') || desc.includes('customer') || desc.includes('growth')) {
          categories.metrics.push(r);
        } else if (title.includes('founder') || title.includes('ceo') || title.includes('team') || desc.includes('executive')) {
          categories.team.push(r);
        } else if (title.includes('product') || title.includes('technology') || title.includes('platform') || title.includes('solution')) {
          categories.product.push(r);
        } else if (title.includes('market') || title.includes('competitor') || title.includes('industry')) {
          categories.market.push(r);
        } else if (url.includes('techcrunch') || url.includes('venturebeat') || url.includes('reuters') || title.includes('announce')) {
          categories.news.push(r);
        } else {
          categories.other.push(r);
        }
      });
      
      return categories;
    };

    const categorizedResults = categorizeResults(dedupedResults);

    // Construire le contexte de recherche structuré
    const buildSearchContext = () => {
      let context = "";
      
      const addCategory = (name: string, results: WebSearchResult[], limit: number = 10) => {
        if (results.length === 0) return;
        context += `\n\n=== ${name.toUpperCase()} ===\n`;
        results.slice(0, limit).forEach((r, i) => {
          context += `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.description}\n`;
          if (r.extra_snippets?.length) {
            context += `Extra: ${r.extra_snippets.slice(0, 2).join(' | ')}\n`;
          }
        });
      };
      
      // Limites par catégorie : phase 1 seule → on envoie plus de contexte à l'IA en phase 2
      addCategory("Official & Company Info", categorizedResults.official.concat(categorizedResults.other).slice(0, 40), 40);
      addCategory("Funding & Investments", categorizedResults.funding, 35);
      addCategory("Metrics & Traction", categorizedResults.metrics, 30);
      addCategory("Team & Founders", categorizedResults.team, 28);
      addCategory("Product & Technology", categorizedResults.product, 28);
      addCategory("Market & Competition", categorizedResults.market, 28);
      addCategory("News & Press", categorizedResults.news, 22);
      addCategory("LinkedIn", categorizedResults.linkedin, 10);
      addCategory("Crunchbase", categorizedResults.crunchbase, 10);
      
      return context;
    };

    const searchContext = buildSearchContext() || `ENTREPRISE: ${companyName}\nAucun résultat de recherche trouvé — l'IA analysera avec ses connaissances générales.`;

    // Phase search : sauvegarder le contexte et retourner jobId (analyse IA en phase 2 séparée)
    const jobIdNew = crypto.randomUUID();
    const SUPABASE_URL_SEARCH = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY_SEARCH = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL_SEARCH || !SUPABASE_SERVICE_ROLE_KEY_SEARCH) {
      return new Response(JSON.stringify({ error: "Configuration Supabase manquante (phase search)" }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const insertRes = await fetch(`${SUPABASE_URL_SEARCH}/rest/v1/due_diligence_jobs`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_SERVICE_ROLE_KEY_SEARCH,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY_SEARCH}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        id: jobIdNew,
        company_name: companyName,
        company_website: companyWebsite || null,
        additional_context: additionalContext || null,
        search_context: searchContext,
        search_results_count: dedupedResults.length,
        status: "search_done",
      }),
    });
    if (!insertRes.ok) {
      const insertErr = await insertRes.text();
      console.error("[DD] Échec INSERT job:", insertRes.status, insertErr);
      return new Response(JSON.stringify({ error: `Erreur sauvegarde résultats (${insertRes.status}). Vérifiez la configuration Supabase.` }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    console.log(`Due Diligence search done for: ${companyName}, jobId: ${jobIdNew}, results: ${dedupedResults.length}`);
    return new Response(
      JSON.stringify({ jobId: jobIdNew, status: "search_done", searchResultsCount: dedupedResults.length }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in due-diligence function:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
