import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ─────────────────────────────────────────────
// ARCHITECTURE — 4 phases autonomes
//
// search_fund     : Recherche thèse du fonds (parallel, ~20s)
// search_market   : Recherche startups + sélection IA de la meilleure (~35s)
// search_startups : Full DD search sur la startup sélectionnée (~80s)
// analyze         : Full DD analyze → rapport complet + slides (~90s)
// ─────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://ai-vc-sourcing.vercel.app",
  "https://dealflow-compass.vercel.app",
  "https://dealflow-compass-rayanouabris-projects.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
];

function corsHeaders(req: Request | null): Record<string, string> {
  const origin = req?.headers?.get?.("origin") ?? "";
  const allow =
    origin &&
    (ALLOWED_ORIGINS.includes(origin) ||
      /^https:\/\/(dealflow-compass|ai-vc-sourcing)[a-z0-9-]*\.vercel\.app$/.test(origin))
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

// ─── Search helpers ───────────────────────────────────────────────────────────

interface SearchResult {
  title: string;
  url: string;
  description: string;
  extra_snippets?: string[];
}

let _serperFailed = false;
let _braveFailed = false;

async function search(query: string, count = 20): Promise<SearchResult[]> {
  const SERPER_KEY = Deno.env.get("SERPER_API_KEY") || Deno.env.get("serper_api");
  const BRAVE_KEY = Deno.env.get("BRAVE_API_KEY");
  if (SERPER_KEY && !_serperFailed) {
    const res = await serperSearch(query, count, SERPER_KEY);
    if (res.length > 0) return res;
  }
  if (BRAVE_KEY && !_braveFailed) {
    return braveSearchFn(query, count, BRAVE_KEY);
  }
  return [];
}

async function serperSearch(query: string, count: number, key: string): Promise<SearchResult[]> {
  try {
    console.log(`[Serper] ${query.slice(0, 60)}...`);
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: Math.min(count, 20) }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`[Serper] ${res.status}: ${txt.slice(0, 100)}`);
      if (res.status === 401 || res.status === 403) { _serperFailed = true; console.error("[Serper] ❌ Clé invalide"); }
      return [];
    }
    const data = await res.json();
    const results = (data.organic || []).slice(0, count).map((r: any) => ({
      title: r.title || "", url: r.link || "", description: r.snippet || "", extra_snippets: [],
    }));
    console.log(`[Serper] ✅ ${results.length} résultats`);
    return results;
  } catch { return []; }
}

async function braveSearchFn(query: string, count: number, key: string): Promise<SearchResult[]> {
  if (_braveFailed) return [];
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
        { headers: { "Accept": "application/json", "X-Subscription-Token": key } },
      );
      if (res.ok) {
        const data = await res.json();
        return (data.web?.results || []).map((r: any) => ({
          title: r.title || "", url: r.url || "", description: r.description || "", extra_snippets: r.extra_snippets || [],
        }));
      }
      if (res.status === 401 || res.status === 403 || res.status === 422) { _braveFailed = true; return []; }
      if (res.status === 429 && i === 0) { await sleep(2000); continue; }
      return [];
    } catch { if (i === 1) return []; await sleep(1000); }
  }
  return [];
}

// ─── AI endpoint ─────────────────────────────────────────────────────────────

async function getAIEndpoint(): Promise<{ url: string; headers: Record<string, string>; isVertex: boolean }> {
  const AI_PROVIDER = (Deno.env.get("AI_PROVIDER") || "gemini").toLowerCase();
  const GEMINI_KEY = Deno.env.get("GEMINI_KEY_2") || Deno.env.get("GEMINI_API_KEY");
  const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro";
  const VERTEX_PROJECT = Deno.env.get("VERTEX_AI_PROJECT_ID");
  const VERTEX_CREDS_RAW = Deno.env.get("VERTEX_AI_CREDENTIALS");
  const VERTEX_MODEL = Deno.env.get("VERTEX_AI_MODEL") || "gemini-2.5-pro";
  const VERTEX_LOCATION = Deno.env.get("VERTEX_AI_LOCATION") || "us-central1";

  if (AI_PROVIDER === "vertex" && VERTEX_PROJECT && VERTEX_CREDS_RAW) {
    let creds: any;
    try {
      creds = typeof VERTEX_CREDS_RAW === "string" ? JSON.parse(VERTEX_CREDS_RAW) : VERTEX_CREDS_RAW;
    } catch (e) {
      throw new Error(`VERTEX_AI_CREDENTIALS JSON invalide: ${e instanceof Error ? e.message : "Parse error"}`);
    }
    const b64url = (d: Uint8Array | string) => {
      const b = typeof d === "string" ? new TextEncoder().encode(d) : d;
      return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    };
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const payload = { iss: creds.client_email, sub: creds.client_email, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600, scope: "https://www.googleapis.com/auth/cloud-platform" };
    const msg = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
    const pem = creds.private_key.replace(/\\n/g, "\n").replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
    const keyBuf = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
    const privKey = await crypto.subtle.importKey("pkcs8", keyBuf, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privKey, new TextEncoder().encode(msg));
    const jwt = `${msg}.${b64url(new Uint8Array(sig))}`;
    const tr = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    });
    if (!tr.ok) throw new Error("Vertex AI token failed");
    const tokenData = await tr.json();
    const token = tokenData?.access_token;
    if (!token) throw new Error("Vertex AI token response missing access_token");
    return {
      url: `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL}:generateContent`,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      isVertex: true,
    };
  }

  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY manquante. Configurez GEMINI_KEY_2 ou GEMINI_API_KEY dans les secrets Supabase.");
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    headers: { "Content-Type": "application/json" },
    isVertex: false,
  };
}

function makeBody(text: string, maxTokens: number, isVertex: boolean, temp = 0.15) {
  return isVertex
    ? { contents: [{ role: "user", parts: [{ text }] }], generationConfig: { temperature: temp, maxOutputTokens: maxTokens } }
    : { contents: [{ parts: [{ text }] }], generationConfig: { temperature: temp, maxOutputTokens: maxTokens, responseMimeType: "application/json" as const } };
}

// ─── JSON parsing ─────────────────────────────────────────────────────────────

function parseJSON(content: string): any {
  if (!content || typeof content !== "string") throw new Error("Content is not a string");

  let s = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  if (!s) throw new Error("Content is empty after trimming");

  const start = s.indexOf("{"), end = s.lastIndexOf("}");
  if (start >= 0 && end > start) {
    s = s.slice(start, end + 1);
  }

  try {
    return JSON.parse(s);
  } catch (e1) {
    try {
      // Try fixing trailing commas
      const fixed = s.replace(/,(\s*[}\]])/g, "$1");
      return JSON.parse(fixed);
    } catch (e2) {
      // Try fixing single quotes
      try {
        const fixed2 = s.replace(/'/g, '"');
        return JSON.parse(fixed2);
      } catch (e3) {
        throw new Error(`JSON parse failed: ${e1 instanceof Error ? e1.message : String(e1)}`);
      }
    }
  }
}

// ─── Search context builder (same as due-diligence) ──────────────────────────

function buildDDContext(results: SearchResult[]): string {
  if (!Array.isArray(results) || results.length === 0) return "";

  const uniq = new Map<string, SearchResult>();
  results.forEach(r => {
    if (r && r.url && typeof r.url === "string" && r.url.trim() && !uniq.has(r.url)) {
      uniq.set(r.url, r);
    }
  });
  const deduped = Array.from(uniq.values());

  if (deduped.length === 0) return "";

  const cats: Record<string, SearchResult[]> = { funding: [], metrics: [], team: [], product: [], market: [], news: [], linkedin: [], crunchbase: [], other: [] };
  deduped.forEach(r => {
    const url = r.url.toLowerCase(), title = r.title.toLowerCase(), desc = r.description.toLowerCase();
    if (url.includes("linkedin.com")) cats.linkedin.push(r);
    else if (url.includes("crunchbase.com")) cats.crunchbase.push(r);
    else if (title.includes("funding") || title.includes("raised") || desc.includes("series") || desc.includes("valuation") || desc.includes("investor")) cats.funding.push(r);
    else if (desc.includes("arr") || desc.includes("mrr") || desc.includes("revenue") || title.includes("revenue") || desc.includes("growth") || desc.includes("customer")) cats.metrics.push(r);
    else if (title.includes("founder") || title.includes("ceo") || title.includes("team") || desc.includes("executive")) cats.team.push(r);
    else if (title.includes("product") || title.includes("technology") || title.includes("platform") || title.includes("solution")) cats.product.push(r);
    else if (title.includes("market") || title.includes("competitor") || title.includes("industry")) cats.market.push(r);
    else if (url.includes("techcrunch") || url.includes("venturebeat") || url.includes("reuters") || title.includes("announce")) cats.news.push(r);
    else cats.other.push(r);
  });

  let ctx = "";
  const addCat = (name: string, items: SearchResult[], limit = 10) => {
    if (!items.length) return;
    ctx += `\n\n=== ${name.toUpperCase()} ===\n`;
    items.slice(0, limit).forEach((r, i) => {
      ctx += `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.description}\n`;
      if (r.extra_snippets?.length) ctx += `Extra: ${r.extra_snippets.slice(0, 2).join(" | ")}\n`;
    });
  };
  addCat("Official & Company Info", [...cats.other], 40);
  addCat("Funding & Investments", cats.funding, 35);
  addCat("Metrics & Traction", cats.metrics, 30);
  addCat("Team & Founders", cats.team, 28);
  addCat("Product & Technology", cats.product, 28);
  addCat("Market & Competition", cats.market, 28);
  addCat("News & Press", cats.news, 22);
  addCat("LinkedIn", cats.linkedin, 10);
  addCat("Crunchbase", cats.crunchbase, 10);
  return ctx;
}

// ─── DD result → Slides (for Analyse.tsx compatibility) ──────────────────────

function ddResultToSlides(dd: any, startup: any, fundCtx: string): any[] {
  if (!dd || typeof dd !== "object") dd = {};

  const s = (x: any) => {
    if (!x) return "Non disponible";
    const str = typeof x === "string" ? x : String(x);
    return str && str.trim() ? str.trim() : "Non disponible";
  };

  const arr = (x: any): string[] => {
    if (!Array.isArray(x)) return [];
    return x.filter((i: any) => typeof i === "string" && i.trim()).map(i => String(i).trim());
  };

  const srcs = (x: any) => {
    if (!x || !Array.isArray(x?.sources)) return [];
    return x.sources.filter((src: any) => src && typeof src === "object");
  };

  return [
    {
      title: "Executive Summary",
      content: s(dd.executiveSummary?.overview),
      keyPoints: arr(dd.executiveSummary?.keyHighlights).slice(0, 6),
      metrics: {
        recommendation: s(dd.executiveSummary?.recommendation),
        confidenceLevel: s(dd.executiveSummary?.confidenceLevel),
        stage: s(dd.company?.stage),
        sector: s(dd.company?.sector),
        headquarters: s(dd.company?.headquarters),
        founded: s(dd.company?.founded),
        fitScore: startup?.matchScore ?? null,
      },
      sources: srcs(dd.executiveSummary).concat((dd.allSources || []).slice(0, 4)),
    },
    {
      title: "Market Analysis",
      content: s(dd.market?.analysis),
      keyPoints: arr(dd.market?.trends).slice(0, 5),
      metrics: { tam: s(dd.market?.tam), sam: s(dd.market?.sam), som: s(dd.market?.som), cagr: s(dd.market?.cagr) },
      sources: srcs(dd.market),
    },
    {
      title: "Product & Technology",
      content: [s(dd.product?.description), dd.product?.valueProposition && s(dd.product.valueProposition) !== "Non disponible" ? `\n\nProposition de valeur : ${s(dd.product.valueProposition)}` : ""].filter(Boolean).join(""),
      keyPoints: arr(dd.product?.keyFeatures).slice(0, 6),
      metrics: { techStack: s(dd.product?.technology), patents: s(dd.product?.patents), pmfScore: null },
      sources: srcs(dd.product),
    },
    {
      title: "Business Metrics & Traction",
      content: s(dd.traction?.overview),
      keyPoints: [
        ...(dd.traction?.keyMilestones || []).slice(0, 4).map((m: any) => typeof m === "string" ? m : (m?.milestone ? `${m.date ? m.date + " — " : ""}${m.milestone}` : "")).filter(Boolean),
        ...arr(dd.traction?.partnerships).slice(0, 2).map((p: string) => `🤝 ${p}`),
      ],
      metrics: {
        totalFunding: s(dd.financials?.totalFunding),
        latestValuation: s(dd.financials?.latestValuation),
        customers: s(dd.traction?.customers?.count),
        teamSize: s(dd.team?.teamSize),
        ...(dd.financials?.metrics && typeof dd.financials.metrics === "object" ? dd.financials.metrics : {}),
      },
      sources: srcs(dd.financials).concat(srcs(dd.traction)),
    },
    {
      title: "Competitive Analysis",
      content: s(dd.competition?.landscape),
      keyPoints: [
        dd.competition?.competitiveAdvantage ? `Avantage : ${s(dd.competition.competitiveAdvantage).slice(0, 120)}` : "",
        dd.competition?.moat ? `Moat : ${s(dd.competition.moat).slice(0, 120)}` : "",
        ...(dd.competition?.competitors || []).slice(0, 4).map((c: any) => `• ${s(c?.name)}: ${s(c?.description).slice(0, 80)}`),
      ].filter(x => x && !x.includes("Non disponible")),
      metrics: { competitorCount: (dd.competition?.competitors || []).length, moat: s(dd.competition?.moat).slice(0, 100) },
      sources: srcs(dd.competition),
    },
    {
      title: "Team Assessment",
      content: s(dd.team?.overview),
      keyPoints: (dd.team?.founders || []).slice(0, 4).map((f: any) =>
        `${s(f?.name)} (${s(f?.role)})${f?.background ? ` — ${String(f.background).slice(0, 100)}` : ""}`
      ).filter((x: string) => !x.startsWith("Non disponible")),
      metrics: {
        teamSize: s(dd.team?.teamSize),
        founders: (dd.team?.founders || []).map((f: any) => ({ name: s(f?.name), role: s(f?.role), linkedin: f?.linkedin || null })),
        hiringTrends: s(dd.team?.hiringTrends),
        advisors: arr(dd.team?.keyExecutives?.map?.((e: any) => e?.name)).slice(0, 3),
      },
      sources: srcs(dd.team),
    },
    {
      title: "Investment Recommendation",
      content: [
        s(dd.investmentRecommendation?.rationale),
        startup?.matchReason ? `\n\n🎯 CORRESPONDANCE FONDS : ${startup.matchReason}` : "",
        arr(dd.risks?.mitigations).length ? `\n\nMitigations : ${arr(dd.risks.mitigations).slice(0, 3).join(" | ")}` : "",
      ].filter(Boolean).join(""),
      keyPoints: [
        ...arr(dd.investmentRecommendation?.strengths).slice(0, 3).map((x: string) => `✅ ${x}`),
        ...arr(dd.investmentRecommendation?.weaknesses).slice(0, 2).map((x: string) => `⚠️ ${x}`),
        ...arr(dd.investmentRecommendation?.keyQuestions).slice(0, 2).map((x: string) => `❓ ${x}`),
      ],
      metrics: {
        recommendation: s(dd.investmentRecommendation?.recommendation || dd.executiveSummary?.recommendation),
        targetReturn: s(dd.investmentRecommendation?.targetReturn),
        riskLevel: s(dd.risks?.overallRiskLevel),
        suggestedTicket: s(dd.investmentRecommendation?.suggestedTicket),
        investmentHorizon: s(dd.investmentRecommendation?.investmentHorizon),
        fitScore: startup?.matchScore ?? null,
      },
      sources: (dd.allSources || []).slice(0, 6),
    },
  ];
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: { ...corsHeaders(req), "Content-Type": "text/plain" } });
  }

  return (async (): Promise<Response> => {
    try {
      const body = await req.json().catch(() => ({}));
      const { phase, jobId, fundName, customThesis, params = {} } = body as any;

      const SUP_URL = Deno.env.get("SUPABASE_URL") || "";
      const SUP_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (!SUP_URL || !SUP_KEY) {
        return new Response(JSON.stringify({ error: "Configuration Supabase manquante (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)" }), { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      }

      const dbH = { "apikey": SUP_KEY, "Authorization": `Bearer ${SUP_KEY}`, "Content-Type": "application/json" };
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

      const getJob = async (id: string) => {
        if (!id) return null;
        const res = await fetch(`${SUP_URL}/rest/v1/sourcing_jobs?id=eq.${encodeURIComponent(id)}&select=*`, { headers: dbH });
        if (!res.ok) {
          console.error(`[getJob] API error ${res.status}`);
          return null;
        }
        const list = await res.json();
        return (Array.isArray(list) && list.length > 0) ? list[0] : null;
      };
      const patchJob = async (id: string, data: object) => {
        return fetch(`${SUP_URL}/rest/v1/sourcing_jobs?id=eq.${encodeURIComponent(id)}`, {
          method: "PATCH", headers: dbH, body: JSON.stringify({ ...data, updated_at: new Date().toISOString() }),
        });
      };
      const ok = (data: object) => new Response(JSON.stringify(data), { headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
      const err = (msg: string, status = 400) => new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });

      // ─────────────────────────────────────────────────────────────────────
      // PHASE 1 : SEARCH FUND — Recherche thèse du fonds en parallèle
      // ─────────────────────────────────────────────────────────────────────
      if (phase === "search_fund") {
        const thesis = customThesis || {};
        const name = fundName || thesis.description || "fonds VC";
        const sector = thesis.sectors?.[0] || "technology";
        const geo = thesis.geography || "europe";

        console.log(`[analyze-fund] search_fund: "${name}"`);

        const [fundR, portfolioR, teamR, criteriaR] = await Promise.all([
          search(`${name} investment thesis sectors stage geography ticket criteria`, 12),
          fundName ? search(`${name} portfolio companies investments 2023 2024 2025`, 10) : Promise.resolve([] as SearchResult[]),
          fundName ? search(`${name} team partners managing director investors`, 8) : Promise.resolve([] as SearchResult[]),
          search(`${sector} ${thesis.stage || "seed"} startup ${geo} funded 2024 2025`, 10),
        ]);

        const fundThesisContext = [
          fundR.map(r => `${r.title}: ${r.description}`).join("\n"),
          portfolioR.length ? "--- PORTFOLIO ---\n" + portfolioR.map(r => `${r.title}: ${r.description}`).join("\n") : "",
          teamR.length ? "--- TEAM ---\n" + teamR.map(r => `${r.title}: ${r.description}`).join("\n") : "",
        ].filter(Boolean).join("\n\n");

        const fundSources = [...fundR, ...portfolioR].slice(0, 8).map(r => ({ name: r.title.slice(0, 60), url: r.url }));
        const initialResults = criteriaR.map(r => ({ name: r.title.split(" - ")[0].split(" | ")[0].trim(), url: r.url, description: r.description }));

        const insertRes = await fetch(`${SUP_URL}/rest/v1/sourcing_jobs`, {
          method: "POST",
          headers: { ...dbH, "Prefer": "return=representation" },
          body: JSON.stringify({
            fund_name: fundName || null,
            custom_thesis: customThesis || null,
            params: params || {},
            search_context: { fundThesisContext, fundSources, initialResults },
            status: "fund_done",
          }),
        });
        if (!insertRes.ok) {
          const errText = await insertRes.text().catch(() => "");
          console.error(`[search_fund] DB insert error ${insertRes.status}: ${errText.slice(0, 200)}`);
          return err("Échec création job sourcing", 500);
        }
        const insertData = await insertRes.json();
        const newJobId = (Array.isArray(insertData) && insertData.length > 0) ? insertData[0]?.id : insertData?.id;
        if (!newJobId || typeof newJobId !== "string") return err("Échec création job sourcing - ID invalide", 500);
        return ok({ jobId: newJobId });
      }

      // ─────────────────────────────────────────────────────────────────────
      // PHASE 2 : SEARCH MARKET — Recherche startups + sélection IA
      // ─────────────────────────────────────────────────────────────────────
      if (phase === "search_market" && jobId) {
        const job = await getJob(jobId);
        if (!job || job.status !== "fund_done") return err(`Job invalide pour search_market (status: ${job?.status})`);

        const ctx = job.search_context as any;
        const thesis = job.custom_thesis || {};
        const sector = thesis.sectors?.[0] || "technology";
        const stage = thesis.stage || "seed";
        const geo = thesis.geography || "europe";
        const ticket = thesis.ticketSize || "";
        const fundCtx = ctx.fundThesisContext || "";
        const fundNameJob = job.fund_name || "";

        console.log(`[analyze-fund] search_market: sector=${sector}, stage=${stage}, geo=${geo}`);

        // 6 recherches parallèles ciblées par secteur/stade/géo
        const [r1, r2, r3, r4, r5, r6] = await Promise.all([
          search(`${sector} ${stage} startup ${geo} funding raised 2024 2025`, 15),
          search(`best ${sector} startups ${geo} 2024 2025 emerging innovative`, 12),
          search(`site:crunchbase.com ${sector} ${stage} ${geo}`, 10),
          search(`${sector} company ${geo} founded 2020 2021 2022 2023 growth traction`, 12),
          search(`${sector} startup ${geo} series investment ${ticket || "pre-seed seed"} 2024`, 10),
          search(`top ${sector} ${geo} founders team ${stage} startup 2024`, 10),
        ]);

        const allResults = [...r1, ...r2, ...r3, ...r4, ...r5, ...r6];
        const seen = new Set<string>();
        const unique = allResults.filter(r => {
          if (!r.url || typeof r.url !== "string") return false;
          if (seen.has(r.url)) return false;
          seen.add(r.url);
          return true;
        });
        console.log(`[analyze-fund] ${unique.length} résultats startup uniques`);

        // Sélection IA de la meilleure startup
        const aiEndpoint = await getAIEndpoint();
        const selectionPrompt = `Tu es analyste VC senior. Tu dois identifier la startup qui correspond le mieux à la thèse de ce fonds.

FONDS: "${fundNameJob || "thèse personnalisée"}"
THÈSE:
${fundCtx.slice(0, 1800)}

CRITÈRES DE SÉLECTION:
- Secteur: ${sector}
- Stade: ${stage}
- Géographie: ${geo}
${ticket ? `- Ticket cible: ${ticket}` : ""}
${thesis.specificCriteria ? `- Critères spécifiques: ${thesis.specificCriteria}` : ""}
${thesis.description ? `- Description thèse: ${thesis.description}` : ""}

RÉSULTATS DE RECHERCHE (${unique.length} résultats disponibles):
${unique.slice(0, 70).map(r => `• ${r.title} | ${r.description.slice(0, 120)} | URL: ${r.url}`).join("\n")}

MISSION: Identifie la startup RÉELLE la plus pertinente pour ce fonds.
Critères de sélection: secteur exact, bon stade, bonne géographie, données vérifiables, traction réelle.
Évite les agrégateurs, listes, articles génériques. Cherche une vraie entreprise.

Réponds UNIQUEMENT avec ce JSON (pas de markdown):
{
  "name": "Nom exact de la startup",
  "website": "URL officielle si trouvée dans les résultats, sinon null",
  "sector": "${sector}",
  "stage": "${stage}",
  "location": "Ville, Pays",
  "matchScore": 85,
  "matchReason": "Explication détaillée en 2-3 phrases pourquoi cette startup correspond parfaitement à la thèse",
  "searchContext": "Contexte additionnel pertinent trouvé dans les résultats (funding, équipe, traction)",
  "alternates": ["Startup alternative 1", "Startup alternative 2"]
}`;

        const selBody = makeBody(selectionPrompt, 1200, aiEndpoint.isVertex, 0.1);
        const selRes = await fetch(aiEndpoint.url, { method: "POST", headers: aiEndpoint.headers, body: JSON.stringify(selBody) });

        let selectedStartup: any = null;
        if (selRes.ok) {
          const selData = await selRes.json();
          const selText: string = selData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          try { selectedStartup = parseJSON(selText); } catch (_) { console.warn("[analyze-fund] Échec parse sélection startup"); }
        } else {
          console.error(`[analyze-fund] Sélection IA échouée: ${selRes.status}`);
        }

        // Fallback si IA échoue
        if (!selectedStartup?.name && unique.length > 0) {
          const first = unique.find(r => !r.url.includes("crunchbase.com") && !r.url.includes("linkedin.com")) || unique[0];
          selectedStartup = {
            name: (first?.title || "Unknown").split(" -")[0].split(" |")[0].trim().slice(0, 60),
            website: first?.url || null,
            matchReason: "Sélection par défaut (premier résultat pertinent)",
            matchScore: 60
          };
        }

        if (!selectedStartup?.name) {
          return err(`Aucune startup trouvée. ${unique.length} résultats mais extraction échouée.`, 500);
        }
        console.log(`[analyze-fund] ✅ Startup sélectionnée: "${selectedStartup.name}"`);

        const patchRes = await patchJob(jobId, { search_context: { ...ctx, selectedStartup, startupSearchCount: unique.length }, status: "market_done" });
        if (!patchRes.ok) {
          const errText = await patchRes.text().catch(() => "");
          console.error(`[search_market] DB patch error ${patchRes.status}: ${errText.slice(0, 200)}`);
          return err("Échec mise à jour job (search_market)", 500);
        }
        return ok({ jobId });
      }

      // ─────────────────────────────────────────────────────────────────────
      // PHASE 3 : SEARCH STARTUPS — Full DD search (même qualité que due-diligence)
      // ─────────────────────────────────────────────────────────────────────
      if (phase === "search_startups" && jobId) {
        const job = await getJob(jobId);
        if (!job || job.status !== "market_done") return err(`Job invalide pour search_startups (status: ${job?.status})`);

        const ctx = job.search_context as any;
        const startup = ctx.selectedStartup;
        const companyName = startup?.name || "";
        const companyWebsite = startup?.website || "";

        if (!companyName) return err("Aucune startup sélectionnée. Phase search_market manquante ou échouée.", 400);
        console.log(`[analyze-fund] search_startups DD: "${companyName}"`);

        // MÊMES requêtes que la fonction due-diligence (qualité identique)
        const ddQueries = [
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
        ];
        if (companyWebsite) {
          ddQueries.push(`site:${companyWebsite} about`);
          ddQueries.push(`site:${companyWebsite} team`);
        }
        // Requête de correspondance fonds
        if (startup?.matchReason) {
          ddQueries.push(`${companyName} ${job.custom_thesis?.sectors?.[0] || ""} investment thesis`);
        }

        // Batch de 5 en parallèle, délai 400ms (Serper sans rate limit)
        const allResults: SearchResult[] = [];
        const batchSize = 5;
        for (let i = 0; i < ddQueries.length; i += batchSize) {
          const batch = ddQueries.slice(i, i + batchSize);
          try {
            const batchRes = await Promise.all(batch.map(q => search(q, 20).catch(e => {
              console.warn(`[search_startups] Erreur recherche "${q.slice(0, 50)}...": ${e instanceof Error ? e.message : String(e)}`);
              return [];
            })));
            batchRes.forEach(r => {
              if (Array.isArray(r)) allResults.push(...r);
            });
          } catch (batchErr) {
            console.warn(`[search_startups] Erreur batch ${i}-${i + batchSize}: ${batchErr instanceof Error ? batchErr.message : String(batchErr)}`);
          }
          if (i + batchSize < ddQueries.length) await sleep(400);
        }

        const ddContext = buildDDContext(allResults);
        const uniqCount = new Set(allResults.map(r => r.url).filter(Boolean)).size;
        console.log(`[analyze-fund] DD search: ${uniqCount} URLs uniques pour "${companyName}"`);

        if (uniqCount === 0) {
          return err(`Aucun résultat de recherche pour "${companyName}". Vérifiez vos clés API (SERPER_API_KEY / BRAVE_API_KEY).`, 500);
        }

        const patchRes2 = await patchJob(jobId, { search_context: { ...ctx, ddSearchContext: ddContext }, search_results_count: uniqCount, status: "search_done" });
        if (!patchRes2.ok) {
          const errText = await patchRes2.text().catch(() => "");
          console.error(`[search_startups] DB patch error ${patchRes2.status}: ${errText.slice(0, 200)}`);
          return err("Échec mise à jour job (search_startups)", 500);
        }
        return ok({ jobId });
      }

      // ─────────────────────────────────────────────────────────────────────
      // PHASE 4 : ANALYZE — Full DD analyze (même qualité que due-diligence)
      // ─────────────────────────────────────────────────────────────────────
      if (phase === "analyze" && jobId) {
        const job = await getJob(jobId);
        if (!job || job.status !== "search_done") return err(`Job invalide pour analyze (status: ${job?.status})`);

        const ctx = job.search_context as any;
        const selectedStartup = ctx.selectedStartup || {};
        const companyName = selectedStartup.name || job.fund_name || "";
        const ddSearchContext = ctx.ddSearchContext || "";
        const fundThesisContext = ctx.fundThesisContext || "";
        const fundName = job.fund_name || "";
        const thesis = job.custom_thesis || {};

        if (!ddSearchContext.trim()) return err(`Contexte de recherche vide pour "${companyName}". Relancez search_startups.`);
        console.log(`[analyze-fund] analyze DD: "${companyName}"`);

        const aiEndpoint = await getAIEndpoint();

        // ──── Recherche de lacunes (gap queries) comme due-diligence ────
        let enrichedContext = ddSearchContext || "";
        try {
          if (!ddSearchContext || ddSearchContext.trim().length === 0) {
            console.warn("[analyze] Contexte DD vide, skip gap search");
          } else {
            const gapPrompt = `Tu es analyste VC. Contexte de recherche sur "${companyName}":

${ddSearchContext.slice(0, 6000)}

Identifie 2-3 thèmes où les données sont insuffisantes (équipe/fondateurs, métriques, financements, produit).
Pour chaque thème, 1-2 requêtes courtes en anglais.
Réponds UNIQUEMENT en JSON: {"gaps":[{"label":"...","queries":["q1","q2"]}]}
Si suffisant: {"gaps":[]}`;

            const gapBody = makeBody(gapPrompt, 800, aiEndpoint.isVertex, 0.1);
            const gapRes = await fetch(aiEndpoint.url, { method: "POST", headers: aiEndpoint.headers, body: JSON.stringify(gapBody) });
            if (gapRes.ok) {
              const gapData = await gapRes.json();
              const gapText: string = gapData.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (gapText && typeof gapText === "string" && gapText.trim()) {
                try {
                  const parsed = parseJSON(gapText);
                  const gaps: any[] = Array.isArray(parsed?.gaps) ? parsed.gaps : [];
                  const queries: string[] = [];
                  for (const g of gaps.slice(0, 3)) {
                    if (g && Array.isArray(g.queries)) {
                      queries.push(...g.queries.slice(0, 2).map((q: any) => {
                        const str = String(q).trim();
                        return str.length >= 8 ? str : "";
                      }).filter(Boolean));
                    }
                  }
                  const uniqueGapQ = [...new Set(queries)].slice(0, 8);
                  if (uniqueGapQ.length > 0) {
                    const extraLines: string[] = [];
                    const seenUrls = new Set<string>();
                    for (const q of uniqueGapQ) {
                      try {
                        const results = await search(q, 6);
                        if (Array.isArray(results)) {
                          for (const r of results) {
                            if (r && r.url && typeof r.url === "string" && !seenUrls.has(r.url)) {
                              seenUrls.add(r.url);
                              extraLines.push(`${r.title}: ${r.description} | ${r.url}`);
                            }
                          }
                        }
                      } catch (searchErr) {
                        console.warn(`[analyze] Gap search query error "${q.slice(0, 30)}...": ${searchErr instanceof Error ? searchErr.message : ""}`);
                      }
                      await sleep(300);
                    }
                    if (extraLines.length > 0) {
                      enrichedContext = `${ddSearchContext}\n\n=== RECHERCHES COMPLÉMENTAIRES ===\n${extraLines.join("\n").slice(0, 4000)}`;
                      console.log(`[analyze-fund] Enrichissement: ${uniqueGapQ.length} requêtes gap, ${extraLines.length} sources`);
                    }
                  }
                } catch (parseErr) {
                  console.warn(`[analyze] Gap JSON parse error: ${parseErr instanceof Error ? parseErr.message : ""}`);
                }
              }
            } else {
              console.warn(`[analyze] Gap AI request failed: ${gapRes.status}`);
            }
          }
        } catch (gapErr) {
          console.warn("[analyze-fund] Gap search ignoré:", gapErr instanceof Error ? gapErr.message : String(gapErr));
        }

        // ──── Prompt DD complet (identique à due-diligence) ────
        const systemPrompt = `Tu es un analyste VC senior spécialisé en due diligence avec 20 ans d'expérience.
Tu dois produire un rapport de due diligence COMPLET et PROFESSIONNEL sur l'entreprise "${companyName}".

⚠️ RÈGLES CRITIQUES :

1. SOURCES OBLIGATOIRES — MAIS PAS DANS LE TEXTE :
   - NE JAMAIS mettre d'URLs ou de "(Source: ...)" dans les champs texte. Le texte doit rester lisible et professionnel.
   - Chaque information doit avoir une source : place TOUTES les sources UNIQUEMENT dans les tableaux "sources" de chaque section ET dans "allSources" avec { "name": "Titre court", "url": "URL exacte", "type": "article|crunchbase|linkedin|official|press|other", "relevance": "Info clé extraite" }.
   - Minimum 15–25 entrées dans "allSources". Utilise TOUTES les URLs pertinentes des résultats de recherche fournis.
   - NE JAMAIS inventer de données ou d'URLs.

2. DONNÉES VÉRIFIÉES ET ESTIMATIONS :
   - Priorité aux informations trouvées dans les recherches.
   - Si une information n'est PAS trouvée : fournis une ESTIMATION basée sur des comparables, en précisant "Estimation".
   - Pour investmentRecommendation : targetReturn, investmentHorizon, suggestedTicket doivent TOUJOURS être remplis.

3. EXHAUSTIVITÉ — AUCUNE SECTION MINIMALE :
   - MARCHÉ : TAM/SAM/SOM avec chiffres et sources ou estimations. Tendances, régulation, acteurs clés.
   - ÉQUIPE : Pour CHAQUE fondateur : name, role, background, linkedin si trouvé.
   - TRACTION : customers.count, customers.notable, partnerships, awards remplis.
   - Autres sections : estimation + mention "estimation" plutôt que "Non disponible".

4. FORMAT DU RAPPORT :
{
  "company": { "name": "...", "tagline": "...", "website": "...", "linkedinUrl": "...", "crunchbaseUrl": "...", "founded": "...", "headquarters": "...", "sector": "...", "stage": "...", "employeeCount": "..." },
  "executiveSummary": { "overview": "200 mots, SANS URL", "keyHighlights": [], "keyRisks": [], "recommendation": "INVEST|WATCH|PASS", "confidenceLevel": "high|medium|low" },
  "product": { "description": "...", "valueProposition": "...", "technology": "...", "patents": "...", "keyFeatures": [], "sources": [] },
  "market": { "tam": "...", "sam": "...", "som": "...", "cagr": "...", "trends": [], "analysis": "...", "sources": [] },
  "competition": { "landscape": "...", "competitors": [{"name":"...","description":"...","funding":"...","strengths":[],"weaknesses":[]}], "competitiveAdvantage": "...", "moat": "...", "sources": [] },
  "financials": { "fundingHistory": [{"round":"...","amount":"...","date":"...","investors":[],"valuation":"...","source":"..."}], "totalFunding": "...", "latestValuation": "...", "metrics": {}, "sources": [] },
  "team": { "overview": "...", "founders": [{"name":"...","role":"...","background":"...","linkedin":"..."}], "keyExecutives": [], "teamSize": "...", "culture": "...", "hiringTrends": "...", "sources": [] },
  "traction": { "overview": "...", "keyMilestones": [{"date":"...","milestone":"texte seul obligatoire"}], "customers": {"count":"...","notable":[],"segments":"..."}, "partnerships": [], "awards": [], "sources": [] },
  "risks": { "marketRisks": [], "executionRisks": [], "financialRisks": [], "competitiveRisks": [], "regulatoryRisks": [], "mitigations": [], "overallRiskLevel": "low|medium|high", "sources": [] },
  "opportunities": { "growthOpportunities": [], "marketExpansion": "...", "productExpansion": "...", "strategicValue": "...", "sources": [] },
  "investmentRecommendation": { "recommendation": "...", "rationale": "...", "strengths": [], "weaknesses": [], "keyQuestions": [], "suggestedNextSteps": [], "targetReturn": "...", "investmentHorizon": "...", "suggestedTicket": "..." },
  "allSources": [{"name":"...","url":"...","type":"...","relevance":"..."}],
  "dataQuality": { "overallScore": "...", "limitations": [], "sourcesCount": "..." }
}

Réponds UNIQUEMENT avec du JSON valide.`;

        const userPrompt = `Due diligence complète sur "${companyName}"${fundName ? ` — sourcée pour le fonds "${fundName}"` : ""}.

${selectedStartup.matchReason ? `RAISON DE SÉLECTION POUR CE FONDS: ${selectedStartup.matchReason}\n` : ""}
${fundThesisContext ? `\nCONTEXTE FONDS (pour aligner la recommandation):\n${fundThesisContext.slice(0, 1000)}\n` : ""}

=== DONNÉES DE RECHERCHE ===
${enrichedContext}

Génère le rapport de due diligence complet. Utilise toutes les données ci-dessus.`;

        const aiBody = makeBody(`${systemPrompt}\n\n${userPrompt}`, 32768, aiEndpoint.isVertex);
        let aiRes: Response | null = null;
        let lastError = "";

        // Retry logic with exponential backoff (max 3 attempts)
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            aiRes = await fetch(aiEndpoint.url, { method: "POST", headers: aiEndpoint.headers, body: JSON.stringify(aiBody) });

            if (aiRes.ok) break; // Success, exit retry loop

            if (aiRes.status === 429) {
              const backoff = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
              console.warn(`[analyze-fund] Rate limited (429), retry dans ${backoff}ms`);
              await sleep(backoff);
              continue;
            }

            if (aiRes.status >= 500) {
              console.warn(`[analyze-fund] Server error ${aiRes.status}, retry dans ${2000 * (attempt + 1)}ms`);
              await sleep(2000 * (attempt + 1));
              continue;
            }

            // Client errors (4xx except 429) are not retryable
            break;
          } catch (fetchErr) {
            lastError = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
            if (attempt < 2) {
              await sleep(1000 * (attempt + 1));
              continue;
            }
          }
        }

        if (!aiRes) {
          console.error(`[analyze-fund] AI fetch failed: ${lastError}`);
          return err(`Erreur IA (fetch failed): ${lastError.slice(0, 100)}`, 500);
        }

        if (!aiRes.ok) {
          const errText = await aiRes.text().catch(() => "");
          console.error(`[analyze-fund] AI error ${aiRes.status}: ${errText.slice(0, 200)}`);
          return err(`Erreur IA (${aiRes.status}): ${errText.slice(0, 100)}`, aiRes.status >= 500 ? 500 : aiRes.status);
        }

        const aiData = await aiRes.json();
        const content: string = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!content || typeof content !== "string" || !content.trim()) {
          return err("Réponse IA vide", 500);
        }

        let ddResult: any;
        try {
          ddResult = parseJSON(content);
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : "JSON invalide";
          console.error(`[analyze] JSON parse error: ${errMsg}, content preview: ${content.slice(0, 300)}`);
          return err(`Impossible de parser le rapport IA: ${errMsg}`, 500);
        }

        if (!ddResult || typeof ddResult !== "object") {
          return err("Rapport IA invalide (pas un objet JSON)", 500);
        }

        // Sanity checks on mandatory fields
        if (!ddResult.company) ddResult.company = {};
        if (!ddResult.executiveSummary) ddResult.executiveSummary = {};
        if (!ddResult.investmentRecommendation) ddResult.investmentRecommendation = {};
        if (!ddResult.investmentRecommendation.targetReturn) ddResult.investmentRecommendation.targetReturn = "Non disponible";
        if (!ddResult.investmentRecommendation.investmentHorizon) ddResult.investmentRecommendation.investmentHorizon = "Non disponible";
        if (!ddResult.investmentRecommendation.recommendation) ddResult.investmentRecommendation.recommendation = "WATCH";
        if (!ddResult.investmentRecommendation.suggestedTicket) ddResult.investmentRecommendation.suggestedTicket = thesis.ticketSize || "Non disponible";

        // Ensure company name is set
        if (!ddResult.company.name) ddResult.company.name = companyName;
        if (!ddResult.company.name) ddResult.company.name = selectedStartup.name || "Unknown";

        if (ddResult.traction?.keyMilestones && Array.isArray(ddResult.traction.keyMilestones)) {
          ddResult.traction.keyMilestones = ddResult.traction.keyMilestones.map((m: any) => {
            if (!m) return null;
            if (typeof m === "string") return { date: "", milestone: m };
            return {
              date: typeof m?.date === "string" ? m.date : "",
              milestone: typeof m?.milestone === "string" ? m.milestone : String(m?.milestone ?? m ?? "")
            };
          }).filter((m: any) => m && m.milestone);
        }

        // Ensure allSources is an array
        if (!Array.isArray(ddResult.allSources)) ddResult.allSources = [];
        if (ddResult.allSources.length === 0) {
          ddResult.allSources = [{ name: "Search Results", url: "", type: "other", relevance: "DD research context" }];
        }

        // Ensure dataQuality exists
        if (!ddResult.dataQuality) ddResult.dataQuality = { overallScore: "medium", limitations: [], sourcesCount: "0" };
        if (!ddResult.dataQuality.overallScore) ddResult.dataQuality.overallScore = "medium";

        // Map DD result to slides (for Analyse.tsx)
        const slides = ddResultToSlides(ddResult, selectedStartup, fundThesisContext);

        // Startup card data
        const startup = {
          name: ddResult.company?.name || companyName,
          tagline: ddResult.company?.tagline || selectedStartup.matchReason || "",
          sector: ddResult.company?.sector || thesis.sectors?.[0] || "",
          stage: ddResult.company?.stage || thesis.stage || "",
          location: ddResult.company?.headquarters || selectedStartup.location || "",
          founded: ddResult.company?.founded || "",
          teamSize: ddResult.team?.teamSize || "",
          website: ddResult.company?.website || selectedStartup.website || null,
          linkedinUrl: ddResult.company?.linkedinUrl || null,
          crunchbaseUrl: ddResult.company?.crunchbaseUrl || null,
          problem: ddResult.product?.description || "",
          solution: ddResult.product?.valueProposition || "",
          businessModel: typeof ddResult.financials?.metrics?.businessModel === "string" ? ddResult.financials.metrics.businessModel : "",
          moat: ddResult.competition?.moat || "",
          matchScore: selectedStartup.matchScore || null,
          matchReason: selectedStartup.matchReason || "",
          sources: ddResult.allSources || [],
          verificationStatus: (ddResult.dataQuality?.overallScore || "medium") as string,
        };

        const investmentThesis = {
          sectors: thesis.sectors || [startup.sector],
          stage: thesis.stage || startup.stage,
          geography: thesis.geography || startup.location,
          ticketSize: thesis.ticketSize || ddResult.investmentRecommendation?.suggestedTicket || "",
          description: fundThesisContext.slice(0, 600) || thesis.description || "",
        };

        const finalResult = {
          investmentThesis,
          fundInfo: { name: fundName || "", sources: ctx.fundSources || [] },
          startups: [startup],
          dueDiligenceReports: [slides],
          ddResult, // Rapport DD structuré complet (pour usage futur)
          selectedStartup,
          analysisMetadata: {
            confidence: ddResult.executiveSummary?.confidenceLevel || "medium",
            dataQuality: ddResult.dataQuality?.overallScore || "good",
            searchResultsCount: job.search_results_count || 0,
            lastUpdated: new Date().toISOString(),
          },
        };

        const patchResFinal = await patchJob(jobId, { result: finalResult, status: "analyze_done" });
        if (!patchResFinal.ok) {
          const errText = await patchResFinal.text().catch(() => "");
          console.error(`[analyze] DB patch error ${patchResFinal.status}: ${errText.slice(0, 200)}`);
          return err("Échec mise à jour job final (analyze)", 500);
        }
        console.log(`[analyze-fund] ✅ Analyse complète: "${companyName}" | Recommandation: ${ddResult.investmentRecommendation?.recommendation}`);
        return ok(finalResult);
      }

      return err("Phase inconnue. Phases valides: search_fund, search_market, search_startups, analyze");
    } catch (e) {
      console.error("[analyze-fund] Erreur:", e);
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : "Erreur interne du serveur" }),
        { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }
  })();
});
