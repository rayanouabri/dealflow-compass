import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callDigitalOceanAgent, formatDueDiligencePrompt } from "../_shared/digitalocean-agent.ts";

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

// Search using Brave Search API
// Search using Serper.dev API (Google Search) - 2500 free searches/month
// Fallback to Brave Search if Serper not configured
async function braveSearch(query: string, count: number = 20, retries: number = 2): Promise<BraveSearchResult[]> {
  const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY") || Deno.env.get("serper_api");
  const BRAVE_API_KEY = Deno.env.get("BRAVE_API_KEY");
  
  if (SERPER_API_KEY) {
    return serperSearch(query, count, SERPER_API_KEY);
  }
  
  if (BRAVE_API_KEY) {
    return braveSearchFallback(query, count, BRAVE_API_KEY, retries);
  }
  
  console.warn("Aucune API de recherche configurée");
  return [];
}

async function serperSearch(query: string, count: number, apiKey: string): Promise<BraveSearchResult[]> {
  try {
    console.log(`[Serper] Recherche: ${query.substring(0, 50)}...`);
    
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: Math.min(count, 30) }),
    });

    if (!response.ok) {
      console.error(`[Serper] Erreur ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results = (data.organic || []).slice(0, count).map((r: any) => ({
      title: r.title || "",
      url: r.link || "",
      description: r.snippet || "",
      extra_snippets: [],
    }));
    
    console.log(`[Serper] ✅ ${results.length} résultats`);
    return results;
    
  } catch (error) {
    console.error("[Serper] Échec:", error);
    return [];
  }
}

async function braveSearchFallback(query: string, count: number, apiKey: string, retries: number): Promise<BraveSearchResult[]> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
        { headers: { "Accept": "application/json", "X-Subscription-Token": apiKey } }
      );

      if (response.ok) {
        const data = await response.json();
        return (data.web?.results || []).map((r: any) => ({
          title: r.title || "",
          url: r.url || "",
          description: r.description || "",
          extra_snippets: r.extra_snippets || [],
        }));
      }

      if (response.status === 429 && attempt < retries - 1) {
        await sleep(2000 * Math.pow(2, attempt));
        continue;
      }
      return [];
    } catch {
      if (attempt === retries - 1) return [];
      await sleep(1000);
    }
  }
  return [];
}

// Robust JSON parsing function
function parseJSONResponse(content: string): any {
  let cleanContent = content.trim();
  
  if (cleanContent.startsWith("```json")) {
    cleanContent = cleanContent.slice(7);
  }
  if (cleanContent.startsWith("```")) {
    cleanContent = cleanContent.slice(3);
  }
  if (cleanContent.endsWith("```")) {
    cleanContent = cleanContent.slice(0, -3);
  }
  cleanContent = cleanContent.trim();
  
  const firstBrace = cleanContent.indexOf('{');
  const lastBrace = cleanContent.lastIndexOf('}');
  
  if (firstBrace > 0 || lastBrace < cleanContent.length - 1) {
    if (firstBrace >= 0 && lastBrace >= 0 && lastBrace > firstBrace) {
      cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
    }
  }
  
  try {
    return JSON.parse(cleanContent);
  } catch (e) {
    // Try fixing common issues
    let fixedContent = cleanContent.replace(/,(\s*[}\]])/g, '$1');
    try {
      return JSON.parse(fixedContent);
    } catch (e2) {
      throw new Error(`Failed to parse JSON: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }
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

    // Configuration AI
    const AI_PROVIDER = (Deno.env.get("AI_PROVIDER") || "gemini").toLowerCase();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_KEY_2") || Deno.env.get("GEMINI_API_KEY");
    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro";
    const VERTEX_AI_PROJECT = Deno.env.get("VERTEX_AI_PROJECT_ID");
    const VERTEX_AI_LOCATION = Deno.env.get("VERTEX_AI_LOCATION") || "us-central1";
    const VERTEX_AI_MODEL = Deno.env.get("VERTEX_AI_MODEL") || "gemini-2.5-pro";
    const VERTEX_AI_CREDENTIALS = Deno.env.get("VERTEX_AI_CREDENTIALS");
    const BRAVE_API_KEY = Deno.env.get("BRAVE_API_KEY");
    
    // Helper pour encoder en base64url
    function base64url(data: Uint8Array | string): string {
      const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const base64 = btoa(String.fromCharCode(...bytes));
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
    
    // Helper pour générer un JWT signé
    async function generateSignedJWT(credentials: any): Promise<string> {
      const header = { alg: "RS256", typ: "JWT" };
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: credentials.client_email,
        sub: credentials.client_email,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
        scope: "https://www.googleapis.com/auth/cloud-platform"
      };
      
      const headerB64 = base64url(JSON.stringify(header));
      const payloadB64 = base64url(JSON.stringify(payload));
      const message = `${headerB64}.${payloadB64}`;
      
      const pemKey = credentials.private_key.replace(/\\n/g, '\n');
      const pemContents = pemKey
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\s/g, '');
      const keyBuffer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
      
      const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        keyBuffer,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );
      
      const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        privateKey,
        new TextEncoder().encode(message)
      );
      
      const signatureB64 = base64url(new Uint8Array(signature));
      return `${message}.${signatureB64}`;
    }
    
    // Helper pour obtenir un token OAuth2 pour Vertex AI
    async function getVertexAIToken(): Promise<string> {
      if (!VERTEX_AI_CREDENTIALS) {
        throw new Error("VERTEX_AI_CREDENTIALS requis pour Vertex AI");
      }
      
      const credentials = typeof VERTEX_AI_CREDENTIALS === 'string' 
        ? JSON.parse(VERTEX_AI_CREDENTIALS) 
        : VERTEX_AI_CREDENTIALS;
      
      const jwt = await generateSignedJWT(credentials);
      
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt
        })
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Erreur OAuth2 Vertex AI: ${tokenResponse.status} - ${errorText}`);
      }
      
      const tokenData = await tokenResponse.json();
      return tokenData.access_token;
    }
    
    // Helper pour construire l'URL et les headers selon le provider
    const getAIEndpoint = async () => {
      const useModel = AI_PROVIDER === "vertex" ? VERTEX_AI_MODEL : GEMINI_MODEL;
      
      if (AI_PROVIDER === "vertex") {
        if (!VERTEX_AI_PROJECT || !VERTEX_AI_CREDENTIALS) {
          throw new Error("Configuration Vertex AI incomplète");
        }
        
        const accessToken = await getVertexAIToken();
        
        return {
          url: `https://${VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_AI_PROJECT}/locations/${VERTEX_AI_LOCATION}/publishers/google/models/${useModel}:generateContent`,
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
        };
      } else {
        if (!GEMINI_API_KEY) {
          throw new Error("GEMINI_API_KEY requis");
        }
        
        return {
          url: `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${GEMINI_API_KEY}`,
          headers: { "Content-Type": "application/json" },
        };
      }
    };
    
    // Vérification configuration
    if (AI_PROVIDER === "vertex") {
      if (!VERTEX_AI_PROJECT || !VERTEX_AI_CREDENTIALS) {
        return new Response(JSON.stringify({ 
          error: "Configuration Vertex AI invalide. Vérifiez VERTEX_AI_PROJECT_ID et VERTEX_AI_CREDENTIALS.",
          setupRequired: true
        }), {
          status: 500,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
    } else {
      if (!GEMINI_API_KEY) {
        return new Response(JSON.stringify({ 
          error: "GEMINI_API_KEY manquante.",
          setupRequired: true
        }), {
          status: 500,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
    }
    
    const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY") || Deno.env.get("serper_api");
    if (phase !== "analyze" && !BRAVE_API_KEY && !SERPER_API_KEY) {
      return new Response(JSON.stringify({ 
        error: "Aucune API de recherche configurée. Ajoutez BRAVE_API_KEY ou SERPER_API_KEY.",
        setupRequired: true
      }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ========== PHASE ANALYZE : charger le job et lancer l'IA uniquement ==========
    if (phase === "analyze" && jobId) {
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
        // Réponse inattendue (non-array) ou aucun résultat
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
      if (job.status !== "search_done" || !job.search_context) {
        return new Response(JSON.stringify({ error: `Job non prêt pour l'analyse (statut: ${job.status}, contexte: ${job.search_context ? "présent" : "absent"})` }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      companyName = job.company_name || "";
      const analyzeContext = job.search_context;
      const analyzeSearchCount = job.search_results_count || 0;

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
  "allSources": [ { "name": "...", "url": "...", "type": "article|crunchbase|linkedin|official|press|other", "relevance": "..." } ],
  "dataQuality": { "overallScore": "...", "dataAvailability": {}, "limitations": [], "sourcesCount": "..." }
}

Réponds UNIQUEMENT avec du JSON valide.`;

      const sleepAnalyze = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const MAX_GAP_QUERIES_DD = 8;
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
      try {
        const aiEndpointGap = await getAIEndpoint();
        const contextExtract = typeof analyzeContext === "string" ? analyzeContext.slice(0, 7000) : "";
        const gapPrompt = `Tu es un analyste VC. Contexte de recherche pour une due diligence sur "${companyName}".

CONTEXTE :
${contextExtract}

TÂCHE : Identifie 2 à 4 thèmes où les infos sont INSUFFISANTES pour remplir le rapport. Priorité : (1) équipe/fondateurs (LinkedIn, parcours, formation), (2) marché (TAM/SAM, évolution, tendances, acteurs), (3) clients/traction (customers, partenariats, chiffres), (4) financements/métriques. Pour chaque thème, 1 à 2 requêtes web en ANGLAIS, courtes ; inclure "${companyName}" (ex: "${companyName} founder LinkedIn", "${companyName} market size TAM").
Réponds UNIQUEMENT : {"gaps":[{"label":"...","queries":["query1"]}]}. Max 4 gaps, 2 queries par gap. Si suffisant : {"gaps":[]}.`;

        const gapBody = AI_PROVIDER === "vertex"
          ? { contents: [{ role: "user", parts: [{ text: gapPrompt }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 600 } }
          : { contents: [{ parts: [{ text: gapPrompt }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 600, responseMimeType: "application/json" as const } };
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
            const extraLines: string[] = [];
            const seenUrl = new Set<string>();
            for (const q of uniqueQueries) {
              try {
                const results = await braveSearch(q, 6);
                for (const r of results) {
                  if (r?.url && !seenUrl.has(r.url)) {
                    seenUrl.add(r.url);
                    const line = `${r.title || ""}: ${r.description || ""} | ${r.url}`.trim();
                    if (line.length > 20) extraLines.push(line);
                  }
                }
                await sleepAnalyze(1200);
              } catch (_) {}
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

⚠️ RAPPELS CRITIQUES :
1. NE METS AUCUNE URL dans le texte. Toutes les URLs vont UNIQUEMENT dans "sources" et "allSources".
2. allSources : 15–25 entrées minimum. N'invente AUCUNE URL.
3. Pour toute donnée manquante : privilégier "Estimation (secteur / benchmarks) : ..." plutôt que "Non disponible" seul.
4. MARCHÉ : fournis une analyse complète (TAM/SAM/SOM, évolution, CAGR, tendances, problèmes du secteur, régulation). Jamais une ligne vide.
5. ÉQUIPE : chaque fondateur avec name, role, background détaillé (formation, parcours), linkedin. overview = complémentarité et capacité d'exécution.
6. TRACTION : customers.count, notable, segments TOUJOURS remplis (données ou "Estimation d'après contexte : ..."). partnerships et awards en listes (ou ["Aucun identifié"] si rien trouvé).
7. keyMilestones[].milestone, partnerships[], awards[] : chaînes uniquement. targetReturn, investmentHorizon, suggestedTicket toujours remplis.
8. Sois EXHAUSTIF : aucune section ne doit rester superficielle ou vide.
${enrichedAnalyzeContext !== analyzeContext ? "\n9. Utilise OBLIGATOIREMENT la section « RECHERCHES COMPLÉMENTAIRES » pour compléter les données manquantes." : ""}

Réponds UNIQUEMENT avec du JSON valide.`;

      const aiEndpoint = await getAIEndpoint();
      const aiBody = AI_PROVIDER === "vertex" 
        ? {
            contents: [{ role: "user", parts: [{ text: `${systemPromptAnalyze}\n\n${userPromptAnalyze}` }] }],
            generationConfig: { temperature: 0.1, topP: 0.9, topK: 40, maxOutputTokens: 32768 },
          }
        : {
            contents: [{ parts: [{ text: `${systemPromptAnalyze}\n\n${userPromptAnalyze}` }] }],
            generationConfig: { temperature: 0.1, topP: 0.9, topK: 40, maxOutputTokens: 32768, responseMimeType: "application/json" as const },
          };
      let response = await fetch(aiEndpoint.url, { method: "POST", headers: aiEndpoint.headers, body: JSON.stringify(aiBody) });
      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: `Erreur API IA: ${response.status} - ${errText.slice(0, 200)}` }), {
          status: 500,
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
      dueDiligenceResult.metadata = { companyName, generatedAt: new Date().toISOString(), searchResultsCount: analyzeSearchCount, aiProvider: AI_PROVIDER };

      // ——— 2e itération : lacunes sur le rapport → recherches → enrichissement ———
      try {
        const reportSummary = JSON.stringify(dueDiligenceResult).slice(0, 4000);
        const gapPrompt2 = `Rapport de due diligence (brouillon) sur "${companyName}". Extrait : ${reportSummary}
Identifie 1 à 3 thèmes où des infos manquent encore (équipe, financements, métriques, concurrence). Pour chaque thème, 1 requête de recherche en anglais, courte ; inclure "${companyName}" si pertinent.
Réponds UNIQUEMENT : {"gaps":[{"label":"...","queries":["query1"]}]}. Max 3 gaps, 1-2 queries chacun. Si rien : {"gaps":[]}.`;

        const aiEndpointGap2 = await getAIEndpoint();
        const gapBody2 = AI_PROVIDER === "vertex"
          ? { contents: [{ role: "user", parts: [{ text: gapPrompt2 }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 500 } }
          : { contents: [{ parts: [{ text: gapPrompt2 }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 500, responseMimeType: "application/json" as const } };
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
                const results = await braveSearch(q, 5);
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
            if (extraContext2) {
              const enrichPrompt = `Rapport de due diligence (JSON) et données complémentaires. Intègre les nouvelles données où pertinent. Retourne le JSON COMPLET, même structure.

RAPPORT ACTUEL :
${JSON.stringify(dueDiligenceResult).slice(0, 26000)}

DONNÉES COMPLÉMENTAIRES :
${extraContext2}

Réponds UNIQUEMENT avec le JSON complet.`;
              const enrichBody = AI_PROVIDER === "vertex"
                ? { contents: [{ role: "user", parts: [{ text: enrichPrompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 32768 } }
                : { contents: [{ parts: [{ text: enrichPrompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 32768, responseMimeType: "application/json" as const } };
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
    
    // Phase 1 seule = tout le budget ~150s pour la recherche → on maximise requêtes et limites
    const searchQueries = [
      `${companyName} company overview about`,
      `${companyName} startup official website`,
      `"${companyName}" company profile business`,
      `${companyName} company description mission`,
      `${companyName} funding round investment 2024 2025`,
      `${companyName} series A B C funding valuation investors`,
      `${companyName} raised million funding round`,
      `${companyName} valuation latest funding`,
      `${companyName} levée de fonds investisseurs`,
      `${companyName} revenue ARR MRR metrics`,
      `${companyName} customers clients users growth`,
      `${companyName} traction growth rate metrics 2024`,
      `${companyName} milestones achievements key events`,
      `${companyName} partnerships deals clients`,
      `${companyName} market share business performance`,
      `${companyName} key metrics KPIs unit economics`,
      `${companyName} revenue growth ARR valuation multiple`,
      `${companyName} founders CEO CTO team LinkedIn`,
      `${companyName} founder CEO name background biography`,
      `${companyName} leadership team executives background`,
      `${companyName} employees headcount team size`,
      `${companyName} fondateurs équipe management`,
      `${companyName} who founded CEO`,
      `${companyName} product technology platform`,
      `${companyName} solution features how it works`,
      `${companyName} technology stack patents`,
      `${companyName} produit innovation`,
      `${companyName} competitors market landscape`,
      `${companyName} industry market TAM SAM`,
      `${companyName} competitive advantage moat`,
      `${companyName} market size opportunity`,
      `${companyName} news latest 2024 2025`,
      `${companyName} press release announcement`,
      `${companyName} partenariat accord`,
      `${companyName} LinkedIn company page`,
      `${companyName} Crunchbase profile`,
      `${companyName} Dealroom PitchBook`,
      `${companyName} challenges risks concerns`,
      `${companyName} reviews reputation`,
      `${companyName} awards prizes recognition`,
      `${companyName} récompenses prix concours`,
      `${companyName} investment thesis target return ticket`,
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
    const allSearchResults: BraveSearchResult[] = [];
    const RESULTS_PER_QUERY = 20;
    const batchSize = 3;
    const BATCH_DELAY_MS = 650;

    for (let i = 0; i < searchQueries.length; i += batchSize) {
      const batch = searchQueries.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(query => braveSearch(query, RESULTS_PER_QUERY))
      );
      batchResults.forEach(results => allSearchResults.push(...results));
      if (i + batchSize < searchQueries.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    console.log(`Total search results collected: ${allSearchResults.length}`);

    // Dédupliquer les résultats par URL
    const uniqueResults = new Map<string, BraveSearchResult>();
    allSearchResults.forEach(result => {
      if (result.url && !uniqueResults.has(result.url)) {
        uniqueResults.set(result.url, result);
      }
    });
    const dedupedResults = Array.from(uniqueResults.values());
    console.log(`Unique results after deduplication: ${dedupedResults.length}`);

    // Organiser les résultats par catégorie pour le prompt
    const categorizeResults = (results: BraveSearchResult[]) => {
      const categories: Record<string, BraveSearchResult[]> = {
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
      
      const addCategory = (name: string, results: BraveSearchResult[], limit: number = 10) => {
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

    const searchContext = buildSearchContext();

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
