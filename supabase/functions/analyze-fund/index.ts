import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

interface AnalysisRequest {
  fundName?: string;
  customThesis?: {
    sectors?: string[];
    stage?: string;
    geography?: string;
    ticketSize?: string;
    description?: string;
    specificCriteria?: string;
  };
  params?: {
    numberOfStartups?: number;
    includeCompetitors?: boolean;
    includeMarketSize?: boolean;
    detailedFinancials?: boolean;
    includeMoat?: boolean;
    detailLevel?: number;
    slideCount?: number;
  };
}

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  extra_snippets?: string[];
}

// Search using Brave Search API
async function braveSearch(query: string, count: number = 5): Promise<BraveSearchResult[]> {
  const BRAVE_API_KEY = Deno.env.get("BRAVE_API_KEY");
  if (!BRAVE_API_KEY) {
    console.warn("BRAVE_API_KEY not configured - skipping web search");
    return [];
  }

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&text_decorations=false&result_filter=web`;
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "X-Subscription-Token": BRAVE_API_KEY,
      },
    });

    if (!response.ok) {
      console.error("Brave Search error:", response.status, await response.text());
      return [];
    }

    const data = await response.json();
    return (data.web?.results || []).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      description: r.description || "",
      extra_snippets: r.extra_snippets || [],
    }));
  } catch (error) {
    console.error("Brave Search failed:", error);
    return [];
  }
}

// Enrich startup data with real web sources
async function enrichStartupData(startup: any): Promise<any> {
  const name = startup.name || "";
  if (!name) return startup;


  // Search for company info, funding, and metrics in parallel - MORE COMPREHENSIVE
  const [
    generalResults,
    fundingResults,
    metricsResults,
    financialResults,
    linkedinResults,
    crunchbaseResults,
  ] = await Promise.all([
    braveSearch(`${name} startup company official website`, 3),
    braveSearch(`${name} funding round valuation investors series A B C`, 5),
    braveSearch(`${name} ARR MRR revenue metrics customers growth 2024`, 5),
    braveSearch(`${name} CAC LTV churn NRR burn rate runway financial metrics`, 5),
    braveSearch(`${name} LinkedIn company employees team size`, 2),
    braveSearch(`${name} Crunchbase profile funding revenue`, 3),
  ]);

  // Extract URLs - combine all search results
  const allResults = [
    ...generalResults, 
    ...fundingResults, 
    ...metricsResults,
    ...financialResults,
    ...linkedinResults,
    ...crunchbaseResults
  ];
  
  const websiteUrl = generalResults.find(r => 
    !r.url.includes("linkedin") && 
    !r.url.includes("crunchbase") && 
    !r.url.includes("techcrunch") &&
    !r.url.includes("wikipedia")
  )?.url || startup.website;

  const linkedinUrl = linkedinResults.find(r => r.url.includes("linkedin.com/company"))?.url;
  const crunchbaseUrl = allResults.find(r => r.url.includes("crunchbase.com"))?.url;

  // Extract snippets for context - prioritize metrics and financial data
  const metricsSnippets = [...metricsResults, ...financialResults, ...fundingResults]
    .flatMap(r => [r.description, ...(r.extra_snippets || [])])
    .filter(Boolean);
  const allSnippets = allResults.flatMap(r => [r.description, ...(r.extra_snippets || [])]).filter(Boolean);
  
  // Combine with priority on metrics
  const enrichedContext = [...metricsSnippets, ...allSnippets].slice(0, 10).join(" | ");

  // Build sources array
  const sources: { name: string; url: string; type: string }[] = [];
  if (websiteUrl) sources.push({ name: "Site officiel", url: websiteUrl, type: "website" });
  if (linkedinUrl) sources.push({ name: "LinkedIn", url: linkedinUrl, type: "linkedin" });
  if (crunchbaseUrl) sources.push({ name: "Crunchbase", url: crunchbaseUrl, type: "crunchbase" });
  
  // Add other relevant sources
  allResults.slice(0, 5).forEach(r => {
    if (!sources.find(s => s.url === r.url)) {
      let type = "article";
      if (r.url.includes("techcrunch")) type = "press";
      else if (r.url.includes("pitchbook")) type = "data";
      sources.push({ name: r.title.substring(0, 50), url: r.url, type });
    }
  });

  return {
    ...startup,
    website: websiteUrl || startup.website,
    linkedinUrl,
    crunchbaseUrl,
    sources: sources.slice(0, 8),
    dataContext: enrichedContext,
    metricsContext: metricsSnippets.join(" | "), // Separate context for metrics
    verificationStatus: sources.length >= 2 ? "verified" : "partially_verified",
  };
}

// Enrich market data with real TAM/SAM/SOM figures
async function enrichMarketData(sector: string, geography: string): Promise<any> {
  
  const marketResults = await braveSearch(
    `${sector} market size TAM SAM 2024 2025 billion growth rate CAGR`, 
    5
  );

  const snippets = marketResults.flatMap(r => [r.description, ...(r.extra_snippets || [])]).filter(Boolean);
  
  const sources = marketResults.slice(0, 3).map(r => ({
    name: r.title.substring(0, 50),
    url: r.url,
  }));

  return {
    marketContext: snippets.join(" | "),
    marketSources: sources,
  };
}

// Robust JSON parsing function that handles large responses and common formatting issues
function parseJSONResponse(content: string): any {
  let cleanContent = content.trim();
  
  // Remove markdown code blocks
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
  
  // Try to find JSON object boundaries if there's extra text
  const firstBrace = cleanContent.indexOf('{');
  const lastBrace = cleanContent.lastIndexOf('}');
  
  if (firstBrace > 0 || lastBrace < cleanContent.length - 1) {
    // There's extra text, extract just the JSON part
    if (firstBrace >= 0 && lastBrace >= 0 && lastBrace > firstBrace) {
      cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
    }
  }
  
  // First attempt: direct parse
  try {
    return JSON.parse(cleanContent);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.log("First parse attempt failed:", errorMsg);
    
    // Check if it's an unterminated string error
    if (errorMsg.includes("Unterminated string") || errorMsg.includes("unterminated string")) {
      console.log("Detected unterminated string, attempting to fix...");
      cleanContent = fixUnterminatedStrings(cleanContent);
    }
  }
  
  // Second attempt: fix common JSON issues
  try {
    let fixedContent = cleanContent;
    
    // Try to fix trailing commas
    fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');
    
    // Try to parse again
    try {
      return JSON.parse(fixedContent);
    } catch (e2) {
      console.log("Fixed parse also failed, trying progressive truncation...");
    }
  } catch (e) {
    // Continue to next attempt
  }
  
  // Third attempt: Progressive truncation to find valid JSON
  // This handles cases where the JSON is cut off mid-string
  try {
    let truncated = cleanContent;
    let lastValidJSON: any = null;
    let lastValidLength = 0;
    
    // Try truncating from the end in increments to find the last valid JSON position
    for (let i = 0; i < 10; i++) {
      const truncatePos = Math.floor(truncated.length * (1 - (i + 1) * 0.1));
      if (truncatePos <= lastValidLength) break;
      
      // Find the last complete property/value pair before truncatePos
      let safeTruncatePos = truncated.lastIndexOf('",', truncatePos);
      if (safeTruncatePos === -1) safeTruncatePos = truncated.lastIndexOf('":', truncatePos);
      if (safeTruncatePos === -1) safeTruncatePos = truncated.lastIndexOf(',', truncatePos);
      
      if (safeTruncatePos > 0) {
        // Try to close the JSON properly
        let testJSON = truncated.substring(0, safeTruncatePos);
        
        // Count open braces/brackets
        const openBraces = (testJSON.match(/\{/g) || []).length;
        const closeBraces = (testJSON.match(/\}/g) || []).length;
        const openBrackets = (testJSON.match(/\[/g) || []).length;
        const closeBrackets = (testJSON.match(/\]/g) || []).length;
        
        // Close unclosed structures
        for (let j = 0; j < openBrackets - closeBrackets; j++) {
          testJSON += ']';
        }
        for (let j = 0; j < openBraces - closeBraces; j++) {
          testJSON += '}';
        }
        
        try {
          const parsed = JSON.parse(testJSON);
          lastValidJSON = parsed;
          lastValidLength = safeTruncatePos;
        } catch (e) {
          // Continue
        }
      }
    }
    
    if (lastValidJSON) {
      console.log("Successfully parsed truncated JSON");
      return lastValidJSON;
    }
  } catch (e) {
    console.log("Progressive truncation failed");
  }
  
  // Fourth attempt: try to extract and parse just the main structure
  let startIdx = cleanContent.indexOf('{');
  if (startIdx >= 0) {
    let braceCount = 0;
    let endIdx = startIdx;
    
    for (let i = startIdx; i < cleanContent.length; i++) {
      if (cleanContent[i] === '{') braceCount++;
      if (cleanContent[i] === '}') braceCount--;
      if (braceCount === 0) {
        endIdx = i;
        break;
      }
    }
    
    if (endIdx > startIdx) {
      try {
        const extractedJSON = cleanContent.substring(startIdx, endIdx + 1);
        return JSON.parse(extractedJSON);
      } catch (e) {
        console.log("Extracted JSON parse also failed");
      }
    }
  }
  
  // If all attempts fail, throw the original error
  throw new Error(`Failed to parse JSON after all attempts. Content length: ${cleanContent.length}`);
}

// Helper function to fix unterminated strings by truncating at a safe position
function fixUnterminatedStrings(json: string): string {
  // Strategy: Find where we are in a string and truncate before the incomplete string starts
  let inString = false;
  let escapeNext = false;
  let stringStartPos = -1;
  let lastCompletePos = json.length - 1;
  
  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    const prevChar = i > 0 ? json[i - 1] : '';
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringStartPos = i;
      } else {
        inString = false;
        lastCompletePos = i;
        stringStartPos = -1;
      }
    }
  }
  
  // If we're still in a string at the end, we need to truncate before that string started
  if (inString && stringStartPos > 0) {
    // Find the last complete property/value before this string
    // Look backwards for common JSON patterns
    let truncatePos = stringStartPos - 1;
    
    // Try to find the start of this property (look for : or , before the string)
    for (let i = truncatePos; i >= 0 && i > stringStartPos - 200; i--) {
      if (json[i] === ':' && i < stringStartPos) {
        // Found the property separator, now find the property name start
        for (let j = i - 1; j >= 0 && j > i - 50; j--) {
          if (json[j] === '"' && json.substring(j, i).match(/"[^"]*"\s*:/)) {
            // Found property name, truncate before it
            truncatePos = j - 1;
            // Look for comma before this property
            for (let k = truncatePos; k >= 0 && k > truncatePos - 100; k--) {
              if (json[k] === ',' && !inStringAt(json, k)) {
                truncatePos = k;
                break;
              }
            }
            break;
          }
        }
        break;
      }
    }
    
    if (truncatePos > json.length * 0.3) { // Keep at least 30% of content
      let truncated = json.substring(0, truncatePos);
      
      // Remove trailing comma
      truncated = truncated.replace(/,\s*$/, '');
      
      // Count and close structures
      const openBraces = (truncated.match(/\{/g) || []).length;
      const closeBraces = (truncated.match(/\}/g) || []).length;
      const openBrackets = (truncated.match(/\[/g) || []).length;
      const closeBrackets = (truncated.match(/\]/g) || []).length;
      
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        truncated += ']';
      }
      for (let i = 0; i < openBraces - closeBraces; i++) {
        truncated += '}';
      }
      
      return truncated;
    }
  }
  
  // Fallback: find last complete string ending
  const safeEndPatterns = ['",', '"}', '"]', '"\n'];
  let bestPos = -1;
  for (const pattern of safeEndPatterns) {
    const pos = json.lastIndexOf(pattern);
    if (pos > bestPos && pos > json.length * 0.4) {
      bestPos = pos + pattern.length - 1;
    }
  }
  
  if (bestPos > 0) {
    let truncated = json.substring(0, bestPos + 1);
    truncated = truncated.replace(/,\s*$/, '');
    
    const openBraces = (truncated.match(/\{/g) || []).length;
    const closeBraces = (truncated.match(/\}/g) || []).length;
    const openBrackets = (truncated.match(/\[/g) || []).length;
    const closeBrackets = (truncated.match(/\]/g) || []).length;
    
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      truncated += ']';
    }
    for (let i = 0; i < openBraces - closeBraces; i++) {
      truncated += '}';
    }
    
    return truncated;
  }
  
  return json;
}

// Helper to check if we're inside a string at position
function inStringAt(json: string, pos: number): boolean {
  let inString = false;
  let escapeNext = false;
  for (let i = 0; i < pos && i < json.length; i++) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (json[i] === '\\') {
      escapeNext = true;
      continue;
    }
    if (json[i] === '"') {
      inString = !inString;
    }
  }
  return inString;
}

/** Scores: 0-100 ou 1-10 uniquement. Montants: $/M/€. Ne jamais mélanger. */
function sanitizeSlideMetrics(slide: { metrics?: Record<string, unknown> }): void {
  const m = slide?.metrics as Record<string, unknown> | undefined;
  if (!m || typeof m !== "object") return;

  const looksLikeMoney = (v: unknown): boolean => {
    if (v == null) return false;
    const s = String(v).toLowerCase();
    return /\$|€|million|millions|m\s*€|m\s*\$/i.test(s) || /\d+\s*[mk](\s|$)/i.test(s);
  };

  const score1To10 = ["fitScore"];
  const score0To100 = ["pmfScore"];
  const nonNegativeInt = ["patents"];

  for (const key of score1To10) {
    const v = m[key];
    if (v == null) continue;
    const s = String(v).trim();
    if (looksLikeMoney(v)) {
      delete m[key];
      continue;
    }
    const n = parseFloat(s.replace(/[^\d.,]/g, "").replace(",", "."));
    if (!Number.isFinite(n)) {
      delete m[key];
      continue;
    }
    const clamped = Math.round(Math.max(1, Math.min(10, n)));
    m[key] = clamped;
  }

  for (const key of score0To100) {
    const v = m[key];
    if (v == null) continue;
    const s = String(v).trim();
    if (looksLikeMoney(v)) {
      delete m[key];
      continue;
    }
    const n = parseFloat(s.replace(/[^\d.,]/g, "").replace(",", "."));
    if (!Number.isFinite(n)) {
      delete m[key];
      continue;
    }
    const clamped = Math.round(Math.max(0, Math.min(100, n)));
    m[key] = clamped;
  }

  for (const key of nonNegativeInt) {
    const v = m[key];
    if (v == null) continue;
    const s = String(v).trim();
    if (looksLikeMoney(v)) {
      delete m[key];
      continue;
    }
    const n = parseFloat(s.replace(/[^\d.,]/g, "").replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      delete m[key];
      continue;
    }
    m[key] = Math.round(Math.min(9999, n));
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders(req) 
    });
  }

  try {
    let requestData: AnalysisRequest;
    try {
      const bodyText = await req.text();
      if (!bodyText) {
        return new Response(JSON.stringify({ 
          error: "Request body is empty. Please provide fundName or customThesis." 
        }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      requestData = JSON.parse(bodyText);
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(JSON.stringify({ 
        error: `Invalid JSON in request body: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}` 
      }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { fundName, customThesis, params = {} } = requestData;
    
    // Gemini + Brave uniquement
    const GEMINI_API_KEY = Deno.env.get("GEMINI_KEY_2") || Deno.env.get("GEMINI_API_KEY");
    const BRAVE_API_KEY = Deno.env.get("BRAVE_API_KEY");
    
    if (!GEMINI_API_KEY) {
      console.error("Gemini not configured");
      return new Response(JSON.stringify({ 
        error: "Gemini non configuré. Ajoutez GEMINI_KEY_2 ou GEMINI_API_KEY dans Supabase Dashboard > Edge Functions > analyze-fund > Settings > Secrets.\n\n📖 Clé gratuite : https://makersuite.google.com/app/apikey",
        setupRequired: true
      }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (!BRAVE_API_KEY) {
      console.error("Brave Search not configured");
      return new Response(JSON.stringify({ 
        error: "Brave Search non configuré. Ajoutez BRAVE_API_KEY dans Supabase Dashboard > Edge Functions > analyze-fund > Settings > Secrets.\n\n📖 https://brave.com/search/api/",
        setupRequired: true
      }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const numberOfStartups = Math.min(Math.max(params.numberOfStartups || 1, 1), 5);


    // Step 1: Search for fund investment thesis and criteria (to understand what startups to source)
    let fundThesisContext = "";
    let fundSources: { name: string; url: string }[] = [];
    let investmentCriteria = {
      sectors: [] as string[],
      stage: "",
      geography: "",
      ticketSize: "",
      focus: ""
    };
    
    if (fundName) {
      // Search for fund investment thesis and criteria
      const fundResults = await braveSearch(`${fundName} investment thesis criteria sectors stage geography ticket size`, 8);
      fundThesisContext = fundResults.map(r => `${r.title}: ${r.description}`).join("\n");
      fundSources = fundResults.slice(0, 4).map(r => ({ name: r.title.substring(0, 60), url: r.url }));
      
      // Additional search for portfolio examples to understand their focus
      const portfolioResults = await braveSearch(`${fundName} portfolio companies investments 2023 2024`, 5);
      fundThesisContext += "\n\nPORTFOLIO EXAMPLES:\n" + portfolioResults.map(r => `${r.title}: ${r.description}`).join("\n");
    }

    // Step 2: Search for market data and potential startups
    const primarySector = customThesis?.sectors?.[0] || "technology startups";
    const marketData = await enrichMarketData(primarySector, customThesis?.geography || "global");
    
    // Step 3: Search for REAL startups matching the thesis (CRITICAL for sourcing)
    let startupSearchQueries: string[] = [];
    
    // Extract criteria — secteurs par défaut si fund-only (pas de thèse personnalisée)
    const stage = customThesis?.stage || "seed";
    const geography = customThesis?.geography || "global";
    const sectors = (customThesis?.sectors?.length ? customThesis.sectors : (fundName ? ["technology", "SaaS"] : ["technology"])) as string[];
    
    if (fundName && fundThesisContext) {
      sectors.forEach(sector => {
        startupSearchQueries.push(`${sector} startup ${stage} stage ${geography} 2024`);
        startupSearchQueries.push(`${sector} company funding ${stage} round 2024`);
      });
    } else if (customThesis) {
      sectors.forEach(sector => {
        startupSearchQueries.push(`${sector} startup ${stage} ${geography} 2024`);
      });
    }
    
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    
    // COUCHE 1–2 : Classic sourcing
    let startupSearchResults: BraveSearchResult[] = [];
    for (const query of startupSearchQueries.slice(0, 4)) {
      const results = await braveSearch(query, 5);
      startupSearchResults.push(...results);
      await sleep(400);
    }
    
    // COUCHE 3 : Ninja sourcing (talent, IP, spinoffs)
    const criticalRoles = ["Head of Photonics", "Quantum Lead", "CTO", "VP Engineering", "Head of AI"];
    for (const sector of sectors.slice(0, 2)) {
      for (const role of criticalRoles.slice(0, 3)) {
        const results = await braveSearch(`${role} ${sector} ${geography} hiring jobs 2024`, 2);
        startupSearchResults.push(...results);
        await sleep(400);
      }
    }
    for (const sector of sectors.slice(0, 2)) {
      for (const q of [`${sector} patent filed ${geography} 2023 2024`, `${sector} patent cited by Intel Tesla Google ${geography}`]) {
        const results = await braveSearch(q, 2);
        startupSearchResults.push(...results);
        await sleep(400);
      }
    }
    const universities = geography === "europe" ? ["CNRS", "CEA", "INRIA", "Max Planck", "ETH Zurich"] : ["MIT", "Stanford", "Harvard", "Berkeley"];
    for (const sector of sectors.slice(0, 2)) {
      for (const uni of universities.slice(0, 3)) {
        const results = await braveSearch(`${uni} ${sector} spin-off startup founded researcher`, 2);
        startupSearchResults.push(...results);
        await sleep(400);
      }
    }
    
    // COUCHE 4 : Deep dive — actualités secteur, concurrence, régulation
    const deepQueries = [
      `${primarySector} news 2024 2025 trends`,
      `${primarySector} competitors landscape 2024`,
      `${primarySector} regulation compliance 2024`,
    ];
    for (const q of deepQueries) {
      const results = await braveSearch(q, 4);
      startupSearchResults.push(...results);
      await sleep(400);
    }
    
    // COUCHE 5 : Reflection — Gemini suggère des requêtes Brave supplémentaires, on les exécute
    let reflectionContext = "";
    try {
      const refPrompt = `Tu es un assistant. Fonds: "${fundName || "thèse personnalisée"}". Contexte thèse:\n${fundThesisContext.slice(0, 800)}\n\nContexte marché:\n${marketData.marketContext?.slice(0, 500) || ""}\n\nStartups déjà trouvées (extraits):\n${startupSearchResults.slice(0, 8).map(r => r.title + " " + r.description).join("\n")}\n\nPropose EXACTEMENT 3 à 5 requêtes de recherche web (en anglais, courtes) pour trouver d'autres startups ou données complémentaires. Réponds UNIQUEMENT avec un JSON: {"queries": ["query1", "query2", ...]}`;
      const refRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: refPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 512, responseMimeType: "application/json" },
        }),
      });
      if (refRes.ok) {
        const refData = await refRes.json();
        const refText = refData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const refJson = refText.replace(/```json?\s*/g, "").trim();
        const parsed = JSON.parse(refJson);
        const queries: string[] = Array.isArray(parsed?.queries) ? parsed.queries.slice(0, 5) : [];
        for (const q of queries) {
          const results = await braveSearch(String(q).trim(), 3);
          startupSearchResults.push(...results);
          await sleep(400);
        }
        reflectionContext = queries.length ? `\n\n=== REQUÊTES ADDITIONNELLES (réflexion) ===\nRésultats des requêtes suggérées: ${queries.join("; ")}` : "";
      }
    } catch (e) {
      console.warn("Reflection layer skipped:", e);
    }
    
    const startupSearchContext = startupSearchResults
      .slice(0, 25)
      .map(r => `${r.title}: ${r.description} | URL: ${r.url}`)
      .join("\n") + reflectionContext;

    const systemPrompt = `Tu es un analyste VC SENIOR avec 15+ ans d'expérience en sourcing de startups et due diligence approfondie pour les plus grands fonds (Sequoia, a16z, Accel, etc.).

🎯 MISSION PRINCIPALE : SOURCING DE STARTUPS + DUE DILIGENCE PROFESSIONNELLE

⚠️ RÉFLEXION : Réfléchis étape par étape avant de conclure. Utilise TOUTES les couches de recherche fournies (thèse fonds, marché, startups classiques, ninja sourcing, deep dive actualités/concurrence/régulation, requêtes additionnelles). Croise les données avant de produire ton analyse.

⚠️ ATTENTION : TU NE DOIS PAS ANALYSER LE FONDS, MAIS SOURCER DES STARTUPS QUI CORRESPONDENT À SA THÈSE ⚠️

TON RÔLE :
1. COMPRENDRE la thèse d'investissement du fonds (secteurs, stade, géographie, ticket) - C'EST UNIQUEMENT POUR COMPRENDRE QUOI CHERCHER
2. SOURCER ${numberOfStartups} startup(s) RÉELLE(S) qui correspondent PARFAITEMENT à cette thèse
3. Effectuer une DUE DILIGENCE COMPLÈTE de niveau senior VC avec TOUTES les métriques chiffrées
4. Générer un rapport d'investissement prêt pour un Investment Committee

⚠️ RÈGLE CRITIQUE : DONNÉES VÉRIFIÉES + ESTIMATIONS INTELLIGENTES ⚠️

PRIORITÉ 1 - DONNÉES RÉELLES :
Tu as accès à des données de recherche web réelles ci-dessous. UTILISE CES DONNÉES en PRIORITÉ pour tes analyses.
Pour chaque information clé (TAM, SAM, SOM, ARR, MRR, valorisation, funding, traction, CAC, LTV, churn, NRR), indique TOUJOURS la source avec URL.

PRIORITÉ 2 - ESTIMATIONS INTELLIGENTES :
Si une donnée n'est PAS disponible dans les recherches web, fais une ESTIMATION INTELLIGENTE basée sur :
1. Le stade de la startup (Seed, Series A, B, etc.)
2. Le secteur (SaaS, Marketplace, Fintech, etc.)
3. Les moyennes du marché pour ce type d'entreprise
4. Les données disponibles sur la startup (funding, équipe, etc.)

FORMAT DES MÉTRIQUES :
- Si données réelles : "$2.5M ARR (source: techcrunch.com/article)"
- Si estimation : "$1.8M ARR (estimation basée sur stade Series A SaaS, moyenne marché $1-3M)"
- Si vraiment non disponible : "Non disponible (startup trop récente)"

⚠️ IMPORTANT : 
- Ne laisse JAMAIS "Non disponible" sans avoir cherché
- Fais TOUJOURS une estimation intelligente si possible
- Compare avec les moyennes du marché
- Indique clairement "(estimation)" pour les métriques estimées

${fundThesisContext ? `
=== THÈSE D'INVESTISSEMENT DU FONDS (pour comprendre quoi chercher) ===
${fundThesisContext}

⚠️ IMPORTANT : Ces informations servent UNIQUEMENT à comprendre les critères d'investissement du fonds.
Tu dois maintenant SOURCER des startups RÉELLES qui correspondent à ces critères, PAS analyser le fonds.
` : ''}

${startupSearchContext ? `
=== STARTUPS POTENTIELLES TROUVÉES (source: Brave Search + Ninja Sourcing) ===
${startupSearchContext}

⚠️ UTILISE CES RÉSULTATS pour identifier des startups RÉELLES à analyser.
Chaque startup doit être une entreprise EXISTANTE avec un site web, des données vérifiables.

🎯 SOURCING NINJA : Ces résultats incluent des entreprises trouvées AVANT qu'elles ne soient sur Crunchbase/Pitchbook via :
- Signaux RH (recrutement massif de postes critiques)
- Propriété Intellectuelle (brevets et citations par géants tech)
- Spinoffs universitaires (chercheurs qui fondent des startups)

Ces startups sont souvent en phase pré-levée ou très récente, ce qui représente des opportunités d'investissement précoces.
` : ''}

=== DONNÉES MARCHÉ (source: Brave Search) ===
${marketData.marketContext}

=== MOYENNES DU MARCHÉ PAR STADE (pour estimations intelligentes) ===

SAAS (Software as a Service) :
- Seed: ARR $0-500K, MRR $0-40K, CAC $500-1500, Churn 5-10%/mois, NRR 80-100%, Marge brute 70-85%
- Series A: ARR $500K-2M, MRR $40K-170K, CAC $1000-2000, Churn 3-7%/mois, NRR 100-120%, Marge brute 75-90%
- Series B: ARR $2M-10M, MRR $170K-830K, CAC $1500-3000, Churn 2-5%/mois, NRR 110-130%, Marge brute 80-92%
- Series C+: ARR $10M+, MRR $830K+, CAC $2000-5000, Churn 1-3%/mois, NRR 120-150%, Marge brute 85-95%

MARKETPLACE :
- Seed: GMV $0-2M, Take rate 10-20%, CAC $50-200, Churn 10-20%/mois
- Series A: GMV $2M-10M, Take rate 15-25%, CAC $100-300, Churn 8-15%/mois
- Series B+: GMV $10M+, Take rate 20-30%, CAC $150-400, Churn 5-12%/mois

FINTECH :
- Seed: ARR $0-1M, CAC $200-800, Churn 4-8%/mois, NRR 90-110%
- Series A: ARR $1M-5M, CAC $500-1500, Churn 3-6%/mois, NRR 100-115%
- Series B+: ARR $5M+, CAC $800-2500, Churn 2-5%/mois, NRR 110-130%

HEALTHCARE IT :
- Seed: ARR $0-800K, CAC $1000-3000, Churn 2-5%/mois (plus bas que SaaS)
- Series A: ARR $800K-3M, CAC $2000-5000, Churn 1-4%/mois
- Series B+: ARR $3M+, CAC $3000-8000, Churn 1-3%/mois

⚠️ UTILISE CES MOYENNES pour faire des estimations intelligentes quand les données réelles ne sont pas disponibles.

⚠️ RÈGLES DE TYPES — NE JAMAIS MÉLANGER ⚠️
- SCORES (fitScore, pmfScore) : TOUJOURS un nombre. fitScore = 1–10, pmfScore = 0–100. JAMAIS de millions, $, M, €. Ex: fitScore 7 ✓ | fitScore "60 millions" ✗.
- MONTANTS ($) : ARR, MRR, CAC, LTV, valuation, TAM, SAM, SOM, askAmount, burnRate — en $ ou M€. Ex: "$2.5M ARR".
- POURCENTAGES (%) : NRR, churn, croissance, marge, CAGR — en %. Ex: "120% NRR", "5% churn/mois".
- ENTIERS : brevets, nombre de clients, team size, runway (mois). Ex: 3 brevets, 12 mois runway.

${customThesis ? `
THÈSE D'INVESTISSEMENT PERSONNALISÉE:
- Secteurs: ${customThesis.sectors?.join(', ') || 'Non spécifié'}
- Stade: ${customThesis.stage || 'Non spécifié'}
- Géographie: ${customThesis.geography || 'Non spécifié'}
- Taille de ticket: ${customThesis.ticketSize || 'Non spécifié'}
- Description: ${customThesis.description || 'Non spécifiée'}
` : ''}

Tu dois répondre avec un objet JSON valide contenant:

1. "investmentThesis": Critères d'investissement du fonds (résumé concis, max 200 mots):
   - "sectors": Array des secteurs focus identifiés
   - "stage": Stade d'investissement préféré
   - "geography": Régions cibles
   - "ticketSize": Taille de ticket moyenne
   - "description": Description concise de leur thèse (max 200 mots)
   
   ⚠️ Ce champ sert UNIQUEMENT de contexte. Le focus principal doit être sur les STARTUPS.

2. "startups": Array de ${numberOfStartups} startup(s) RÉELLE(S) SOURCÉES:
   Chaque startup contient (TOUTES les données doivent être VÉRIFIÉES avec sources):
   - "name": Nom RÉEL de la startup (doit exister vraiment)
   - "tagline": Description en une ligne
   - "sector": Secteur principal
   - "stage": Stade actuel (Seed, Series A, etc.) avec source
   - "location": Siège (ville, pays)
   - "founded": Année de création
   - "problem": Problème adressé (détaillé)
   - "solution": Solution proposée (détaillée)
   - "businessModel": Modèle économique détaillé (B2B, B2C, marketplace, SaaS, etc.)
   - "competitors": Concurrents principaux avec leurs données (nom, funding, taille)
   - "moat": Avantage compétitif détaillé
   - "fundingHistory": Historique COMPLET de levées avec montants, dates, investisseurs, sources URL
   - "website": Site web RÉEL (URL complète)
   - "linkedin": URL LinkedIn de la startup
   - "crunchbaseUrl": URL Crunchbase si disponible
   - "metrics": {
       "arr": "ARR en $ avec source OU estimation (ex: '$2.5M ARR (source: techcrunch.com)' ou '$1.8M ARR (estimation basée sur stade Series A SaaS)')",
       "mrr": "MRR en $ avec source OU estimation (ex: '$200K MRR (source: ...)' ou '$150K MRR (estimation)')",
       "growth": "Croissance MoM/YoY en % avec source OU estimation",
       "customers": "Nombre de clients avec source OU estimation basée sur ARR/MRR et secteur",
       "nrr": "Net Revenue Retention en % avec source OU estimation (moyenne SaaS: 100-120%)",
       "cac": "Customer Acquisition Cost en $ avec source OU estimation (moyenne SaaS: $500-2000)",
       "ltv": "Lifetime Value en $ avec source OU estimation (calculé: LTV = ARPU / churn rate)",
       "ltvCacRatio": "Ratio LTV/CAC avec source OU estimation (bon ratio: 3:1 minimum)",
       "churn": "Taux de churn mensuel en % avec source OU estimation (moyenne SaaS: 3-7%/mois)",
       "grossMargin": "Marge brute en % avec source OU estimation (moyenne SaaS: 70-90%)",
       "burnRate": "Burn rate mensuel en $ avec source OU estimation (basé sur funding et runway)",
       "runway": "Runway en mois avec source OU estimation (calculé: cash / burn rate)",
       "valuation": "Valorisation actuelle en $ avec source URL OU estimation basée sur dernière levée"
     }
   - "team": {
       "founders": [{"name": "Nom complet", "role": "CEO/CTO/etc", "linkedin": "URL", "background": "Expérience"}],
       "teamSize": "Nombre d'employés",
       "keyHires": "Recrutements clés récents"
     }
   - "verificationStatus": "verified" | "partially_verified" | "unverified"
   - "sources": Array de toutes les sources utilisées { "name": "Nom", "url": "URL", "type": "article/crunchbase/linkedin/etc" }

4. "dueDiligenceReports": Array de ${numberOfStartups} rapport(s):
   Chaque rapport est un Array de slides:
   
   [
     {
       "title": "Executive Summary",
       "content": "Résumé détaillé avec données VÉRIFIÉES et sources citées (min 300 mots)",
       "keyPoints": ["Point 1 avec source", "Point 2 avec source", ...],
       "metrics": { 
         "valuation": "Valorisation en $ avec source (ex: $15M)", 
         "askAmount": "Montant demandé en $ (ex: $2M)", 
         "fitScore": "Nombre ENTRE 1 ET 10 UNIQUEMENT (ex: 7). JAMAIS 60, 60M, millions, $",
         "sources": ["source1", "source2"]
       }
     },
     {
       "title": "Market Analysis",
       "content": "Analyse marché avec TAM/SAM/SOM VÉRIFIÉS et sources (min 300 mots)",
       "keyPoints": ["Tendance 1", ...],
       "metrics": { 
         "tam": "TAM avec source (ex: $50B - Grand View Research 2024)", 
         "sam": "SAM avec source", 
         "som": "SOM avec source", 
         "cagr": "CAGR avec source",
         "sources": ["url1", "url2"]
       }
     },
     {
       "title": "Product & Technology",
       "content": "Analyse produit détaillée (min 250 mots)",
       "keyPoints": ["Force 1", ...],
       "metrics": { 
         "techStack": "Stack technique", 
         "patents": "Nombre de brevets (entier, ex: 3)", 
         "pmfScore": "Nombre ENTRE 0 ET 100 UNIQUEMENT (ex: 75). JAMAIS 60M, millions, $" 
       }
     },
     {
       "title": "Business Metrics & Traction",
       "content": "Métriques DÉTAILLÉES avec SOURCES VÉRIFIÉES et CHIFFRES PRÉCIS (min 400 mots). Inclure: ARR/MRR, croissance MoM/YoY, nombre de clients, NRR, CAC, LTV, ratio LTV/CAC, churn, burn rate, runway, unit economics, cohort analysis si disponible.",
       "keyPoints": ["ARR: $X avec source URL", "MRR: $Y avec croissance Z% MoM", "Clients: N avec source", "NRR: X% avec source", "CAC: $X avec source", "LTV: $Y avec source", "LTV/CAC: X avec source", "Churn: X% avec source", "Burn: $X/mois avec source", "Runway: X mois avec source"],
       "metrics": { 
         "arr": "ARR en $ avec source URL OU estimation. Format: '$2.5M ARR (source: ...)' ou '$1.2M ARR (estimation - Series A SaaS)'",
         "mrr": "MRR en $ avec source OU estimation. Si ARR disponible, MRR = ARR/12.",
         "mrrGrowth": "Croissance MRR en % MoM/YoY avec source OU estimation. Estime basé sur stade si non disponible.", 
         "customers": "Nombre de clients avec source OU estimation. Calcule si ARR/MRR et ARPU disponibles.", 
         "nrr": "NRR en % avec source OU estimation (moyenne SaaS par stade: Seed 80-100%, Series A 100-120%, etc.)",
         "cac": "CAC en $ avec source OU estimation (moyenne SaaS par stade: Seed $500-1500, Series A $1000-2000, etc.)",
         "ltv": "LTV en $ avec source OU estimation. Calcule: LTV = ARPU / churn rate si données disponibles.",
         "ltvCacRatio": "Ratio LTV/CAC avec source OU estimation. Calcule si LTV et CAC disponibles. Bon: 3:1+",
         "churn": "Churn mensuel en % avec source OU estimation (moyenne SaaS: Seed 5-10%, Series A 3-7%, etc.)",
         "burnRate": "Burn rate mensuel en $ avec source OU estimation. Estime basé sur équipe et stade.",
         "runway": "Runway en mois avec source OU estimation. Calcule: cash / burn rate si données disponibles.",
         "grossMargin": "Marge brute en % avec source OU estimation (SaaS typique: 70-90%)",
         "sources": ["source1", "source2", "source3"]
       }
     },
     {
       "title": "Competitive Analysis",
       "content": "Analyse concurrentielle avec données marché (min 250 mots)",
       "keyPoints": ["Avantage 1", ...],
       "metrics": { "marketShare": "Part de marché", "competitorCount": "Nb concurrents" }
     },
     {
       "title": "Team Assessment",
       "content": "Évaluation équipe avec liens LinkedIn (min 250 mots)",
       "keyPoints": ["Point 1", ...],
       "metrics": { 
         "founders": [{ "name": "Nom", "role": "Rôle", "linkedin": "URL LinkedIn" }],
         "teamSize": "Taille équipe",
         "advisors": ["Advisor 1", ...]
       }
     },
     {
       "title": "Investment Recommendation",
       "content": "Recommandation détaillée avec risques et opportunités (min 300 mots)",
       "keyPoints": ["Raison 1", "Risque 1", ...],
       "metrics": { 
         "recommendation": "INVEST" | "PASS" | "WATCH",
         "targetReturn": "Multiple cible",
         "riskLevel": "high" | "medium" | "low",
         "suggestedTicket": "Ticket suggéré"
       }
     }
   ]

5. "analysisMetadata":
   - "confidence": "high" | "medium" | "low"
   - "dataQuality": "excellent" | "good" | "fair" | "limited"
   - "verificationLevel": "fully_verified" | "mostly_verified" | "partially_verified"
   - "sources": Array de toutes les sources utilisées { "name", "url", "type" }`;

    const userPrompt = fundName 
      ? `🎯 MISSION : SOURCER ET ANALYSER DES STARTUPS POUR LE FONDS "${fundName}"

⚠️ ATTENTION : TU NE DOIS PAS ANALYSER LE FONDS "${fundName}". TU DOIS SOURCER DES STARTUPS QUI CORRESPONDENT À SA THÈSE.

ÉTAPE 1 - COMPRENDRE LA THÈSE (rapide, max 100 mots) :
Analyse rapidement la thèse d'investissement du fonds "${fundName}" pour identifier :
- Les secteurs cibles
- Le stade d'investissement préféré (Seed, Series A, etc.)
- La géographie cible
- La taille de ticket moyenne

ÉTAPE 2 - SOURCING DE STARTUPS RÉELLES (PRIORITÉ ABSOLUE) :
Identifie ${numberOfStartups} startup(s) RÉELLE(S) et VÉRIFIÉES qui correspondent PARFAITEMENT à la thèse du fonds "${fundName}".

Chaque startup doit être :
- Une entreprise RÉELLE et EXISTANTE (pas inventée)
- Correspondre aux critères du fonds (secteur, stade, géographie, ticket)
- Avoir un site web RÉEL, LinkedIn, et idéalement Crunchbase
- Avoir des données vérifiables (funding, métriques, équipe)

⚠️ UTILISE les résultats de recherche web fournis ci-dessus pour identifier des startups RÉELLES.
⚠️ Ne crée PAS de startups fictives. Si tu ne trouves pas assez de startups réelles, dis-le clairement.

ÉTAPE 3 - DUE DILIGENCE COMPLÈTE (niveau senior VC) :
Pour chaque startup sourcée, génère un rapport de due diligence PROFESSIONNEL avec TOUTES les métriques chiffrées :

OBLIGATOIRE - Métriques financières (RÉELLES ou ESTIMATIONS INTELLIGENTES) :

POUR CHAQUE MÉTRIQUE :
1. Cherche d'abord dans les données de recherche web fournies
2. Si trouvé → Utilise la donnée réelle avec source URL
3. Si NON trouvé → Fais une ESTIMATION INTELLIGENTE basée sur :
   - Le stade de la startup (Seed, Series A, B, etc.)
   - Le secteur (SaaS, Marketplace, Fintech, etc.)
   - Les moyennes du marché pour ce type d'entreprise
   - Les données disponibles (funding, équipe, etc.)

MÉTRIQUES REQUISES :
- ARR/MRR en $ (avec source OU estimation avec justification)
- Croissance MoM/YoY en % (avec source OU estimation)
- Nombre de clients (avec source OU estimation basée sur ARR/MRR moyen par client)
- NRR en % (avec source OU estimation: moyenne SaaS 100-120%)
- CAC en $ (avec source OU estimation: moyenne SaaS $500-2000)
- LTV en $ (avec source OU estimation: calculé LTV = ARPU / churn)
- Ratio LTV/CAC (avec source OU estimation: bon ratio 3:1 minimum)
- Churn mensuel en % (avec source OU estimation: moyenne SaaS 3-7%/mois)
- Burn rate mensuel en $ (avec source OU estimation basée sur funding/runtime)
- Runway en mois (avec source OU estimation: calculé cash / burn rate)
- Marge brute en % (avec source OU estimation: moyenne SaaS 70-90%)
- Valorisation en $ (avec source URL OU estimation basée sur dernière levée)

FORMAT OBLIGATOIRE :
- Donnée réelle : "$2.5M ARR (source: techcrunch.com/article)"
- Estimation : "$1.8M ARR (estimation - stade Series A SaaS, moyenne marché $1-3M)"
- Ne JAMAIS mettre "Non disponible" sans estimation

COHÉRENCE DES TYPES :
- fitScore = nombre 1–10 uniquement (ex: 7). JAMAIS "60 millions", "60M", "$60", etc.
- pmfScore = nombre 0–100 uniquement (ex: 75). Mêmes règles.
- Montants (ARR, MRR, valuation, etc.) en $ ou M€. Scores en nombres purs.

OBLIGATOIRE - Analyse marché :
- TAM/SAM/SOM en $ avec sources URL (ex: $50B TAM - Grand View Research 2024)
- CAGR en % avec source
- Tendances du marché avec sources

OBLIGATOIRE - Équipe :
- Founders avec LinkedIn, background, expérience
- Taille de l'équipe
- Recrutements clés récents

OBLIGATOIRE - Recommandation :
- INVEST / PASS / WATCH avec justification détaillée
- Multiple cible (ex: 10x en 5 ans)
- Risques identifiés
- Opportunités identifiées

IMPORTANT : 
- Utilise UNIQUEMENT les données réelles trouvées dans les recherches web
- Ne crée PAS de données fictives
- Pour chaque chiffre, indique la source avec URL
- Si une donnée n'est pas disponible, marque "Non disponible" au lieu d'inventer`
      : `🎯 MISSION : SOURCER ET ANALYSER DES STARTUPS POUR THÈSE PERSONNALISÉE

ÉTAPE 1 - SOURCING :
Identifie ${numberOfStartups} startup(s) RÉELLE(S) et VÉRIFIÉES correspondant à la thèse personnalisée fournie.
Chaque startup doit être une entreprise RÉELLE avec des données vérifiables (site web, LinkedIn, Crunchbase).

ÉTAPE 2 - DUE DILIGENCE COMPLÈTE :
Génère un rapport de due diligence PROFESSIONNEL de niveau senior VC avec TOUTES les métriques chiffrées (ARR, MRR, CAC, LTV, churn, burn rate, etc.) avec sources URL pour chaque donnée.

IMPORTANT : Utilise UNIQUEMENT les données réelles trouvées dans les recherches web. Ne crée PAS de données fictives.`;

    let response: Response | null = null;
    let lastErrorText = "";

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const geminiBody = {
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}\n\nRéponds UNIQUEMENT avec du JSON valide, sans formatage markdown.` }] }],
      generationConfig: { temperature: 0.15, topP: 0.9, topK: 40, maxOutputTokens: 32768, responseMimeType: "application/json" as const },
    };

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        const waitMs = Math.min(8000, 800 * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 400);
        console.log(`Gemini rate-limited. Retrying in ${waitMs}ms (attempt ${attempt + 1}/3)`);
        await sleep(waitMs);
      }
      response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });
      if (response.ok) break;
      lastErrorText = await response.text();
      console.error("Gemini API error:", response.status, lastErrorText);
      if (response.status !== 429) break;
    }

    if (!response) {
      return new Response(JSON.stringify({ error: "Échec appel API Gemini." }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      const status = response.status;
      const errorText = lastErrorText || (await response.text());
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit Gemini. Attendez ~30–60s puis réessayez." }), {
          status: 429,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (status === 403) {
        return new Response(JSON.stringify({
          error: "Clé Gemini invalide ou expirée. Vérifiez GEMINI_KEY_2 ou GEMINI_API_KEY.",
        }), {
          status: 403,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (status === 400) {
        let msg = "Erreur requête Gemini.";
        try {
          const d = JSON.parse(errorText);
          if (d.error?.message) msg = `Gemini: ${d.error.message}`;
        } catch { /* ignore */ }
        return new Response(JSON.stringify({ error: msg }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Gemini API error (${status})` }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!content) {
      if (data.candidates?.[0]?.finishReason === "SAFETY") {
        return new Response(JSON.stringify({ error: "Réponse bloquée par les filtres de sécurité. Essayez une autre requête." }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Réponse Gemini vide." }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }


    let analysisResult;
    try {
      analysisResult = parseJSONResponse(content);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      console.error("Content length:", content.length);
      console.error("Content preview (first 1000 chars):", content.substring(0, 1000));
      console.error("Content preview (last 500 chars):", content.substring(Math.max(0, content.length - 500)));
      
      // Log the position of the error if available
      if (parseError instanceof Error && parseError.message.includes("position")) {
        const match = parseError.message.match(/position (\d+)/);
        if (match) {
          const errorPos = parseInt(match[1]);
          const start = Math.max(0, errorPos - 200);
          const end = Math.min(content.length, errorPos + 200);
          console.error(`Content around error position ${errorPos}:`, content.substring(start, end));
        }
      }
      
      return new Response(JSON.stringify({ 
        error: `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : "Unknown error"}. The response may be too large or malformed. Please try with fewer startups.` 
      }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Ensure startups is always an array
    if (!Array.isArray(analysisResult.startups)) {
      if ((analysisResult as any).startup) {
        analysisResult.startups = [(analysisResult as any).startup];
        delete (analysisResult as any).startup;
      } else {
        analysisResult.startups = [];
      }
    }

    // Step 3: Enrich each startup with real web data
    console.log("Enriching startup data with Brave Search...");
    const enrichedStartups = await Promise.all(
      analysisResult.startups.map((s: any) => enrichStartupData(s))
    );
    analysisResult.startups = enrichedStartups;

    // Add fund sources
    if (fundSources.length > 0) {
      analysisResult.fundInfo = analysisResult.fundInfo || {};
      analysisResult.fundInfo.sources = fundSources;
    }

    // Add market sources
    if (marketData.marketSources?.length > 0) {
      analysisResult.marketSources = marketData.marketSources;
    }

    // Normalize due diligence reports into Slide[][]
    const normalizeReportToSlides = (report: any): any[] => {
      if (!report) return [];
      if (Array.isArray(report)) return report;

      if (typeof report === "object") {
        const entries = Object.entries(report)
          .filter(([k, v]) => /^slide\s*\d+/i.test(k) && v && typeof v === "object")
          .map(([k, v]) => {
            const n = parseInt(k.replace(/\D+/g, ""), 10);
            return { n: Number.isFinite(n) ? n : 0, v };
          })
          .sort((a, b) => a.n - b.n)
          .map(({ v }) => v as any);

        if (entries.length > 0) return entries;

        if ("title" in report || "content" in report) return [report];
      }

      return [];
    };

    if (!Array.isArray(analysisResult.dueDiligenceReports)) {
      if (analysisResult.dueDiligenceReport || analysisResult.pitchDeck) {
        analysisResult.dueDiligenceReports = [analysisResult.dueDiligenceReport || analysisResult.pitchDeck];
        delete analysisResult.dueDiligenceReport;
        delete analysisResult.pitchDeck;
      } else {
        analysisResult.dueDiligenceReports = [];
      }
    }

    analysisResult.dueDiligenceReports = (analysisResult.dueDiligenceReports as any[]).map((r) =>
      normalizeReportToSlides(r).map((s) => {
        const slide = {
          title: String((s as any).title ?? ""),
          content: String((s as any).content ?? ""),
          keyPoints: Array.isArray((s as any).keyPoints) ? (s as any).keyPoints : [],
          metrics: (s as any).metrics && typeof (s as any).metrics === "object" ? (s as any).metrics : undefined,
        };
        sanitizeSlideMetrics(slide);
        return slide;
      })
    );

    console.log("Analysis complete:", fundName || 'Custom Thesis');
    console.log("Startups found:", analysisResult.startups?.length || 0);
    console.log("Startups enriched with sources:", enrichedStartups.filter((s: any) => s.sources?.length > 0).length);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-fund function:", error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : JSON.stringify(error);
    
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});