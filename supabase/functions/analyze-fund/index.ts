import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";

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
    
    // Configuration AI : Gemini ou Vertex AI
    const AI_PROVIDER = (Deno.env.get("AI_PROVIDER") || "gemini").toLowerCase(); // "gemini" ou "vertex"
    const GEMINI_API_KEY = Deno.env.get("GEMINI_KEY_2") || Deno.env.get("GEMINI_API_KEY");
    const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro"; // gemini-2.5-pro, gemini-2.0-flash, gemini-pro, gemini-1.5-pro, gemini-1.5-flash (gemini-3.0-pro pas encore disponible)
    const VERTEX_AI_PROJECT = Deno.env.get("VERTEX_AI_PROJECT_ID");
    const VERTEX_AI_LOCATION = Deno.env.get("VERTEX_AI_LOCATION") || "us-central1";
    const VERTEX_AI_MODEL = Deno.env.get("VERTEX_AI_MODEL") || "gemini-1.5-pro"; // gemini-1.5-pro, gemini-1.5-flash, gemini-pro
    const VERTEX_AI_CREDENTIALS = Deno.env.get("VERTEX_AI_CREDENTIALS");
    const BRAVE_API_KEY = Deno.env.get("BRAVE_API_KEY");
    
    // Helper pour générer un token OAuth2 depuis les credentials Vertex AI (méthode simplifiée)
    async function getVertexAIToken(): Promise<string> {
      if (!VERTEX_AI_CREDENTIALS) {
        throw new Error("VERTEX_AI_CREDENTIALS requis pour Vertex AI");
      }
      
      try {
        const credentials = typeof VERTEX_AI_CREDENTIALS === 'string' 
          ? JSON.parse(VERTEX_AI_CREDENTIALS) 
          : VERTEX_AI_CREDENTIALS;
        
        // Utiliser google-auth-library via import map ou fetch direct
        // Pour simplifier, on utilise l'API Google OAuth2 directement
        const jwt = await generateJWT(credentials);
        
        // Échanger le JWT contre un access token
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
          throw new Error(`Erreur OAuth2: ${tokenResponse.status} - ${errorText}`);
        }
        
        const tokenData = await tokenResponse.json();
        return tokenData.access_token;
      } catch (error) {
        console.error("Erreur génération token Vertex AI:", error);
        throw new Error(`Impossible de générer le token Vertex AI: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Helper pour générer un JWT avec djwt
    async function generateJWT(credentials: any): Promise<string> {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: credentials.client_email,
        sub: credentials.client_email,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
        scope: "https://www.googleapis.com/auth/cloud-platform"
      };
      
      // Importer la clé privée
      const privateKeyPem = credentials.private_key.replace(/\\n/g, '\n');
      const key = await crypto.subtle.importKey(
        "pkcs8",
        new TextEncoder().encode(privateKeyPem),
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
        },
        false,
        ["sign"]
      );
      
      // Créer le JWT avec djwt
      const jwt = await create({ alg: "RS256", typ: "JWT" }, payload, key);
      return jwt;
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
        // Pour Vertex AI, on doit générer un token OAuth2
        // Note: Cette implémentation nécessite une bibliothèque JWT
        // Solution temporaire: utiliser l'API Gemini directement avec les credentials
        // ou utiliser une bibliothèque comme google-auth-library
        const accessToken = await getVertexAIToken().catch(() => {
          // Fallback: utiliser directement les credentials si possible
          console.warn("Impossible de générer token OAuth2, vérifiez VERTEX_AI_CREDENTIALS");
          return null;
        });
        
        if (!accessToken) {
          throw new Error("Impossible d'obtenir un token d'accès Vertex AI. Vérifiez VERTEX_AI_CREDENTIALS.");
        }
        
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
          throw new Error("GEMINI_API_KEY requis pour Gemini");
        }
        return {
          url: `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${GEMINI_API_KEY}`,
          headers: { "Content-Type": "application/json" },
          needsAuth: false
        };
      }
    };
    
    // Vérification de la configuration
    try {
      getAIEndpoint(); // Test de la config
    } catch (configError) {
      const errorMsg = configError instanceof Error ? configError.message : String(configError);
      return new Response(JSON.stringify({ 
        error: `Configuration AI invalide: ${errorMsg}\n\nPour Gemini: Ajoutez GEMINI_KEY_2 ou GEMINI_API_KEY\nPour Vertex AI: Ajoutez VERTEX_AI_PROJECT_ID\n\nModèle Gemini actuel: ${GEMINI_MODEL} (changez via GEMINI_MODEL)\nProvider actuel: ${AI_PROVIDER} (changez via AI_PROVIDER=gemini|vertex)`,
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
        // Recherches ciblées pour startups précoces et moins connues
        startupSearchQueries.push(`${sector} pre-seed startup ${geography} 2024 2025 stealth`);
        startupSearchQueries.push(`${sector} early stage startup ${geography} not on crunchbase 2024`);
        startupSearchQueries.push(`${sector} ${stage} stage startup ${geography} new founded 2023 2024`);
        startupSearchQueries.push(`${sector} startup ${stage} ${geography} under 50 employees 2024`);
        startupSearchQueries.push(`${sector} startup ${stage} ${geography} less than 2 years old`);
      });
    } else if (customThesis) {
      sectors.forEach(sector => {
        // Recherches ciblées pour startups précoces et moins connues
        startupSearchQueries.push(`${sector} pre-seed startup ${geography} 2024 2025 stealth`);
        startupSearchQueries.push(`${sector} early stage startup ${geography} not on crunchbase 2024`);
        startupSearchQueries.push(`${sector} ${stage} startup ${geography} new founded 2023 2024`);
        startupSearchQueries.push(`${sector} startup ${stage} ${geography} under 50 employees 2024`);
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
      const reflectionModel = AI_PROVIDER === "vertex" 
        ? `projects/${VERTEX_AI_PROJECT}/locations/${VERTEX_AI_LOCATION}/publishers/google/models/gemini-2.5-pro`
        : `gemini-2.5-pro`;
      const refUrl = AI_PROVIDER === "vertex"
        ? `https://${VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/${reflectionModel}:generateContent`
        : `https://generativelanguage.googleapis.com/v1beta/models/${reflectionModel}:generateContent?key=${GEMINI_API_KEY}`;
      const refHeaders = AI_PROVIDER === "vertex"
        ? { "Content-Type": "application/json", "Authorization": `Bearer ${JSON.parse(VERTEX_AI_CREDENTIALS).access_token || ""}` }
        : { "Content-Type": "application/json" };
      const refRes = await fetch(refUrl, {
        method: "POST",
        headers: refHeaders,
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

🎯 MISSION PRINCIPALE : SOURCING DE STARTUPS PRÉCOCES + DUE DILIGENCE PROFESSIONNELLE

⚠️ RÈGLE CRITIQUE : SOURCING DE STARTUPS FIABLES AVEC DONNÉES VÉRIFIABLES
- Tu dois trouver des startups RÉELLES avec des DONNÉES VÉRIFIABLES (site web, LinkedIn, sources)
- PRIORITÉ aux startups avec au moins 2 sources vérifiables (site web + LinkedIn/Crunchbase)
- Si une startup n'a PAS de site web vérifiable, de LinkedIn, ou de sources → NE L'UTILISE PAS, TROUVE-EN UNE AUTRE
- Les startups doivent correspondre EXACTEMENT aux critères (secteurs, géographie, stade)
- Si une startup n'a pas assez de données vérifiables, TROUVE-EN UNE AUTRE dans les résultats de recherche
- NE JAMAIS utiliser une startup si tu ne peux pas vérifier son existence réelle avec au moins 2 sources

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

🚫 RÈGLE ABSOLUE SUR LES URLs :
- N'utilise UNIQUEMENT que les URLs trouvées dans les résultats de recherche web fournis ci-dessus
- NE JAMAIS inventer, créer ou deviner des URLs
- Si une URL n'est pas dans les résultats de recherche, ne l'inclus PAS dans ta réponse
- Les URLs doivent être exactement telles que trouvées dans les résultats (sans modification)
- Si aucune URL n'est trouvée pour un site web/LinkedIn/Crunchbase, laisse le champ vide ou null

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
         "mrrGrowth": "Croissance MRR en % MoM/YoY avec source OU estimation. FORMAT OBLIGATOIRE: 'X% MoM' ou 'X% YoY' avec le symbole %. Ex: '8% MoM', '120% YoY'. JAMAIS juste '8' sans %.", 
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
       "metrics": { 
         "marketShare": "Part de marché en % (0-100%, ex: '5.2%' ou '5.2' - JAMAIS avec $, JAMAIS '1$' ou '$1')", 
         "competitorCount": "Nombre de concurrents (entier, ex: 10, 25 - JAMAIS avec $, JAMAIS '10$' ou '$10')" 
       }
     },
     {
       "title": "Team Assessment",
       "content": "Évaluation équipe avec liens LinkedIn (min 250 mots)",
       "keyPoints": ["Point 1", ...],
       "metrics": { 
         "founders": [{ "name": "Nom", "role": "Rôle", "linkedin": "URL LinkedIn - UNIQUEMENT si trouvée dans les recherches web, sinon null" }],
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

    let response: Response | null = null;
    let lastErrorText = "";

    const aiEndpoint = getAIEndpoint(); // Utilise le modèle configuré
    const aiBody = {
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}\n\nRéponds UNIQUEMENT avec du JSON valide, sans formatage markdown.` }] }],
      generationConfig: { temperature: 0.15, topP: 0.9, topK: 40, maxOutputTokens: 32768, responseMimeType: "application/json" as const },
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