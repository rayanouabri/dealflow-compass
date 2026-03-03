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
    
    if (phase !== "analyze" && !BRAVE_API_KEY) {
      return new Response(JSON.stringify({ 
        error: "BRAVE_API_KEY manquante.",
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
      const jobList = await jobRes.json();
      const job = Array.isArray(jobList) ? jobList[0] : jobList;
      if (!job || job.status !== "search_done") {
        return new Response(JSON.stringify({ error: "Job introuvable ou déjà analysé" }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      companyName = job.company_name || "";
      // search_context peut être vide si aucun résultat de recherche ; l'IA analysera avec ses connaissances
      const analyzeContext = job.search_context || `ENTREPRISE À ANALYSER: ${companyName}`;
      const analyzeSearchCount = job.search_results_count || 0;

      const systemPromptAnalyze = `Tu es un analyste VC partner-level avec 25 ans d'expérience chez Sequoia, a]6z, et Index Ventures.
Tu dois produire un rapport de due diligence EXHAUSTIF, DÉTAILLÉ et PROFESSIONNEL sur l'entreprise "${companyName}".
Ce rapport sera lu par un comité d'investissement — il doit être d'une qualité irréprochable.

⚠️ RÈGLES CRITIQUES :

1. SOURCES OBLIGATOIRES — MAIS PAS DANS LE TEXTE :
   - NE JAMAIS mettre d'URLs ou de "(Source: ...)" dans les champs texte. Le texte doit rester lisible et professionnel.
   - Place TOUTES les sources dans les tableaux "sources" de chaque section ET dans "allSources".
   - Format allSources : { "name": "Titre descriptif", "url": "URL exacte", "type": "article|crunchbase|linkedin|official|press|patent|regulatory|github|other", "relevance": "Information clé extraite" }.
   - Minimum 20–40 entrées dans "allSources". Utilise TOUTES les URLs pertinentes trouvées.
   - NE JAMAIS inventer d'URLs. Si pas de source, indique "Non disponible".

2. PROFONDEUR ANALYTIQUE — PAS DE SUPERFICIALITÉ :
   - Chaque section doit contenir AU MINIMUM 150-300 mots d'analyse réelle.
   - Les listes (keyHighlights, keyRisks, strengths, etc.) doivent avoir MINIMUM 5 éléments détaillés.
   - NE JAMAIS écrire un seul mot vague. Chaque point doit être spécifique et actionnable.
   - Pour les estimations : base TOUJOURS sur des comparables nommés (ex: "Estimation basée sur des comparables comme [société X] au même stade : 3-5x revenue multiple").

3. EXHAUSTIVITÉ — CHAQUE SECTION DOIT ÊTRE UN MINI-RAPPORT :

   📊 MARCHÉ (market) — ANALYSE COMPLÈTE OBLIGATOIRE :
   - TAM/SAM/SOM avec chiffres, sources, et projections à 5 ans
   - CAGR du marché avec source du rapport (Gartner, McKinsey, CB Insights, etc.)
   - Analyse des tendances macro (5+ tendances détaillées)
   - Problèmes et défis du secteur
   - Réglementation et barrières à l'entrée
   - Acteurs principaux et parts de marché estimées
   - Dynamiques de marché (consolidation, fragmentation, disruption)

   👥 ÉQUIPE (team) — PROFILS DÉTAILLÉS OBLIGATOIRES :
   - Pour CHAQUE fondateur/C-level : nom, rôle, background DÉTAILLÉ (université + diplôme, entreprises précédentes avec rôles et durées, réalisations clés, exits éventuels)
   - LinkedIn de chaque personne si trouvé
   - Analyse de la complémentarité de l'équipe (tech/business/industrie)
   - Capacité d'exécution : track record, expériences pertinentes
   - Taille de l'équipe + répartition (dev, sales, ops) si disponible
   - Tendances de recrutement (postes ouverts, croissance de l'effectif)
   - Culture d'entreprise (Glassdoor, valeurs affichées)
   - Advisors et board members si trouvés

   🔬 PRODUIT & TECHNOLOGIE (product) — ANALYSE APPROFONDIE :
   - Description détaillée du produit/service (pas une phrase, un paragraphe complet)
   - Proposition de valeur unique (USP) — pourquoi ce produit est meilleur
   - Stack technique détaillée si disponible
   - Architecture et infrastructure
   - PROPRIÉTÉ INTELLECTUELLE : brevets déposés/accordés (numéros si trouvés), marques, trade secrets
   - Stratégie IP et protection de la technologie
   - Maturité technologique (MVP, beta, production, scale)
   - Roadmap produit si disponible
   - Open source vs propriétaire
   - Certifications techniques
   - keyFeatures : minimum 6 features détaillées

   💰 FINANCIALS (financials) — DONNÉES PRÉCISES :
   - Historique COMPLET des levées (chaque round : montant, date, type, lead investor, co-investors, valorisation)
   - Total funding cumulé
   - Dernière valorisation connue ou estimée
   - Metrics : ARR/MRR, croissance YoY, churn rate, NRR, CAC, LTV, ratio LTV/CAC
   - Burn rate estimé et runway
   - Unit economics détaillés
   - Projection de rentabilité

   📈 TRACTION (traction) — PREUVES CONCRÈTES :
   - Milestones clés avec dates (minimum 5)
   - Nombre de clients (exact ou estimation avec base)
   - Clients notables (nommer les entreprises/organisations)
   - Segments de clientèle ciblés et atteints
   - Partenariats stratégiques (détailler chacun)
   - Prix et reconnaissances (détailler chacun)
   - Accélérateurs/incubateurs (YC, Station F, etc.)
   - Métriques de croissance (MoM, QoQ, YoY)

   ⚔️ CONCURRENCE (competition) — MATRICE COMPLÈTE :
   - Paysage concurrentiel détaillé
   - Pour chaque concurrent : nom, pays, stade, funding, forces/faiblesses
   - Minimum 4-6 concurrents identifiés (directs et indirects)
   - Positionnement différenciant clair
   - Moat (avantage défendable) : réseau, techno, données, réglementaire, etc.
   - Risques de nouveaux entrants

   ⚠️ RISQUES (risks) — ANALYSE GRANULAIRE :
   - Minimum 3 risques par catégorie (market, execution, financial, competitive, regulatory)
   - Pour chaque risque : description spécifique + impact + probabilité
   - Mitigations concrètes pour les principaux risques
   - Overall risk level argumenté

   🚀 OPPORTUNITÉS (opportunities) — VISION STRATÉGIQUE :
   - Opportunités de croissance organique et inorganique
   - Expansion géographique : marchés cibles, timeline
   - Extension produit : adjacent markets, new verticals
   - Valeur stratégique (M&A) : acquéreurs potentiels, multiples du secteur
   - Minimum 5 growth opportunities détaillées

   🎯 RECOMMANDATION (investmentRecommendation) — ARGUMENTÉE :
   - Verdict clair : INVEST / WATCH / PASS
   - Rationale : paragraphe de 150+ mots avec arguments
   - Strengths : minimum 5 points forts spécifiques
   - Weaknesses : minimum 5 points faibles spécifiques
   - Key questions : 5+ questions à poser au management
   - Next steps : 5+ étapes concrètes
   - Target return estimé (avec comparables)
   - Investment horizon estimé
   - Suggested ticket estimé

4. FORMAT JSON :
{
  "company": {
    "name": "Nom officiel",
    "tagline": "Description courte SANS URL",
    "website": "URL site officiel",
    "linkedinUrl": "URL LinkedIn",
    "crunchbaseUrl": "URL Crunchbase",
    "founded": "Année",
    "headquarters": "Ville, Pays",
    "sector": "Secteur",
    "stage": "Stade",
    "employeeCount": "Nombre ou estimation",
    "legalName": "Raison sociale si trouvée",
    "registrationNumber": "SIREN/SIRET si trouvé"
  },
  "executiveSummary": {
    "overview": "Résumé DÉTAILLÉ de 300+ mots, texte seul SANS URL.",
    "keyHighlights": ["5-8 points forts détaillés"],
    "keyRisks": ["5-8 risques détaillés"],
    "recommendation": "INVEST | WATCH | PASS",
    "confidenceLevel": "high | medium | low"
  },
  "product": { "description": "Description détaillée 200+ mots", "valueProposition": "USP détaillée", "technology": "Stack technique détaillée", "patents": "Brevets et IP — détailler numéros, dates, statut", "ipStrategy": "Stratégie de protection IP", "maturity": "MVP/beta/production/scale", "keyFeatures": ["6+ features"], "certifications": "Certifications obtenues ou visées", "openSource": "Projets open source si applicable", "sources": [] },
  "market": { "tam": "Chiffre + évolution + source", "sam": "Chiffre + source", "som": "Chiffre + source", "cagr": "% + source", "trends": ["5+ tendances détaillées"], "analysis": "Analyse marché 300+ mots : taille, croissance, défis, régulation, acteurs, dynamiques", "barriers": "Barrières à l'entrée", "regulation": "Cadre réglementaire applicable", "sources": [] },
  "competition": { "landscape": "Paysage concurrentiel détaillé 200+ mots", "competitors": [{"name":"...","country":"...","stage":"...","funding":"...","strengths":"...","weaknesses":"..."}], "competitiveAdvantage": "Avantages détaillés", "moat": "Type et solidité du moat", "newEntrantsRisk": "Risque de nouveaux entrants", "sources": [] },
  "financials": { "fundingHistory": [{"round":"...","amount":"...","date":"...","lead":"...","investors":"...","valuation":"..."}], "totalFunding": "...", "latestValuation": "...", "metrics": {"arr":"...","mrr":"...","growthRate":"...","churnRate":"...","nrr":"...","cac":"...","ltv":"...","ltvCacRatio":"...","burnRate":"...","runway":"..."}, "unitEconomics": "Analyse unit economics", "profitabilityTimeline": "Projection rentabilité", "sources": [] },
  "team": { "overview": "Synthèse équipe 200+ mots — complémentarité, capacité d'exécution, track record.", "founders": [{"name":"...","role":"...","background":"Parcours DÉTAILLÉ : formation, entreprises, réalisations, exits","linkedin":"url","education":"Université et diplôme","previousCompanies":"Entreprises précédentes avec rôles"}], "keyExecutives": [{"name":"...","role":"...","background":"..."}], "advisors": "Board members et advisors si trouvés", "teamSize": "...", "teamBreakdown": "Répartition par fonction (tech, sales, ops)", "culture": "...", "hiringTrends": "Postes ouverts, croissance effectif", "sources": [] },
  "traction": { "overview": "Synthèse traction 200+ mots", "keyMilestones": [{"date":"YYYY","milestone":"texte détaillé"}], "customers": {"count":"...","notable":["clients nommés"],"segments":"Segments détaillés","geography":"Géographie des clients"}, "growthMetrics": "Croissance MoM/QoQ/YoY", "partnerships": ["Partenaire + détail"], "awards": ["Prix + détail"], "accelerators": "Accélérateurs/incubateurs", "sources": [] },
  "risks": { "marketRisks": ["3+ risques marché détaillés"], "executionRisks": ["3+ risques exécution"], "financialRisks": ["3+ risques financiers"], "competitiveRisks": ["3+ risques concurrentiels"], "regulatoryRisks": ["3+ risques réglementaires"], "mitigations": ["Mitigation pour chaque risque majeur"], "overallRiskLevel": "low|medium|high — argumenté", "sources": [] },
  "opportunities": { "growthOpportunities": ["5+ opportunités détaillées"], "marketExpansion": "Marchés cibles, timeline, potentiel", "productExpansion": "Adjacences, nouvelles verticales", "strategicValue": "Acquéreurs potentiels, multiples M&A", "sources": [] },
  "investmentRecommendation": { "recommendation": "INVEST|WATCH|PASS", "rationale": "Justification 200+ mots", "strengths": ["5+ forces détaillées"], "weaknesses": ["5+ faiblesses détaillées"], "keyQuestions": ["5+ questions pour le management"], "suggestedNextSteps": ["5+ prochaines étapes"], "targetReturn": "Multiple estimé avec comparables", "investmentHorizon": "Horizon estimé", "suggestedTicket": "Ticket estimé avec justification" },
  "allSources": [{"name":"...","url":"...","type":"article|crunchbase|linkedin|official|press|patent|regulatory|github|other","relevance":"..."}],
  "dataQuality": { "overallScore": "Score /10 avec justification", "dataAvailability": {"company":"high|medium|low","team":"...","financials":"...","market":"...","product":"...","traction":"...","competition":"..."}, "limitations": ["Limitations identifiées"], "sourcesCount": "Nombre total", "dataFreshness": "Fraîcheur des données" }
}

IMPORTANT :
- keyMilestones[].milestone = chaîne de caractères, PAS un objet
- partnerships[] et awards[] = tableaux de CHAÎNES uniquement
- Réponds UNIQUEMENT avec du JSON valide.`;

      const sleepAnalyze = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const MAX_GAP_QUERIES_DD = 14;
      const GAP_QUERY_MIN_LEN = 8;
      const GAP_QUERY_MAX_LEN = 140;
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
        const contextExtract = typeof analyzeContext === "string" ? analyzeContext.slice(0, 12000) : "";
        const gapPrompt = `Tu es un analyste VC senior. Tu prépares une due diligence sur "${companyName}". Voici les résultats de recherche collectés :

CONTEXTE (extrait) :
${contextExtract}

TÂCHE : Identifie 5 à 7 thèmes où les informations sont INSUFFISANTES pour produire un rapport de due diligence complet et professionnel.

Catégories à couvrir obligatoirement :
1. **Équipe/Fondateurs** — LinkedIn des fondateurs individuels, parcours, formation (université), expériences passées, exits
2. **Propriété Intellectuelle** — Brevets déposés/accordés, marques, IP strategy, R&D
3. **Marché** — TAM/SAM/SOM, CAGR, rapports d'analystes, taille du marché, évolution
4. **Financements** — Dernière levée, investisseurs, valorisation, cap table
5. **Métriques/Traction** — ARR/MRR, nombre de clients, NRR, churn, croissance
6. **Concurrence** — Concurrents directs, positionnement, parts de marché
7. **Réglementaire** — Certifications, conformité, régulations sectorielles

Pour chaque thème, génère 2 à 3 requêtes web en ANGLAIS, courtes et précises. Inclure "${companyName}" dans chaque requête.
Exemples : "${companyName} founder CEO LinkedIn education background", "${companyName} patents filed USPTO INPI", "${companyName} market size TAM 2025 report".

Réponds UNIQUEMENT : {"gaps":[{"label":"thème","queries":["query1","query2"]}]}. Max 7 gaps, 3 queries par gap. Si suffisant : {"gaps":[]}.`;

        const gapBody = AI_PROVIDER === "vertex"
          ? { contents: [{ role: "user", parts: [{ text: gapPrompt }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 1200 } }
          : { contents: [{ parts: [{ text: gapPrompt }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 1200, responseMimeType: "application/json" as const } };
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
          for (const g of gaps.slice(0, 7)) {
            const qs = (Array.isArray(g.queries) ? g.queries : []).map((x: string) => String(x).trim().slice(0, GAP_QUERY_MAX_LEN)).filter((x: string) => x.length >= GAP_QUERY_MIN_LEN);
            allQueries.push(...qs.slice(0, 3));
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
                const results = await braveSearch(q, 10);
                for (const r of results) {
                  if (r?.url && !seenUrl.has(r.url)) {
                    seenUrl.add(r.url);
                    const line = `${r.title || ""}: ${r.description || ""} | ${r.url}`.trim();
                    if (line.length > 20) extraLines.push(line);
                  }
                }
                await sleepAnalyze(800);
              } catch (_) {}
            }
            const extraContext = extraLines.join("\n").slice(0, 8000);
            if (extraContext) {
              enrichedAnalyzeContext = `${analyzeContext}\n\n=== RECHERCHES COMPLÉMENTAIRES — ITÉRATION 1 (lacunes identifiées) ===\n${extraContext}`;
              console.log(`[DueDiligence] Enrichissement 1: ${uniqueQueries.length} requêtes, ${extraLines.length} résultats`);
            }
          }
        }
      } catch (gapErr) {
        console.warn("[DueDiligence] Boucle lacunes ignorée:", gapErr);
      }

      const userPromptAnalyze = `Effectue une due diligence EXHAUSTIVE sur l'entreprise "${companyName}".

Voici TOUTES les données collectées par nos recherches web (${analyzeSearchCount} résultats de recherche uniques). Utilise CHAQUE information pertinente :

${enrichedAnalyzeContext}

⚠️ RAPPELS CRITIQUES POUR LA QUALITÉ DU RAPPORT :

SOURCES :
- AUCUNE URL dans le texte. Toutes les URLs → "sources" et "allSources" uniquement.
- allSources : 20–40 entrées minimum. N'invente AUCUNE URL.

PROFONDEUR :
- Executive Summary : overview de 300+ mots. 5-8 keyHighlights et 5-8 keyRisks détaillés.
- Chaque section : minimum 150-300 mots d'analyse réelle, PAS de phrases vagues.
- Toutes les listes : minimum 5 éléments sauf si données insuffisantes (minimum 3).

ÉQUIPE (CRUCIAL) :
- Chaque fondateur/C-level : nom, rôle, background COMPLET (université + diplôme, entreprises précédentes avec rôles et durées, réalisations).
- LinkedIn de chaque personne. Analyse de complémentarité.
- Advisors, board members si trouvés.
- Taille équipe + répartition par fonction + tendances recrutement.

PROPRIÉTÉ INTELLECTUELLE (CRUCIAL) :
- Brevets déposés/accordés : numéros, dates, domaines couverts.
- Marques déposées, trade secrets, stratégie IP.
- Projets open source (GitHub) si applicable.
- Certifications techniques obtenues.

MARCHÉ :
- TAM/SAM/SOM avec chiffres et projections 5 ans + CAGR.
- 5+ tendances détaillées. Analyse des barrières à l'entrée.
- Réglementation applicable. Acteurs clés et parts de marché.

FINANCIALS :
- CHAQUE round de levée avec montant, date, type, lead, co-investors, valorisation.
- Métriques : ARR, MRR, croissance, churn, NRR, CAC, LTV, burn rate, runway.
- Projection de rentabilité si possible.

CONCURRENCE :
- 4-6 concurrents directs et indirects avec nom, pays, stade, funding, forces/faiblesses.
- Moat détaillé et défendable.

RISQUES :
- 3+ risques par catégorie (market, execution, financial, competitive, regulatory).
- Mitigations concrètes.

RECOMMANDATION :
- Rationale de 200+ mots. 5+ strengths, 5+ weaknesses.
- 5+ key questions pour le management. 5+ next steps.
- targetReturn, investmentHorizon, suggestedTicket TOUJOURS remplis avec estimation + comparables.

DONNÉES MANQUANTES :
- Privilégier "Estimation basée sur [comparable/benchmark] : ..." plutôt que "Non disponible" seul.
- Si vraiment aucune estimation possible : "Non disponible — données non trouvées dans les recherches".

FORMAT :
- keyMilestones[].milestone = chaîne, PAS un objet.
- partnerships[] et awards[] = tableaux de CHAÎNES uniquement.
${enrichedAnalyzeContext !== analyzeContext ? "\n- Utilise OBLIGATOIREMENT les « RECHERCHES COMPLÉMENTAIRES » pour enrichir le rapport." : ""}

Réponds UNIQUEMENT avec du JSON valide.`;

      const aiEndpoint = await getAIEndpoint();
      const aiBody = AI_PROVIDER === "vertex"
        ? {
            contents: [{ role: "user", parts: [{ text: `${systemPromptAnalyze}\n\n${userPromptAnalyze}` }] }],
            generationConfig: { temperature: 0.15, topP: 0.92, topK: 40, maxOutputTokens: 65536 },
          }
        : {
            contents: [{ parts: [{ text: `${systemPromptAnalyze}\n\n${userPromptAnalyze}` }] }],
            generationConfig: { temperature: 0.15, topP: 0.92, topK: 40, maxOutputTokens: 65536, responseMimeType: "application/json" as const },
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

      // ——— 2e itération : analyse des sections faibles du rapport → recherches ciblées → enrichissement ———
      try {
        const reportSummary = JSON.stringify(dueDiligenceResult).slice(0, 6000);
        const gapPrompt2 = `Tu es un reviewer VC senior. Voici le brouillon d'un rapport de due diligence sur "${companyName}".

RAPPORT (extrait) :
${reportSummary}

TÂCHE : Identifie 3 à 5 sections qui sont TROP FAIBLES, VAGUES ou INCOMPLÈTES. Priorité :
1. Équipe/Fondateurs — Si les parcours des fondateurs sont flous ou manquants (pas de formation, pas d'expériences précédentes)
2. Propriété Intellectuelle — Si aucun brevet ni IP n'est mentionné
3. Métriques financières — Si ARR/churn/croissance sont "Non disponible" sans estimation
4. Concurrence — Si moins de 3 concurrents identifiés
5. Marché — Si TAM/SAM/SOM manquent de chiffres précis

Pour chaque section faible, génère 2-3 requêtes de recherche en ANGLAIS, très spécifiques. Inclure "${companyName}" si pertinent.
Exemples : "${companyName} CEO previous company exit", "${companyName} patent USPTO", "${companyName} vs [concurrent] comparison".

Réponds UNIQUEMENT : {"gaps":[{"label":"section faible","queries":["query1","query2"]}]}. Max 5 gaps, 3 queries chacun. Si le rapport est suffisamment complet : {"gaps":[]}.`;

        const aiEndpointGap2 = await getAIEndpoint();
        const gapBody2 = AI_PROVIDER === "vertex"
          ? { contents: [{ role: "user", parts: [{ text: gapPrompt2 }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 1000 } }
          : { contents: [{ parts: [{ text: gapPrompt2 }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 1000, responseMimeType: "application/json" as const } };
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
          for (const g of gaps2.slice(0, 5)) {
            const qs = (Array.isArray(g.queries) ? g.queries : []).map((x: string) => String(x).trim().slice(0, 140)).filter((x: string) => x.length >= 8);
            queries2.push(...qs.slice(0, 3));
          }
          const seenQ2 = new Set<string>();
          const uniqueQueries2 = queries2.filter((q) => {
            const k = q.toLowerCase().replace(/\s+/g, " ");
            if (seenQ2.has(k)) return false;
            seenQ2.add(k);
            return true;
          }).slice(0, 10);
          if (uniqueQueries2.length > 0) {
            const extraLines2: string[] = [];
            const seenUrl2 = new Set<string>();
            for (const q of uniqueQueries2) {
              try {
                const results = await braveSearch(q, 8);
                for (const r of results) {
                  if (r?.url && !seenUrl2.has(r.url)) {
                    seenUrl2.add(r.url);
                    const line = `${r.title || ""}: ${r.description || ""} | ${r.url}`.trim();
                    if (line.length > 20) extraLines2.push(line);
                  }
                }
                await sleepAnalyze(800);
              } catch (_) {}
            }
            const extraContext2 = extraLines2.join("\n").slice(0, 6000);
            if (extraContext2) {
              const enrichPrompt = `Tu es un analyste VC senior. Voici un rapport de due diligence (JSON) et des DONNÉES COMPLÉMENTAIRES fraîches.
Intègre les nouvelles données PARTOUT où c'est pertinent. Enrichis les sections faibles. Ajoute les nouvelles sources dans allSources.

OBJECTIF : Le rapport enrichi doit être PLUS COMPLET que le rapport actuel. Chaque section enrichie doit contenir plus de détails, plus de données, plus d'analyse.

RAPPORT ACTUEL :
${JSON.stringify(dueDiligenceResult).slice(0, 28000)}

DONNÉES COMPLÉMENTAIRES (ITÉRATION 2) :
${extraContext2}

RÈGLES :
- Retourne le JSON COMPLET avec la MÊME structure
- NE SUPPRIME aucune donnée existante, ENRICHIS seulement
- Ajoute les nouvelles URLs dans allSources
- PAS d'URLs dans le texte
- keyMilestones[].milestone, partnerships[], awards[] = CHAÎNES uniquement

Réponds UNIQUEMENT avec le JSON complet et enrichi.`;
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
                    if (enriched.traction?.partnerships && Array.isArray(enriched.traction.partnerships)) {
                      enriched.traction.partnerships = enriched.traction.partnerships.map((p: any) => toStr(p));
                    }
                    if (enriched.traction?.awards && Array.isArray(enriched.traction.awards)) {
                      enriched.traction.awards = enriched.traction.awards.map((a: any) => toStr(a));
                    }
                    if (enriched.investmentRecommendation) {
                      const ir = enriched.investmentRecommendation;
                      if (!ir.targetReturn || typeof ir.targetReturn !== "string") ir.targetReturn = "Non disponible";
                      if (!ir.investmentHorizon || typeof ir.investmentHorizon !== "string") ir.investmentHorizon = "Non disponible";
                      if (!ir.suggestedTicket || typeof ir.suggestedTicket !== "string") ir.suggestedTicket = "Non disponible";
                    }
                    enriched.metadata = dueDiligenceResult.metadata;
                    dueDiligenceResult = enriched;
                    console.log(`[DueDiligence] Enrichissement 2 appliqué: ${uniqueQueries2.length} requêtes, ${extraLines2.length} résultats`);
                  }
                }
              }
            }
          }
        }
      } catch (round2Err) {
        console.warn("[DueDiligence] 2e itération ignorée:", round2Err);
      }

      // ——— 3e itération : vérification finale — focus fondateurs + IP + métriques manquantes ———
      try {
        // Vérifier quelles sections sont encore faibles
        const teamWeak = !dueDiligenceResult.team?.founders?.length ||
          dueDiligenceResult.team.founders.some((f: any) => !f.background || f.background === "Non disponible" || f.background.length < 50);
        const ipWeak = !dueDiligenceResult.product?.patents || dueDiligenceResult.product.patents === "Non disponible" || dueDiligenceResult.product.patents.length < 20;
        const metricsWeak = !dueDiligenceResult.financials?.metrics?.arr || dueDiligenceResult.financials.metrics.arr === "Non disponible";

        if (teamWeak || ipWeak || metricsWeak) {
          const focusQueries: string[] = [];
          if (teamWeak) {
            // Chercher les fondateurs individuellement si possible
            const founderNames = (dueDiligenceResult.team?.founders || [])
              .map((f: any) => f?.name).filter((n: any) => n && typeof n === "string" && n !== "Non disponible");
            for (const name of founderNames.slice(0, 2)) {
              focusQueries.push(`"${name}" LinkedIn CEO founder background education`);
              focusQueries.push(`"${name}" career experience startup company`);
            }
            if (focusQueries.length === 0) {
              focusQueries.push(`${companyName} CEO founder name LinkedIn background career`);
              focusQueries.push(`${companyName} team founders education university experience`);
            }
          }
          if (ipWeak) {
            focusQueries.push(`"${companyName}" patent intellectual property filed granted`);
            focusQueries.push(`"${companyName}" brevet INPI propriété intellectuelle technology`);
          }
          if (metricsWeak) {
            focusQueries.push(`${companyName} revenue ARR growth rate 2024 2025`);
            focusQueries.push(`${companyName} customers number users traction metrics`);
          }

          const seenQ3 = new Set<string>();
          const uniqueQueries3 = focusQueries.filter((q) => {
            const k = q.toLowerCase().replace(/\s+/g, " ");
            if (seenQ3.has(k)) return false;
            seenQ3.add(k);
            return true;
          }).slice(0, 8);

          if (uniqueQueries3.length > 0) {
            const extraLines3: string[] = [];
            const seenUrl3 = new Set<string>();
            for (const q of uniqueQueries3) {
              try {
                const results = await braveSearch(q, 8);
                for (const r of results) {
                  if (r?.url && !seenUrl3.has(r.url)) {
                    seenUrl3.add(r.url);
                    const line = `${r.title || ""}: ${r.description || ""} | ${r.url}`.trim();
                    if (line.length > 20) extraLines3.push(line);
                  }
                }
                await sleepAnalyze(800);
              } catch (_) {}
            }
            const extraContext3 = extraLines3.join("\n").slice(0, 5000);
            if (extraContext3) {
              const focusAreas = [teamWeak && "ÉQUIPE/FONDATEURS", ipWeak && "PROPRIÉTÉ INTELLECTUELLE", metricsWeak && "MÉTRIQUES"].filter(Boolean).join(", ");
              const enrichPrompt3 = `Rapport de due diligence (JSON) sur "${companyName}". Des recherches supplémentaires ont été effectuées pour compléter les sections faibles : ${focusAreas}.

RAPPORT ACTUEL :
${JSON.stringify(dueDiligenceResult).slice(0, 28000)}

DONNÉES COMPLÉMENTAIRES (ITÉRATION 3 — focus ${focusAreas}) :
${extraContext3}

INSTRUCTIONS :
- Enrichis SPÉCIFIQUEMENT les sections ${focusAreas}
- Pour les fondateurs : ajoute formation, entreprises précédentes, réalisations si trouvées
- Pour l'IP : ajoute brevets, numéros, domaines couverts si trouvés
- Pour les métriques : ajoute ARR, croissance, nombre de clients si trouvés
- NE SUPPRIME aucune donnée existante
- Ajoute les nouvelles URLs dans allSources
- PAS d'URLs dans le texte
- keyMilestones[].milestone, partnerships[], awards[] = CHAÎNES uniquement
- Retourne le JSON COMPLET enrichi.`;

              const aiEndpointGap3 = await getAIEndpoint();
              const enrichBody3 = AI_PROVIDER === "vertex"
                ? { contents: [{ role: "user", parts: [{ text: enrichPrompt3 }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 32768 } }
                : { contents: [{ parts: [{ text: enrichPrompt3 }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 32768, responseMimeType: "application/json" as const } };
              const enrichRes3 = await fetch(aiEndpointGap3.url, { method: "POST", headers: aiEndpointGap3.headers, body: JSON.stringify(enrichBody3) });
              if (enrichRes3.ok) {
                const enrichData3 = await enrichRes3.json();
                const enrichText3: string = enrichData3.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (enrichText3) {
                  let enriched3 = parseJSONResponse(enrichText3);
                  if (enriched3 && typeof enriched3 === "object") {
                    enriched3 = cleanUrlsAnalyze(stripSrc(enriched3));
                    if (enriched3.traction?.keyMilestones) {
                      enriched3.traction.keyMilestones = (enriched3.traction.keyMilestones as any[]).map((m: any) => ({ date: typeof m?.date === "string" ? m.date : "", milestone: toStr(m?.milestone ?? m) })).filter((m: any) => m.milestone);
                    }
                    if (enriched3.traction?.partnerships && Array.isArray(enriched3.traction.partnerships)) {
                      enriched3.traction.partnerships = enriched3.traction.partnerships.map((p: any) => toStr(p));
                    }
                    if (enriched3.traction?.awards && Array.isArray(enriched3.traction.awards)) {
                      enriched3.traction.awards = enriched3.traction.awards.map((a: any) => toStr(a));
                    }
                    if (enriched3.investmentRecommendation) {
                      const ir = enriched3.investmentRecommendation;
                      if (!ir.targetReturn || typeof ir.targetReturn !== "string") ir.targetReturn = "Non disponible";
                      if (!ir.investmentHorizon || typeof ir.investmentHorizon !== "string") ir.investmentHorizon = "Non disponible";
                      if (!ir.suggestedTicket || typeof ir.suggestedTicket !== "string") ir.suggestedTicket = "Non disponible";
                    }
                    enriched3.metadata = dueDiligenceResult.metadata;
                    dueDiligenceResult = enriched3;
                    console.log(`[DueDiligence] Enrichissement 3 (focus ${focusAreas}) appliqué`);
                  }
                }
              }
            }
          }
        } else {
          console.log("[DueDiligence] 3e itération non nécessaire — rapport suffisamment complet");
        }
      } catch (round3Err) {
        console.warn("[DueDiligence] 3e itération ignorée:", round3Err);
      }

      await fetch(`${SUPABASE_URL}/rest/v1/due_diligence_jobs?id=eq.${encodeURIComponent(jobId)}`, {
        method: "PATCH",
        headers: { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ result: dueDiligenceResult, status: "analyze_done", updated_at: new Date().toISOString() }),
      });
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
    // RECHERCHES EXHAUSTIVES : company info, team, funding, product, IP, market, traction, news, regulatory
    const searchQueries = [
      // ---- COMPANY OVERVIEW ----
      `${companyName} company overview about`,
      `${companyName} startup official website`,
      `"${companyName}" company profile business description`,
      `${companyName} company history founded when where`,

      // ---- FUNDING & FINANCIALS ----
      `${companyName} funding round investment 2024 2025 2026`,
      `${companyName} series A B C funding valuation investors`,
      `${companyName} raised million funding round latest`,
      `${companyName} valuation latest funding cap table`,
      `${companyName} levée de fonds investisseurs montant`,
      `${companyName} seed pre-seed angel investment round`,
      `${companyName} investors backers venture capital firm`,

      // ---- REVENUE & METRICS ----
      `${companyName} revenue ARR MRR annual recurring`,
      `${companyName} customers clients users growth numbers`,
      `${companyName} traction growth rate metrics 2024 2025`,
      `${companyName} key metrics KPIs unit economics CAC LTV`,
      `${companyName} revenue growth churn retention rate NRR`,
      `${companyName} burn rate runway profitability`,

      // ---- TRACTION & MILESTONES ----
      `${companyName} milestones achievements key events timeline`,
      `${companyName} partnerships strategic deals signed`,
      `${companyName} clients notable enterprise customers case study`,
      `${companyName} market share business performance expansion`,
      `${companyName} awards prizes recognition incubator accelerator`,
      `${companyName} récompenses prix concours programme`,

      // ---- TEAM & FOUNDERS (DETAILED) ----
      `${companyName} founders CEO CTO team LinkedIn background`,
      `${companyName} founder CEO name biography education university`,
      `${companyName} co-founder background previous companies experience`,
      `${companyName} leadership team executives C-level management`,
      `${companyName} employees headcount team size hiring`,
      `${companyName} fondateurs équipe parcours formation expérience`,
      `${companyName} who founded CEO CTO biography career`,
      `${companyName} founder previous startup exit experience`,
      `${companyName} hiring jobs careers open positions engineering`,
      `${companyName} Glassdoor reviews employer culture`,

      // ---- PRODUCT & TECHNOLOGY ----
      `${companyName} product technology platform solution`,
      `${companyName} how it works features capabilities demo`,
      `${companyName} technology stack architecture infrastructure`,
      `${companyName} produit innovation différenciation`,
      `${companyName} product roadmap future plans vision`,
      `${companyName} API SDK developer platform integration`,

      // ---- INTELLECTUAL PROPERTY & PATENTS ----
      `${companyName} patents filed granted intellectual property`,
      `${companyName} patent application technology proprietary`,
      `"${companyName}" brevet propriété intellectuelle INPI`,
      `${companyName} IP portfolio trademark copyright protection`,
      `${companyName} R&D research development innovation lab`,
      `${companyName} open source GitHub repository code`,

      // ---- MARKET & COMPETITION ----
      `${companyName} competitors market landscape comparison`,
      `${companyName} industry market TAM SAM SOM size 2024 2025`,
      `${companyName} competitive advantage moat differentiation`,
      `${companyName} market size opportunity growth forecast`,
      `${companyName} industry trends report analysis sector`,
      `${companyName} vs competitor alternative comparison`,

      // ---- NEWS & PRESS ----
      `${companyName} news latest 2025 2026 announcement`,
      `${companyName} press release communiqué presse`,
      `${companyName} interview podcast CEO founder`,
      `${companyName} TechCrunch Maddyness Les Echos article`,

      // ---- REGULATORY & RISKS ----
      `${companyName} regulation compliance legal regulatory`,
      `${companyName} challenges risks concerns issues`,
      `${companyName} certification compliance standard ISO`,

      // ---- PROFILES ----
      `${companyName} LinkedIn company page`,
      `${companyName} Crunchbase profile funding`,
      `${companyName} Dealroom PitchBook profile`,
      `${companyName} AngelList Wellfound startup profile`,
      `${companyName} societe.com pappers registration legal`,
    ];

    // Si le site web est fourni, explorer plus en profondeur
    if (companyWebsite) {
      searchQueries.push(`site:${companyWebsite} about team`);
      searchQueries.push(`site:${companyWebsite} technology product`);
      searchQueries.push(`site:${companyWebsite} careers jobs hiring`);
      searchQueries.push(`site:${companyWebsite} press news blog`);
    }

    // Contexte additionnel comme requête
    if (additionalContext) {
      searchQueries.push(`${companyName} ${additionalContext}`);
    }

    // Phase 1 seule : plus de résultats par requête, délai raisonnable pour rester sous 150s
    const allSearchResults: BraveSearchResult[] = [];
    const RESULTS_PER_QUERY = 20;
    const batchSize = 4;
    const BATCH_DELAY_MS = 500;

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
        patent_ip: [],
        regulatory: [],
        github: [],
        other: [],
      };

      results.forEach(r => {
        const url = r.url.toLowerCase();
        const title = r.title.toLowerCase();
        const desc = r.description.toLowerCase();
        const combined = `${title} ${desc}`;

        if (url.includes('linkedin.com')) {
          categories.linkedin.push(r);
        } else if (url.includes('crunchbase.com')) {
          categories.crunchbase.push(r);
        } else if (url.includes('github.com') || url.includes('gitlab.com')) {
          categories.github.push(r);
        } else if (combined.includes('patent') || combined.includes('brevet') || combined.includes('intellectual property') || combined.includes('propriété intellectuelle') || url.includes('patents.google') || url.includes('inpi.fr') || url.includes('uspto')) {
          categories.patent_ip.push(r);
        } else if (combined.includes('regulation') || combined.includes('compliance') || combined.includes('certification') || combined.includes('réglementaire') || combined.includes('conformité')) {
          categories.regulatory.push(r);
        } else if (combined.includes('funding') || combined.includes('raised') || combined.includes('series') || combined.includes('valuation') || combined.includes('investor') || combined.includes('levée')) {
          categories.funding.push(r);
        } else if (combined.includes('revenue') || combined.includes('arr') || combined.includes('mrr') || combined.includes('customer') || combined.includes('growth rate') || combined.includes('churn') || combined.includes('retention')) {
          categories.metrics.push(r);
        } else if (combined.includes('founder') || combined.includes('ceo') || combined.includes('cto') || combined.includes('team') || combined.includes('executive') || combined.includes('fondateur') || combined.includes('co-founder')) {
          categories.team.push(r);
        } else if (combined.includes('product') || combined.includes('technology') || combined.includes('platform') || combined.includes('solution') || combined.includes('produit') || combined.includes('feature')) {
          categories.product.push(r);
        } else if (combined.includes('market') || combined.includes('competitor') || combined.includes('industry') || combined.includes('tam') || combined.includes('marché') || combined.includes('concurren')) {
          categories.market.push(r);
        } else if (url.includes('techcrunch') || url.includes('venturebeat') || url.includes('reuters') || url.includes('maddyness') || url.includes('lesechos') || combined.includes('announce') || combined.includes('press release')) {
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
      
      // Limites par catégorie : phase 1 seule → on envoie le max de contexte à l'IA en phase 2
      addCategory("Official & Company Info", categorizedResults.official.concat(categorizedResults.other).slice(0, 45), 45);
      addCategory("Funding & Investments", categorizedResults.funding, 35);
      addCategory("Metrics & Traction", categorizedResults.metrics, 30);
      addCategory("Team & Founders", categorizedResults.team, 30);
      addCategory("Product & Technology", categorizedResults.product, 28);
      addCategory("Patents & Intellectual Property", categorizedResults.patent_ip, 20);
      addCategory("Market & Competition", categorizedResults.market, 30);
      addCategory("Regulatory & Compliance", categorizedResults.regulatory, 15);
      addCategory("News & Press", categorizedResults.news, 25);
      addCategory("GitHub & Open Source", categorizedResults.github, 10);
      addCategory("LinkedIn", categorizedResults.linkedin, 15);
      addCategory("Crunchbase", categorizedResults.crunchbase, 12);
      
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
    await fetch(`${SUPABASE_URL_SEARCH}/rest/v1/due_diligence_jobs`, {
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
    console.log(`Due Diligence search done for: ${companyName}, jobId: ${jobIdNew}`);
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
