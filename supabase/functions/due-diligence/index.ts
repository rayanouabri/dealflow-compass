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
  companyName: string;
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
async function braveSearch(query: string, count: number = 10, retries: number = 2): Promise<BraveSearchResult[]> {
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
      body: JSON.stringify({ q: query, num: Math.min(count, 20) }),
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

    const { companyName, companyWebsite, additionalContext } = requestData;
    
    if (!companyName || companyName.trim().length < 2) {
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
    
    if (!BRAVE_API_KEY) {
      return new Response(JSON.stringify({ 
        error: "BRAVE_API_KEY manquante.",
        setupRequired: true
      }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    console.log(`Starting Due Diligence for: ${companyName}`);
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // ============================================
    // PHASE 1: RECHERCHES MASSIVES ET PARALLÈLES
    // ============================================
    
    const searchQueries = [
      // Informations générales
      `${companyName} company overview about`,
      `${companyName} startup official website`,
      `"${companyName}" company profile business`,
      
      // Funding & Valorisation
      `${companyName} funding round investment 2024 2025`,
      `${companyName} series A B C funding valuation investors`,
      `${companyName} raised million funding round`,
      `${companyName} valuation latest funding`,
      
      // Métriques & Traction
      `${companyName} revenue ARR MRR metrics`,
      `${companyName} customers clients users growth`,
      `${companyName} traction growth rate metrics 2024`,
      `${companyName} market share business performance`,
      
      // Équipe & Fondateurs
      `${companyName} founders CEO CTO team LinkedIn`,
      `${companyName} leadership team executives background`,
      `${companyName} employees headcount team size`,
      
      // Produit & Technologie
      `${companyName} product technology platform`,
      `${companyName} solution features how it works`,
      `${companyName} technology stack patents`,
      
      // Marché & Concurrence
      `${companyName} competitors market landscape`,
      `${companyName} industry market TAM SAM`,
      `${companyName} competitive advantage moat`,
      
      // News & Actualités
      `${companyName} news latest 2024 2025`,
      `${companyName} press release announcement`,
      
      // LinkedIn & Crunchbase
      `${companyName} LinkedIn company page`,
      `${companyName} Crunchbase profile`,
      
      // Risques & Controverses
      `${companyName} challenges risks concerns`,
      `${companyName} reviews reputation`,
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

    // Exécuter toutes les recherches (en batch pour éviter rate limiting)
    const allSearchResults: BraveSearchResult[] = [];
    const batchSize = 3;
    
    for (let i = 0; i < searchQueries.length; i += batchSize) {
      const batch = searchQueries.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(query => braveSearch(query, 8))
      );
      batchResults.forEach(results => allSearchResults.push(...results));
      if (i + batchSize < searchQueries.length) {
        await sleep(1200); // Rate limit Brave Free: 1 req/sec, on attend 1.2s pour être sûr
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
      
      addCategory("Official & Company Info", categorizedResults.official.concat(categorizedResults.other).slice(0, 15), 15);
      addCategory("Funding & Investments", categorizedResults.funding, 12);
      addCategory("Metrics & Traction", categorizedResults.metrics, 10);
      addCategory("Team & Founders", categorizedResults.team, 8);
      addCategory("Product & Technology", categorizedResults.product, 8);
      addCategory("Market & Competition", categorizedResults.market, 8);
      addCategory("News & Press", categorizedResults.news, 8);
      addCategory("LinkedIn", categorizedResults.linkedin, 5);
      addCategory("Crunchbase", categorizedResults.crunchbase, 5);
      
      return context;
    };

    const searchContext = buildSearchContext();

    // ============================================
    // PHASE 1.5: UTILISER AGENT DIGITALOCEAN (si configuré)
    // TEMPORAIREMENT DÉSACTIVÉ - L'API DO retourne 405 Method Not Allowed
    // ============================================
    const USE_DO_AGENT = false; // Deno.env.get("USE_DO_AGENT") === "true";
    const DO_AGENT_ENDPOINT = Deno.env.get("DO_AGENT_ENDPOINT");
    const DO_AGENT_API_KEY = Deno.env.get("DO_AGENT_API_KEY");
    
    console.log(`[DO Agent] TEMPORAIREMENT DÉSACTIVÉ (erreur 405 non résolue)`);
    console.log(`[DO Agent Config] DO_AGENT_ENDPOINT: ${DO_AGENT_ENDPOINT ? "✅ Configuré" : "❌ Manquant"}`);
    console.log(`[DO Agent Config] DO_AGENT_API_KEY: ${DO_AGENT_API_KEY ? "✅ Configuré" : "❌ Manquant"}`);
    
    let doAgentDueDiligenceResult = "";
    
    if (USE_DO_AGENT) {
      try {
        console.log("Using DigitalOcean Agent for due diligence...");
        const dueDiligencePrompt = formatDueDiligencePrompt(
          companyName,
          companyWebsite,
          additionalContext
        );
        
        const doResponse = await callDigitalOceanAgent(dueDiligencePrompt);
        doAgentDueDiligenceResult = doResponse.output || "";
        console.log("✅ DigitalOcean Agent due diligence completed");
        console.log(`[DO Agent] Réponse reçue: ${doAgentDueDiligenceResult.length} caractères`);
      } catch (doError) {
        console.error("❌ DigitalOcean Agent failed, falling back to standard analysis:", doError);
        // Continue with standard analysis if agent fails
      }
    } else {
      console.log("⚠️ DigitalOcean Agent désactivé (USE_DO_AGENT != 'true')");
    }

    // ============================================
    // PHASE 2: ANALYSE IA AVEC TOUTES LES DONNÉES
    // ============================================

    const systemPrompt = `Tu es un analyste VC senior spécialisé en due diligence avec 20 ans d'expérience. 
Tu dois produire un rapport de due diligence COMPLET et PROFESSIONNEL sur l'entreprise "${companyName}".

⚠️ RÈGLES CRITIQUES :

1. SOURCES OBLIGATOIRES :
   - CHAQUE information doit être accompagnée de sa source URL
   - Format: "[Donnée] (Source: url)"
   - Si une information n'a PAS de source dans les données fournies, indique "Non disponible - aucune source trouvée"
   - NE JAMAIS inventer de données ou d'URLs

2. DONNÉES VÉRIFIÉES UNIQUEMENT :
   - Utilise UNIQUEMENT les informations des résultats de recherche fournis
   - Les URLs doivent être exactement celles trouvées dans les recherches
   - Si tu ne trouves pas une information, dis-le clairement

3. FORMAT DU RAPPORT :
   Tu dois retourner un objet JSON avec la structure suivante (tous les champs sont requis):

{
  "company": {
    "name": "Nom officiel de l'entreprise",
    "tagline": "Description courte",
    "website": "URL du site officiel (trouvée dans les recherches)",
    "linkedinUrl": "URL LinkedIn (trouvée dans les recherches)",
    "crunchbaseUrl": "URL Crunchbase (trouvée dans les recherches)",
    "founded": "Année de création avec source",
    "headquarters": "Siège social avec source",
    "sector": "Secteur d'activité",
    "stage": "Stade (Seed, Series A, etc.)",
    "employeeCount": "Nombre d'employés avec source"
  },
  "executiveSummary": {
    "overview": "Résumé de l'entreprise en 200 mots (avec sources citées)",
    "keyHighlights": ["Point fort 1 (source)", "Point fort 2 (source)", ...],
    "keyRisks": ["Risque 1 (source)", "Risque 2 (source)", ...],
    "recommendation": "INVEST | WATCH | PASS",
    "confidenceLevel": "high | medium | low"
  },
  "product": {
    "description": "Description détaillée du produit/service (300+ mots, avec sources)",
    "valueProposition": "Proposition de valeur unique",
    "technology": "Stack technique et innovations (avec sources)",
    "patents": "Brevets déposés si mentionnés (avec sources)",
    "keyFeatures": ["Feature 1", "Feature 2", ...],
    "sources": [{"name": "...", "url": "..."}]
  },
  "market": {
    "tam": "Total Addressable Market avec source",
    "sam": "Serviceable Addressable Market avec source",
    "som": "Serviceable Obtainable Market avec source",
    "cagr": "Taux de croissance du marché avec source",
    "trends": ["Tendance 1 (source)", "Tendance 2 (source)", ...],
    "analysis": "Analyse du marché détaillée (200+ mots)",
    "sources": [{"name": "...", "url": "..."}]
  },
  "competition": {
    "landscape": "Analyse du paysage concurrentiel (200+ mots)",
    "competitors": [
      {
        "name": "Nom du concurrent",
        "description": "Description",
        "funding": "Funding si connu",
        "strengths": ["..."],
        "weaknesses": ["..."]
      }
    ],
    "competitiveAdvantage": "Avantages compétitifs de ${companyName} (avec sources)",
    "moat": "Barrières à l'entrée / moat",
    "sources": [{"name": "...", "url": "..."}]
  },
  "financials": {
    "fundingHistory": [
      {
        "round": "Seed / Series A / etc.",
        "amount": "Montant levé",
        "date": "Date",
        "investors": ["Investor 1", "Investor 2"],
        "valuation": "Valorisation si connue",
        "source": "URL source"
      }
    ],
    "totalFunding": "Total levé avec source",
    "latestValuation": "Dernière valorisation avec source",
    "metrics": {
      "arr": "ARR avec source ou 'Non disponible'",
      "mrr": "MRR avec source ou 'Non disponible'",
      "revenue": "Revenus avec source ou 'Non disponible'",
      "growth": "Croissance avec source ou 'Non disponible'",
      "customers": "Nombre de clients avec source ou 'Non disponible'",
      "nrr": "Net Revenue Retention avec source ou 'Non disponible'",
      "churn": "Taux de churn avec source ou 'Non disponible'",
      "grossMargin": "Marge brute avec source ou 'Non disponible'",
      "burnRate": "Burn rate avec source ou 'Non disponible'",
      "runway": "Runway avec source ou 'Non disponible'"
    },
    "sources": [{"name": "...", "url": "..."}]
  },
  "team": {
    "overview": "Analyse de l'équipe (200+ mots)",
    "founders": [
      {
        "name": "Nom complet",
        "role": "CEO / CTO / etc.",
        "linkedin": "URL LinkedIn si trouvée",
        "background": "Expérience et parcours",
        "source": "URL source"
      }
    ],
    "keyExecutives": [
      {
        "name": "...",
        "role": "...",
        "background": "..."
      }
    ],
    "teamSize": "Taille de l'équipe avec source",
    "culture": "Culture d'entreprise si mentionnée",
    "hiringTrends": "Tendances de recrutement si disponibles",
    "sources": [{"name": "...", "url": "..."}]
  },
  "traction": {
    "overview": "Analyse de la traction (200+ mots)",
    "keyMilestones": [
      {
        "date": "Date",
        "milestone": "Description du milestone",
        "source": "URL source"
      }
    ],
    "customers": {
      "count": "Nombre avec source",
      "notable": ["Client notable 1", "Client notable 2"],
      "segments": "Segments clients"
    },
    "partnerships": ["Partenariat 1 (source)", ...],
    "awards": ["Prix/reconnaissance (source)", ...],
    "sources": [{"name": "...", "url": "..."}]
  },
  "risks": {
    "marketRisks": ["Risque marché 1 avec explication", ...],
    "executionRisks": ["Risque exécution 1 avec explication", ...],
    "financialRisks": ["Risque financier 1 avec explication", ...],
    "competitiveRisks": ["Risque concurrentiel 1 avec explication", ...],
    "regulatoryRisks": ["Risque réglementaire 1 avec explication", ...],
    "mitigations": ["Facteur atténuant 1", ...],
    "overallRiskLevel": "high | medium | low",
    "sources": [{"name": "...", "url": "..."}]
  },
  "opportunities": {
    "growthOpportunities": ["Opportunité 1 avec explication", ...],
    "marketExpansion": "Potentiel d'expansion géographique/sectorielle",
    "productExpansion": "Potentiel d'expansion produit",
    "strategicValue": "Valeur stratégique (M&A potentiel, etc.)",
    "sources": [{"name": "...", "url": "..."}]
  },
  "investmentRecommendation": {
    "recommendation": "INVEST | WATCH | PASS",
    "rationale": "Justification détaillée (300+ mots)",
    "strengths": ["Force 1 avec source", "Force 2 avec source", ...],
    "weaknesses": ["Faiblesse 1 avec source", "Faiblesse 2 avec source", ...],
    "keyQuestions": ["Question à creuser 1", "Question à creuser 2", ...],
    "suggestedNextSteps": ["Prochaine étape 1", "Prochaine étape 2", ...],
    "targetReturn": "Multiple cible estimé (ex: 5-10x)",
    "investmentHorizon": "Horizon d'investissement suggéré",
    "suggestedTicket": "Ticket suggéré si applicable"
  },
  "allSources": [
    {
      "name": "Titre de la source",
      "url": "URL complète",
      "type": "article | crunchbase | linkedin | official | press | other",
      "relevance": "Information clé extraite"
    }
  ],
  "dataQuality": {
    "overallScore": "excellent | good | fair | limited",
    "dataAvailability": {
      "funding": "high | medium | low | none",
      "metrics": "high | medium | low | none",
      "team": "high | medium | low | none",
      "product": "high | medium | low | none",
      "market": "high | medium | low | none"
    },
    "limitations": ["Limitation 1", "Limitation 2", ...],
    "sourcesCount": "Nombre total de sources utilisées"
  }
}

INSTRUCTIONS SUPPLÉMENTAIRES :
- Sois EXHAUSTIF : utilise TOUTES les données disponibles dans les recherches
- Sois PRÉCIS : cite toujours la source avec l'URL exacte
- Sois HONNÊTE : si une donnée n'est pas disponible, dis-le clairement
- Sois ANALYTIQUE : donne ton avis professionnel basé sur les faits
- NE PAS INVENTER : aucune donnée fictive, aucune URL inventée

${additionalContext ? `\nCONTEXTE ADDITIONNEL FOURNI PAR L'UTILISATEUR:\n${additionalContext}` : ''}
${companyWebsite ? `\nSITE WEB FOURNI: ${companyWebsite}` : ''}`;

    // Combine search context with DigitalOcean Agent results
    let combinedContext = searchContext;
    if (doAgentDueDiligenceResult) {
      combinedContext = `=== ANALYSE PAR AGENT DIGITALOCEAN (recherche approfondie) ===\n${doAgentDueDiligenceResult}\n\n=== RÉSULTATS RECHERCHE WEB (Brave Search) ===\n${searchContext}`;
    }

    const userPrompt = `Effectue une due diligence COMPLÈTE sur l'entreprise "${companyName}".

Voici TOUTES les données collectées par nos recherches web et notre agent de sourcing. Utilise-les pour produire un rapport exhaustif :

${combinedContext}

⚠️ RAPPELS CRITIQUES :
1. Cite TOUJOURS les sources avec leurs URLs exactes
2. N'invente AUCUNE donnée ni URL
3. Si une info n'est pas dans les recherches, indique "Non disponible"
4. Sois exhaustif et professionnel
5. Priorise les informations de l'agent DigitalOcean si disponibles (recherche approfondie)

Réponds UNIQUEMENT avec du JSON valide.`;

    const aiEndpoint = await getAIEndpoint();
    
    const aiBody = AI_PROVIDER === "vertex" 
      ? {
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: { temperature: 0.1, topP: 0.9, topK: 40, maxOutputTokens: 32768 },
        }
      : {
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: { temperature: 0.1, topP: 0.9, topK: 40, maxOutputTokens: 32768, responseMimeType: "application/json" as const },
        };

    let response: Response | null = null;
    let lastErrorText = "";

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        const waitMs = Math.min(8000, 800 * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 400);
        console.log(`Rate-limited. Retrying in ${waitMs}ms (attempt ${attempt + 1}/3)`);
        await sleep(waitMs);
      }
      response = await fetch(aiEndpoint.url, {
        method: "POST",
        headers: aiEndpoint.headers,
        body: JSON.stringify(aiBody),
      });
      if (response.ok) break;
      lastErrorText = await response.text();
      console.error(`AI API error:`, response.status, lastErrorText);
      if (response.status !== 429) break;
    }

    if (!response || !response.ok) {
      return new Response(JSON.stringify({ 
        error: `Erreur API IA: ${response?.status || 'unknown'}`
      }), {
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

    let dueDiligenceResult;
    try {
      dueDiligenceResult = parseJSONResponse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return new Response(JSON.stringify({ 
        error: `Erreur parsing réponse IA: ${parseError instanceof Error ? parseError.message : "Unknown"}`
      }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Nettoyer et valider les URLs dans le résultat
    const cleanUrls = (obj: any): any => {
      if (!obj) return obj;
      if (typeof obj === 'string') {
        if (obj.startsWith('http')) {
          return validateAndCleanUrl(obj) || obj;
        }
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(cleanUrls);
      }
      if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const key of Object.keys(obj)) {
          cleaned[key] = cleanUrls(obj[key]);
        }
        return cleaned;
      }
      return obj;
    };

    dueDiligenceResult = cleanUrls(dueDiligenceResult);

    // Ajouter metadata
    dueDiligenceResult.metadata = {
      companyName,
      generatedAt: new Date().toISOString(),
      searchResultsCount: dedupedResults.length,
      aiProvider: AI_PROVIDER,
    };

    console.log(`Due Diligence complete for: ${companyName}`);
    console.log(`Sources used: ${dueDiligenceResult.allSources?.length || 0}`);

    return new Response(JSON.stringify(dueDiligenceResult), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in due-diligence function:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
