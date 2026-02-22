import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutopickRequest {
  phase: "source" | "pick" | "dd_search" | "dd_analyze";
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
}

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

interface ScoredStartup {
  name: string;
  url: string;
  description: string;
  signalType: string;
  francophoneScore: number;
  thesisFitScore: number;
  evidenceScore: number;
  totalScore: number;
  sources: string[];
}

// ─── Supabase REST helpers ────────────────────────────────────────────────────

function supabaseHeaders(serviceKey: string) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

async function createSourcingJob(
  supabaseUrl: string,
  serviceKey: string,
  payload: Record<string, unknown>
): Promise<string> {
  const res = await fetch(`${supabaseUrl}/rest/v1/sourcing_jobs`, {
    method: "POST",
    headers: supabaseHeaders(serviceKey),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`createSourcingJob failed ${res.status}: ${errText}`);
  }
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row?.id) throw new Error("createSourcingJob: no id returned");
  return row.id as string;
}

async function updateSourcingJob(
  supabaseUrl: string,
  serviceKey: string,
  jobId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/sourcing_jobs?id=eq.${encodeURIComponent(jobId)}`,
    {
      method: "PATCH",
      headers: supabaseHeaders(serviceKey),
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`updateSourcingJob failed ${res.status}: ${errText}`);
  }
}

async function getSourcingJob(
  supabaseUrl: string,
  serviceKey: string,
  jobId: string
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/sourcing_jobs?id=eq.${encodeURIComponent(jobId)}&select=*`,
    { headers: supabaseHeaders(serviceKey) }
  );
  if (!res.ok) throw new Error(`getSourcingJob failed ${res.status}`);
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) throw new Error(`Sourcing job ${jobId} not found`);
  return row as Record<string, unknown>;
}

// ─── Search helpers ───────────────────────────────────────────────────────────

async function webSearch(
  query: string,
  count = 5
): Promise<SearchResult[]> {
  const SERPER_KEY = Deno.env.get("SERPER_API_KEY") || Deno.env.get("serper_api");
  const BRAVE_KEY = Deno.env.get("BRAVE_API_KEY");

  if (SERPER_KEY) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num: Math.min(count, 10), gl: "fr", hl: "fr" }),
      });
      if (res.ok) {
        const data = await res.json();
        return (data.organic || []).slice(0, count).map((r: Record<string, string>) => ({
          title: r.title || "",
          url: r.link || "",
          description: r.snippet || "",
        }));
      }
    } catch (serperErr) {
      console.warn("[webSearch] Serper failed:", serperErr);
    }
  }

  if (BRAVE_KEY) {
    try {
      const url =
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "X-Subscription-Token": BRAVE_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        return (data.web?.results || []).map((r: Record<string, string | string[]>) => ({
          title: (r.title as string) || "",
          url: (r.url as string) || "",
          description: (r.description as string) || "",
        }));
      }
    } catch (braveErr) {
      console.warn("[webSearch] Brave failed:", braveErr);
    }
  }

  return [];
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Maximum number of search queries to execute in the source phase (keeps the phase under 60 s). */
const MAX_QUERIES_TO_AVOID_TIMEOUT = 14;
/** Delay between search API calls to stay within rate limits. */
const RATE_LIMIT_DELAY_MS = 400;

// ─── France-biased sourcing ───────────────────────────────────────────────────

async function runFranceBiasedSourcing(
  fundName?: string,
  customThesis?: AutopickRequest["customThesis"]
): Promise<SearchResult[]> {
  const sectors = customThesis?.sectors?.length
    ? customThesis.sectors.slice(0, 3)
    : ["IA", "Deeptech", "SaaS"];
  const stage = customThesis?.stage || "seed";

  // Core France/Francophone queries — broad but targeted
  const queries: string[] = [];

  for (const sector of sectors) {
    queries.push(`startup ${sector} France 2024 levée de fonds ${stage} maddyness`);
    queries.push(`${sector} startup France Bpifrance financement innovation 2024`);
    queries.push(`${sector} French Tech startup fondateur France 2024`);
    queries.push(`CNRS INRIA spin-off ${sector} startup France fondateur chercheur`);
    queries.push(`${sector} startup France Belgique Suisse francophone seed série A 2024`);
    queries.push(`${sector} entreprise innovante Station F Paris Île-de-France 2024`);
  }

  // Fund-specific queries if a fund name is provided
  if (fundName && fundName !== "Custom Thesis") {
    queries.push(`startup similaire portefeuille ${fundName} France`);
    queries.push(`${fundName} portfolio thèse France startup investissement`);
  }

  // Extra France-specific searches
  queries.push("maddyness.com startup française prometteuse 2024");
  queries.push("lesechos.fr startup France levée de fonds 2024");
  queries.push("Bpifrance startup french tech seed 2024 innovation");
  queries.push("deeptech France Polytechnique ENS CentraleSupélec spin-off 2024");
  queries.push("Quebec startup francophone IA financement 2024");

  const seen = new Set<string>();
  const allResults: SearchResult[] = [];

  // Execute queries with a small delay to avoid rate limits — cap to stay within timeout
  for (const q of queries.slice(0, MAX_QUERIES_TO_AVOID_TIMEOUT)) {
    const results = await webSearch(q, 5);
    for (const r of results) {
      if (r.url && !seen.has(r.url)) {
        seen.add(r.url);
        allResults.push(r);
      }
    }
    await sleep(RATE_LIMIT_DELAY_MS);
  }

  return allResults;
}

// ─── AI helpers ───────────────────────────────────────────────────────────────

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
  const GEMINI_KEY = Deno.env.get("GEMINI_KEY_2") || Deno.env.get("GEMINI_API_KEY");
  const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro";

  if (GROQ_KEY) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "{}";
    }
  }

  if (GEMINI_KEY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: {
          temperature: 0.4,
          response_mime_type: "application/json",
        },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    }
  }

  throw new Error("No AI provider configured (GROQ_API_KEY or GEMINI_KEY_2 required)");
}

function safeParseJSON(raw: string): unknown {
  const clean = raw.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(clean.slice(start, end + 1));
    } catch (firstParseErr) {
      console.warn("[safeParseJSON] first parse failed:", firstParseErr);
    }
  }
  try {
    return JSON.parse(clean);
  } catch (parseErr) {
    console.warn("[safeParseJSON] fallback parse failed:", parseErr);
    return {};
  }
}

// ─── Phase: source ────────────────────────────────────────────────────────────

async function phaseSource(
  supabaseUrl: string,
  serviceKey: string,
  fundName?: string,
  customThesis?: AutopickRequest["customThesis"]
): Promise<{ jobId: string; status: string }> {
  // 1. Create the sourcing job
  const jobId = await createSourcingJob(supabaseUrl, serviceKey, {
    fund_name: fundName || null,
    custom_thesis: customThesis || null,
    params: { fundName, customThesis },
    status: "pending",
  });

  try {
    // 2. Run France-biased sourcing
    const rawResults = await runFranceBiasedSourcing(fundName, customThesis);

    // 3. Use AI to identify & rank startups
    const sectors = customThesis?.sectors?.join(", ") || "Tech, IA, Deeptech";
    const stage = customThesis?.stage || "seed";
    const geography = customThesis?.geography || "France et écosystème francophone";

    const systemPrompt = `Tu es un expert en sourcing de startups pour un fonds VC avec une forte priorité pour l'écosystème France et francophone (France, Belgique, Suisse, Québec, Maroc, fondateurs français à l'étranger).

Critères d'investissement :
- Secteurs: ${sectors}
- Stade: ${stage}
- Géographie préférée: ${geography}${fundName ? `\n- Fond de référence: ${fundName}` : ""}

Tu dois identifier les 5 meilleures startups prometteuses depuis les résultats de recherche fournis.

Pour chaque startup, attribue un score (0-10) sur :
- francophoneScore: lien avec la France/francophonie (siège, fondateurs, écosystème)
- thesisFitScore: adéquation avec la thèse (secteur, stade, géographie)
- evidenceScore: qualité des preuves (sources, signaux récents, traction)
- totalScore: moyenne pondérée (francophone x 0.35, thesis x 0.35, evidence x 0.30)

Réponds UNIQUEMENT en JSON valide avec la structure :
{
  "startups": [
    {
      "name": "...",
      "url": "...",
      "description": "...",
      "signalType": "presse|bpifrance|spinoff|recrutement|financement",
      "francophoneScore": 8,
      "thesisFitScore": 7,
      "evidenceScore": 6,
      "totalScore": 7.1,
      "sources": ["url1", "url2"]
    }
  ]
}`;

    const searchSummary = rawResults
      .slice(0, 40)
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.description}\n   URL: ${r.url}`)
      .join("\n\n");

    const userPrompt = `Voici les résultats de recherche sur les startups françaises et francophones :\n\n${searchSummary}\n\nIdentifie et classe les 5 meilleures startups en JSON.`;

    const aiRaw = await callAI(systemPrompt, userPrompt);
    const aiData = safeParseJSON(aiRaw) as { startups?: ScoredStartup[] };
    const startups: ScoredStartup[] = Array.isArray(aiData?.startups)
      ? aiData.startups
      : [];

    // 4. Persist results
    await updateSourcingJob(supabaseUrl, serviceKey, jobId, {
      search_context: { rawResults: rawResults.slice(0, 50), startups },
      search_results_count: rawResults.length,
      status: "analyze_done",
    });

    return { jobId, status: "analyze_done" };
  } catch (err) {
    await updateSourcingJob(supabaseUrl, serviceKey, jobId, {
      status: "error",
      error_message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ─── Phase: pick ──────────────────────────────────────────────────────────────

async function phasePick(
  supabaseUrl: string,
  serviceKey: string,
  jobId: string
): Promise<{ jobId: string; status: string; pickedCompany: { name: string; url: string } }> {
  const job = await getSourcingJob(supabaseUrl, serviceKey, jobId);

  if (job.status !== "analyze_done") {
    throw new Error(`Job ${jobId} must be in analyze_done status to pick (current: ${job.status})`);
  }

  const searchContext = job.search_context as {
    startups?: ScoredStartup[];
    rawResults?: SearchResult[];
  } | null;

  let pickedName = "";
  let pickedUrl = "";

  // Sort by totalScore and pick #1
  const startups = searchContext?.startups || [];
  if (startups.length > 0) {
    const sorted = [...startups].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    pickedName = sorted[0].name || "";
    pickedUrl = sorted[0].url || "";
  }

  // Fallback: extract company name from raw results via AI if no structured startups
  if (!pickedName && searchContext?.rawResults?.length) {
    const systemPrompt = `Tu es un expert VC. Depuis les résultats de recherche, identifie LA startup la plus prometteuse et donne uniquement son nom et son URL. Réponds en JSON: {"name":"...","url":"..."}`;
    const userPrompt = (searchContext.rawResults || [])
      .slice(0, 20)
      .map((r) => `${r.title}: ${r.description} | ${r.url}`)
      .join("\n");
    const aiRaw = await callAI(systemPrompt, userPrompt);
    const parsed = safeParseJSON(aiRaw) as { name?: string; url?: string };
    pickedName = parsed?.name || "";
    pickedUrl = parsed?.url || "";
  }

  if (!pickedName) throw new Error("Could not identify a startup to pick from sourcing results");

  await updateSourcingJob(supabaseUrl, serviceKey, jobId, {
    picked_company_name: pickedName,
    picked_company_url: pickedUrl || null,
    status: "picked",
  });

  return { jobId, status: "picked", pickedCompany: { name: pickedName, url: pickedUrl } };
}

// ─── Phase: dd_search ─────────────────────────────────────────────────────────

async function phaseDdSearch(
  supabaseUrl: string,
  serviceKey: string,
  jobId: string
): Promise<{ jobId: string; ddJobId: string; status: string }> {
  const job = await getSourcingJob(supabaseUrl, serviceKey, jobId);

  if (job.status !== "picked") {
    throw new Error(`Job ${jobId} must be in picked status to run dd_search (current: ${job.status})`);
  }

  const companyName = (job.picked_company_name as string) || "";
  const companyUrl = (job.picked_company_url as string) || undefined;

  if (!companyName) throw new Error("No picked company name found in sourcing job");

  // Call the existing due-diligence function — phase 1 (search)
  const ddRes = await fetch(`${supabaseUrl}/functions/v1/due-diligence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({
      phase: "search",
      companyName,
      companyWebsite: companyUrl,
      additionalContext: "Startup sélectionnée automatiquement par le pipeline de sourcing France/Francos.",
    }),
  });

  const ddText = await ddRes.text();
  let ddData: { jobId?: string; error?: string } = {};
  try {
    ddData = ddText ? JSON.parse(ddText) : {};
  } catch (parseErr) {
    console.warn("[phaseDdSearch] failed to parse DD response:", parseErr);
  }

  if (!ddRes.ok || !ddData.jobId) {
    throw new Error(
      `due-diligence search phase failed (${ddRes.status}): ${ddData.error || ddText.slice(0, 200)}`
    );
  }

  const ddJobId = ddData.jobId;

  await updateSourcingJob(supabaseUrl, serviceKey, jobId, {
    dd_job_id: ddJobId,
    status: "dd_search_done",
  });

  return { jobId, ddJobId, status: "dd_search_done" };
}

// ─── Phase: dd_analyze ────────────────────────────────────────────────────────

async function phaseDdAnalyze(
  supabaseUrl: string,
  serviceKey: string,
  jobId: string
): Promise<{ jobId: string; status: string; result: unknown }> {
  const job = await getSourcingJob(supabaseUrl, serviceKey, jobId);

  if (job.status !== "dd_search_done") {
    throw new Error(
      `Job ${jobId} must be in dd_search_done status to run dd_analyze (current: ${job.status})`
    );
  }

  const ddJobId = job.dd_job_id as string;
  if (!ddJobId) throw new Error("No dd_job_id found in sourcing job");

  // Call the existing due-diligence function — phase 2 (analyze)
  const ddRes = await fetch(`${supabaseUrl}/functions/v1/due-diligence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({ phase: "analyze", jobId: ddJobId }),
  });

  const ddText = await ddRes.text();
  let ddResult: unknown = null;
  try {
    const parsed = ddText ? JSON.parse(ddText) : null;
    // Accept 200/OK or 546/500 if it looks like a valid report
    if (ddRes.ok) {
      ddResult = parsed;
    } else if (
      (ddRes.status === 546 || ddRes.status === 500) &&
      parsed &&
      !parsed.error &&
      (parsed.company != null || parsed.executiveSummary != null)
    ) {
      ddResult = parsed;
    } else if (!ddRes.ok) {
      const errMsg =
        (parsed as Record<string, string>)?.error ||
        (parsed as Record<string, string>)?.message ||
        `HTTP ${ddRes.status}`;
      throw new Error(`due-diligence analyze phase failed: ${errMsg}`);
    }
  } catch (parseErr) {
    if (!ddRes.ok) {
      throw new Error(`due-diligence analyze phase failed (${ddRes.status}): ${ddText.slice(0, 200)}`);
    }
    throw parseErr;
  }

  if (!ddResult) throw new Error("due-diligence analyze returned an empty result");

  // Persist final result in sourcing job
  await updateSourcingJob(supabaseUrl, serviceKey, jobId, {
    result: ddResult,
    status: "dd_analyze_done",
  });

  return { jobId, status: "dd_analyze_done", result: ddResult };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase configuration (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: AutopickRequest = await req.json();
    const { phase, jobId, fundName, customThesis } = body;

    if (!phase) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: "phase"' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: unknown;

    switch (phase) {
      case "source":
        result = await phaseSource(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, fundName, customThesis);
        break;

      case "pick":
        if (!jobId) throw new Error("jobId required for phase pick");
        result = await phasePick(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, jobId);
        break;

      case "dd_search":
        if (!jobId) throw new Error("jobId required for phase dd_search");
        result = await phaseDdSearch(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, jobId);
        break;

      case "dd_analyze":
        if (!jobId) throw new Error("jobId required for phase dd_analyze");
        result = await phaseDdAnalyze(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, jobId);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown phase: ${phase}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[autopick-dd] error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
