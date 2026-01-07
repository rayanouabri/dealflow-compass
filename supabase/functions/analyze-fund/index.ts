import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      requestData = JSON.parse(bodyText);
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(JSON.stringify({ 
        error: `Invalid JSON in request body: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fundName, customThesis, params = {} } = requestData;
    
    // Support multiple AI providers: Groq (preferred) or Gemini
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_KEY_2") || Deno.env.get("GEMINI_API_KEY");
    const AI_PROVIDER = GROQ_API_KEY ? "groq" : (GEMINI_API_KEY ? "gemini" : null);
    
    if (!AI_PROVIDER) {
      console.error("No AI provider configured");
      return new Response(JSON.stringify({ 
        error: "No AI provider configured. Please add either GROQ_API_KEY or GEMINI_KEY_2 (or GEMINI_API_KEY) in Supabase Dashboard > Edge Functions > analyze-fund > Settings > Secrets.\n\n📖 Groq (Recommandé - GRATUIT) : https://console.groq.com\n📖 Gemini : https://makersuite.google.com/app/apikey",
        setupRequired: true
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    
    // Extract criteria
    const sectors = customThesis?.sectors || [];
    const stage = customThesis?.stage || "seed";
    const geography = customThesis?.geography || "global";
    
    if (fundName && fundThesisContext) {
      // Build targeted search queries for real startups
      sectors.forEach(sector => {
        startupSearchQueries.push(`${sector} startup ${stage} stage ${geography} 2024`);
        startupSearchQueries.push(`${sector} company funding ${stage} round 2024`);
      });
    } else if (customThesis) {
      sectors.forEach(sector => {
        startupSearchQueries.push(`${sector} startup ${stage} ${geography} 2024`);
      });
    }
    
    // Execute searches for real startups (CLASSIC SOURCING)
    let startupSearchResults: BraveSearchResult[] = [];
    for (const query of startupSearchQueries.slice(0, 3)) {
      const results = await braveSearch(query, 5);
      startupSearchResults.push(...results);
      await new Promise(r => setTimeout(r, 500)); // Rate limit
    }
    
    // NINJA SOURCING: Find companies BEFORE they're on Crunchbase/Pitchbook
    let ninjaResults: BraveSearchResult[] = [];
    
    // 1. Talent Signals (companies hiring critical roles)
    const criticalRoles = ["Head of Photonics", "Quantum Lead", "CTO", "VP Engineering", "Head of AI"];
    for (const sector of sectors.slice(0, 2)) {
      for (const role of criticalRoles.slice(0, 3)) {
        const talentQuery = `${role} ${sector} ${geography} hiring jobs 2024`;
        const results = await braveSearch(talentQuery, 2);
        ninjaResults.push(...results);
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    // 2. IP Sourcing (patents and citations)
    for (const sector of sectors.slice(0, 2)) {
      const ipQueries = [
        `${sector} patent filed ${geography} 2023 2024`,
        `${sector} patent cited by Intel Tesla Google ${geography}`,
      ];
      for (const query of ipQueries) {
        const results = await braveSearch(query, 2);
        ninjaResults.push(...results);
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    // 3. University Spinoffs
    const universities = geography === "europe" 
      ? ["CNRS", "CEA", "INRIA", "Max Planck", "ETH Zurich"]
      : ["MIT", "Stanford", "Harvard", "Berkeley"];
    for (const sector of sectors.slice(0, 2)) {
      for (const uni of universities.slice(0, 3)) {
        const spinoffQuery = `${uni} ${sector} spin-off startup founded researcher`;
        const results = await braveSearch(spinoffQuery, 2);
        ninjaResults.push(...results);
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    // Combine classic and ninja results
    startupSearchResults = [...startupSearchResults, ...ninjaResults];
    
    const startupSearchContext = startupSearchResults
      .slice(0, 15)
      .map(r => `${r.title}: ${r.description} | URL: ${r.url}`)
      .join("\n");

    const systemPrompt = `Tu es un analyste VC senior expert en sourcing et due diligence. Ta mission: sourcer ${numberOfStartups} startup(s) réelle(s) qui correspondent à la thèse d'investissement et effectuer une analyse complète.

RÈGLES:
1. Utilise en priorité les données web fournies et cite les sources
2. Si une donnée manque, fais une estimation intelligente basée sur le stade/secteur et indique "(estimation)"
3. Chaque startup doit être une entreprise réelle et vérifiable
4. Format des métriques: "$2.5M ARR (source: URL)" ou "$1.8M ARR (estimation basée sur Series A SaaS)"

${fundThesisContext ? `
THÈSE D'INVESTISSEMENT:
${fundThesisContext}
` : ''}

${startupSearchContext ? `
STARTUPS POTENTIELLES (Brave Search + Ninja Sourcing):
${startupSearchContext}
` : ''}

DONNÉES MARCHÉ:
${marketData.marketContext}

MOYENNES MARCHÉ (pour estimations):
SaaS: Seed ($0-500K ARR), Series A ($500K-2M ARR), Series B ($2M-10M ARR)
Marketplace: Seed ($0-2M GMV), Series A ($2M-10M GMV), Series B+ ($10M+ GMV)
Fintech: Seed ($0-1M ARR), Series A ($1M-5M ARR), Series B+ ($5M+ ARR)

${customThesis ? `
THÈSE D'INVESTISSEMENT PERSONNALISÉE:
- Secteurs: ${customThesis.sectors?.join(', ') || 'Non spécifié'}
- Stade: ${customThesis.stage || 'Non spécifié'}
- Géographie: ${customThesis.geography || 'Non spécifié'}
- Taille de ticket: ${customThesis.ticketSize || 'Non spécifié'}
- Description: ${customThesis.description || 'Non spécifiée'}
` : ''}

Réponds avec un objet JSON contenant:

1. "investmentThesis": {sectors, stage, geography, ticketSize, description}

2. "startups": Array de ${numberOfStartups} startup(s):
   - name, tagline, sector, stage, location, founded
   - problem, solution, businessModel, competitors, moat
   - fundingHistory (montants, dates, investisseurs, sources)
   - website, linkedin, crunchbaseUrl
   - metrics: {arr, mrr, growth, customers, nrr, cac, ltv, ltvCacRatio, churn, grossMargin, burnRate, runway, valuation}
   - team: {founders: [{name, role, linkedin, background}], teamSize, keyHires}
   - verificationStatus: "verified"|"partially_verified"|"unverified"
   - sources: [{name, url, type}]

4. "dueDiligenceReports": Array de ${numberOfStartups} rapport(s) avec slides: Executive Summary, Market Analysis, Product & Technology, Business Metrics & Traction (avec arr, mrr, growth, customers, nrr, cac, ltv, ltvCacRatio, churn, burnRate, runway, grossMargin, sources), Competitive Analysis, Team Assessment, Investment Recommendation (INVEST|PASS|WATCH, targetReturn, riskLevel, suggestedTicket)

5. "analysisMetadata": {confidence, dataQuality, verificationLevel, sources}`;

    const userPrompt = fundName 
      ? `Sourcer ${numberOfStartups} startup(s) réelle(s) pour "${fundName}". Utilise les données web fournies. Pour chaque startup: due diligence complète avec métriques (ARR, MRR, CAC, LTV, churn, burn, runway) avec sources ou estimations basées sur stade/secteur. Format: "$2.5M ARR (source: URL)" ou "$1.8M ARR (estimation Series A SaaS)".`
      : `Sourcer ${numberOfStartups} startup(s) réelle(s) pour la thèse personnalisée. Due diligence complète avec métriques et sources.`;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));


    let response: Response | null = null;
    let lastErrorText = "";

    // Use Groq if available, otherwise fallback to Gemini
    if (AI_PROVIDER === "groq") {
      const groqUrl = "https://api.groq.com/openai/v1/chat/completions";
      const groqModel = Deno.env.get("GROQ_MODEL") || "llama-3.1-70b-versatile";
      
      const groqBody = {
        model: groqModel,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `${userPrompt}\n\nRéponds UNIQUEMENT avec du JSON valide, sans formatage markdown.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 32768,
        response_format: { type: "json_object" },
      };

      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          const backoffMs = Math.min(8000, 800 * Math.pow(2, attempt - 1));
          const jitterMs = Math.floor(Math.random() * 400);
          const waitMs = backoffMs + jitterMs;
          console.log(`Groq rate-limited. Retrying in ${waitMs}ms (attempt ${attempt + 1}/3)`);
          await sleep(waitMs);
        }

        response = await fetch(groqUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify(groqBody),
        });

        if (response.ok) break;

        lastErrorText = await response.text();
        console.error("Groq API error:", response.status, lastErrorText);

        if (response.status !== 429) break;
      }
    } else {
      // Gemini fallback
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

      const geminiBody = {
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\n${userPrompt}\n\nRéponds UNIQUEMENT avec du JSON valide, sans formatage markdown.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 32768,
          responseMimeType: "application/json",
        },
      };

      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          const backoffMs = Math.min(8000, 800 * Math.pow(2, attempt - 1));
          const jitterMs = Math.floor(Math.random() * 400);
          const waitMs = backoffMs + jitterMs;
          console.log(`Gemini rate-limited. Retrying in ${waitMs}ms (attempt ${attempt + 1}/3)`);
          await sleep(waitMs);
        }

        response = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(geminiBody),
        });

        if (response.ok) break;

        lastErrorText = await response.text();
        console.error("Gemini API error:", response.status, lastErrorText);

        if (response.status !== 429) break;
      }
    }

    if (!response) {
      return new Response(JSON.stringify({ error: `Failed to call ${AI_PROVIDER.toUpperCase()} API.` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      const status = response.status;
      const errorText = lastErrorText || (await response.text());

      if (status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please wait ~30-60s and retry.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (status === 403) {
        const providerName = AI_PROVIDER === "groq" ? "Groq" : "Gemini";
        const keyName = AI_PROVIDER === "groq" ? "GROQ_API_KEY" : "GEMINI_KEY_2 (ou GEMINI_API_KEY)";
        return new Response(
          JSON.stringify({
            error: `Invalid or expired ${providerName} API key. Please check your ${keyName}.`,
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (status === 400) {
        const providerName = AI_PROVIDER === "groq" ? "Groq" : "Gemini";
        let errorMessage = `Invalid request to ${providerName} API.`;
        let setupInstructions = "";
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage = `${providerName} API: ${errorData.error.message}`;
            // Détecter spécifiquement le problème de clé API manquante
            if (errorData.error.message.toLowerCase().includes("api key") || 
                errorData.error.message.toLowerCase().includes("key not found") ||
                errorData.error.message.toLowerCase().includes("invalid api key") ||
                errorData.error.message.toLowerCase().includes("unauthorized")) {
              if (AI_PROVIDER === "groq") {
                setupInstructions = "\n\n🔧 SOLUTION : Configurez GROQ_API_KEY dans Supabase Dashboard > Edge Functions > analyze-fund > Settings > Secrets.\n📖 Guide : https://console.groq.com (GRATUIT, pas de carte bancaire)";
              } else {
                setupInstructions = "\n\n🔧 SOLUTION : Configurez GEMINI_KEY_2 (ou GEMINI_API_KEY) dans Supabase Dashboard > Edge Functions > analyze-fund > Settings > Secrets.\n📖 Guide : https://makersuite.google.com/app/apikey";
              }
            }
          }
        } catch {
          // ignore
        }
        return new Response(JSON.stringify({ 
          error: errorMessage + setupInstructions,
          setupRequired: setupInstructions.length > 0
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          error: `${AI_PROVIDER === "groq" ? "Groq" : "Gemini"} API error (${status})`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    
    // Handle different response formats: Groq vs Gemini
    let content: string;
    if (AI_PROVIDER === "groq") {
      content = data.choices?.[0]?.message?.content || "";
    } else {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    if (!content) {
      console.error(`No content in ${AI_PROVIDER} response:`, JSON.stringify(data));
      
      if (AI_PROVIDER === "gemini" && data.candidates?.[0]?.finishReason === "SAFETY") {
        return new Response(JSON.stringify({ 
          error: "Content was blocked by safety filters. Please try a different query." 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: `No content in ${AI_PROVIDER} response` 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    let analysisResult;
    try {
      analysisResult = parseJSONResponse(content);
    } catch (parseError) {
      console.error(`Failed to parse ${AI_PROVIDER} response:`, parseError);
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      normalizeReportToSlides(r).map((s) => ({
        title: String((s as any).title ?? ""),
        content: String((s as any).content ?? ""),
        keyPoints: Array.isArray((s as any).keyPoints) ? (s as any).keyPoints : [],
        metrics: (s as any).metrics && typeof (s as any).metrics === "object" ? (s as any).metrics : undefined,
      }))
    );

    console.log("Analysis complete:", fundName || 'Custom Thesis');
    console.log("Startups found:", analysisResult.startups?.length || 0);
    console.log("Startups enriched with sources:", enrichedStartups.filter((s: any) => s.sources?.length > 0).length);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});