import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ─────────────────────────────────────────────
// ARCHITECTURE — 4 phases autonomes
//
// search_fund     : Recherche thèse du fonds (parallel, ~20s)
// search_market   : Recherche startups + sélection IA de la meilleure (~35s)
// search_startups : Appelle due-diligence phase search (~80s)
// analyze         : Appelle due-diligence phase analyze → rapport + slides (~90s)
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

// ─── Search helpers (for phases 1 & 2 only) ─────────────────────────────────

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
      if (res.status === 401 || res.status === 403) { _serperFailed = true; }
      return [];
    }
    const data = await res.json();
    return (data.organic || []).slice(0, count).map((r: any) => ({
      title: r.title || "", url: r.link || "", description: r.snippet || "", extra_snippets: [],
    }));
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

// ─── AI endpoint (for phase 2 selection only) ────────────────────────────────

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
    if (!tokenData?.access_token) throw new Error("Vertex AI token missing access_token");
    return {
      url: `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL}:generateContent`,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenData.access_token}` },
      isVertex: true,
    };
  }

  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY manquante.");
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

function parseJSON(content: string): any {
  if (!content || typeof content !== "string") throw new Error("Content is not a string");
  let s = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = s.indexOf("{"), end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  try { return JSON.parse(s); } catch (e1) {
    try { return JSON.parse(s.replace(/,(\s*[}\]])/g, "$1")); } catch {
      throw new Error(`JSON parse failed: ${e1 instanceof Error ? e1.message : String(e1)}`);
    }
  }
}

// ─── DD result → Slides (for Analyse.tsx compatibility) ──────────────────────

function ddResultToSlides(dd: any, startup: any): any[] {
  if (!dd || typeof dd !== "object") dd = {};

  const s = (x: any) => {
    if (!x) return "Non disponible";
    const str = typeof x === "string" ? x : String(x);
    return str.trim() || "Non disponible";
  };
  const arr = (x: any): string[] => Array.isArray(x) ? x.filter((i: any) => typeof i === "string" && i.trim()) : [];
  const srcs = (x: any) => Array.isArray(x?.sources) ? x.sources.filter((src: any) => src && typeof src === "object") : [];

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

// ─── Helper: call the due-diligence Edge Function ────────────────────────────

async function callDueDiligence(supUrl: string, supKey: string, body: object): Promise<{ ok: boolean; data: any; error?: string }> {
  const ddUrl = `${supUrl}/functions/v1/due-diligence`;
  console.log(`[analyze-fund] → Appel due-diligence: ${JSON.stringify(body).slice(0, 120)}...`);

  try {
    const res = await fetch(ddUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supKey}`,
        "apikey": supKey,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`[analyze-fund] ← due-diligence ${res.status}: ${text.slice(0, 300)}`);
      return { ok: false, data: null, error: `due-diligence ${res.status}: ${text.slice(0, 200)}` };
    }

    try {
      const data = JSON.parse(text);
      return { ok: true, data };
    } catch {
      return { ok: false, data: null, error: `Réponse due-diligence non-JSON: ${text.slice(0, 200)}` };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[analyze-fund] ← due-diligence fetch error: ${msg}`);
    return { ok: false, data: null, error: msg };
  }
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

      const getJob = async (id: string) => {
        if (!id) return null;
        const res = await fetch(`${SUP_URL}/rest/v1/sourcing_jobs?id=eq.${encodeURIComponent(id)}&select=*`, { headers: dbH });
        if (!res.ok) return null;
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
        if (!newJobId) return err("Échec création job sourcing - ID invalide", 500);
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
            matchScore: 60,
          };
        }

        if (!selectedStartup?.name) {
          return err(`Aucune startup trouvée. ${unique.length} résultats mais extraction échouée.`, 500);
        }
        console.log(`[analyze-fund] ✅ Startup sélectionnée: "${selectedStartup.name}"`);

        const patchRes = await patchJob(jobId, { search_context: { ...ctx, selectedStartup, startupSearchCount: unique.length }, status: "market_done" });
        if (!patchRes.ok) return err("Échec mise à jour job (search_market)", 500);
        return ok({ jobId });
      }

      // ─────────────────────────────────────────────────────────────────────
      // PHASE 3 : SEARCH STARTUPS — Appelle due-diligence phase search
      // ─────────────────────────────────────────────────────────────────────
      if (phase === "search_startups" && jobId) {
        const job = await getJob(jobId);
        if (!job || job.status !== "market_done") return err(`Job invalide pour search_startups (status: ${job?.status})`);

        const ctx = job.search_context as any;
        const startup = ctx.selectedStartup;
        const companyName = startup?.name || "";
        const companyWebsite = startup?.website || "";

        if (!companyName) return err("Aucune startup sélectionnée. Phase search_market manquante ou échouée.", 400);
        console.log(`[analyze-fund] search_startups → due-diligence search: "${companyName}"`);

        // Appel direct à la fonction due-diligence (phase search)
        const ddSearch = await callDueDiligence(SUP_URL, SUP_KEY, {
          companyName,
          companyWebsite: companyWebsite || undefined,
          additionalContext: startup.searchContext || startup.matchReason || undefined,
        });

        if (!ddSearch.ok) {
          return err(`Échec due-diligence search: ${ddSearch.error}`, 500);
        }

        const ddJobId = ddSearch.data?.jobId;
        const ddSearchCount = ddSearch.data?.searchResultsCount || 0;
        if (!ddJobId) {
          return err("due-diligence n'a pas retourné de jobId", 500);
        }

        console.log(`[analyze-fund] ✅ DD search done: ddJobId=${ddJobId}, ${ddSearchCount} résultats`);

        // Sauvegarder le ddJobId dans le sourcing_job pour la phase analyze
        const patchRes = await patchJob(jobId, {
          search_context: { ...ctx, ddJobId, ddSearchCount },
          search_results_count: ddSearchCount,
          status: "search_done",
        });
        if (!patchRes.ok) return err("Échec mise à jour job (search_startups)", 500);
        return ok({ jobId });
      }

      // ─────────────────────────────────────────────────────────────────────
      // PHASE 4 : ANALYZE — Appelle due-diligence phase analyze → slides
      // ─────────────────────────────────────────────────────────────────────
      if (phase === "analyze" && jobId) {
        const job = await getJob(jobId);
        if (!job || job.status !== "search_done") return err(`Job invalide pour analyze (status: ${job?.status})`);

        const ctx = job.search_context as any;
        const selectedStartup = ctx.selectedStartup || {};
        const ddJobId = ctx.ddJobId;
        const fundThesisContext = ctx.fundThesisContext || "";
        const fundNameLocal = job.fund_name || "";
        const thesis = job.custom_thesis || {};

        if (!ddJobId) {
          return err("ddJobId manquant. Relancez search_startups.", 400);
        }

        const companyName = selectedStartup.name || "";
        console.log(`[analyze-fund] analyze → due-diligence analyze: "${companyName}" (ddJobId=${ddJobId})`);

        // Appel direct à la fonction due-diligence (phase analyze)
        const ddAnalyze = await callDueDiligence(SUP_URL, SUP_KEY, {
          phase: "analyze",
          jobId: ddJobId,
        });

        if (!ddAnalyze.ok) {
          return err(`Échec due-diligence analyze: ${ddAnalyze.error}`, 500);
        }

        const ddResult = ddAnalyze.data;
        if (!ddResult || typeof ddResult !== "object") {
          return err("due-diligence a retourné un résultat vide", 500);
        }

        console.log(`[analyze-fund] ✅ DD analyze done: recommendation=${ddResult.investmentRecommendation?.recommendation}`);

        // Map DD result to slides (for Analyse.tsx)
        const slides = ddResultToSlides(ddResult, selectedStartup);

        // Startup card data
        const startupCard = {
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
          sectors: thesis.sectors || [startupCard.sector],
          stage: thesis.stage || startupCard.stage,
          geography: thesis.geography || startupCard.location,
          ticketSize: thesis.ticketSize || ddResult.investmentRecommendation?.suggestedTicket || "",
          description: fundThesisContext.slice(0, 600) || thesis.description || "",
        };

        const finalResult = {
          investmentThesis,
          fundInfo: { name: fundNameLocal || "", sources: ctx.fundSources || [] },
          startups: [startupCard],
          dueDiligenceReports: [slides],
          ddResult,
          selectedStartup,
          analysisMetadata: {
            confidence: ddResult.executiveSummary?.confidenceLevel || "medium",
            dataQuality: ddResult.dataQuality?.overallScore || "good",
            searchResultsCount: ctx.ddSearchCount || job.search_results_count || 0,
            lastUpdated: new Date().toISOString(),
          },
        };

        const patchResFinal = await patchJob(jobId, { result: finalResult, status: "analyze_done" });
        if (!patchResFinal.ok) return err("Échec mise à jour job final (analyze)", 500);

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
