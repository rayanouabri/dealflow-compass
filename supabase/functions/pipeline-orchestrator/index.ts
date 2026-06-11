// Pipeline Orchestrator — Edge Function principale
// Gère le pipeline complet : thesis → sourcing → pick → DD
// Utilise un pattern de self-invocation (fire-and-forget) pour chaîner les étapes
// car Supabase Edge Functions n'expose pas EdgeRuntime.waitUntil()

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "../_shared/logger.ts";
import { callAI } from "../_shared/ai-client.ts";
import { searchAll } from "../_shared/search-client.ts";
import { buildFrenchBiasedQueries } from "../_shared/sourcing-queries-fr.ts";
import { deduplicateAndRank, filterByICP } from "../_shared/dedup-ranker.ts";
import { searchNewCompanies, inseeToSearchResults } from "../_shared/insee-sirene.ts";
import { searchHackerNews, hnToSearchResults } from "../_shared/hn-algolia.ts";
import { searchGitHub, githubToSearchResults } from "../_shared/github-search.ts";
import { resolveEntities } from "../_shared/entity-cleanup.ts";
import { buildLinkedInQueries } from "../_shared/linkedin-signals.ts";
import { buildIPPatentQueries } from "../_shared/ip-patent-signals.ts";
import {
  buildScoringPrompt,
  buildBatchScoringPrompt,
  computeWeightedScore,
  DEFAULT_WEIGHTS,
} from "../_shared/scoring-engine.ts";
import {
  THESIS_ANALYSIS_SYSTEM_PROMPT,
  buildThesisAnalysisPrompt,
} from "../_shared/prompts/thesis-analysis.ts";

// --- CORS ---
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
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResp(
  body: unknown,
  status = 200,
  req: Request,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(req),
    },
  });
}

// --- Supabase admin client ---
function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// --- Self-invocation pour chaîner les étapes ---
// Appelle l'étape suivante dans une nouvelle invocation (pour ne pas dépasser
// le wall-time). CLÉ : on garde l'isolate en vie avec EdgeRuntime.waitUntil
// jusqu'à ce que la requête soit réellement envoyée — sinon l'isolate est
// détruit avant l'envoi et l'invocation suivante ne part jamais (jobs figés).
async function fireContinue(pipelineId: string): Promise<void> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const post = fetch(
    `${SUPABASE_URL}/functions/v1/pipeline-orchestrator`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ action: "continue", pipelineId }),
    },
  )
    .then((r) => r.text())
    .catch((err) =>
      logger.error("Self-invocation échouée", { error: String(err), pipelineId })
    );

  // @ts-ignore EdgeRuntime est fourni par le runtime Supabase
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(post);
  } else {
    await post; // fallback local
  }
}

// --- Helpers DB ---
async function updateJob(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("pipeline_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`DB update error: ${error.message}`);
}

async function markError(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  id: string,
  errorMessage: string,
  errorStep: string,
  retryCount: number,
  maxRetries: number,
): Promise<void> {
  const shouldRetry = retryCount < maxRetries;
  if (shouldRetry) {
    await updateJob(supabase, id, {
      retry_count: retryCount + 1,
      error_message: errorMessage,
      error_step: errorStep,
      // Garde le même status pour re-essayer l'étape
    });
    // Backoff exponentiel avant retry
    const backoff = Math.pow(2, retryCount) * 1000;
    await new Promise((r) => setTimeout(r, backoff));
    await fireContinue(id);
  } else {
    await updateJob(supabase, id, {
      status: "error",
      error_message: errorMessage,
      error_step: errorStep,
    });
  }
}

// ============================================================
// STEP 1 : Analyse de la thèse
// ============================================================
async function handleThesisAnalysis(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  job: any,
): Promise<void> {
  logger.info("handleThesisAnalysis", { pipelineId: job.id });

  const userPrompt = buildThesisAnalysisPrompt(
    job.fund_name,
    job.custom_thesis,
  );

  const thesisAnalysis = await callAI(
    THESIS_ANALYSIS_SYSTEM_PROMPT,
    userPrompt,
    { temperature: 0.2, maxTokens: 2048 },
  );

  await updateJob(supabase, job.id, {
    thesis_analysis: thesisAnalysis,
    status: "thesis_done",
    current_step: 1,
  });

  await fireContinue(job.id);
}

// ============================================================
// STEP 2 : Sourcing multi-source (FR + Global)
// ============================================================
async function handleSourcingStart(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  job: any,
): Promise<void> {
  logger.info("handleSourcingStart", { pipelineId: job.id });

  await updateJob(supabase, job.id, { status: "sourcing_running" });

  const thesis = job.thesis_analysis as any;
  const sectors: string[] = thesis?.sectors ?? ["deeptech", "startup"];
  const stage: string = thesis?.stage?.min ?? "seed";
  const geography: string = thesis?.geography?.primary ?? "France";

  // Profil d'entreprise idéal (ICP) — sert à cibler et filtrer strictement
  const icp = thesis?.idealCompanyProfile ?? {};
  const precisionTerms: string[] = [
    ...(icp.mustHaveKeywords ?? []),
    ...(thesis?.techKeywords ?? []),
    ...(thesis?.subSectors ?? []),
  ];
  const exclusionTerms: string[] = icp.exclusionKeywords ?? [];

  // Sources structurées GRATUITES (sans coût Serper), lancées en parallèle
  // de la recherche web → aucune latence ajoutée.
  const isFrench =
    thesis?.geography?.frenchBias === true ||
    /fr|france|paris|île-de-france|ile-de-france|europe/i.test(geography);

  // Termes pour HN / GitHub : secteur + techKeywords (anglais). On n'utilise PAS
  // les mustHaveKeywords (souvent en français) car ces plateformes sont anglophones.
  const freeApiTerms = [sectors[0], ...(thesis?.techKeywords ?? [])]
    .filter(Boolean)
    .slice(0, 3);

  // INSEE : registre FR (immatriculations récentes). FR/Europe uniquement.
  const inseePromise = isFrench
    ? searchNewCompanies({
        nafCodes: icp.nafCodes,
        nameTokens: icp.inseeNameTokens,
        postalPrefixes: /paris|île-de-france|ile-de-france/i.test(geography)
          ? ["75", "77", "78", "91", "92", "93", "94", "95"]
          : [],
        sinceDays: 120,
        maxResults: 25,
      })
    : Promise.resolve([]);
  // Hacker News (Show HN) : signal produit global.
  const hnPromise = searchHackerNews({ terms: freeApiTerms, maxResults: 20 });
  // GitHub : pertinent uniquement pour les thèses tech/logicielles.
  const isTechThesis =
    /saas|software|logiciel|\bai\b|\bml\b|\bdata\b|dev|cloud|\bapi\b|crypto|web3|cyber|infra|platform|plateforme|fintech|deeptech|hardware|robot|iot/i
      .test(
        JSON.stringify([sectors, thesis?.techKeywords, thesis?.subSectors]),
      );
  const githubPromise = isTechThesis
    ? searchGitHub({ terms: freeApiTerms, maxResults: 20 })
    : Promise.resolve([]);

  // Génère les queries FR biaisées, ciblées sur le type d'entreprise visé
  const queryGroups = buildFrenchBiasedQueries(sectors, stage, geography, {
    precisionTerms,
    exclusionTerms,
  });

  // Ajoute les queries prioritaires de l'analyse IA
  const priorityQueries: string[] =
    thesis?.searchStrategy?.priorityQueries ?? [];

  // Limite à ~70 calls API total
  const allQueries: { category: string; query: string }[] = [];

  for (const group of queryGroups) {
    for (const q of group.queries) {
      allQueries.push({ category: group.category, query: q });
    }
  }

  for (const q of priorityQueries.slice(0, 10)) {
    allQueries.push({ category: "ai_priority", query: q });
  }

  // Signaux LinkedIn (pages société, founders ex-GAFAM, hiring, exits) et
  // IP/brevets (Google Patents, INPI/EPO, inventeur→fondateur). Additif : ces
  // requêtes web (site:) ne remplacent rien, elles enrichissent les signaux.
  const signalYear = new Date().getFullYear();
  const sectorSeed = sectors[0] || "tech";
  // LinkedIn : on privilégie les requêtes qui ciblent des PAGES SOCIÉTÉ
  // (site:linkedin.com/company) plutôt que des profils de personnes (/in/),
  // car le pipeline source des ENTREPRISES.
  const companyLinkedIn = ["hiring_burst", "investor_connection", "department_head", "advisor_network"];
  const linkedinQueries = buildLinkedInQueries(sectorSeed, geography, signalYear)
    .filter((q) => companyLinkedIn.includes(q.signalType))
    .slice(0, 8);
  for (const { query } of linkedinQueries) {
    allQueries.push({ category: "linkedin", query });
  }
  // IP : signaux qui ramènent un NOM d'entreprise/fondateur (inventeur→fondateur,
  // citations de brevets, github). On EXCLUT tech_journal (ramène des publis /
  // pages de recherche, pas des entreprises) et les bases de brevets brutes.
  const usefulIp = ["inventor_movement", "patent_citation", "github_innovation"];
  const ipQueries = buildIPPatentQueries(sectorSeed, geography, signalYear)
    .filter((q) => usefulIp.includes(q.signalType))
    .slice(0, 8);
  for (const { query } of ipQueries) {
    allQueries.push({ category: "ip", query });
  }

  // Cap relevé de 70 → 88 pour absorber LinkedIn+IP sans tronquer le reste.
  const limited = allQueries.slice(0, 88);
  const BATCH_SIZE = 5;
  const allResults: any[] = [];

  for (let i = 0; i < limited.length; i += BATCH_SIZE) {
    const batch = limited.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async ({ category, query }) => {
        const results = await searchAll(query, 5);
        return results.map((r) => ({ ...r, category }));
      }),
    );
    allResults.push(...batchResults.flat());

    // Pause entre les batches
    if (i + BATCH_SIZE < limited.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Fusionne les candidats des sources structurées (noms fiables) avec le web
  const [inseeCompanies, hnStartups, githubOrgs] = await Promise.all([
    inseePromise,
    hnPromise,
    githubPromise,
  ]);
  allResults.push(...inseeToSearchResults(inseeCompanies));
  allResults.push(...hnToSearchResults(hnStartups));
  allResults.push(...githubToSearchResults(githubOrgs));
  logger.info("Sources structurées", {
    insee: inseeCompanies.length,
    hn: hnStartups.length,
    github: githubOrgs.length,
  });

  const ranked = deduplicateAndRank(allResults);
  // Filtre strict on-thesis : écarte les acteurs hors-profil, priorise l'ICP
  const filtered = filterByICP(ranked, {
    mustHave: precisionTerms,
    exclude: exclusionTerms,
  });
  // Garde-fou : si le filtre est trop agressif, on retombe sur le ranking brut
  const prefiltered = filtered.length >= 5 ? filtered : ranked;

  // Résolution d'entités IA : nettoie noms, filtre le bruit (comptes perso,
  // labos, repos sans société), priorise les vraies startups on-thesis.
  const candidates = await resolveEntities(prefiltered, thesis, 30);

  await updateJob(supabase, job.id, {
    sourcing_results: candidates.map((c) => ({
      ...c,
      categories: Array.from(c.categories),
    })),
    status: "sourcing_done",
    current_step: 3,
  });

  await fireContinue(job.id);
}

// ============================================================
// STEP 3 : Picking — sélection de la meilleure startup
// ============================================================
async function handlePicking(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  job: any,
): Promise<void> {
  logger.info("handlePicking", { pipelineId: job.id });

  await updateJob(supabase, job.id, { status: "picking" });

  const sourcingResults: any[] = job.sourcing_results ?? [];
  const thesis = job.thesis_analysis;

  // Top candidats. La couche de résolution d'entités a déjà pré-classé par
  // pertinence à la thèse → scorer le top 6 suffit.
  const top10 = sourcingResults.slice(0, 6).map((c) => ({
    ...c,
    categories: new Set(c.categories ?? []),
  }));

  if (top10.length === 0) {
    throw new Error("Aucun candidat trouvé lors du sourcing");
  }

  const toScored = (candidate: any, result: any) => ({
    name: candidate.name,
    url: candidate.url,
    descriptions: candidate.descriptions?.slice(0, 3) ?? [],
    mentionCount: candidate.mentionCount,
    categories: Array.from(candidate.categories),
    sources: candidate.sources,
    scores: result?.scores ?? {},
    totalWeighted: computeWeightedScore(result?.scores ?? {}, DEFAULT_WEIGHTS),
    redFlags: result?.redFlags ?? [],
    whyNow: result?.whyNow ?? "",
    whyThisStartup: result?.whyThisStartup ?? "",
    comparables: result?.comparables ?? [],
    riskLevel: result?.riskLevel ?? "medium",
  });

  const scoredCandidates: any[] = [];

  // BATCH : un seul appel IA pour scorer tout le top (économise le quota Gemini).
  try {
    const batch = (await callAI(
      "Tu es un analyste VC. Réponds uniquement en JSON valide.",
      buildBatchScoringPrompt(top10, thesis),
      { temperature: 0.1, maxTokens: 4096 },
    )) as any;
    for (const r of batch?.rankings ?? []) {
      const idx = r?.index;
      if (typeof idx === "number" && idx >= 0 && idx < top10.length) {
        scoredCandidates.push(toScored(top10[idx], r));
      }
    }
  } catch (err) {
    logger.warn("Scoring batché échoué — fallback unitaire", {
      error: String(err),
    });
  }

  // Fallback : si le batch n'a rien donné, score unitairement le top 3.
  if (scoredCandidates.length === 0) {
    for (const candidate of top10.slice(0, 3)) {
      try {
        const result = (await callAI(
          "Tu es un analyste VC. Réponds uniquement en JSON valide.",
          buildScoringPrompt(candidate, thesis),
          { temperature: 0.1, maxTokens: 1024 },
        )) as any;
        scoredCandidates.push(toScored(candidate, result));
      } catch (err) {
        logger.warn("Scoring unitaire échoué", {
          name: candidate.name,
          error: String(err),
        });
      }
    }
  }

  scoredCandidates.sort((a, b) => b.totalWeighted - a.totalWeighted);
  const pickedStartup = scoredCandidates[0];

  if (!pickedStartup) {
    throw new Error("Impossible de scorer les candidats");
  }

  await updateJob(supabase, job.id, {
    picked_startup: pickedStartup,
    status: "pick_done",
    current_step: 5,
  });

  await fireContinue(job.id);
}

// ============================================================
// STEP 4 : DD Search
// ============================================================
async function handleDDSearch(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  job: any,
): Promise<void> {
  logger.info("handleDDSearch", { pipelineId: job.id });

  await updateJob(supabase, job.id, { status: "dd_search_running" });

  const pickedStartup = job.picked_startup as any;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const ddResp = await fetch(
    `${SUPABASE_URL}/functions/v1/due-diligence`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        phase: "search",
        companyName: pickedStartup.name,
        companyWebsite: pickedStartup.url,
      }),
    },
  );

  if (!ddResp.ok) {
    const txt = await ddResp.text();
    throw new Error(`DD search échoué: ${ddResp.status} — ${txt}`);
  }

  const ddData = await ddResp.json();
  const ddJobId = ddData.jobId;

  if (!ddJobId) {
    throw new Error("DD search n'a pas retourné de jobId");
  }

  await updateJob(supabase, job.id, {
    dd_job_id: ddJobId,
    status: "dd_search_done",
    current_step: 6,
  });

  await fireContinue(job.id);
}

// ============================================================
// STEP 5 : DD Analyze
// ============================================================
async function handleDDAnalyze(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  job: any,
): Promise<void> {
  logger.info("handleDDAnalyze", { pipelineId: job.id });

  await updateJob(supabase, job.id, { status: "dd_analyze_running" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const ddResp = await fetch(
    `${SUPABASE_URL}/functions/v1/due-diligence`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        phase: "analyze",
        jobId: job.dd_job_id,
      }),
    },
  );

  if (!ddResp.ok) {
    const txt = await ddResp.text();
    throw new Error(`DD analyze échoué: ${ddResp.status} — ${txt}`);
  }

  const finalResult = await ddResp.json();
  const completedAt = new Date().toISOString();
  const startedAt = job.started_at ? new Date(job.started_at).getTime() : null;
  const durationMs = startedAt
    ? Date.now() - startedAt
    : null;

  await updateJob(supabase, job.id, {
    final_result: finalResult,
    status: "dd_done",
    current_step: 7,
    completed_at: completedAt,
    ...(durationMs !== null ? { duration_ms: durationMs } : {}),
  });
}

// ============================================================
// ACTION: start
// ============================================================
async function handleStart(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  body: any,
  req: Request,
): Promise<Response> {
  const { fundName, customThesis } = body;

  const { data: job, error } = await supabase
    .from("pipeline_jobs")
    .insert({
      fund_name: fundName ?? null,
      custom_thesis: customThesis ?? null,
      status: "thesis_analyzing",
      current_step: 0,
      total_steps: 7,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !job) {
    logger.error("Création pipeline_jobs échouée", { error: error?.message });
    return jsonResp({ error: "Impossible de créer le job" }, 500, req);
  }

  logger.info("Pipeline démarré", { pipelineId: job.id });

  // Lance la première étape de manière asynchrone
  await fireContinue(job.id);

  return jsonResp({ pipelineId: job.id }, 200, req);
}

// ============================================================
// ACTION: continue
// ============================================================
async function handleContinue(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  body: any,
  req: Request,
): Promise<Response> {
  const { pipelineId } = body;

  if (!pipelineId) {
    return jsonResp({ error: "pipelineId requis" }, 400, req);
  }

  const { data: job, error } = await supabase
    .from("pipeline_jobs")
    .select("*")
    .eq("id", pipelineId)
    .single();

  if (error || !job) {
    return jsonResp({ error: "Job introuvable" }, 404, req);
  }

  const { status, retry_count, max_retries } = job;

  logger.info("handleContinue", { pipelineId, status });

  try {
    switch (status) {
      case "thesis_analyzing":
        await handleThesisAnalysis(supabase, job);
        break;
      case "thesis_done":
        await handleSourcingStart(supabase, job);
        break;
      case "sourcing_running":
        // Cas de retry : le sourcing était en cours mais a échoué
        await handleSourcingStart(supabase, job);
        break;
      case "sourcing_done":
        await handlePicking(supabase, job);
        break;
      case "picking":
        // Retry picking
        await handlePicking(supabase, job);
        break;
      case "pick_done":
        await handleDDSearch(supabase, job);
        break;
      case "dd_search_running":
        // Retry DD search
        await handleDDSearch(supabase, job);
        break;
      case "dd_search_done":
        await handleDDAnalyze(supabase, job);
        break;
      case "dd_analyze_running":
        // Retry DD analyze
        await handleDDAnalyze(supabase, job);
        break;
      case "dd_done":
      case "error":
        // Rien à faire
        break;
      default:
        logger.warn("Status inconnu", { status, pipelineId });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("Étape pipeline échouée", {
      pipelineId,
      status,
      error: errorMessage,
    });
    await markError(
      supabase,
      pipelineId,
      errorMessage,
      status,
      retry_count,
      max_retries,
    );
  }

  return jsonResp({ ok: true }, 200, req);
}

// ============================================================
// WATCHDOG : auto-réparation des jobs figés
// ============================================================
// Seuils > durée normale de chaque étape. Les états "_done" sont des handoffs
// (le fireContinue suivant peut mourir) → seuil court. dd_done/error = terminaux.
const STUCK_THRESHOLDS_MS: Record<string, number> = {
  thesis_analyzing: 45_000,
  thesis_done: 20_000,
  sourcing_running: 200_000,
  sourcing_done: 20_000,
  picking: 120_000,
  pick_done: 20_000,
  dd_search_running: 150_000,
  dd_search_done: 20_000,
  dd_analyze_running: 300_000,
};

async function selfHealIfStuck(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  job: any,
): Promise<void> {
  const threshold = STUCK_THRESHOLDS_MS[job.status];
  if (!threshold) return; // état terminal ou inconnu

  const updatedAt = job.updated_at ? new Date(job.updated_at).getTime() : 0;
  if (Date.now() - updatedAt < threshold) return;

  const retry = job.retry_count ?? 0;
  const maxRetries = job.max_retries ?? 3;
  if (retry >= maxRetries) {
    await updateJob(supabase, job.id, {
      status: "error",
      error_message: `Job figé au stade ${job.status} (watchdog)`,
      error_step: job.status,
    });
    return;
  }

  logger.warn("Watchdog : job figé, relance auto", {
    pipelineId: job.id,
    status: job.status,
    ageMs: Date.now() - updatedAt,
  });
  // Incrémente retry_count ET touche updated_at → évite une rafale de relances
  // entre deux polls (3s) avant que l'étape relancée ne mette à jour le status.
  await updateJob(supabase, job.id, { retry_count: retry + 1 });
  await fireContinue(job.id);
}

// ============================================================
// ACTION: sweep — balayage des jobs figés (appelé par un cron pg_cron).
// Rend la reprise indépendante du polling frontend.
// ============================================================
async function handleSweep(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  req: Request,
): Promise<Response> {
  // Jobs non terminaux, pas mis à jour depuis au moins 20s (plus petit seuil).
  const cutoff = new Date(Date.now() - 20_000).toISOString();
  const { data: jobs, error } = await supabase
    .from("pipeline_jobs")
    .select("id, status, updated_at, retry_count, max_retries")
    .not("status", "in", "(dd_done,error)")
    .lt("updated_at", cutoff)
    .limit(50);

  if (error) {
    logger.error("Sweep : lecture échouée", { error: error.message });
    return jsonResp({ error: error.message }, 500, req);
  }

  let candidates = 0;
  for (const job of jobs ?? []) {
    candidates++;
    // selfHealIfStuck applique le seuil par état et relance si vraiment figé.
    await selfHealIfStuck(supabase, job);
  }

  logger.info("Sweep terminé", { scanned: jobs?.length ?? 0 });
  return jsonResp({ scanned: candidates }, 200, req);
}

// ============================================================
// ACTION: status
// ============================================================
async function handleStatus(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  body: any,
  req: Request,
): Promise<Response> {
  const { pipelineId } = body;

  if (!pipelineId) {
    return jsonResp({ error: "pipelineId requis" }, 400, req);
  }

  const { data: job, error } = await supabase
    .from("pipeline_jobs")
    .select(
      "id, status, current_step, total_steps, picked_startup, error_message, dd_job_id, completed_at, thesis_analysis, created_at, started_at, updated_at, retry_count, max_retries",
    )
    .eq("id", pipelineId)
    .single();

  if (error || !job) {
    return jsonResp({ error: "Job introuvable" }, 404, req);
  }

  // Watchdog : auto-répare un job figé (instance async tuée sans throw → status
  // bloqué sans erreur). Seuils > durée normale de l'étape pour ne pas relancer
  // une étape simplement lente. Déclenché par le polling du frontend.
  await selfHealIfStuck(supabase, job);

  // Résumé de la thèse (pas le JSON complet)
  const thesisSummary = job.thesis_analysis
    ? {
        sectors: (job.thesis_analysis as any)?.sectors,
        stage: (job.thesis_analysis as any)?.stage,
        geography: (job.thesis_analysis as any)?.geography,
      }
    : null;

  return jsonResp(
    {
      id: job.id,
      status: job.status,
      currentStep: job.current_step,
      totalSteps: job.total_steps,
      pickedStartup: job.picked_startup,
      errorMessage: job.error_message,
      ddJobId: job.dd_job_id,
      completedAt: job.completed_at,
      thesisSummary,
      createdAt: job.created_at,
      startedAt: job.started_at,
    },
    200,
    req,
  );
}

// ============================================================
// SERVE
// ============================================================
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new Response("JSON invalide", { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { action } = body;

  logger.info("pipeline-orchestrator appelé", { action });

  switch (action) {
    case "start":
      return handleStart(supabase, body, req);
    case "continue":
      return handleContinue(supabase, body, req);
    case "status":
      return handleStatus(supabase, body, req);
    case "sweep":
      return handleSweep(supabase, req);
    default:
      return jsonResp({ error: `Action inconnue: ${action}` }, 400, req);
  }
});
