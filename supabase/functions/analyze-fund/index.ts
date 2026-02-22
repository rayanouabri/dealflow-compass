import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callDigitalOceanAgent, formatSourcingPrompt } from "../_shared/digitalocean-agent.ts";

const ALLOWED_ORIGINS = [
  "https://ai-vc-sourcing.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
];

function corsHeaders(req: Request | null): Record<string, string> {
  const origin = req?.headers?.get?.("origin") ?? "";
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

interface AnalysisRequest {
  phase?: "search" | "analyze";
  jobId?: string;
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

// Fonction pour valider et nettoyer une URL
function validateAndCleanUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  let cleanUrl = url.trim();
  
  // Enlever la ponctuation finale qui pourrait être collée
  cleanUrl = cleanUrl.replace(/[.,;:!?)\]\}]+$/, '');
  
  // Enlever les parenthèses/braces initiales
  cleanUrl = cleanUrl.replace(/^[(\[\{]+/, '');
  
  // S'assurer que l'URL commence par http:// ou https://
  if (!cleanUrl.match(/^https?:\/\//i)) {
    if (cleanUrl.startsWith('www.')) {
      cleanUrl = 'https://' + cleanUrl;
    } else if (cleanUrl.includes('.') && !cleanUrl.includes(' ')) {
      cleanUrl = 'https://' + cleanUrl;
    } else {
      return null; // URL invalide
    }
  }
  
  // Valider le format d'URL
  try {
    const urlObj = new URL(cleanUrl);
    
    if (!urlObj.hostname || urlObj.hostname.length < 3) return null;
    // Rejeter les URLs locales ou invalides
    if (urlObj.hostname === 'localhost' || 
        urlObj.hostname.startsWith('127.') || 
        urlObj.hostname.startsWith('192.') ||
        urlObj.hostname.startsWith('10.') ||
        urlObj.hostname === '0.0.0.0') {
      return null;
    }
    
    // Rejeter les URLs avec des caractères invalides
    if (cleanUrl.includes(' ') || cleanUrl.includes('\n') || cleanUrl.includes('\t')) {
      return null;
    }
    
    return cleanUrl;
  } catch {
    return null;
  }
}

// Search using Serper.dev API (Google Search) - 2500 free searches/month
// Fallback to Brave Search if Serper not configured
async function braveSearch(query: string, count: number = 10, retries: number = 2): Promise<BraveSearchResult[]> {
  const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY") || Deno.env.get("serper_api");
  const BRAVE_API_KEY = Deno.env.get("BRAVE_API_KEY");
  
  // Préférer Serper (2500/mois gratuit) à Brave (2000/mois, 1 req/sec)
  if (SERPER_API_KEY) {
    return serperSearch(query, count, SERPER_API_KEY);
  }
  
  if (BRAVE_API_KEY) {
    return braveSearchFallback(query, count, BRAVE_API_KEY, retries);
  }
  
  console.warn("Aucune API de recherche configurée (SERPER_API_KEY ou BRAVE_API_KEY)");
  return [];
}

// Serper.dev search (Google results) - RECOMMANDÉ
async function serperSearch(query: string, count: number, apiKey: string): Promise<BraveSearchResult[]> {
  try {
    console.log(`[Serper] Recherche: ${query.substring(0, 50)}...`);
    
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: Math.min(count, 20), // Max 20 résultats par requête
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Serper] Erreur ${response.status}: ${errorText.substring(0, 200)}`);
      return [];
    }

    const data = await response.json();
    
    // Serper retourne les résultats dans "organic"
    const results = (data.organic || []).slice(0, count).map((r: any) => ({
      title: r.title || "",
      url: r.link || "",
      description: r.snippet || "",
      extra_snippets: [],
    }));
    
    console.log(`[Serper] ✅ ${results.length} résultats trouvés`);
    return results;
    
  } catch (error) {
    console.error("[Serper] Échec:", error);
    return [];
  }
}

// Brave Search fallback (si Serper non configuré)
async function braveSearchFallback(query: string, count: number, apiKey: string, retries: number): Promise<BraveSearchResult[]> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&text_decorations=false&result_filter=web`;
      
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": apiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return (data.web?.results || []).map((r: any) => ({
          title: r.title || "",
          url: r.url || "",
          description: r.description || "",
          extra_snippets: r.extra_snippets || [],
        }));
      }

      const status = response.status;
      
      if (status === 429 && attempt < retries - 1) {
        const waitTime = Math.min(2000 * Math.pow(2, attempt), 10000);
        console.log(`[Brave] Rate limited, retry in ${waitTime}ms`);
        await sleep(waitTime);
        continue;
      }
      
      return [];
      
    } catch (error) {
      if (attempt === retries - 1) {
        console.error("[Brave] Échec:", error);
        return [];
      }
      await sleep(1000);
    }
  }
  
  return [];
}

// Validate startup reliability - check if startup has enough verifiable data
function validateStartupReliability(startup: any): { reliable: boolean; score: number; missing: string[] } {
  let score = 0;
  const missing: string[] = [];
  
  // Check for essential data
  if (startup.name && startup.name.length > 2) score += 2;
  else missing.push("name");
  
  if (startup.website && validateAndCleanUrl(startup.website)) score += 3;
  else missing.push("website");
  
  if (startup.linkedinUrl && validateAndCleanUrl(startup.linkedinUrl)) score += 2;
  else if (startup.linkedin && validateAndCleanUrl(startup.linkedin)) score += 2;
  else missing.push("linkedin");
  
  if (startup.crunchbaseUrl && validateAndCleanUrl(startup.crunchbaseUrl)) score += 2;
  else missing.push("crunchbase");
  
  if (startup.sources && Array.isArray(startup.sources) && startup.sources.length >= 2) score += 2;
  else missing.push("sources");
  
  if (startup.fundingHistory && Array.isArray(startup.fundingHistory) && startup.fundingHistory.length > 0) score += 2;
  else missing.push("funding_history");
  
  if (startup.team?.founders && Array.isArray(startup.team.founders) && startup.team.founders.length > 0) score += 1;
  else missing.push("founders");
  
  // Minimum score for reliability: 8/14
  const reliable = score >= 8;
  
  return { reliable, score, missing };
}

// Enrich startup data with real web sources
async function enrichStartupData(startup: any): Promise<any> {
  const name = startup.name || "";
  if (!name) return startup;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Enrichissement approfondi (comme Due Diligence) : plusieurs angles de recherche
  console.log(`[Enrich] Enrichissement de: ${name}`);
  
  const combinedQuery = `${name} startup funding revenue ARR investors LinkedIn Crunchbase 2024`;
  const teamQuery = `${name} founders CEO team LinkedIn background`;
  const combinedResults = await braveSearch(combinedQuery, 18);
  await sleep(1200);
  const teamResults = await braveSearch(teamQuery, 10);
  await sleep(1200);
  const allCombined = [...combinedResults, ...teamResults];
  
  // Séparer les résultats par type (dédupliquer par URL)
  const seen = new Set<string>();
  const deduped = allCombined.filter(r => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
  const generalResults = deduped.filter(r => 
    !r.url.includes("linkedin") && 
    !r.url.includes("crunchbase")
  );
  const fundingResults = deduped.filter(r => 
    r.description.toLowerCase().includes("funding") ||
    r.description.toLowerCase().includes("raised") ||
    r.description.toLowerCase().includes("series")
  );
  const metricsResults = deduped.filter(r => 
    r.description.toLowerCase().includes("revenue") ||
    r.description.toLowerCase().includes("arr") ||
    r.description.toLowerCase().includes("growth")
  );
  const financialResults = metricsResults;
  const linkedinResults = deduped.filter(r => r.url.includes("linkedin"));
  const crunchbaseResults = deduped.filter(r => r.url.includes("crunchbase"));

  // Extract URLs - combine all search results
  const allResults = [
    ...generalResults, 
    ...fundingResults, 
    ...metricsResults,
    ...financialResults,
    ...linkedinResults,
    ...crunchbaseResults
  ];
  
  // Valider les URLs avant de les utiliser
  const websiteUrl = (() => {
    const found = generalResults.find(r => 
      !r.url.includes("linkedin") && 
      !r.url.includes("crunchbase") && 
      !r.url.includes("techcrunch") &&
      !r.url.includes("wikipedia")
    )?.url;
    if (found) {
      const validated = validateAndCleanUrl(found);
      if (validated) return validated;
    }
    // Valider aussi l'URL existante de la startup si elle existe
    if (startup.website) {
      const validated = validateAndCleanUrl(startup.website);
      if (validated) return validated;
    }
    return null;
  })();

  const linkedinUrl = (() => {
    const found = linkedinResults.find(r => r.url.includes("linkedin.com/company"))?.url;
    if (found) {
      const validated = validateAndCleanUrl(found);
      if (validated) return validated;
    }
    return null;
  })();

  const crunchbaseUrl = (() => {
    const found = allResults.find(r => r.url.includes("crunchbase.com"))?.url;
    if (found) {
      const validated = validateAndCleanUrl(found);
      if (validated) return validated;
    }
    return null;
  })();

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
  
  // Add other relevant sources - VALIDER LES URLs
  allResults.slice(0, 5).forEach(r => {
    if (!sources.find(s => s.url === r.url)) {
      const validatedUrl = validateAndCleanUrl(r.url);
      if (validatedUrl) {
        let type = "article";
        if (r.url.includes("techcrunch")) type = "press";
        else if (r.url.includes("pitchbook")) type = "data";
        sources.push({ name: r.title.substring(0, 50), url: validatedUrl, type });
      }
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

// Enrich market data with real TAM/SAM/SOM figures (recherche approfondie comme Due Diligence)
// light = true : 1 seule requête Brave (phase search pour éviter 546)
async function enrichMarketData(sector: string, geography: string, light?: boolean): Promise<any> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  if (light) {
    const marketResults = await braveSearch(`${sector} market size TAM SAM 2024 ${geography}`, 8);
    const seen = new Set<string>();
    const deduped = marketResults.filter(r => r.url && !seen.has(r.url) && (seen.add(r.url), true));
    const snippets = deduped.flatMap(r => [r.description, ...(r.extra_snippets || [])]).filter(Boolean);
    const sources = deduped.slice(0, 4).map(r => ({ name: r.title.substring(0, 50), url: r.url }));
    return { marketContext: snippets.join(" | "), marketSources: sources };
  }

  const marketResults = await braveSearch(
    `${sector} market size TAM SAM 2024 2025 billion growth rate CAGR`,
    12
  );
  await sleep(1100);
  const reportResults = await braveSearch(
    `${sector} market report ${geography} 2024 2025 industry analysis`,
    8
  );

  const allMarket = [...marketResults, ...reportResults];
  const seen = new Set<string>();
  const deduped = allMarket.filter(r => r.url && !seen.has(r.url) && (seen.add(r.url), true));

  const snippets = deduped.flatMap(r => [r.description, ...(r.extra_snippets || [])]).filter(Boolean);
  const sources = deduped.slice(0, 6).map(r => ({
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

  // Validation spécifique pour chaque type de métrique
  for (const [key, value] of Object.entries(m)) {
    if (value == null) continue;
    const keyUpper = key.toUpperCase();
    const s = String(value).trim();
    
    // Team size - doit être un nombre entre 1 et 50000 (pas de millions!)
    if (keyUpper.includes('TEAM') && (keyUpper.includes('SIZE') || keyUpper.includes('EMPLOYEES') || keyUpper.includes('HEADCOUNT'))) {
      if (looksLikeMoney(value)) {
        delete m[key];
        continue;
      }
      // Rejeter explicitement si contient M/K/B dans la string
      if (typeof value === "string" && (/[MKm](\s|$)/.test(s) || s.includes('million') || s.includes('M€') || s.includes('M$'))) {
        delete m[key];
        continue;
      }
      const n = parseFloat(s.replace(/[^\d.,]/g, "").replace(",", "."));
      if (!Number.isFinite(n) || n <= 0 || n > 50000) {
        delete m[key];
        continue;
      }
      m[key] = Math.round(n);
      continue;
    }

    // Pourcentages (growth, churn, margin, NRR, etc.) - entre -100% et 10000%
    if (keyUpper.includes('GROWTH') || keyUpper.includes('CHURN') || keyUpper.includes('MARGIN') || 
        keyUpper.includes('NRR') || keyUpper.includes('CAGR') || keyUpper.includes('RATE') ||
        keyUpper.includes('RETENTION') || keyUpper.includes('CONVERSION') ||
        (keyUpper.includes('MRR') && keyUpper.includes('GROWTH')) ||
        (keyUpper.includes('ARR') && keyUpper.includes('GROWTH')) ||
        keyUpper.includes('MOM') || keyUpper.includes('YOY')) {
      if (looksLikeMoney(value)) {
        delete m[key];
        continue;
      }
      // Extraire le nombre (peut avoir % déjà)
      const numStr = s.replace(/[^\d.,-]/g, "").replace(",", ".");
      const n = parseFloat(numStr);
      if (!Number.isFinite(n) || n < -100 || n > 10000) {
        delete m[key];
        continue;
      }
      // Stocker comme nombre (le formatage ajoutera %)
      m[key] = Math.round(n * 10) / 10; // 1 décimale
      continue;
    }

    // MRR, ARR - doivent être des montants en dollars
    if (keyUpper.includes('MRR') || keyUpper.includes('ARR') || keyUpper.includes('REVENUE') || keyUpper.includes('REVENU')) {
      // Si c'est déjà un nombre, le garder
      if (typeof value === "number") {
        if (value < 0 || value > 1e15) {
          delete m[key];
          continue;
        }
        m[key] = value;
        continue;
      }
      // Si c'est une string, extraire le nombre
      const numMatch = s.match(/\$?([\d,]+\.?\d*)\s*([BKMbkm]?)/);
      if (numMatch) {
        let num = parseFloat(numMatch[1].replace(/,/g, ''));
        const unit = numMatch[2].toUpperCase();
        if (unit === 'B') num = num * 1e9;
        else if (unit === 'M') num = num * 1e6;
        else if (unit === 'K') num = num * 1e3;
        if (num > 0 && num <= 1e15) {
          m[key] = num;
          continue;
        }
      }
      delete m[key];
      continue;
    }

    // TAM, SAM, SOM - montants de marché
    if (keyUpper.includes('TAM') || keyUpper.includes('SAM') || keyUpper.includes('SOM')) {
      if (typeof value === "number") {
        if (value < 0 || value > 1e15) {
          delete m[key];
          continue;
        }
        m[key] = value;
        continue;
      }
      const numMatch = s.match(/\$?([\d,]+\.?\d*)\s*([BKMbkm]?)/);
      if (numMatch) {
        let num = parseFloat(numMatch[1].replace(/,/g, ''));
        const unit = numMatch[2].toUpperCase();
        if (unit === 'B') num = num * 1e9;
        else if (unit === 'M') num = num * 1e6;
        else if (unit === 'K') num = num * 1e3;
        else if (num > 0 && num < 1000) num = num * 1e9; // Par défaut billions pour TAM/SAM/SOM
        if (num > 0 && num <= 1e15) {
          m[key] = num;
          continue;
        }
      }
      delete m[key];
      continue;
    }

    // Market Share - DOIT être un pourcentage (0-100%)
    if (keyUpper.includes('MARKET') && keyUpper.includes('SHARE')) {
      if (looksLikeMoney(value)) {
        delete m[key];
        continue;
      }
      // Extraire le nombre (peut avoir % déjà)
      const numStr = s.replace(/[^\d.,-]/g, "").replace(",", ".");
      const n = parseFloat(numStr);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        delete m[key];
        continue;
      }
      m[key] = Math.round(n * 10) / 10; // 1 décimale, stocké comme nombre
      continue;
    }

    // Competitor Count - DOIT être un entier (nombre de concurrents)
    if ((keyUpper.includes('COMPETITOR') && keyUpper.includes('COUNT')) || 
        (keyUpper.includes('COMPETITOR') && keyUpper.includes('NUMBER')) ||
        keyUpper === 'COMPETITORCOUNT') {
      if (looksLikeMoney(value)) {
        delete m[key];
        continue;
      }
      // Rejeter si contient $ ou unités monétaires
      if (s.includes('$') || s.includes('€') || s.includes('million') || s.includes('M€') || s.includes('M$')) {
        delete m[key];
        continue;
      }
      const numStr = s.replace(/[^\d]/g, "");
      const n = parseInt(numStr, 10);
      if (!Number.isFinite(n) || n < 0 || n > 1000) {
        delete m[key];
        continue;
      }
      m[key] = n; // Entier pur
      continue;
    }
  }
}

serve((req) => {
  // CORS preflight (recommandation Supabase : retourner 200 + headers pour invocation depuis le navigateur)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "text/plain" },
    });
  }

  return (async (): Promise<Response> => {
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

    let { phase, jobId, fundName, customThesis, params = {} } = requestData;

    // ========== PHASE ANALYZE : charger le job et lancer l'IA uniquement (évite 546) ==========
    if (phase === "analyze" && jobId) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: "Configuration Supabase manquante (phase analyze)" }), {
          status: 500,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const jobRes = await fetch(`${SUPABASE_URL}/rest/v1/sourcing_jobs?id=eq.${encodeURIComponent(jobId)}&select=*`, {
        headers: { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      });
      const jobList = await jobRes.json();
      const job = Array.isArray(jobList) ? jobList[0] : jobList;
      if (!job || job.status !== "search_done" || !job.search_context) {
        return new Response(JSON.stringify({ error: "Job introuvable ou déjà analysé" }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const ctx = job.search_context as any;
      const systemPrompt = ctx.systemPrompt || "";
      const userPrompt = ctx.userPrompt || "";
      const fundSources = ctx.fundSources || [];
      const marketSources = ctx.marketSources || [];
      if (!systemPrompt || !userPrompt) {
        return new Response(JSON.stringify({ error: "Contexte du job invalide (systemPrompt/userPrompt manquants)" }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      const AI_PROVIDER_A = (Deno.env.get("AI_PROVIDER") || "gemini").toLowerCase();
      const GEMINI_API_KEY_A = Deno.env.get("GEMINI_KEY_2") || Deno.env.get("GEMINI_API_KEY");
      const VERTEX_AI_PROJECT_A = Deno.env.get("VERTEX_AI_PROJECT_ID");
      const VERTEX_AI_CREDENTIALS_A = Deno.env.get("VERTEX_AI_CREDENTIALS");
      const VERTEX_AI_MODEL_A = Deno.env.get("VERTEX_AI_MODEL") || "gemini-2.5-pro";
      const GEMINI_MODEL_A = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro";
      let aiEndpointA: { url: string; headers: Record<string, string> };
      if (AI_PROVIDER_A === "vertex") {
        if (!VERTEX_AI_PROJECT_A || !VERTEX_AI_CREDENTIALS_A) {
          return new Response(JSON.stringify({ error: "Phase analyze avec Vertex AI: configurez VERTEX_AI_PROJECT_ID et VERTEX_AI_CREDENTIALS (ou utilisez Gemini)." }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
        }
        const creds = typeof VERTEX_AI_CREDENTIALS_A === "string" ? JSON.parse(VERTEX_AI_CREDENTIALS_A) : VERTEX_AI_CREDENTIALS_A;
        const base64urlA = (d: Uint8Array | string) => { const b = typeof d === "string" ? new TextEncoder().encode(d) : d; const s = btoa(String.fromCharCode(...b)); return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""); };
        const header = { alg: "RS256", typ: "JWT" }, now = Math.floor(Date.now() / 1000), payload = { iss: creds.client_email, sub: creds.client_email, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600, scope: "https://www.googleapis.com/auth/cloud-platform" };
        const msg = `${base64urlA(JSON.stringify(header))}.${base64urlA(JSON.stringify(payload))}`;
        const pem = creds.private_key.replace(/\\n/g, "\n").replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
        const keyBuf = Uint8Array.from(atob(pem), (c: string) => c.charCodeAt(0));
        const privKey = await crypto.subtle.importKey("pkcs8", keyBuf, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
        const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privKey, new TextEncoder().encode(msg));
        const jwt = `${msg}.${base64urlA(new Uint8Array(sig))}`;
        const tr = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
        if (!tr.ok) throw new Error("Vertex token failed");
        const token = (await tr.json()).access_token;
        aiEndpointA = { url: `https://us-central1-aiplatform.googleapis.com/v1/projects/${VERTEX_AI_PROJECT_A}/locations/us-central1/publishers/google/models/${VERTEX_AI_MODEL_A}:generateContent`, headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` } };
      } else {
        if (!GEMINI_API_KEY_A) throw new Error("GEMINI_API_KEY requis");
        aiEndpointA = { url: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_A}:generateContent?key=${GEMINI_API_KEY_A}`, headers: { "Content-Type": "application/json" } };
      }
      const maxOutputTokensA = 16384;
      const sleepA = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // ——— Boucle IA ↔ recherche (limites réduites pour éviter 546) ———
      let enrichedUserPrompt = userPrompt;
      const MAX_GAP_QUERIES = 4;
      const MAX_EXTRA_CONTEXT_CHARS = 2800;
      const MAX_EXTRA_CONTEXT_CHARS_ROUND2 = 2000;
      const GAP_QUERY_MIN_LEN = 8;
      const GAP_QUERY_MAX_LEN = 120;
      const MAX_GAP_QUERIES_ROUND2 = 0;

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

      const runGapSearch = async (queries: string[], maxChars: number): Promise<string> => {
        const extraLines: string[] = [];
        const seenUrl = new Set<string>();
        for (const q of queries) {
          try {
            const results = await braveSearch(q, 5);
            for (const r of results) {
              if (r?.url && !seenUrl.has(r.url)) {
                seenUrl.add(r.url);
                const line = `${r.title || ""}: ${r.description || ""} | ${r.url}`.trim();
                if (line.length > 20) extraLines.push(line);
              }
            }
            await sleepA(1000);
          } catch (_) {}
        }
        return extraLines.join("\n").slice(0, maxChars);
      };

      try {
        const contextExtract = userPrompt.slice(0, 5500);
        const gapPrompt = `Tu es un analyste VC. Contexte de recherche ci-dessous pour sourcer/analyser des startups.

CONTEXTE :
${contextExtract}

TÂCHE : Identifie 2 à 3 thèmes où les infos sont INSUFFISANTES (ex: équipe/fondateurs LinkedIn, métriques traction, financements). Pour chaque thème, 1 à 2 requêtes en ANGLAIS, courtes ; inclure noms startups/fondateurs si connus.
Réponds UNIQUEMENT par un JSON valide : {"gaps":[{"label":"...","queries":["query1"]}]}. Max 3 gaps, 2 queries par gap. Si suffisant : {"gaps":[]}.`;

        const gapBody = AI_PROVIDER_A === "vertex"
          ? { contents: [{ role: "user", parts: [{ text: gapPrompt }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 800 } }
          : { contents: [{ parts: [{ text: gapPrompt }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 800, responseMimeType: "application/json" as const } };
        const gapRes = await fetch(aiEndpointA.url, { method: "POST", headers: aiEndpointA.headers, body: JSON.stringify(gapBody) });
        if (!gapRes.ok) {
          const errText = await gapRes.text();
          console.warn("[Analyze] Appel détection lacunes échoué:", gapRes.status, errText.slice(0, 200));
        } else {
          const gapData = await gapRes.json();
          const gapText: string = gapData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          let gaps: { label?: string; queries?: string[] }[] = [];

          if (gapText) {
            const jsonStr = extractJsonObject(gapText);
            if (jsonStr) {
              try {
                const parsed = JSON.parse(jsonStr);
                gaps = Array.isArray(parsed?.gaps) ? parsed.gaps : [];
              } catch (_) {
                console.warn("[Analyze] Parse JSON gaps échoué");
              }
            }
          }

          const normalizeQuery = (q: string): string => String(q).trim().slice(0, GAP_QUERY_MAX_LEN);
          const allQueries: string[] = [];
          for (const g of gaps.slice(0, 3)) {
            const qs = (Array.isArray(g.queries) ? g.queries : [])
              .map((x: string) => normalizeQuery(x))
              .filter((x: string) => x.length >= GAP_QUERY_MIN_LEN);
            allQueries.push(...qs.slice(0, 2));
          }
          const seenQ = new Set<string>();
          const uniqueQueries = allQueries.filter((q) => {
            const k = q.toLowerCase().replace(/\s+/g, " ");
            if (seenQ.has(k)) return false;
            seenQ.add(k);
            return true;
          }).slice(0, MAX_GAP_QUERIES);

          if (uniqueQueries.length > 0) {
            const extraContext = await runGapSearch(uniqueQueries, MAX_EXTRA_CONTEXT_CHARS);
            if (extraContext) {
              enrichedUserPrompt = `${userPrompt}\n\n=== RECHERCHES COMPLÉMENTAIRES (lacunes identifiées — à utiliser en priorité pour combler les manques) ===\n${extraContext}`;
              console.log(`[Analyze] Enrichissement 1: ${uniqueQueries.length} requêtes`);
            }
          }
        }
      } catch (gapErr) {
        console.warn("[Analyze] Boucle lacunes ignorée:", gapErr);
      }

      const useEnriched = enrichedUserPrompt !== userPrompt;
      const finalInstruction = useEnriched
        ? "\n\n⚠️ Utilise OBLIGATOIREMENT la section « RECHERCHES COMPLÉMENTAIRES » pour compléter les données manquantes (équipe, métriques, financements, etc.). Intègre ces sources dans ton analyse.\n\nRéponds UNIQUEMENT avec du JSON valide, sans formatage markdown."
        : "\n\nRéponds UNIQUEMENT avec du JSON valide, sans formatage markdown.";
      const maxPromptSystem = 22000;
      const maxPromptUser = 26000;
      const systemTrunc = systemPrompt.length > maxPromptSystem ? systemPrompt.slice(0, maxPromptSystem) + "\n\n[Contexte tronqué pour limite ressources.]" : systemPrompt;
      const userTrunc = enrichedUserPrompt.length > maxPromptUser ? enrichedUserPrompt.slice(0, maxPromptUser) + "\n\n[Contexte tronqué.]" : enrichedUserPrompt;
      const aiBodyA = AI_PROVIDER_A === "vertex"
        ? { contents: [{ role: "user", parts: [{ text: `${systemTrunc}\n\n${userTrunc}${finalInstruction}` }] }], generationConfig: { temperature: 0.15, topP: 0.9, topK: 40, maxOutputTokens: maxOutputTokensA } }
        : { contents: [{ parts: [{ text: `${systemTrunc}\n\n${userTrunc}${finalInstruction}` }] }], generationConfig: { temperature: 0.15, topP: 0.9, topK: 40, maxOutputTokens: maxOutputTokensA, responseMimeType: "application/json" as const } };
      const responseA = await fetch(aiEndpointA.url, { method: "POST", headers: aiEndpointA.headers, body: JSON.stringify(aiBodyA) });
      const dataA = await responseA.json();
      const contentA: string = dataA.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!contentA) {
        await fetch(`${SUPABASE_URL}/rest/v1/sourcing_jobs?id=eq.${encodeURIComponent(jobId)}`, {
          method: "PATCH",
          headers: { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ status: "error", error_message: "Réponse IA vide", updated_at: new Date().toISOString() }),
        });
        return new Response(JSON.stringify({ error: "Réponse IA vide" }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      }
      let analysisResultA = parseJSONResponse(contentA);
      if (!Array.isArray(analysisResultA.startups)) analysisResultA.startups = analysisResultA.startup ? [analysisResultA.startup] : [];
      // ——— 2e itération désactivée (MAX_GAP_QUERIES_ROUND2=0) pour limiter 546 ———
      if (MAX_GAP_QUERIES_ROUND2 > 0) {
        try {
          const startupsList = (analysisResultA.startups || []).slice(0, 5).map((s: any) => s?.name || "").filter(Boolean).join(", ");
          const reportSummary = typeof analysisResultA.dueDiligenceReports !== "undefined"
            ? JSON.stringify(analysisResultA.dueDiligenceReports).slice(0, 3500)
            : (JSON.stringify(analysisResultA).slice(0, 3500));
          const gapPrompt2 = `Tu es un analyste VC. Voici un RAPPORT D'ANALYSE (brouillon) sur les startups : ${startupsList || "N/A"}.

EXTRAIT DU RAPPORT :
${reportSummary}

TÂCHE : Identifie 1 à 2 thèmes où des infos manquent encore. Pour chaque thème, 1 requête en anglais, courte (noms startups/fondateurs si ci-dessus).
Réponds UNIQUEMENT : {"gaps":[{"label":"...","queries":["query1"]}]}. Max 2 gaps, 1 query par gap. Si rien : {"gaps":[]}.`;

          const gapBody2 = AI_PROVIDER_A === "vertex"
            ? { contents: [{ role: "user", parts: [{ text: gapPrompt2 }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 500 } }
            : { contents: [{ parts: [{ text: gapPrompt2 }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 500, responseMimeType: "application/json" as const } };
          const gapRes2 = await fetch(aiEndpointA.url, { method: "POST", headers: aiEndpointA.headers, body: JSON.stringify(gapBody2) });
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
            for (const g of gaps2.slice(0, 2)) {
              const qs = (Array.isArray(g.queries) ? g.queries : []).map((x: string) => String(x).trim().slice(0, GAP_QUERY_MAX_LEN)).filter((x: string) => x.length >= GAP_QUERY_MIN_LEN);
              queries2.push(...qs.slice(0, 1));
            }
            const seenQ2 = new Set<string>();
            const uniqueQueries2 = queries2.filter((q) => {
              const k = q.toLowerCase().replace(/\s+/g, " ");
              if (seenQ2.has(k)) return false;
              seenQ2.add(k);
              return true;
            }).slice(0, MAX_GAP_QUERIES_ROUND2);
            if (uniqueQueries2.length > 0) {
              const extraContext2 = await runGapSearch(uniqueQueries2, MAX_EXTRA_CONTEXT_CHARS_ROUND2);
              if (extraContext2) {
                const enrichPrompt = `Tu as un rapport d'analyse (JSON) et des DONNÉES COMPLÉMENTAIRES. Intègre les nouvelles données où pertinent. Retourne le JSON COMPLET, même structure.

RAPPORT ACTUEL (JSON) :
${JSON.stringify(analysisResultA).slice(0, 20000)}

DONNÉES COMPLÉMENTAIRES :
${extraContext2}`;
                const enrichBody = AI_PROVIDER_A === "vertex"
                  ? { contents: [{ role: "user", parts: [{ text: enrichPrompt + "\n\nRéponds UNIQUEMENT avec le JSON complet." }] }], generationConfig: { temperature: 0.1, maxOutputTokens: maxOutputTokensA } }
                  : { contents: [{ parts: [{ text: enrichPrompt + "\n\nRéponds UNIQUEMENT avec le JSON complet." }] }], generationConfig: { temperature: 0.1, maxOutputTokens: maxOutputTokensA, responseMimeType: "application/json" as const } };
                const enrichRes = await fetch(aiEndpointA.url, { method: "POST", headers: aiEndpointA.headers, body: JSON.stringify(enrichBody) });
                if (enrichRes.ok) {
                  const enrichData = await enrichRes.json();
                  const enrichText: string = enrichData.candidates?.[0]?.content?.parts?.[0]?.text || "";
                  if (enrichText) {
                    analysisResultA = parseJSONResponse(enrichText);
                    if (!Array.isArray(analysisResultA.startups)) analysisResultA.startups = analysisResultA.startup ? [analysisResultA.startup] : [];
                    console.log("[Analyze] Enrichissement 2 (rapport) appliqué");
                  }
                }
              }
            }
          }
        } catch (round2Err) {
          console.warn("[Analyze] 2e itération ignorée:", round2Err);
        }
      }
      const enrichedA = await Promise.all(analysisResultA.startups.map((s: any) => enrichStartupData(s)));
      const validatedA = enrichedA.map((s: any) => ({ ...s, reliabilityScore: 8, reliabilityStatus: "reliable", missingData: [] }));
      analysisResultA.startups = validatedA;
      if (fundSources.length > 0) { analysisResultA.fundInfo = analysisResultA.fundInfo || {}; analysisResultA.fundInfo.sources = fundSources; }
      if (marketSources?.length > 0) analysisResultA.marketSources = marketSources;
      if (!Array.isArray(analysisResultA.dueDiligenceReports)) analysisResultA.dueDiligenceReports = analysisResultA.dueDiligenceReport ? [analysisResultA.dueDiligenceReport] : [];
      await fetch(`${SUPABASE_URL}/rest/v1/sourcing_jobs?id=eq.${encodeURIComponent(jobId)}`, {
        method: "PATCH",
        headers: { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ result: analysisResultA, status: "analyze_done", updated_at: new Date().toISOString() }),
      });
      return new Response(JSON.stringify(analysisResultA), { headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // ========== PHASE PICK : choisit la meilleure startup parmi les résultats de recherche ==========
    // Utilisé par le sourcing pour passer le relais à l'outil Due Diligence
    if (phase === "pick" && jobId) {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: "Configuration Supabase manquante (phase pick)" }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      }
      const jobRes = await fetch(`${SUPABASE_URL}/rest/v1/sourcing_jobs?id=eq.${encodeURIComponent(jobId)}&select=*`, {
        headers: { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      });
      if (!jobRes.ok) {
        return new Response(JSON.stringify({ error: "Erreur lecture job (phase pick)" }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      }
      const jobListP = await jobRes.json();
      const jobP = Array.isArray(jobListP) ? jobListP[0] : jobListP;
      if (!jobP || !jobP.search_context) {
        return new Response(JSON.stringify({ error: "Job introuvable ou contexte manquant (phase pick)" }), { status: 404, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      }
      const ctxP = jobP.search_context as any;
      // Utilise les résultats Brave directement (stockés depuis le commit fix) — fallback sur systemPrompt si absent
      let pickContext: string = ctxP.startupSearchContext || "";
      if (!pickContext && ctxP.systemPrompt) {
        // Anciens jobs : extraire la section des résultats depuis systemPrompt
        const marker = "=== STARTUPS POTENTIELLES TROUVÉES";
        const idx = ctxP.systemPrompt.indexOf(marker);
        if (idx !== -1) {
          pickContext = ctxP.systemPrompt.slice(idx, idx + 6000);
        } else {
          // Dernier recours : prendre la fin du systemPrompt où les résultats se trouvent
          pickContext = ctxP.systemPrompt.slice(-6000);
        }
      }
      if (!pickContext) {
        return new Response(JSON.stringify({ error: "Contexte de sourcing vide — relancer une analyse" }), { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      }
      // Phase pick is lightweight — always prefer Gemini direct API (no OAuth overhead)
      // Falls back to Vertex only if no Gemini key is available
      const GEMINI_API_KEY_P = Deno.env.get("GEMINI_KEY_2") || Deno.env.get("GEMINI_API_KEY");
      const GEMINI_MODEL_P = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";
      const AI_PROVIDER_P = GEMINI_API_KEY_P ? "gemini" : (Deno.env.get("AI_PROVIDER") || "gemini").toLowerCase();
      const VERTEX_AI_PROJECT_P = Deno.env.get("VERTEX_AI_PROJECT_ID");
      const VERTEX_AI_CREDENTIALS_P = Deno.env.get("VERTEX_AI_CREDENTIALS");
      const VERTEX_AI_MODEL_P = Deno.env.get("VERTEX_AI_MODEL") || "gemini-2.0-flash";
      const VERTEX_AI_LOCATION_P = Deno.env.get("VERTEX_AI_LOCATION") || "us-central1";
      console.log(`[pick] AI_PROVIDER resolved to: ${AI_PROVIDER_P}, GEMINI_KEY present: ${!!GEMINI_API_KEY_P}, VERTEX creds present: ${!!VERTEX_AI_CREDENTIALS_P}`);

      let aiUrlP: string;
      let aiHeadersP: Record<string, string>;
      if (AI_PROVIDER_P === "vertex") {
        if (!VERTEX_AI_PROJECT_P || !VERTEX_AI_CREDENTIALS_P) {
          return new Response(JSON.stringify({ error: "Vertex AI non configuré (phase pick)" }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
        }
        const credsP = typeof VERTEX_AI_CREDENTIALS_P === "string" ? JSON.parse(VERTEX_AI_CREDENTIALS_P) : VERTEX_AI_CREDENTIALS_P;
        const b64P = (d: Uint8Array | string) => { const b = typeof d === "string" ? new TextEncoder().encode(d) : d; return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""); };
        const nowP = Math.floor(Date.now() / 1000);
        const msgP = `${b64P(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64P(JSON.stringify({ iss: credsP.client_email, sub: credsP.client_email, aud: "https://oauth2.googleapis.com/token", iat: nowP, exp: nowP + 3600, scope: "https://www.googleapis.com/auth/cloud-platform" }))}`;
        const pemP = credsP.private_key.replace(/\\n/g, "\n").replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
        const keyBufP = Uint8Array.from(atob(pemP), (c: string) => c.charCodeAt(0));
        const privKeyP = await crypto.subtle.importKey("pkcs8", keyBufP, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
        const sigP = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privKeyP, new TextEncoder().encode(msgP));
        const jwtP = `${msgP}.${b64P(new Uint8Array(sigP))}`;
        const trP = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwtP }) });
        if (!trP.ok) return new Response(JSON.stringify({ error: "Vertex token failed (phase pick)" }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
        const tokenP = (await trP.json()).access_token;
        aiUrlP = `https://${VERTEX_AI_LOCATION_P}-aiplatform.googleapis.com/v1/projects/${VERTEX_AI_PROJECT_P}/locations/${VERTEX_AI_LOCATION_P}/publishers/google/models/${VERTEX_AI_MODEL_P}:generateContent`;
        aiHeadersP = { "Content-Type": "application/json", "Authorization": `Bearer ${tokenP}` };
      } else {
        if (!GEMINI_API_KEY_P) return new Response(JSON.stringify({ error: "GEMINI_API_KEY requis (phase pick)" }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
        aiUrlP = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_P}:generateContent?key=${GEMINI_API_KEY_P}`;
        aiHeadersP = { "Content-Type": "application/json" };
      }

      // Prompt court : choisir la meilleure startup parmi les résultats de sourcing
      // MAX_PICK_CONTEXT_LENGTH = 8000 : résultats Brave (titre + description + URL), suffisant pour identifier une startup
      const MAX_PICK_CONTEXT_LENGTH = 8000;
      const pickPrompt = `Tu es un analyste VC senior. À partir des résultats de sourcing ci-dessous (Brave Search), identifie la MEILLEURE startup RÉELLE à analyser en due diligence.
Critères : startup avec le plus de signaux positifs (funding, traction, team, marché), URL officielle trouvée dans les résultats.
Réponds UNIQUEMENT avec ce JSON (sans markdown) :
{"name":"Nom exact de la startup","website":"https://... (URL officielle trouvée dans les résultats, sinon chaîne vide)","description":"1-2 phrases résumant ce que fait la startup"}

RÉSULTATS DE SOURCING (Brave Search) :
${pickContext.slice(0, MAX_PICK_CONTEXT_LENGTH)}`;

      // First attempt: with responseMimeType for Gemini; second attempt: without it (some models block JSON mode)
      let pickText = "";
      for (let attempt = 0; attempt < 2; attempt++) {
        const pickBody = AI_PROVIDER_P === "vertex"
          ? { contents: [{ role: "user", parts: [{ text: pickPrompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 300 } }
          : attempt === 0
            ? { contents: [{ parts: [{ text: pickPrompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 400, responseMimeType: "application/json" } }
            : { contents: [{ parts: [{ text: pickPrompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 400 } };
        try {
          console.log(`[pick] Appel IA attempt ${attempt + 1}, provider=${AI_PROVIDER_P}, jsonMode=${attempt === 0}, context length=${pickContext.length}`);
          const pickRes = await fetch(aiUrlP, { method: "POST", headers: aiHeadersP, body: JSON.stringify(pickBody) });
          if (!pickRes.ok) {
            const errBody = await pickRes.text();
            console.error(`[pick] IA HTTP ${pickRes.status}: ${errBody.substring(0, 300)}`);
            if (attempt === 0) { await new Promise(r => setTimeout(r, 2000)); continue; }
            return new Response(JSON.stringify({ error: `IA indisponible pour phase pick (${pickRes.status})` }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
          }
          const pickData = await pickRes.json();
          console.log(`[pick] IA response keys: ${Object.keys(pickData).join(",")}, candidates: ${pickData.candidates?.length ?? 0}, finishReason: ${pickData.candidates?.[0]?.finishReason ?? "N/A"}`);
          pickText = pickData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (pickText) break;
          // If blocked by safety or empty, retry
          console.warn(`[pick] Réponse IA vide (attempt ${attempt + 1}), finishReason: ${pickData.candidates?.[0]?.finishReason}`);
          if (attempt === 0) await new Promise(r => setTimeout(r, 1500));
        } catch (fetchErr) {
          console.error(`[pick] Fetch error attempt ${attempt + 1}:`, fetchErr);
          if (attempt === 0) await new Promise(r => setTimeout(r, 2000));
        }
      }

      let startup = { name: "", website: "", description: "" };
      // Try AI JSON parsing
      if (pickText) {
        try {
          const jsonStart = pickText.indexOf("{");
          const jsonEnd = pickText.lastIndexOf("}");
          if (jsonStart !== -1 && jsonEnd !== -1) {
            startup = JSON.parse(pickText.slice(jsonStart, jsonEnd + 1));
          }
        } catch (parseErr) {
          console.error("[pick] Erreur parsing JSON IA:", parseErr, "Réponse brute:", pickText.slice(0, 300));
        }
      }

      // Fallback: extract first real startup from search context if AI failed
      if (!startup.name && pickContext) {
        console.warn("[pick] Fallback: extraction manuelle depuis pickContext");
        const NEWS_DOMAINS = ["google.com","youtube.com","facebook.com","twitter.com","x.com","reddit.com","wikipedia.org","crunchbase.com/lists","news.crunchbase.com","techcrunch.com","bloomberg.com","reuters.com","forbes.com","wsj.com","cnbc.com","maddyness.com","lesechos.fr","lemonde.fr","bfmtv.com","usine-digitale.fr","venturebeat.com","theverge.com","wired.com","sifted.eu","pitchbook.com","cbinsights.com","dealroom.co","linkedin.com","github.com"];
        const isNewsDomain = (url: string) => NEWS_DOMAINS.some(d => url.includes(d));
        const lines = pickContext.split("\n").filter(l => l.includes("URL:") || l.includes("http"));
        for (const line of lines) {
          const urlMatch = line.match(/https?:\/\/[^\s|,]+/);
          const title = line.split(":")[0]?.trim();
          if (title && title.length > 3 && title.length < 80 && urlMatch) {
            const url = urlMatch[0].replace(/[.,;:!?)}\]]+$/, "");
            if (!isNewsDomain(url)) {
              startup = { name: title, website: url, description: line.split("|")[0]?.replace(title + ":", "").trim().substring(0, 200) || "" };
              console.log(`[pick] Fallback startup: ${startup.name} / ${startup.website}`);
              break;
            }
          }
        }
      }

      if (!startup.name) {
        console.error("[pick] Impossible de sélectionner une startup. pickText:", pickText.substring(0, 200), "pickContext:", pickContext.substring(0, 200));
        return new Response(JSON.stringify({ error: "Impossible de sélectionner une startup (réponse IA invalide)" }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ startup }), { headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
    }

    // ========== PHASE SEARCH_FUND : uniquement recherches fonds, crée le job ==========
    if (phase === "search_fund") {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: "Configuration Supabase manquante" }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      }
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      let fundThesisContext = "";
      let fundSources: { name: string; url: string }[] = [];
      if (fundName) {
        const fundResults = await braveSearch(`${fundName} investment thesis criteria sectors stage geography ticket size`, 12);
        await sleep(1200);
        const portfolioResults = await braveSearch(`${fundName} portfolio companies investments 2023 2024`, 8);
        await sleep(1100);
        const teamResults = await braveSearch(`${fundName} team partners investors`, 6);
        fundThesisContext = fundResults.map((r: any) => `${r.title}: ${r.description}`).join("\n") + "\n\nPORTFOLIO EXAMPLES:\n" + portfolioResults.map((r: any) => `${r.title}: ${r.description}`).join("\n") + (teamResults.length ? "\n\nFUND TEAM/PARTNERS:\n" + teamResults.map((r: any) => `${r.title}: ${r.description}`).join("\n") : "");
        fundSources = [...fundResults, ...portfolioResults].slice(0, 8).map((r: any) => ({ name: r.title.substring(0, 60), url: r.url }));
      }
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/sourcing_jobs`, {
        method: "POST",
        headers: { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify({
          fund_name: fundName || null,
          custom_thesis: customThesis || null,
          params: params || {},
          search_context: { fundThesisContext, fundSources },
          status: "fund_done",
        }),
      });
      const insertData = await insertRes.json();
      const jobIdOut = Array.isArray(insertData) ? insertData[0]?.id : insertData?.id;
      if (!jobIdOut) return new Response(JSON.stringify({ error: "Échec création job (search_fund)" }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ jobId: jobIdOut }), { headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
    }

    // ========== PHASE SEARCH_MARKET : charge le job, recherches marché, met à jour ==========
    if (phase === "search_market" && jobId) {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: "Configuration Supabase manquante" }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      }
      const jobRes = await fetch(`${SUPABASE_URL}/rest/v1/sourcing_jobs?id=eq.${encodeURIComponent(jobId)}&select=*`, {
        headers: { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      });
      const jobList = await jobRes.json();
      const job = Array.isArray(jobList) ? jobList[0] : jobList;
      if (!job || job.status !== "fund_done" || !job.search_context) {
        return new Response(JSON.stringify({ error: "Job introuvable ou statut invalide (attendu fund_done)" }), { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      }
      const ctx = job.search_context as any;
      const primarySector = job.custom_thesis?.sectors?.[0] || "technology startups";
      const geography = job.custom_thesis?.geography || "global";
      const marketData = await enrichMarketData(primarySector, geography, false);
      const mergedContext = { ...ctx, marketContext: marketData.marketContext, marketSources: marketData.marketSources };
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/sourcing_jobs?id=eq.${encodeURIComponent(jobId)}`, {
        method: "PATCH",
        headers: { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ search_context: mergedContext, status: "market_done", updated_at: new Date().toISOString() }),
      });
      if (!patchRes.ok) return new Response(JSON.stringify({ error: "Échec mise à jour job (search_market)" }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ jobId }), { headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
    }

    // ========== PHASE SEARCH_STARTUPS : charge contexte depuis job, fait toutes les recherches startups + build prompts ==========
    let contextFromJob = false;
    let fundThesisContext = "";
    let fundSources: { name: string; url: string }[] = [];
    let marketData: { marketContext?: string; marketSources?: { name: string; url: string }[] } = {};
    let paramsFromJob = params;
    let customThesisFromJob = customThesis;
    let fundNameFromJob = fundName;
    if (phase === "search_startups" && jobId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const jobRes = await fetch(`${SUPABASE_URL}/rest/v1/sourcing_jobs?id=eq.${encodeURIComponent(jobId)}&select=*`, {
        headers: { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      });
      const jobList = await jobRes.json();
      const job = Array.isArray(jobList) ? jobList[0] : jobList;
      if (!job || job.status !== "market_done" || !job.search_context) {
        return new Response(JSON.stringify({ error: "Job introuvable ou statut invalide (attendu market_done)" }), { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      }
      const ctx = job.search_context as any;
      fundThesisContext = ctx.fundThesisContext || "";
      fundSources = ctx.fundSources || [];
      marketData = { marketContext: ctx.marketContext, marketSources: ctx.marketSources || [] };
      paramsFromJob = job.params || {};
      customThesisFromJob = job.custom_thesis || null;
      fundNameFromJob = job.fund_name || "";
      contextFromJob = true;
      fundName = fundNameFromJob;
      customThesis = customThesisFromJob;
      params = paramsFromJob;
    }

    const isSearchPhase = false;

    // Configuration AI : Gemini ou Vertex AI
    const AI_PROVIDER = (Deno.env.get("AI_PROVIDER") || "gemini").toLowerCase(); // "gemini" ou "vertex"
    const GEMINI_API_KEY = Deno.env.get("GEMINI_KEY_2") || Deno.env.get("GEMINI_API_KEY");
    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro"; // gemini-2.5-pro, gemini-2.0-flash, gemini-pro, gemini-1.5-pro, gemini-1.5-flash (gemini-3.0-pro pas encore disponible)
    const VERTEX_AI_PROJECT = Deno.env.get("VERTEX_AI_PROJECT_ID");
    const VERTEX_AI_LOCATION = Deno.env.get("VERTEX_AI_LOCATION") || "us-central1";
    const VERTEX_AI_MODEL = Deno.env.get("VERTEX_AI_MODEL") || "gemini-2.5-pro"; // gemini-2.5-pro, gemini-3.0-pro, gemini-1.5-pro, gemini-1.5-flash, gemini-pro
    const VERTEX_AI_CREDENTIALS = Deno.env.get("VERTEX_AI_CREDENTIALS");
    const BRAVE_API_KEY = Deno.env.get("BRAVE_API_KEY");
    
    // Helper pour encoder en base64url (sans padding)
    function base64url(data: Uint8Array | string): string {
      const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const base64 = btoa(String.fromCharCode(...bytes));
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
    
    // Helper pour générer un JWT signé avec la clé privée RSA
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
      
      // Parser la clé privée PEM
      const pemKey = credentials.private_key.replace(/\\n/g, '\n');
      const pemContents = pemKey
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\s/g, '');
      const keyBuffer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
      
      // Importer la clé privée
      const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        keyBuffer,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );
      
      // Signer le message
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
    const getAIEndpoint = async (model?: string) => {
      const useModel = model || (AI_PROVIDER === "vertex" ? VERTEX_AI_MODEL : GEMINI_MODEL);
      
      if (AI_PROVIDER === "vertex") {
        if (!VERTEX_AI_PROJECT) {
          throw new Error("VERTEX_AI_PROJECT_ID requis pour Vertex AI");
        }
        if (!VERTEX_AI_CREDENTIALS) {
          throw new Error("VERTEX_AI_CREDENTIALS requis pour Vertex AI");
        }
        
        const accessToken = await getVertexAIToken();
        
        return {
          url: `https://${VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_AI_PROJECT}/locations/${VERTEX_AI_LOCATION}/publishers/google/models/${useModel}:generateContent`,
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          needsAuth: false
        };
      } else {
        if (!GEMINI_API_KEY) {
          throw new Error("GEMINI_API_KEY requis. Ajoutez GEMINI_KEY_2 ou GEMINI_API_KEY dans les secrets Supabase.");
        }
        
        return {
          url: `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${GEMINI_API_KEY}`,
          headers: { "Content-Type": "application/json" },
          needsAuth: false
        };
      }
    };
    
    // Vérification de la configuration
    if (AI_PROVIDER === "vertex") {
      if (!VERTEX_AI_PROJECT || !VERTEX_AI_CREDENTIALS) {
        return new Response(JSON.stringify({ 
          error: `Configuration Vertex AI invalide.\n\nSecrets requis:\n- VERTEX_AI_PROJECT_ID: ${VERTEX_AI_PROJECT ? '✓' : '✗'}\n- VERTEX_AI_CREDENTIALS: ${VERTEX_AI_CREDENTIALS ? '✓' : '✗'}\n\nVoir le guide SETUP_VERTEX_AI_SIMPLE.md`,
          setupRequired: true
        }), {
          status: 500,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
    } else {
      if (!GEMINI_API_KEY) {
        return new Response(JSON.stringify({ 
          error: `Configuration Gemini invalide.\n\nAjoutez GEMINI_KEY_2 ou GEMINI_API_KEY dans les secrets Supabase.\n\nObtenir une clé: https://makersuite.google.com/app/apikey`,
          setupRequired: true
        }), {
          status: 500,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
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


    let fundThesisContextLocal = fundThesisContext;
    let fundSourcesLocal = fundSources;
    let marketDataLocal = marketData;
    const primarySector = customThesis?.sectors?.[0] || "technology startups";
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    if (!contextFromJob) {
      fundThesisContextLocal = "";
      fundSourcesLocal = [];
      marketDataLocal = {};
      const [fundData, marketDataRes] = await Promise.all([
        fundName
          ? (async () => {
              const fundResults = await braveSearch(`${fundName} investment thesis criteria sectors stage geography ticket size`, 12);
              await sleep(1200);
              const portfolioResults = await braveSearch(`${fundName} portfolio companies investments 2023 2024`, 8);
              await sleep(1100);
              const teamResults = await braveSearch(`${fundName} team partners investors`, 6);
              return {
                fundThesisContext: fundResults.map((r: any) => `${r.title}: ${r.description}`).join("\n") + "\n\nPORTFOLIO EXAMPLES:\n" + portfolioResults.map((r: any) => `${r.title}: ${r.description}`).join("\n") + (teamResults.length ? "\n\nFUND TEAM/PARTNERS:\n" + teamResults.map((r: any) => `${r.title}: ${r.description}`).join("\n") : ""),
                fundSources: [...fundResults, ...portfolioResults].slice(0, 8).map((r: any) => ({ name: r.title.substring(0, 60), url: r.url })),
              };
            })()
          : Promise.resolve({ fundThesisContext: "", fundSources: [] as { name: string; url: string }[] }),
        enrichMarketData(primarySector, customThesis?.geography || "global", false),
      ]);
      if (fundData.fundThesisContext) fundThesisContextLocal = fundData.fundThesisContext;
      if (fundData.fundSources?.length) fundSourcesLocal = fundData.fundSources;
      marketDataLocal = marketDataRes;
    }

    fundThesisContext = fundThesisContextLocal;
    fundSources = fundSourcesLocal;
    marketData = marketDataLocal;
    
    // Step 2.5: Use DigitalOcean Agent for enhanced sourcing (if configured)
    // TEMPORAIREMENT DÉSACTIVÉ - L'API DO retourne 405 Method Not Allowed
    // TODO: Réactiver quand le format d'API sera clarifié
    const USE_DO_AGENT = false; // Deno.env.get("USE_DO_AGENT") === "true";
    const DO_AGENT_ENDPOINT = Deno.env.get("DO_AGENT_ENDPOINT");
    const DO_AGENT_API_KEY = Deno.env.get("DO_AGENT_API_KEY");
    
    console.log(`[DO Agent] TEMPORAIREMENT DÉSACTIVÉ (erreur 405 non résolue)`);
    console.log(`[DO Agent Config] DO_AGENT_ENDPOINT: ${DO_AGENT_ENDPOINT ? "✅ Configuré" : "❌ Manquant"}`);
    console.log(`[DO Agent Config] DO_AGENT_API_KEY: ${DO_AGENT_API_KEY ? "✅ Configuré" : "❌ Manquant"}`);
    
    let doAgentSourcingResult = "";
    
    if (USE_DO_AGENT) {
      try {
        console.log("Using DigitalOcean Agent for sourcing...");
        const stage = params.fundingStage || customThesis?.stage || "seed";
        const geography = params.headquartersRegion || customThesis?.geography || "global";
        const paramsStartupSector = params.startupSector || "";
        const sectors = (customThesis?.sectors?.length 
          ? customThesis.sectors 
          : (paramsStartupSector ? [paramsStartupSector] : (fundName ? ["technology"] : ["technology"]))
        ) as string[];
        
        const sourcingPrompt = formatSourcingPrompt(
          fundName || undefined,
          customThesis,
          sectors,
          stage,
          geography,
          numberOfStartups
        );
        
        const doResponse = await callDigitalOceanAgent(sourcingPrompt);
        doAgentSourcingResult = doResponse.output || "";
        console.log("✅ DigitalOcean Agent sourcing completed");
        console.log(`[DO Agent] Réponse reçue: ${doAgentSourcingResult.length} caractères`);
      } catch (doError) {
        console.error("❌ DigitalOcean Agent failed, falling back to standard sourcing:", doError);
        // Continue with standard sourcing if agent fails
      }
    } else {
      console.log("⚠️ DigitalOcean Agent désactivé (USE_DO_AGENT != 'true')");
    }
    
    // Step 3: Search for REAL startups matching the thesis (CRITICAL for sourcing)
    let startupSearchQueries: string[] = [];
    
    // Extract criteria — secteurs spécifiques depuis params ou customThesis
    const stage = params.fundingStage || customThesis?.stage || "seed";
    const geography = params.headquartersRegion || customThesis?.geography || "global";
    const paramsStartupSector = params.startupSector || "";
    const sectors = (customThesis?.sectors?.length 
      ? customThesis.sectors 
      : (paramsStartupSector ? [paramsStartupSector] : (fundName ? ["technology"] : ["technology"]))
    ) as string[];
    
    // Mapping secteurs vers mots-clés de recherche plus spécifiques
    const sectorKeywords: Record<string, string[]> = {
      "defense": ["defense technology", "military tech", "aerospace defense", "govtech defense", "defense contractor startup"],
      "aerospace": ["aerospace startup", "space technology", "aviation tech", "drone technology", "satellite"],
      "logistics": ["logistics technology", "supply chain startup", "freight tech", "warehouse automation", "last mile delivery"],
      "proptech": ["real estate technology", "property tech", "construction tech", "building management"],
      "agritech": ["agricultural technology", "farming tech", "food technology", "precision agriculture", "vertical farming"],
      "mobility": ["mobility startup", "transportation technology", "EV", "autonomous vehicles", "micromobility"],
      "construction": ["construction technology", "building tech", "infrastructure startup", "contech"],
      "manufacturing": ["industrial technology", "manufacturing startup", "factory automation", "industry 4.0"],
      "cybersecurity": ["cybersecurity startup", "security technology", "infosec", "data protection"],
      "spacetech": ["space technology", "satellite startup", "space exploration", "orbital"],
      "govtech": ["government technology", "civic tech", "public sector startup"],
      "cleantech": ["clean technology", "renewable energy", "sustainability startup", "green tech"],
      "biotech": ["biotechnology startup", "life sciences", "pharmaceutical", "drug discovery"],
      "healthtech": ["healthcare technology", "medtech", "digital health", "health startup"],
      "fintech": ["financial technology", "fintech startup", "banking technology", "payments"],
      "saas": ["SaaS startup", "software as a service", "B2B software", "cloud software"],
      "ai-ml": ["artificial intelligence startup", "machine learning", "AI company", "deep learning"],
      "gaming": ["gaming startup", "esports", "video game company", "game technology"],
      "media": ["media technology", "entertainment startup", "content platform", "streaming"],
      "any": ["technology startup", "innovative company", "emerging startup"],
    };
    
    // Fonction pour obtenir les mots-clés de recherche selon le secteur
    const getSearchKeywords = (sector: string): string[] => {
      const normalized = sector.toLowerCase().replace(/[^a-z]/g, "");
      for (const [key, keywords] of Object.entries(sectorKeywords)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          return keywords;
        }
      }
      // Secteur inconnu → utiliser le secteur tel quel
      return [sector, `${sector} startup`, `${sector} company`];
    };
    
    // Générer les requêtes avec les mots-clés spécifiques au secteur
    sectors.forEach(sector => {
      const keywords = getSearchKeywords(sector);
      const mainKeyword = keywords[0];
      const altKeyword = keywords[1] || mainKeyword;
      
      // Recherches ciblées pour startups précoces et moins connues
      startupSearchQueries.push(`${mainKeyword} ${stage} startup ${geography} 2024 2025`);
      startupSearchQueries.push(`${altKeyword} early stage company ${geography} founded 2023 2024`);
      startupSearchQueries.push(`${mainKeyword} pre-seed funding ${geography} new company`);
      startupSearchQueries.push(`${mainKeyword} emerging startup ${geography} innovative 2024`);
      startupSearchQueries.push(`best ${mainKeyword} startups ${geography} 2024`);
      
      // Recherches spécifiques au secteur
      if (keywords.length > 2) {
        startupSearchQueries.push(`${keywords[2]} startup ${geography} ${stage} 2024`);
      }
    });
    
    // OPTIMISATION: Réduire drastiquement les requêtes Brave (plan Free = 1 req/sec, 2000/mois)
    // On fait seulement 3-4 requêtes bien ciblées au lieu de 20+
    
    let startupSearchResults: BraveSearchResult[] = [];
    
    // Construire UNE requête optimale par secteur
    const mainSector = sectors[0] || "technology";
    const keywords = getSearchKeywords(mainSector);
    const mainKeyword = keywords[0];
    
    const RESULTS_PER_QUERY = isSearchPhase ? 10 : 15;
    const BATCH_DELAY_MS = 1200;

    console.log(`[Brave] Recherche 1: ${mainKeyword} ${stage} startup ${geography}`);
    const results1 = await braveSearch(`${mainKeyword} ${stage} startup ${geography} 2024 2025 funding`, RESULTS_PER_QUERY);
    startupSearchResults.push(...results1);
    await sleep(BATCH_DELAY_MS);

    if (!isSearchPhase) {
      console.log(`[Brave] Recherche 2: best ${mainKeyword} startups`);
      const results2 = await braveSearch(`best ${mainKeyword} startups ${geography} 2024 emerging`, RESULTS_PER_QUERY);
      startupSearchResults.push(...results2);
      await sleep(BATCH_DELAY_MS);
    }

    let ipInnovationContext = "";
    if (!isSearchPhase) {
      console.log(`[Brave] Recherche 3: ${mainKeyword} funding`);
      const results3 = await braveSearch(`${mainKeyword} startup funding round ${geography} 2024`, RESULTS_PER_QUERY);
      startupSearchResults.push(...results3);
      await sleep(BATCH_DELAY_MS);

      console.log(`[Brave] Recherche 4: ${mainKeyword} founders traction`);
      const results4 = await braveSearch(`${mainKeyword} ${stage} startup founders CEO team ${geography} 2024`, RESULTS_PER_QUERY);
      startupSearchResults.push(...results4);
      await sleep(BATCH_DELAY_MS);

      console.log(`[Brave] Recherche 5: ${mainKeyword} traction metrics`);
      const results5 = await braveSearch(`${mainKeyword} startup traction revenue growth metrics ${geography} 2024`, RESULTS_PER_QUERY);
      startupSearchResults.push(...results5);

      if (startupSearchResults.length < 20) {
        await sleep(BATCH_DELAY_MS);
        const results6 = await braveSearch(`${mainSector} company ${geography} innovative 2024`, 10);
        startupSearchResults.push(...results6);
      }

      const deepQueries = [
        `${primarySector} news 2024 2025 trends`,
        `${primarySector} competitors landscape 2024`,
        `${mainKeyword} LinkedIn Crunchbase company profile`,
      ];
      for (const q of deepQueries) {
        const results = await braveSearch(q, 6);
        startupSearchResults.push(...results);
        await sleep(1100);
      }

      const ipInnovationQueries = [
        `${mainKeyword} startup patent filing 2024 2025 ${geography}`,
        `${primarySector} patent portfolio company funding`,
        `${mainKeyword} university spin-off research startup ${geography} 2024`,
      ];
      for (const q of ipInnovationQueries) {
        const results = await braveSearch(q, 6);
        startupSearchResults.push(...results);
        if (results.length > 0) {
          ipInnovationContext += results.map(r => `${r.title}: ${r.description} | ${r.url}`).join("\n") + "\n";
        }
        await sleep(1100);
      }
      if (ipInnovationContext) {
        ipInnovationContext = `\n\n=== PROPRIÉTÉ INTELLECTUELLE & INNOVATION (brevets, dépôts, spin-offs) ===\n${ipInnovationContext.slice(0, 2000)}`;
      }
    }

    console.log(`[Brave] Total résultats: ${startupSearchResults.length}${isSearchPhase ? " (phase search légère)" : ""}`);

    const searchSeen = new Set<string>();
    const uniqueSearchResults = startupSearchResults.filter(r => r.url && !searchSeen.has(r.url) && (searchSeen.add(r.url), true));

    let reflectionContext = "";
    if (!isSearchPhase && uniqueSearchResults.length < 25) {
      try {
        const refPrompt = `Tu es un assistant VC spécialisé dans le sourcing. Fonds: "${fundName || "thèse personnalisée"}". 
Secteurs: ${sectors.join(", ")}. Géographie: ${geography}. Stade: ${stage}

Contexte thèse (extrait):\n${fundThesisContext.slice(0, 600)}\n\nStartups trouvées (extraits):\n${startupSearchResults.slice(0, 6).map(r => r.title + " " + r.description).join("\n")}

Propose EXACTEMENT 3 requêtes (en anglais, courtes) pour trouver d'autres startups ou données : au moins une ciblant brevets/propriété intellectuelle ou spin-offs recherche (ex: "patent [sector] startup", "university spin-off [sector]"). Réponds UNIQUEMENT avec un JSON: {"queries": ["q1", "q2", "q3"]}`;
        const refEndpoint = await getAIEndpoint();
        const refBody = AI_PROVIDER === "vertex"
          ? { contents: [{ role: "user", parts: [{ text: refPrompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 400 } }
          : { contents: [{ parts: [{ text: refPrompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 400, responseMimeType: "application/json" as const } };
        const refRes = await fetch(refEndpoint.url, { method: "POST", headers: refEndpoint.headers, body: JSON.stringify(refBody) });
        if (refRes.ok) {
          const refData = await refRes.json();
          const refText = refData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const parsed = JSON.parse(refText.replace(/```json?\s*/g, "").trim());
          const queries: string[] = Array.isArray(parsed?.queries) ? parsed.queries.slice(0, 3) : [];
          for (const q of queries) {
            const results = await braveSearch(String(q).trim(), 5);
            startupSearchResults.push(...results);
            await sleep(1000);
          }
          reflectionContext = queries.length ? `\n\n=== REQUÊTES ADDITIONNELLES ===\n${queries.join("; ")}` : "";
        }
      } catch (e) {
        console.warn("Reflection layer skipped:", e);
      }
    }

    const finalSeen = new Set<string>();
    const finalUnique = startupSearchResults.filter(r => r.url && !finalSeen.has(r.url) && (finalSeen.add(r.url), true));
    const maxResultsForContext = isSearchPhase ? 15 : 35;
    let startupSearchContext = finalUnique
      .slice(0, maxResultsForContext)
      .map(r => `${r.title}: ${r.description} | URL: ${r.url}`)
      .join("\n") + ipInnovationContext + reflectionContext;
    
    // Add DigitalOcean Agent results if available
    if (doAgentSourcingResult) {
      startupSearchContext = `=== SOURCING PAR AGENT DIGITALOCEAN (recherche approfondie) ===\n${doAgentSourcingResult}\n\n=== RÉSULTATS RECHERCHE WEB (Brave Search) ===\n${startupSearchContext}`;
    }

    const systemPrompt = `Tu es un analyste VC SENIOR avec 15+ ans d'expérience en sourcing de startups et due diligence approfondie pour les plus grands fonds (Sequoia, a16z, Accel, etc.).

🎯 MISSION PRINCIPALE : SOURCING DE STARTUPS PRÉCOCES + DUE DILIGENCE PROFESSIONNELLE

⚠️ RÈGLE CRITIQUE : SOURCING DE STARTUPS FIABLES AVEC DONNÉES VÉRIFIABLES
- Tu dois trouver des startups RÉELLES avec des DONNÉES VÉRIFIABLES (site web, LinkedIn, sources)
- PRIORITÉ aux startups avec au moins 2 sources vérifiables (site web + LinkedIn/Crunchbase)
- Si une startup n'a PAS de site web vérifiable, de LinkedIn, ou de sources → NE L'UTILISE PAS, TROUVE-EN UNE AUTRE
- Les startups doivent correspondre EXACTEMENT aux critères (secteurs, géographie, stade)
- Si une startup n'a pas assez de données vérifiables, TROUVE-EN UNE AUTRE dans les résultats de recherche
- NE JAMAIS utiliser une startup si tu ne peux pas vérifier son existence réelle avec au moins 2 sources

⚠️ RÉFLEXION : Utilise TOUTES les couches fournies : thèse fonds, marché, startups, actualités/concurrence, et surtout la section PROPRIÉTÉ INTELLECTUELLE & INNOVATION (brevets, dépôts, spin-offs universitaires). Priorise les startups avec des signaux IP (brevets déposés, technologies protégées) ou issues de la recherche. Croise les données avant de produire ton analyse.

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
=== THÈSE DU FONDS (critères à matcher) ===
${fundThesisContext.slice(0, 1000)}

⚠️ Utilise cette thèse pour SOURCER des startups qui correspondent. N'analyse pas le fonds.
` : ''}

${startupSearchContext ? `
=== STARTUPS POTENTIELLES TROUVÉES (source: Brave Search + Ninja Sourcing) ===
${startupSearchContext}

⚠️ UTILISE CES RÉSULTATS pour identifier des startups RÉELLES à analyser.
Chaque startup doit être une entreprise EXISTANTE avec un site web, des données vérifiables.

🚫 URLs : utilise UNIQUEMENT les URLs des résultats ci-dessus (y compris brevets, Google Patents, bases IP, articles sur dépôts). Ne jamais inventer d'URL. Sinon champ vide/null.

💡 PROPRIÉTÉ INTELLECTUELLE : Si la section "Propriété intellectuelle & innovation" est présente, utilise-la pour identifier des startups avec brevets/dépôts ou spin-offs recherche. Cite les sources (patents.google.com, INPI, EPO, articles sur dépôts) dans le rapport quand tu as ces données.
` : ''}

=== DONNÉES MARCHÉ ===
${(marketData.marketContext || "").slice(0, 500)}

=== BENCHMARKS (estimations si données manquantes) ===
SAAS: Seed ARR $0-500K CAC $500-1500 Churn 5-10% | Series A ARR $500K-2M CAC $1-2K Churn 3-7% NRR 100-120% | Series B+ ARR $2M+
MARKETPLACE: Seed GMV $0-2M | Series A GMV $2-10M take rate 15-25%
FINTECH: Seed ARR $0-1M | Series A ARR $1-5M
Adapte les métriques au secteur (ARR/MRR pour SaaS, revenus/contrats pour industriel). Utilise ces benchmarks pour estimations si données manquantes.

📚 SOURCES: Chaque slide 5-10 sources pertinentes au thème (marché = rapports Gartner/McKinsey/Statista; équipe = LinkedIn/Crunchbase; financements = presse/Crunchbase). Varie les types. URLs uniquement depuis les résultats fournis.
- Pour Team Assessment: Inclus LinkedIn de TOUS les fondateurs + articles/interviews sur l'équipe + podcasts + annonces de recrutements clés
- Pour Business Metrics: Inclus Crunchbase + benchmarks multiples (OpenView, Bessemer, a16z, NFX) + articles de presse sur les métriques
- Pour Competitive Analysis: Inclus sites de TOUS les concurrents majeurs + comparatifs (G2, Capterra) + articles d'analyse
- Pour Product & Technology: Inclus site officiel (plusieurs pages), GitHub, Product Hunt, G2, Capterra, brevets, blogs techniques
- NE JAMAIS répéter les mêmes sources dans plusieurs slides - chaque slide doit avoir ses propres sources uniques

⚠️ RÈGLES DE TYPES — NE JAMAIS MÉLANGER ⚠️
- SCORES (fitScore, pmfScore) : TOUJOURS un nombre ENTRE 1-10 (fitScore) ou 0-100 (pmfScore). JAMAIS de millions, $, M, €, K. Ex: fitScore 7 ✓ | fitScore "60 millions" ✗ | fitScore "201M" ✗.
- MONTANTS ($) : ARR, MRR, CAC, LTV, valuation, TAM, SAM, SOM, askAmount, burnRate — en $ avec unité (K/M/B). Ex: "$2.5M ARR", "$150K MRR". TOUJOURS inclure l'unité.
- POURCENTAGES (%) : NRR, churn, croissance (growth), marge (margin), CAGR, MRR growth — TOUJOURS avec le symbole %. Ex: "120% NRR", "5% churn/mois", "8% MRR growth", "15% YoY growth". JAMAIS juste "8" sans %.
- ENTIERS : brevets, nombre de clients (customers), team size, runway (mois) — TOUJOURS un nombre entier SANS unité M/K/B. Ex: teamSize 25 ✓ | teamSize "201M" ✗ | teamSize "201" ✓. Team size doit être entre 1 et 50000. Runway en mois (entier).

${customThesis ? `
THÈSE D'INVESTISSEMENT PERSONNALISÉE:
- Secteurs: ${customThesis.sectors?.join(', ') || 'Non spécifié'}
- Stade: ${customThesis.stage || 'Non spécifié'}
- Géographie: ${customThesis.geography || 'Non spécifié'}
- Taille de ticket: ${customThesis.ticketSize || 'Non spécifié'}
- Description: ${customThesis.description || 'Non spécifiée'}
${customThesis.specificCriteria ? `- Critères spécifiques: ${customThesis.specificCriteria}` : ''}
${customThesis.sourcingInstructions ? `
📋 INSTRUCTIONS DE SOURCING PERSONNALISÉES:
${customThesis.sourcingInstructions}

⚠️ APPLIQUE ces instructions de sourcing pour trouver les startups les plus pertinentes!
` : ''}
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
   - "patents" ou "ip": Si trouvé dans la section Propriété intellectuelle & innovation : nombre de brevets, liens patents.google.com/EPO/INPI ou résumé des dépôts (avec URL source). Sinon omettre.
   - "website": Site web RÉEL (URL complète) - UNIQUEMENT si trouvé dans les recherches web. NE PAS inventer d'URLs.
   - "linkedin": URL LinkedIn de la startup - UNIQUEMENT si trouvé dans les recherches web. NE PAS inventer d'URLs.
   - "crunchbaseUrl": URL Crunchbase si disponible - UNIQUEMENT si trouvé dans les recherches web. NE PAS inventer d'URLs.
   - "metrics": {
       "arr": "ARR en $ avec source OU estimation (ex: '$2.5M ARR (source: techcrunch.com)' ou '$1.8M ARR (estimation basée sur stade Series A SaaS)')",
       "mrr": "MRR en $ avec source OU estimation (ex: '$200K MRR (source: ...)' ou '$150K MRR (estimation)')",
       "growth": "Croissance MoM/YoY en % avec source OU estimation. FORMAT OBLIGATOIRE: 'X% MoM' ou 'X% YoY' avec le symbole %. Ex: '8% MoM', '120% YoY'. JAMAIS juste '8' sans %.",
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
       "founders": [{"name": "Nom complet", "role": "CEO/CTO/etc", "linkedin": "URL - UNIQUEMENT si trouvée dans les recherches web, sinon null", "background": "Expérience"}],
       "teamSize": "Nombre d'employés (ENTIER entre 1-50000, JAMAIS avec M/K/B. Ex: 25, 150, 500. PAS 201M, PAS 2.5K)",
       "keyHires": "Recrutements clés récents"
     }
   - "verificationStatus": "verified" | "partially_verified" | "unverified"
   - "sources": Array de toutes les sources utilisées { "name": "Nom", "url": "URL", "type": "article/crunchbase/linkedin/etc" } - UNIQUEMENT des URLs trouvées dans les recherches web. NE JAMAIS inventer d'URLs fictives.

4. "dueDiligenceReports": Array de ${numberOfStartups} rapport(s):
   Chaque rapport est un Array de slides:
   
   ⚠️ CRITIQUE: Chaque slide DOIT avoir un champ "sources" avec des sources PERTINENTES À CE SLIDE UNIQUEMENT.
   - Slide "Team Assessment" / "Équipe" → UNIQUEMENT sources fondateurs, équipe, LinkedIn profils, articles sur l'équipe.
   - Slide "Business Metrics & Traction" / "Financements" → UNIQUEMENT sources levées, Crunchbase, presse finance, benchmarks.
   - Slide "Market Analysis" → UNIQUEMENT sources marché, TAM/SAM, rapports secteur.
   - Slide "Product & Technology" → UNIQUEMENT sources produit, site, comparatifs, brevets.
   - Slide "Competitive Analysis" → UNIQUEMENT sources concurrents, comparatifs, cartes marché.
   - Slide "Investment Recommendation" → sources synthèse (Crunchbase, Dealroom, presse analyse).
   Ne pas dupliquer les mêmes sources sur toutes les slides : chaque page affiche uniquement les sources qui concernent son thème (min 5-8 par slide).
   
   [
     {
       "title": "Executive Summary",
       "content": "Résumé détaillé avec données VÉRIFIÉES et sources citées (min 300 mots)",
       "keyPoints": ["Point 1 avec source", "Point 2 avec source", ...],
       "metrics": { 
         "valuation": "Valorisation en $ avec source (ex: $15M)", 
         "askAmount": "Montant demandé en $ (ex: $2M)", 
         "fitScore": "Nombre ENTRE 1 ET 10 UNIQUEMENT (ex: 7). JAMAIS 60, 60M, millions, $"
       },
       "sources": [
         { "title": "Crunchbase - Startup Profile", "url": "https://crunchbase.com/...", "type": "Crunchbase" },
         { "title": "Site officiel - About", "url": "https://startup.com/about", "type": "Site officiel" },
         { "title": "Article TechCrunch - Funding", "url": "https://techcrunch.com/...", "type": "Presse" },
         { "title": "LinkedIn - Company Page", "url": "https://linkedin.com/company/...", "type": "LinkedIn" },
         { "title": "Article Sifted - Startup", "url": "https://sifted.eu/...", "type": "Presse" },
         { "title": "Dealroom - Company Data", "url": "https://dealroom.co/...", "type": "Base de données" },
         { "title": "Article The Information", "url": "https://theinformation.com/...", "type": "Presse" },
         { "title": "Product Hunt Launch", "url": "https://producthunt.com/...", "type": "Plateforme" }
       ]
     },
     {
       "title": "Market Analysis",
       "content": "Analyse marché avec TAM/SAM/SOM VÉRIFIÉS et sources (min 300 mots)",
       "keyPoints": ["Tendance 1", ...],
       "metrics": { 
         "tam": "TAM avec source (ex: $50B - Grand View Research 2024)", 
         "sam": "SAM avec source", 
         "som": "SOM avec source", 
         "cagr": "CAGR avec source"
       },
       "sources": [
         { "title": "Grand View Research - Market Report 2024", "url": "https://grandviewresearch.com/...", "type": "Rapport marché" },
         { "title": "Statista - Industry Size & Growth", "url": "https://statista.com/...", "type": "Statistiques" },
         { "title": "McKinsey - Industry Analysis", "url": "https://mckinsey.com/...", "type": "Rapport industrie" },
         { "title": "Gartner - Market Forecast", "url": "https://gartner.com/...", "type": "Rapport marché" },
         { "title": "CB Insights - Sector Report", "url": "https://cbinsights.com/...", "type": "Rapport secteur" },
         { "title": "Forrester - Market Trends", "url": "https://forrester.com/...", "type": "Rapport industrie" },
         { "title": "IDC - Market Sizing", "url": "https://idc.com/...", "type": "Rapport marché" },
         { "title": "PwC - Industry Report", "url": "https://pwc.com/...", "type": "Rapport industrie" },
         { "title": "Deloitte - Sector Analysis", "url": "https://deloitte.com/...", "type": "Rapport secteur" },
         { "title": "BCG - Market Study", "url": "https://bcg.com/...", "type": "Rapport marché" },
         { "title": "Article TechCrunch - Market Trends", "url": "https://techcrunch.com/...", "type": "Presse" },
         { "title": "Research Paper - Academic", "url": "https://...", "type": "Recherche académique" }
       ]
     },
     {
       "title": "Product & Technology",
       "content": "Analyse produit détaillée (min 250 mots)",
       "keyPoints": ["Force 1", ...],
       "metrics": { 
         "techStack": "Stack technique", 
         "patents": "Nombre de brevets (entier, ex: 3)", 
         "pmfScore": "Nombre ENTRE 0 ET 100 UNIQUEMENT (ex: 75). JAMAIS 60M, millions, $" 
       },
       "sources": [
         { "title": "Site officiel - Product Page", "url": "https://startup.com/product", "type": "Site officiel" },
         { "title": "Site officiel - Features", "url": "https://startup.com/features", "type": "Site officiel" },
         { "title": "GitHub Repository", "url": "https://github.com/...", "type": "GitHub" },
         { "title": "Product Hunt - Launch", "url": "https://producthunt.com/...", "type": "Plateforme" },
         { "title": "G2 Crowd - Reviews", "url": "https://g2.com/...", "type": "Comparatif" },
         { "title": "Capterra - Product Info", "url": "https://capterra.com/...", "type": "Comparatif" },
         { "title": "Article - Product Review", "url": "https://...", "type": "Presse" },
         { "title": "Google Patents - Brevets", "url": "https://patents.google.com/...", "type": "Brevets" },
         { "title": "Blog - Technical Deep Dive", "url": "https://startup.com/blog/...", "type": "Blog" },
         { "title": "Demo Video - YouTube", "url": "https://youtube.com/...", "type": "Vidéo" }
       ]
     },
     {
       "title": "Business Metrics & Traction",
       "content": "Métriques DÉTAILLÉES avec SOURCES VÉRIFIÉES et CHIFFRES PRÉCIS (min 400 mots). Inclure: ARR/MRR, croissance MoM/YoY, nombre de clients, NRR, CAC, LTV, ratio LTV/CAC, churn, burn rate, runway, unit economics, cohort analysis si disponible.",
       "keyPoints": ["ARR: $X avec source URL", "MRR: $Y avec croissance Z% MoM", "Clients: N avec source", "NRR: X% avec source", "CAC: $X avec source", "LTV: $Y avec source", "LTV/CAC: X avec source", "Churn: X% avec source", "Burn: $X/mois avec source", "Runway: X mois avec source"],
       "metrics": { 
         "arr": "ARR en $ avec source URL OU estimation. Format: '$2.5M ARR (source: ...)' ou '$1.2M ARR (estimation - Series A SaaS)'",
         "mrr": "MRR en $ avec source OU estimation. Si ARR disponible, MRR = ARR/12.",
         "mrrGrowth": "Croissance MRR en % MoM/YoY avec source OU estimation. FORMAT OBLIGATOIRE: 'X% MoM' ou 'X% YoY' avec le symbole %. Ex: '8% MoM', '120% YoY'. JAMAIS juste '8' sans %.", 
         "customers": "Nombre de clients avec source OU estimation. Calcule si ARR/MRR et ARPU disponibles.", 
         "nrr": "NRR en % avec source OU estimation (moyenne SaaS par stade: Seed 80-100%, Series A 100-120%, etc.)",
         "cac": "CAC en $ avec source OU estimation (moyenne SaaS par stade: Seed $500-1500, Series A $1000-2000, etc.)",
         "ltv": "LTV en $ avec source OU estimation. Calcule: LTV = ARPU / churn rate si données disponibles.",
         "ltvCacRatio": "Ratio LTV/CAC avec source OU estimation. Calcule si LTV et CAC disponibles. Bon: 3:1+",
         "churn": "Churn mensuel en % avec source OU estimation (moyenne SaaS: Seed 5-10%, Series A 3-7%, etc.)",
         "burnRate": "Burn rate mensuel en $ avec source OU estimation. Estime basé sur équipe et stade.",
         "runway": "Runway en mois avec source OU estimation. Calcule: cash / burn rate si données disponibles.",
         "grossMargin": "Marge brute en % avec source OU estimation (SaaS typique: 70-90%)"
       },
       "sources": [
         { "title": "Crunchbase - Financials & Funding", "url": "https://crunchbase.com/...", "type": "Crunchbase" },
         { "title": "OpenView - SaaS Benchmarks 2024", "url": "https://openview.com/benchmarks", "type": "Benchmark" },
         { "title": "Bessemer - Cloud Index", "url": "https://bvp.com/...", "type": "Benchmark" },
         { "title": "Article TechCrunch - Funding", "url": "https://techcrunch.com/...", "type": "Presse" },
         { "title": "Article The Information - Metrics", "url": "https://theinformation.com/...", "type": "Presse" },
         { "title": "Dealroom - Financial Data", "url": "https://dealroom.co/...", "type": "Base de données" },
         { "title": "PitchBook - Company Metrics", "url": "https://pitchbook.com/...", "type": "Base de données" },
         { "title": "Article Sifted - Traction", "url": "https://sifted.eu/...", "type": "Presse" },
         { "title": "a16z - Market Benchmarks", "url": "https://a16z.com/...", "type": "Benchmark" },
         { "title": "NFX - Startup Metrics", "url": "https://nfx.com/...", "type": "Benchmark" },
         { "title": "Article - Customer Case Study", "url": "https://...", "type": "Presse" },
         { "title": "LinkedIn - Growth Announcement", "url": "https://linkedin.com/...", "type": "LinkedIn" }
       ]
     },
     {
       "title": "Competitive Analysis",
       "content": "Analyse concurrentielle avec données marché (min 250 mots)",
       "keyPoints": ["Avantage 1", ...],
       "metrics": { 
         "marketShare": "Part de marché en % (0-100%, ex: '5.2%' ou '5.2' - JAMAIS avec $, JAMAIS '1$' ou '$1')", 
         "competitorCount": "Nombre de concurrents (entier, ex: 10, 25 - JAMAIS avec $, JAMAIS '10$' ou '$10')" 
       },
       "sources": [
         { "title": "G2 Crowd - Comparison Matrix", "url": "https://g2.com/...", "type": "Comparatif" },
         { "title": "Capterra - Competitor Analysis", "url": "https://capterra.com/...", "type": "Comparatif" },
         { "title": "Concurrent 1 - Site officiel", "url": "https://competitor1.com", "type": "Site concurrent" },
         { "title": "Concurrent 2 - Site officiel", "url": "https://competitor2.com", "type": "Site concurrent" },
         { "title": "Concurrent 3 - Crunchbase", "url": "https://crunchbase.com/...", "type": "Crunchbase" },
         { "title": "Article - Competitive Landscape", "url": "https://...", "type": "Presse" },
         { "title": "CB Insights - Market Map", "url": "https://cbinsights.com/...", "type": "Rapport secteur" },
         { "title": "LinkedIn - Competitor Updates", "url": "https://linkedin.com/...", "type": "LinkedIn" },
         { "title": "Product Hunt - Competitor Launch", "url": "https://producthunt.com/...", "type": "Plateforme" },
         { "title": "Article - Market Analysis", "url": "https://...", "type": "Presse" }
       ]
     },
     {
       "title": "Team Assessment",
       "content": "Évaluation équipe avec liens LinkedIn (min 250 mots)",
       "keyPoints": ["Point 1", ...],
       "metrics": { 
         "founders": [{ "name": "Nom", "role": "Rôle", "linkedin": "URL LinkedIn - UNIQUEMENT si trouvée dans les recherches web, sinon null" }],
         "teamSize": "Taille équipe",
         "advisors": ["Advisor 1", ...]
       },
       "sources": [
         { "title": "LinkedIn - CEO Profile", "url": "https://linkedin.com/in/...", "type": "LinkedIn" },
         { "title": "LinkedIn - CTO Profile", "url": "https://linkedin.com/in/...", "type": "LinkedIn" },
         { "title": "LinkedIn - COO Profile", "url": "https://linkedin.com/in/...", "type": "LinkedIn" },
         { "title": "LinkedIn - Company Page", "url": "https://linkedin.com/company/...", "type": "LinkedIn" },
         { "title": "Article - Founder Interview", "url": "https://...", "type": "Presse" },
         { "title": "Podcast - Founder Story", "url": "https://...", "type": "Podcast" },
         { "title": "Article TechCrunch - Team", "url": "https://techcrunch.com/...", "type": "Presse" },
         { "title": "Crunchbase - Team Section", "url": "https://crunchbase.com/...", "type": "Crunchbase" },
         { "title": "Article - Key Hire Announcement", "url": "https://...", "type": "Presse" },
         { "title": "Twitter/X - Founder Account", "url": "https://twitter.com/...", "type": "Réseau social" },
         { "title": "Article - Team Background", "url": "https://...", "type": "Presse" },
         { "title": "LinkedIn - Advisor Profiles", "url": "https://linkedin.com/in/...", "type": "LinkedIn" }
       ]
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
       },
       "sources": [
         { "title": "Crunchbase - Full Profile", "url": "https://crunchbase.com/...", "type": "Crunchbase" },
         { "title": "Dealroom - Company Analysis", "url": "https://dealroom.co/...", "type": "Base de données" },
         { "title": "Article - Investment Thesis", "url": "https://...", "type": "Presse" },
         { "title": "Article - Risk Analysis", "url": "https://...", "type": "Presse" },
         { "title": "CB Insights - Sector Report", "url": "https://cbinsights.com/...", "type": "Rapport secteur" },
         { "title": "Article - Market Opportunity", "url": "https://...", "type": "Presse" },
         { "title": "LinkedIn - Company Updates", "url": "https://linkedin.com/...", "type": "LinkedIn" },
         { "title": "Article - Industry Trends", "url": "https://...", "type": "Presse" },
         { "title": "Research - Market Validation", "url": "https://...", "type": "Recherche" },
         { "title": "Article - Competitive Advantage", "url": "https://...", "type": "Presse" }
       ]
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

ÉTAPE 2 - SOURCING DE STARTUPS RÉELLES ET FIABLES (PRIORITÉ ABSOLUE) :
Identifie ${numberOfStartups} startup(s) RÉELLE(S) et VÉRIFIÉES qui correspondent PARFAITEMENT à la thèse du fonds "${fundName}".

CRITÈRES OBLIGATOIRES pour chaque startup :
- Une entreprise RÉELLE et EXISTANTE (pas inventée)
- Correspondre aux critères du fonds (secteur, stade, géographie, ticket)
- Avoir un site web RÉEL vérifiable (URL trouvée dans les recherches web)
- Avoir un LinkedIn ou Crunchbase vérifiable (URL trouvée dans les recherches web)
- Avoir au moins 2 sources vérifiables (site web + LinkedIn/Crunchbase/article)
- Avoir des données vérifiables (funding, métriques, équipe)

⚠️ UTILISE UNIQUEMENT les résultats de recherche web fournis ci-dessus pour identifier des startups RÉELLES.
⚠️ Si une startup n'a PAS de site web vérifiable OU pas de LinkedIn/Crunchbase → NE L'UTILISE PAS, TROUVE-EN UNE AUTRE
⚠️ Ne crée PAS de startups fictives. Si tu ne trouves pas assez de startups réelles avec données vérifiables, cherche plus profondément dans les résultats de recherche.

🚫 RÈGLE ABSOLUE SUR LES URLs :
- N'utilise UNIQUEMENT que les URLs trouvées dans les résultats de recherche web fournis ci-dessus
- NE JAMAIS inventer, créer ou deviner des URLs (website, LinkedIn, Crunchbase, sources)
- Si une URL n'est pas dans les résultats de recherche, laisse le champ vide ou null
- Les URLs doivent être exactement telles que trouvées dans les résultats (sans modification)
- Ne génère PAS d'URLs fictives même si elles semblent logiques (ex: ne pas créer "https://linkedin.com/company/nom-startup" si non trouvé)

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
- TAM/SAM/SOM en $ avec sources URL (ex: $50B TAM - Grand View Research 2024) - UNIQUEMENT si trouvé dans les recherches web
- CAGR en % avec source - UNIQUEMENT si trouvé dans les recherches web
- Tendances du marché avec sources - UNIQUEMENT si trouvées dans les recherches web

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
- Pour chaque chiffre, indique la source avec URL - UNIQUEMENT si l'URL est dans les résultats de recherche
- Si une donnée n'est pas disponible, marque "Non disponible" au lieu d'inventer
- 🚫 NE JAMAIS inventer d'URLs (website, LinkedIn, Crunchbase, sources) - utilise uniquement celles trouvées dans les recherches web`
      : `🎯 MISSION : SOURCER ET ANALYSER DES STARTUPS POUR THÈSE PERSONNALISÉE

⚠️ ATTENTION : TU DOIS SOURCER DES STARTUPS RÉELLES AVEC DONNÉES VÉRIFIABLES.

ÉTAPE 1 - COMPRENDRE LA THÈSE (rapide, max 100 mots) :
Analyse rapidement la thèse personnalisée pour identifier :
- Les secteurs cibles
- Le stade d'investissement préféré (Seed, Series A, etc.)
- La géographie cible
- La taille de ticket moyenne

ÉTAPE 2 - SOURCING DE STARTUPS RÉELLES ET FIABLES (PRIORITÉ ABSOLUE) :
Identifie ${numberOfStartups} startup(s) RÉELLE(S) et VÉRIFIÉES qui correspondent PARFAITEMENT à la thèse personnalisée.

CRITÈRES OBLIGATOIRES pour chaque startup :
- Une entreprise RÉELLE et EXISTANTE (pas inventée)
- Correspondre aux critères de la thèse (secteur, stade, géographie, ticket)
- Avoir un site web RÉEL vérifiable (URL trouvée dans les recherches web)
- Avoir un LinkedIn ou Crunchbase vérifiable (URL trouvée dans les recherches web)
- Avoir au moins 2 sources vérifiables (site web + LinkedIn/Crunchbase/article)
- Avoir des données vérifiables (funding, métriques, équipe)

⚠️ UTILISE UNIQUEMENT les résultats de recherche web fournis ci-dessus pour identifier des startups RÉELLES.
⚠️ Si une startup n'a PAS de site web vérifiable OU pas de LinkedIn/Crunchbase → NE L'UTILISE PAS, TROUVE-EN UNE AUTRE
⚠️ Ne crée PAS de startups fictives. Si tu ne trouves pas assez de startups réelles avec données vérifiables, cherche plus profondément dans les résultats de recherche.

🚫 RÈGLE ABSOLUE SUR LES URLs :
- N'utilise UNIQUEMENT que les URLs trouvées dans les résultats de recherche web fournis ci-dessus
- NE JAMAIS inventer, créer ou deviner des URLs (website, LinkedIn, Crunchbase, sources)
- Si une URL n'est pas dans les résultats de recherche, laisse le champ vide ou null
- Les URLs doivent être exactement telles que trouvées dans les résultats (sans modification)
- Ne génère PAS d'URLs fictives même si elles semblent logiques (ex: ne pas créer "https://linkedin.com/company/nom-startup" si non trouvé)

ÉTAPE 3 - DUE DILIGENCE COMPLÈTE (niveau senior VC) :

ÉTAPE 1 - SOURCING :
Identifie ${numberOfStartups} startup(s) RÉELLE(S) et VÉRIFIÉES correspondant à la thèse personnalisée fournie.
Chaque startup doit être une entreprise RÉELLE avec des données vérifiables (site web, LinkedIn, Crunchbase).

ÉTAPE 2 - DUE DILIGENCE COMPLÈTE :
Génère un rapport de due diligence PROFESSIONNEL de niveau senior VC avec TOUTES les métriques chiffrées (ARR, MRR, CAC, LTV, churn, burn rate, etc.) avec sources URL pour chaque donnée.

IMPORTANT : 
- Utilise UNIQUEMENT les données réelles trouvées dans les recherches web
- Ne crée PAS de données fictives
- 🚫 NE JAMAIS inventer d'URLs (website, LinkedIn, Crunchbase, sources) - utilise uniquement celles trouvées dans les recherches web
- Si une URL n'est pas dans les résultats de recherche, laisse le champ vide ou null`;

    if (phase === "search_startups" && jobId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/sourcing_jobs?id=eq.${encodeURIComponent(jobId)}`, {
        method: "PATCH",
        headers: { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          search_context: { systemPrompt, userPrompt, fundSources, marketSources: marketData.marketSources || [], startupSearchContext },
          search_results_count: finalUnique?.length ?? 0,
          status: "search_done",
          updated_at: new Date().toISOString(),
        }),
      });
      if (!patchRes.ok) return new Response(JSON.stringify({ error: "Échec mise à jour job (search_startups)" }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ jobId }), { headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
    }
    if (phase === "search" && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/sourcing_jobs`, {
        method: "POST",
        headers: { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify({
          fund_name: fundName || null,
          custom_thesis: customThesis || null,
          params: params || {},
          search_context: { systemPrompt, userPrompt, fundSources, marketSources: marketData.marketSources || [] },
          search_results_count: finalUnique?.length ?? 0,
          status: "search_done",
        }),
      });
      const insertData = await insertRes.json();
      const jobIdOut = Array.isArray(insertData) ? insertData[0]?.id : insertData?.id;
      if (!jobIdOut) return new Response(JSON.stringify({ error: "Échec création job sourcing" }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ jobId: jobIdOut }), { headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
    }

    let response: Response | null = null;
    let lastErrorText = "";

    const aiEndpoint = await getAIEndpoint(); // Utilise le modèle configuré
    
    // Format du corps différent pour Vertex AI (nécessite role: "user")
    const maxOutputTokens = 20480;
    const aiBody = AI_PROVIDER === "vertex" 
      ? {
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}\n\nRéponds UNIQUEMENT avec du JSON valide, sans formatage markdown.` }] }],
          generationConfig: { temperature: 0.15, topP: 0.9, topK: 40, maxOutputTokens },
        }
      : {
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}\n\nRéponds UNIQUEMENT avec du JSON valide, sans formatage markdown.` }] }],
          generationConfig: { temperature: 0.15, topP: 0.9, topK: 40, maxOutputTokens, responseMimeType: "application/json" as const },
        };

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        const waitMs = Math.min(8000, 800 * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 400);
        console.log(`${AI_PROVIDER === "vertex" ? "Vertex AI" : "Gemini"} rate-limited. Retrying in ${waitMs}ms (attempt ${attempt + 1}/3)`);
        await sleep(waitMs);
      }
      response = await fetch(aiEndpoint.url, {
        method: "POST",
        headers: aiEndpoint.headers,
        body: JSON.stringify(aiBody),
      });
      if (response.ok) break;
      lastErrorText = await response.text();
      console.error(`${AI_PROVIDER === "vertex" ? "Vertex AI" : "Gemini"} API error:`, response.status, lastErrorText);
      if (response.status !== 429) break;
    }

    if (!response) {
      return new Response(JSON.stringify({ error: `Échec appel API ${AI_PROVIDER === "vertex" ? "Vertex AI" : "Gemini"}.` }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      const status = response.status;
      const errorText = lastErrorText || (await response.text());
      const providerName = AI_PROVIDER === "vertex" ? "Vertex AI" : "Gemini";
      if (status === 429) {
        return new Response(JSON.stringify({ error: `Rate limit ${providerName}. Attendez ~30–60s puis réessayez.` }), {
          status: 429,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (status === 403) {
        return new Response(JSON.stringify({
          error: AI_PROVIDER === "vertex" 
            ? "Credentials Vertex AI invalides. Vérifiez VERTEX_AI_PROJECT_ID et VERTEX_AI_CREDENTIALS."
            : "Clé Gemini invalide ou expirée. Vérifiez GEMINI_KEY_2 ou GEMINI_API_KEY.",
        }), {
          status: 403,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (status === 400) {
        let msg = `Erreur requête ${providerName}.`;
        try {
          const d = JSON.parse(errorText);
          if (d.error?.message) msg = `${providerName}: ${d.error.message}`;
        } catch { /* ignore */ }
        return new Response(JSON.stringify({ error: msg }), {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `${providerName} API error (${status})` }), {
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
      return new Response(JSON.stringify({ error: `Réponse ${AI_PROVIDER === "vertex" ? "Vertex AI" : "Gemini"} vide.` }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }


    // Réduire la taille en mémoire pour éviter 546 (limite mémoire) — garder un JSON valide
    let contentToParse = content;
    if (content.length > 1_200_000) {
      const maxLen = 1_100_000;
      const truncated = content.slice(0, maxLen);
      const lastBrace = truncated.lastIndexOf("}");
      contentToParse = lastBrace > maxLen - 50000 ? truncated.slice(0, lastBrace + 1) : truncated;
      console.log(`[546 mitigation] Response truncated from ${content.length} to ${contentToParse.length} chars for parsing`);
    }

    let analysisResult;
    try {
      analysisResult = parseJSONResponse(contentToParse);
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

    // Helper function to clean URLs in startup data
    const cleanStartupUrls = (startup: any): any => {
      if (!startup) return startup;
      
      // Clean website, linkedin, crunchbaseUrl
      if (startup.website) {
        const cleaned = validateAndCleanUrl(startup.website);
        startup.website = cleaned || null;
      }
      if (startup.linkedin) {
        const cleaned = validateAndCleanUrl(startup.linkedin);
        startup.linkedin = cleaned || null;
      }
      if (startup.linkedinUrl) {
        const cleaned = validateAndCleanUrl(startup.linkedinUrl);
        startup.linkedinUrl = cleaned || null;
      }
      if (startup.crunchbaseUrl) {
        const cleaned = validateAndCleanUrl(startup.crunchbaseUrl);
        startup.crunchbaseUrl = cleaned || null;
      }
      
      // Clean URLs in sources array
      if (Array.isArray(startup.sources)) {
        startup.sources = startup.sources
          .map((source: any) => {
            if (typeof source === 'string') {
              const cleaned = validateAndCleanUrl(source);
              return cleaned || null;
            }
            if (source && typeof source === 'object' && source.url) {
              const cleaned = validateAndCleanUrl(source.url);
              if (!cleaned) return null;
              return { ...source, url: cleaned };
            }
            return source;
          })
          .filter((s: any) => s !== null);
      }
      
      // Clean LinkedIn URLs in founders
      if (Array.isArray(startup.team?.founders)) {
        startup.team.founders = startup.team.founders.map((founder: any) => {
          if (founder && founder.linkedin) {
            const cleaned = validateAndCleanUrl(founder.linkedin);
            return { ...founder, linkedin: cleaned || null };
          }
          return founder;
        });
      }
      
      return startup;
    };

    // Step 3: Clean URLs in AI response before enrichment
    analysisResult.startups = analysisResult.startups.map((s: any) => cleanStartupUrls(s));

    // Step 4: Enrich each startup with real web data
    console.log("Enriching startup data with Brave Search...");
    const enrichedStartups = await Promise.all(
      analysisResult.startups.map((s: any) => enrichStartupData(s))
    );
    
    // Step 4.5: Validate startup reliability and filter out unreliable ones
    console.log("Validating startup reliability...");
    const validatedStartups = enrichedStartups.map((s: any) => {
      const validation = validateStartupReliability(s);
      return {
        ...s,
        reliabilityScore: validation.score,
        reliabilityStatus: validation.reliable ? "reliable" : "unreliable",
        missingData: validation.missing,
      };
    });
    
    // Filter out unreliable startups (score < 8) and log warnings
    const reliableStartups = validatedStartups.filter((s: any) => {
      if (!s.reliabilityStatus || s.reliabilityStatus === "unreliable") {
        console.warn(`Startup "${s.name}" filtered out - insufficient verifiable data. Score: ${s.reliabilityScore}, Missing: ${s.missingData?.join(", ")}`);
        return false;
      }
      return true;
    });
    
    // If we lost startups, log a warning but keep what we have
    if (reliableStartups.length < enrichedStartups.length) {
      console.warn(`Filtered out ${enrichedStartups.length - reliableStartups.length} unreliable startup(s). Keeping ${reliableStartups.length} reliable startup(s).`);
    }
    
    analysisResult.startups = reliableStartups.length > 0 ? reliableStartups : validatedStartups; // Fallback to all if none are reliable

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
        // Extraire et valider les sources
        let sources: Array<{title: string; url: string; type: string}> = [];
        if (Array.isArray((s as any).sources)) {
          sources = (s as any).sources
            .filter((src: any) => src && typeof src === 'object' && src.url)
            .map((src: any) => ({
              title: String(src.title || src.name || 'Source'),
              url: validateAndCleanUrl(String(src.url)) || src.url,
              type: String(src.type || 'Source')
            }))
            .filter((src: any) => src.url && src.url.startsWith('http'));
        }
        
        const slide = {
          title: String((s as any).title ?? ""),
          content: String((s as any).content ?? ""),
          keyPoints: Array.isArray((s as any).keyPoints) ? (s as any).keyPoints : [],
          metrics: (s as any).metrics && typeof (s as any).metrics === "object" ? (s as any).metrics : undefined,
          sources: sources.length > 0 ? sources : undefined,
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
  })().catch((err) => {
    console.error("Unhandled rejection in analyze-fund:", err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Internal server error",
    }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  });
});