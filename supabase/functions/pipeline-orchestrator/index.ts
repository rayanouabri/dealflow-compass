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
import { deduplicateAndRank } from "../_shared/dedup-ranker.ts";
import {
  buildScoringPrompt,
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
async function fireContinue(pipelineId: string): Promise<void> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  // Fire-and-forget : appelle soi-même pour continuer le pipeline
  const fireAndForgetPromise = fetch(
    `${SUPABASE_URL}/functions/v1/pipeline-orchestrator`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ action: "continue", pipelineId }),
    },
  ).catch((err) =>
    logger.error("Self-invocation échouée", { error: String(err), pipelineId })
  );
  // fire-and-forget
  void fireAndForgetPromise;
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

  // Génère les queries FR biaisées
  const queryGroups = buildFrenchBiasedQueries(sectors, stage, geography);

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

  const limited = allQueries.slice(0, 70);
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

  const candidates = deduplicateAndRank(allResults);

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

  // Top 10 candidats
  const top10 = sourcingResults.slice(0, 10).map((c) => ({
    ...c,
    categories: new Set(c.categories ?? []),
  }));

  if (top10.length === 0) {
    throw new Error("Aucun candidat trouvé lors du sourcing");
  }

  // Score chaque candidat
  const scoredCandidates: any[] = [];

  for (const candidate of top10) {
    try {
      const scoringPrompt = buildScoringPrompt(candidate, thesis);
      const result = await callAI(
        "Tu es un analyste VC. Réponds uniquement en JSON valide.",
        scoringPrompt,
        { temperature: 0.1, maxTokens: 1024 },
      ) as any;

      const scores = result?.scores ?? {};
      const totalWeighted = computeWeightedScore(scores, DEFAULT_WEIGHTS);

      scoredCandidates.push({
        name: candidate.name,
        url: candidate.url,
        descriptions: candidate.descriptions?.slice(0, 3) ?? [],
        mentionCount: candidate.mentionCount,
        categories: Array.from(candidate.categories),
        sources: candidate.sources,
        scores,
        totalWeighted,
        redFlags: result?.redFlags ?? [],
        whyNow: result?.whyNow ?? "",
        whyThisStartup: result?.whyThisStartup ?? "",
        comparables: result?.comparables ?? [],
        riskLevel: result?.riskLevel ?? "medium",
      });
    } catch (err) {
      logger.warn("Scoring échoué pour candidat", {
        name: candidate.name,
        error: String(err),
      });
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
      "id, status, current_step, total_steps, picked_startup, error_message, dd_job_id, completed_at, thesis_analysis, created_at, started_at",
    )
    .eq("id", pipelineId)
    .single();

  if (error || !job) {
    return jsonResp({ error: "Job introuvable" }, 404, req);
  }

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
    default:
      return jsonResp({ error: `Action inconnue: ${action}` }, 400, req);
  }
});
