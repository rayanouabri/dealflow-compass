import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCachedSearch, setCachedSearch } from "../_shared/search-cache.ts";
import { searchAll } from "../_shared/search-client.ts";
import { reserveAiCall } from "../_shared/ai-client.ts";

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
    const GEMINI_KEYS = [
      ...new Set(
        [
          Deno.env.get("GEMINI_API_KEY"),
          Deno.env.get("GEMINI_KEY_2"),
          Deno.env.get("GEMINI_KEY_3"),
        ].filter((k): k is string => !!k),
      ),
    ];
    const GEMINI_API_KEY = GEMINI_KEYS[0];
    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
    // Sur 2.5-flash, le thinking peut consommer tout le budget de sortie →
    // désactivé. Les modèles 3.x gèrent leur thinking séparément : ne pas forcer.
    const GEMINI_THINKING = /2\.5-flash/.test(GEMINI_MODEL)
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
      const reportCacheKey = `ddreport|${companyName.toLowerCase().trim()}`;
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
   - competition.competitors : 3 à 5 concurrents MAXIMUM, mais CHACUN doit OBLIGATOIREMENT avoir funding (montant/round si connu, sinon "Estimation : ...") + 2-3 strengths + 2-3 weaknesses spécifiques et non vides. Mieux vaut 3 concurrents détaillés que 7 noms aux forces/faiblesses vides — ne liste JAMAIS un concurrent sans remplir ses strengths ET weaknesses. competition.moat doit expliquer POURQUOI le moat tient (IP, effets de réseau, coût de switch, avance techno chiffrée).
   - team : pour chaque fondateur, background détaillé (formation, employeurs passés, réalisations) ; overview = thèse explicite sur la capacité d'exécution.
   - financials : reconstituer fundingHistory (rounds, montants, dates, investisseurs nommés) même partiellement ; estimer burn/runway et logique de valorisation quand pertinent (marqué "estimation").
   - investmentRecommendation.rationale : raisonnement de VC structuré (thèse, ce qui doit être vrai pour gagner, ce qui peut tuer le deal) ; strengths/weaknesses chiffrés ; suggestedNextSteps = actions de DD concrètes (qui appeler, quels chiffres demander, quelle clause).
   - Business model & go-to-market : couvre explicitement le modèle de revenus / pricing dans product.valueProposition, et la stratégie d'acquisition / GTM dans opportunities.

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
    "thesisFitAnalysis": "Analyse FINE de l'adéquation au mandat du fonds : pourquoi (ou pas) ce deal correspond au stade visé, au secteur, à la géo, au type de moat/retour recherché. Pas un oui/non — un raisonnement d'associé.",
    "bullCase": "Le scénario haussier ARGUMENTÉ (chemin vers un 10x+) : quelles hypothèses doivent se réaliser (marché, exécution, moat), avec l'ordre de grandeur de l'upside.",
    "bearCase": "Le scénario baissier ARGUMENTÉ : les 2-3 façons les PLUS PROBABLES dont ce deal perd de l'argent, classées par probabilité.",
    "keyDebates": ["Les vrais débats d'un comité d'investissement sur ce dossier — chaque point présenté avec les DEUX côtés de l'argument (pour/contre), pas une banalité."],
    "whatMustBeTrue": ["Les conditions NÉCESSAIRES pour que la thèse d'investissement tienne (hypothèses critiques à valider)."],
    "killCriteria": ["Les signaux qui INVALIDERAIENT le deal (deal-breakers) — ce qui ferait dire non en DD approfondie."],
    "valuationView": "Vue sur la valorisation/le point d'entrée : raisonnable au stade ? comparables de tour, dilution attendue, prix d'entrée vs potentiel.",
    "diligencePriorities": ["Les 3-4 vérifications de DD qui CHANGERAIENT LE PLUS la décision (les plus à fort enjeu, pas une checklist générique)."],
    "convictionLevel": "high | medium | low",
    "verdict": "La position finale ARGUMENTÉE en 3-5 phrases, comme un associé qui défend ou rejette le deal en comité : la recommandation, le raisonnement central, et la condition principale."
  },
  "allSources": [ { "name": "...", "url": "...", "type": "article|crunchbase|linkedin|official|press|other", "relevance": "..." } ],
  "dataQuality": { "overallScore": "...", "dataAvailability": {}, "limitations": [], "sourcesCount": "..." }
}

Réponds UNIQUEMENT avec du JSON valide.`;

      const sleepAnalyze = (ms: number) => new Promise((r) => setTimeout(r, ms));
      // 4 gap queries (was 8) — keeps gap1 phase under ~10s so main AI has budget
      const MAX_GAP_QUERIES_DD = 4;
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

      // ——— SYSTÉMATIQUE : Requêtes équipe obligatoires (car souvent manquantes) ———
      const teamQueries = [
        `${companyName} founding team members`,
        `site:linkedin.com ${companyName} company`,
        `${companyName} CEO founder background`,
        `${companyName} CTO VP Engineering`,
        `${companyName} team hiring employees`,
      ];
      const teamLines: string[] = [];
      const seenTeamUrl = new Set<string>();
      try {
        const teamResults = await Promise.all(teamQueries.map(q => webSearch(q, 6).catch(() => [])));
        for (const results of teamResults) {
          for (const r of results) {
            if (r?.url && !seenTeamUrl.has(r.url)) {
              seenTeamUrl.add(r.url);
              const line = `${r.title || ""}: ${r.description || ""} | ${r.url}`.trim();
              if (line.length > 20) teamLines.push(line);
            }
          }
        }
        if (teamLines.length > 0) {
          enrichedAnalyzeContext = `${analyzeContext}\n\n=== RECHERCHES ÉQUIPE (5 requêtes systématiques — PRIORITÉ) ===\n${teamLines.join("\n").slice(0, 3000)}`;
          console.log(`[DueDiligence] Équipe systématique: ${teamLines.length} résultats trouvés`);
        }
      } catch (teamErr) {
        console.warn("[DueDiligence] Requêtes équipe sistématiques ignorées:", teamErr);
      }

      try {
        const aiEndpointGap = await getAIEndpoint();
        const contextExtract = typeof enrichedAnalyzeContext === "string" ? enrichedAnalyzeContext.slice(0, 7000) : "";
        const gapPrompt = `Tu es un analyste VC. Contexte de recherche pour une due diligence sur "${companyName}".

CONTEXTE :
${contextExtract}

TÂCHE : Identifie 1 à 3 thèmes où les infos sont ENCORE INSUFFISANTES pour remplir le rapport (si l'équipe est complète, mets-la en bas de priorité). Priorité : (1) marché (TAM/SAM, évolution, tendances, acteurs), (2) clients/traction (customers, partenariats, chiffres), (3) financements/métriques. Pour chaque thème, 1 à 2 requêtes web en ANGLAIS, courtes ; inclure "${companyName}".
Réponds UNIQUEMENT : {"gaps":[{"label":"...","queries":["query1"]}]}. Max 3 gaps, 2 queries par gap. Si suffisant : {"gaps":[]}.`;

        const gapBody = { contents: [{ parts: [{ text: gapPrompt }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 2048, responseMimeType: "application/json" as const, ...GEMINI_THINKING } };
        await reserveAiCall();
        const gapRes = await fetch(aiEndpointGap.url, { method: "POST", headers: aiEndpointGap.headers, body: JSON.stringify(gapBody) });
        if (gapRes.ok) {
          const gapData = await gapRes.json();
          const gapText: string = gapData.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
              enrichedAnalyzeContext = `${analyzeContext}\n\n=== RECHERCHES COMPLÉMENTAIRES (lacunes — à utiliser en priorité) ===\n${extraContext}`;
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
        generationConfig: { temperature: 0.1, topP: 0.9, topK: 40, maxOutputTokens: 16384, responseMimeType: "application/json" as const, ...GEMINI_THINKING },
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
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const headers = { ...aiEndpoint.headers, "x-goog-api-key": GEMINI_KEYS[keyIdx] };
        const r = await fetch(aiEndpoint.url, { method: "POST", headers, body: JSON.stringify(aiBody) });
        if (r.ok) { response = r; break; }
        lastStatus = r.status;
        lastErrText = await r.text();
        console.warn(`[DD analyze] Gemini HTTP ${r.status} key#${keyIdx} attempt ${attempt + 1}/${maxAttempts}: ${lastErrText.slice(0, 150)}`);
        if (r.status === 429) {
          if (keyIdx < GEMINI_KEYS.length - 1) { keyIdx++; continue; } // quota → clé suivante
          break; // toutes les clés en quota
        }
        if (!TRANSIENT_STATUSES.has(r.status)) break;                  // permanent error → don't retry
        if (transientWaits >= 2) break;
        await sleepMs(transientWaits === 0 ? 2000 : 5000);             // 2s, then 5s
        transientWaits++;
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

      // ——— 2e itération : lacunes sur le rapport → recherches → enrichissement ———
      // Conditionnelle : (a) budget wall-time — l'enrichissement refait une
      // génération 16k (~50s), risque de kill 546 près du plafond 150s ;
      // (b) complétude — si les sections clés sont déjà remplies, ces 2 appels
      // IA free-tier n'apportent rien.
      const ROUND2_BUDGET_MS = 85_000;
      const elapsedMs = Date.now() - phaseStart;
      const reportIncomplete = (() => {
        const r = dueDiligenceResult;
        const nd = (v: unknown) => !v || /non disponible|non identifié/i.test(String(v));
        const founders = r?.team?.founders;
        const foundersWeak = !Array.isArray(founders) || founders.length === 0 ||
          founders.every((f: any) => nd(f?.name));
        const tamWeak = nd(r?.market?.tam);
        const fundingWeak = nd(r?.financials?.totalFunding);
        const sourcesWeak = !Array.isArray(r?.allSources) || r.allSources.length < 8;
        return foundersWeak || tamWeak || fundingWeak || sourcesWeak;
      })();
      // Contexte additionnel de l'itération 2, conservé pour la vérification
      // des sources en fin de phase.
      let round2Context = "";
      if (elapsedMs > ROUND2_BUDGET_MS) {
        console.warn(`[DueDiligence] 2e itération sautée (budget temps: ${Math.round(elapsedMs / 1000)}s écoulées)`);
      } else if (!reportIncomplete) {
        console.log("[DueDiligence] 2e itération sautée (rapport déjà complet — économie de 2 appels IA)");
      } else
      try {
        const reportSummary = JSON.stringify(dueDiligenceResult).slice(0, 4000);
        const gapPrompt2 = `Rapport de due diligence (brouillon) sur "${companyName}". Extrait : ${reportSummary}
Identifie 1 à 3 thèmes où des infos manquent encore (équipe, financements, métriques, concurrence). Pour chaque thème, 1 requête de recherche en anglais, courte ; inclure "${companyName}" si pertinent.
Réponds UNIQUEMENT : {"gaps":[{"label":"...","queries":["query1"]}]}. Max 3 gaps, 1-2 queries chacun. Si rien : {"gaps":[]}.`;

        const aiEndpointGap2 = await getAIEndpoint();
        const gapBody2 = { contents: [{ parts: [{ text: gapPrompt2 }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 1500, responseMimeType: "application/json" as const, ...GEMINI_THINKING } };
        await reserveAiCall();
        const gapRes2 = await fetch(aiEndpointGap2.url, { method: "POST", headers: aiEndpointGap2.headers, body: JSON.stringify(gapBody2) });
        if (gapRes2.ok) {
          const gapData2 = await gapRes2.json();
          const gapText2: string = gapData2.candidates?.[0]?.content?.parts?.[0]?.text || "";
          let gaps2: { queries?: string[] }[] = [];
          if (gapText2) {
            const jsonStr2 = extractJsonObject(gapText2);
            if (jsonStr2) {
              try {
                const parsed2 = JSON.parse(jsonStr2);
                gaps2 = Array.isArray(parsed2?.gaps) ? parsed2.gaps : [];
              } catch (_) {}
            }
          }
          const queries2: string[] = [];
          for (const g of gaps2.slice(0, 3)) {
            const qs = (Array.isArray(g.queries) ? g.queries : []).map((x: string) => String(x).trim().slice(0, 120)).filter((x: string) => x.length >= 8);
            queries2.push(...qs.slice(0, 2));
          }
          const seenQ2 = new Set<string>();
          const uniqueQueries2 = queries2.filter((q) => {
            const k = q.toLowerCase().replace(/\s+/g, " ");
            if (seenQ2.has(k)) return false;
            seenQ2.add(k);
            return true;
          }).slice(0, 4);
          if (uniqueQueries2.length > 0) {
            const extraLines2: string[] = [];
            const seenUrl2 = new Set<string>();
            for (const q of uniqueQueries2) {
              try {
                const results = await webSearch(q, 5);
                for (const r of results) {
                  if (r?.url && !seenUrl2.has(r.url)) {
                    seenUrl2.add(r.url);
                    const line = `${r.title || ""}: ${r.description || ""} | ${r.url}`.trim();
                    if (line.length > 20) extraLines2.push(line);
                  }
                }
                await sleepAnalyze(1200);
              } catch (_) {}
            }
            const extraContext2 = extraLines2.join("\n").slice(0, 3500);
            round2Context = extraContext2;
            if (extraContext2) {
              const enrichPrompt = `Rapport de due diligence (JSON) et données complémentaires. Intègre les nouvelles données où pertinent. Retourne le JSON COMPLET, même structure.

RAPPORT ACTUEL :
${JSON.stringify(dueDiligenceResult).slice(0, 26000)}

DONNÉES COMPLÉMENTAIRES :
${extraContext2}

Réponds UNIQUEMENT avec le JSON complet.`;
              const enrichBody = { contents: [{ parts: [{ text: enrichPrompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 16384, responseMimeType: "application/json" as const, ...GEMINI_THINKING } };
              await reserveAiCall();
              const enrichRes = await fetch(aiEndpointGap2.url, { method: "POST", headers: aiEndpointGap2.headers, body: JSON.stringify(enrichBody) });
              if (enrichRes.ok) {
                const enrichData = await enrichRes.json();
                const enrichText: string = enrichData.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
                    dueDiligenceResult = enriched;
                    console.log("[DueDiligence] Enrichissement 2 (rapport) appliqué");
                  }
                }
              }
            }
          }
        }
      } catch (round2Err) {
        console.warn("[DueDiligence] 2e itération ignorée:", round2Err);
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
