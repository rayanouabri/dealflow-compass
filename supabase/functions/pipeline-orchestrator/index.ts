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
import { mineListicles, mergeMinedCandidates } from "../_shared/listicle-miner.ts";
import { apifyGoogleSearch } from "../_shared/apify-client.ts";
import {
  dealroomJustFounded,
  dealroomEnrich,
} from "../_shared/dealroom-client.ts";
import { searchNewCompanies, inseeToSearchResults } from "../_shared/insee-sirene.ts";
import { searchHackerNews, hnToSearchResults } from "../_shared/hn-algolia.ts";
import { searchGitHub, githubToSearchResults } from "../_shared/github-search.ts";
import { resolveEntities } from "../_shared/entity-cleanup.ts";
import { buildLinkedInQueries } from "../_shared/linkedin-signals.ts";
import { buildIPPatentQueries } from "../_shared/ip-patent-signals.ts";
import {
  loadSourcedSet,
  isAlreadySourced,
  saveSourcedCompanies,
} from "../_shared/user-memory.ts";
import {
  buildScoringPrompt,
  buildBatchScoringPrompt,
  buildContextualWeights,
  computeWeightedScore,
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

  // La thèse est fournie EXPLICITEMENT par l'utilisateur (secteurs, stades,
  // géographie, détails libres). On ne recherche plus la thèse d'un fonds sur
  // le web : ce budget de recherche est réalloué au sourcing. L'IA se contente
  // de STRUCTURER les critères de l'utilisateur en stratégie de sourcing (ICP,
  // exclusions, codes NAF, priorityQueries) — sans inventer.
  const userPrompt = buildThesisAnalysisPrompt(job.custom_thesis);

  // Validation de forme : une réponse tronquée/fragmentaire (ex: juste le
  // tableau sectors) corromprait TOUT le pipeline aval (queries génériques,
  // pas d'ICP, pas d'exclusions).
  const isValidThesis = (t: unknown): boolean => {
    const x = t as any;
    return !!x && typeof x === "object" && !Array.isArray(x) &&
      Array.isArray(x.sectors) && !!x.idealCompanyProfile;
  };

  // Cache 7 j : mêmes critères → même structuration, 0 quota IA reconsommé.
  const cacheKey = `thesis|custom|${JSON.stringify(job.custom_thesis)}`;

  const thesisAnalysis = await callAI(
    THESIS_ANALYSIS_SYSTEM_PROMPT,
    userPrompt,
    {
      temperature: 0.2,
      maxTokens: 8192,
      cacheKey,
      validate: isValidThesis,
      model: "gemini-2.5-pro",
    },
  );

  if (!isValidThesis(thesisAnalysis)) {
    throw new Error(
      `Analyse de thèse invalide (JSON incomplet: ${JSON.stringify(thesisAnalysis).slice(0, 120)})`,
    );
  }

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

  // Sources structurées GRATUITES (sans coût de recherche), lancées en parallèle
  // de la recherche web → aucune latence ajoutée.
  const isFrench =
    thesis?.geography?.frenchBias === true ||
    /fr|france|paris|île-de-france|ile-de-france|europe/i.test(geography);

  // Termes pour HN / GitHub : secteur + techKeywords (anglais). On n'utilise PAS
  // les mustHaveKeywords (souvent en français) car ces plateformes sont anglophones.
  const freeApiTerms = [sectors[0], ...(thesis?.techKeywords ?? [])]
    .filter(Boolean)
    .slice(0, 3);

  // Pré-seed : les startups très early ont peu d'empreinte web — on élargit
  // les fenêtres des canaux structurés (registre, GitHub, HN) pour le recall.
  const isVeryEarly = /pre-?seed|amorçage/i.test(stage);

  // INSEE : registre FR (immatriculations récentes). FR/Europe uniquement.
  const inseePromise = isFrench
    ? searchNewCompanies({
        nafCodes: icp.nafCodes,
        nameTokens: icp.inseeNameTokens,
        postalPrefixes: /paris|île-de-france|ile-de-france/i.test(geography)
          ? ["75", "77", "78", "91", "92", "93", "94", "95"]
          : [],
        sinceDays: isVeryEarly ? 270 : 120,
        maxResults: isVeryEarly ? 35 : 25,
      })
    : Promise.resolve([]);
  // Hacker News (Show HN) : signal produit global.
  const hnPromise = searchHackerNews({
    terms: freeApiTerms,
    maxResults: 20,
    sinceDays: isVeryEarly ? 540 : 365,
  });
  // GitHub : pertinent uniquement pour les thèses tech/logicielles.
  const isTechThesis =
    /saas|software|logiciel|\bai\b|\bml\b|\bdata\b|dev|cloud|\bapi\b|crypto|web3|cyber|infra|platform|plateforme|fintech|deeptech|hardware|robot|iot/i
      .test(
        JSON.stringify([sectors, thesis?.techKeywords, thesis?.subSectors]),
      );
  const githubPromise = isTechThesis
    ? searchGitHub({
        terms: freeApiTerms,
        maxResults: 20,
        // Une org pré-seed n'a souvent que quelques étoiles ; le filtre
        // Organization + anti-bruit pédagogique limite déjà les faux positifs.
        minStars: isVeryEarly ? 3 : 10,
      })
    : Promise.resolve([]);

  // Sources FRAÎCHES & EARLY (anti-notoriété) via Apify Google Search — donne
  // des résultats Google (qu'Oxylabs ne scrape pas) sur des sources où les
  // pépites discrètes apparaissent AVANT d'être connues : portfolios
  // d'accélérateurs, lauréats French Tech/Bpifrance, augmentations de capital
  // au greffe (Pappers), pages société LinkedIn récentes. Lancé EN PARALLÈLE de
  // la boucle de recherche pour ne pas allonger le wall-time.
  const sigYear = new Date().getFullYear();
  const geoTerm = /europe/i.test(geography) ? "Europe" : (geography || "France");
  const freshQueries = [
    `site:stationf.co ${sectors[0] || "tech"} startup`,
    `("French Tech Seed" OR "i-Lab" OR Bpifrance OR "Aerospace Valley") lauréat ${sectors[0] || "tech"} ${geoTerm} ${sigYear}`,
    `${sectors[0] || "tech"} startup ("pre-seed" OR "seed") ("levée" OR "amorçage") ${geoTerm} ${sigYear}`,
    `site:pappers.fr ${sectors[0] || "tech"} "augmentation de capital"`,
    `site:linkedin.com/company ${sectors[0] || "tech"} startup ${geoTerm} ${sigYear}`,
  ];
  const apifyPromise = apifyGoogleSearch(freshQueries, {
    resultsPerQuery: 8,
    timeoutMs: 45000,
  }).catch(() => []);
  const justFoundedPromise = dealroomJustFounded().catch(() => []);

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

  // Cap à 50 requêtes web (relevé de 40 : le budget de recherche libéré par la
  // suppression de la recherche de thèse de fonds est réalloué au sourcing).
  // Bing/Oxylabs ~3-6s/req (timeout dur 9s), batch 10 → 50/10 = 5 batches × ~9s
  // worst-case ≈ 45s, sous le budget recherche (60s) et le wall-time edge.
  const limited = allQueries.slice(0, 50);
  const BATCH_SIZE = 10;
  // Budget temps dur : on arrête de lancer de nouveaux batches au-delà de 60s
  // pour garder du wall-time pour le mining listicle + résolution IA + DB.
  const SEARCH_BUDGET_MS = 60000;
  const searchStart = Date.now();
  const allResults: any[] = [];

  for (let i = 0; i < limited.length; i += BATCH_SIZE) {
    if (Date.now() - searchStart > SEARCH_BUDGET_MS) {
      logger.warn("Budget recherche dépassé — arrêt anticipé", {
        done: i,
        total: limited.length,
      });
      break;
    }
    const batch = limited.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async ({ category, query }) => {
        const results = await searchAll(query, 8);
        return results.map((r) => ({ ...r, category }));
      }),
    );
    allResults.push(...batchResults.flat());
  }

  // Mine les pages agrégateurs (F6S, Seedtable, portfolios d'accélérateurs...)
  // — en parallèle des sources structurées.
  const minePromise = mineListicles(
    allResults.filter((r) => r.source === "oxylabs"),
    thesis,
    { maxPages: 3 },
  );

  // Fusionne les candidats des sources structurées (noms fiables) avec le web
  const [inseeCompanies, hnStartups, githubOrgs, mined, apifyResults, justFounded] =
    await Promise.all([
      inseePromise,
      hnPromise,
      githubPromise,
      minePromise,
      apifyPromise,
      justFoundedPromise,
    ]);
  allResults.push(...inseeToSearchResults(inseeCompanies));
  allResults.push(...hnToSearchResults(hnStartups));
  allResults.push(...githubToSearchResults(githubOrgs));
  // Résultats Apify Google → candidats web frais (catégorie "fresh").
  for (const r of apifyResults) {
    allResults.push({ title: r.title, url: r.url, description: r.description, source: "oxylabs", category: "fresh" } as any);
  }
  // Dealroom just-founded filtré à la thèse → candidats (catégorie "dealroom").
  const sectorTokens = [...sectors, ...precisionTerms].map((s) => String(s).toLowerCase());
  for (const c of justFounded) {
    const hay = `${c.name} ${c.description}`.toLowerCase();
    const onThesis = sectorTokens.length === 0 || sectorTokens.some((t) => t.length >= 3 && hay.includes(t));
    if (onThesis && c.url) {
      allResults.push({ title: c.name, url: c.url, description: c.description, source: "oxylabs", category: "dealroom" } as any);
    }
  }
  logger.info("Sources structurées + fraîches", {
    insee: inseeCompanies.length,
    hn: hnStartups.length,
    github: githubOrgs.length,
    mined: mined.length,
    apify: apifyResults.length,
    justFounded: justFounded.length,
  });

  // Mine AUSSI les pages ramenées par Apify Google (portfolios d'accélérateurs
  // Station F, lauréats French Tech/Bpifrance, Pappers...) : ce sont des listes
  // de startups EARLY non célèbres → on en extrait les noms individuels.
  const apifyMined = apifyResults.length > 0
    ? await mineListicles(
        apifyResults.map((r) => ({ ...r, source: "oxylabs" as const })),
        thesis,
        { maxPages: 3 },
      ).catch(() => [])
    : [];

  // Classement piloté par les CRITÈRES de l'utilisateur (pertinence thèse),
  // pas par le seul volume de signal.
  const ranked = deduplicateAndRank(allResults, {
    mustHave: precisionTerms,
    sectors,
    geography,
    exclude: exclusionTerms,
  });
  // Injecte les startups minées (mining web + mining Apify) en tête du ranking.
  const rankedWithMined = mergeMinedCandidates(ranked, [...mined, ...apifyMined]);
  // Filtre strict on-thesis : écarte les acteurs hors-profil, priorise l'ICP
  const filtered = filterByICP(rankedWithMined, {
    mustHave: precisionTerms,
    exclude: exclusionTerms,
  });
  // Garde-fou : si le filtre est trop agressif, on retombe sur le ranking brut
  const prefiltered = filtered.length >= 5 ? filtered : rankedWithMined;

  // Résolution d'entités IA : nettoie noms, filtre le bruit (comptes perso,
  // labos, repos sans société), priorise les vraies startups on-thesis.
  const resolved = await resolveEntities(prefiltered, thesis, 30);

  // Mémoire utilisateur : écarte les sociétés déjà proposées à cet utilisateur
  // lors de runs précédents (pour ne pas re-sourcer la même chose).
  let candidates = resolved;
  if (job.user_id) {
    const sourcedSet = await loadSourcedSet(supabase, job.user_id);
    if (sourcedSet.names.size > 0 || sourcedSet.domains.size > 0) {
      const fresh = resolved.filter(
        (c) => !isAlreadySourced(sourcedSet, c.name, c.url),
      );
      // Garde-fou : ne pas tout vider si l'utilisateur a déjà beaucoup sourcé
      candidates = fresh.length >= 3 ? fresh : resolved;
      logger.info("Mémoire utilisateur", {
        connus: resolved.length - fresh.length,
        gardes: candidates.length,
      });
    }
  }

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
  // Quota de diversité : les immatriculations INSEE (nom + code NAF, zéro
  // empreinte web) sont un signal précoce fort mais une shortlist 100 %
  // registre n'est pas actionnable → max 3, complété par les meilleurs
  // candidats web/HN/GitHub.
  const isRegistryOnly = (c: any) =>
    (c.categories ?? []).length > 0 &&
    (c.categories ?? []).every((k: string) => String(k).startsWith("insee"));
  const TOP_N = 6;
  const MAX_REGISTRY = 3;
  const selected: any[] = [];
  const overflowRegistry: any[] = [];
  let registryCount = 0;
  for (const c of sourcingResults) {
    if (selected.length >= TOP_N) break;
    if (isRegistryOnly(c)) {
      if (registryCount >= MAX_REGISTRY) {
        overflowRegistry.push(c);
        continue;
      }
      registryCount++;
    }
    selected.push(c);
  }
  // S'il n'y a pas assez de candidats web, on recomplète avec le registre.
  while (selected.length < TOP_N && overflowRegistry.length > 0) {
    selected.push(overflowRegistry.shift());
  }

  const top10 = selected.map((c) => ({
    ...c,
    categories: new Set(c.categories ?? []),
  }));

  if (top10.length === 0) {
    throw new Error("Aucun candidat trouvé lors du sourcing");
  }

  // Enrichissement web des candidats registre : 1 recherche (cachée) par
  // candidat sans empreinte web → le scoring et la DD reçoivent du signal
  // réel (site, produit, équipe) au lieu d'une simple ligne d'immatriculation.
  await Promise.all(
    top10
      .filter((c) => c.categories.has("insee") || c.categories.has("insee_named"))
      .map(async (c) => {
        try {
          const web = await searchAll(`"${c.name}" startup OR société France`, 4);
          for (const r of web.slice(0, 3)) {
            c.descriptions.push(`${r.title}: ${r.description}`.slice(0, 250));
          }
          // Si un site propre émerge (hors annuaires/réseaux), on le retient
          // comme site officiel probable pour la DD.
          const own = web.find((r) => {
            try {
              const host = new URL(r.url).hostname.replace(/^www\./, "");
              const blocked = /annuaire-entreprises|societe\.com|pappers\.fr|linkedin\.com|facebook\.com|crunchbase|wikipedia/i;
              const nameToken = c.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
              return !blocked.test(host) && nameToken.length >= 4 &&
                host.replace(/[^a-z0-9]/g, "").includes(nameToken);
            } catch {
              return false;
            }
          });
          if (own) (c as any).website = own.url;
        } catch (err) {
          logger.warn("Enrichissement web candidat échoué", {
            name: c.name,
            error: String(err),
          });
        }
      }),
  );

  // ENRICHISSEMENT STRUCTURÉ (Dealroom) sur TOUS les top candidats : récupère
  // le stade/levée réels via l'actualité Dealroom → vérité terrain pour le
  // scoring ET pour le gate stade déterministe (fini les heuristiques sur la
  // description). Tolérant : si Dealroom ne connaît pas la société, on continue.
  await Promise.all(
    top10.map(async (c) => {
      try {
        const enr = await dealroomEnrich(c.name);
        if (enr.matched) {
          (c as any).dealroomStage = enr.latestStageHint ?? null;
          (c as any).dealroomProfile = enr.profileUrl;
          if (enr.newsText) {
            (c as any).dealroomNews = enr.newsText.slice(0, 1200);
            c.descriptions.push(`[Dealroom] ${enr.newsText.slice(0, 220)}`);
          }
        }
      } catch { /* Dealroom optionnel */ }
    }),
  );

  // Poids contextuels : hors thèse FR, le bonus écosystème français est
  // redistribué vers thesisFit et teamQuality.
  const weights = buildContextualWeights(
    String(thesis?.geography?.primary ?? "France"),
  );

  const toScored = (candidate: any, result: any) => {
    // Critères STRUCTURELS calculés depuis les données réelles du sourcing —
    // pas demandés à l'IA : mêmes faits → même score, classement explicable.
    // L'IA garde les critères de jugement (thesisFit, timing, team, moat).
    const catCount = candidate.categories?.size ?? 0;
    const srcCount = candidate.sources?.length ?? 0;
    const structuralScores = {
      signalDiversity: Math.min(100, catCount * 25),
      sourceCorroboration: Math.min(
        100,
        srcCount * 25 + Math.min(candidate.mentionCount ?? 0, 10) * 5,
      ),
      recency: Math.min(100, (candidate.recencyScore ?? 1) * 10),
    };
    const scores = { ...(result?.scores ?? {}), ...structuralScores };
    return {
      name: candidate.name,
      url: candidate.url,
      website: candidate.website ?? null,
      descriptions: candidate.descriptions?.slice(0, 3) ?? [],
      mentionCount: candidate.mentionCount,
      categories: Array.from(candidate.categories),
      sources: candidate.sources,
      scores,
      totalWeighted: computeWeightedScore(scores, weights),
      redFlags: result?.redFlags ?? [],
      whyNow: result?.whyNow ?? "",
      whyThisStartup: result?.whyThisStartup ?? "",
      comparables: result?.comparables ?? [],
      riskLevel: result?.riskLevel ?? "medium",
    };
  };

  const scoredCandidates: any[] = [];

  // BATCH : un seul appel IA pour scorer tout le top (économise le quota Gemini).
  try {
    const batch = (await callAI(
      "Tu es un analyste VC. Réponds uniquement en JSON valide.",
      buildBatchScoringPrompt(top10, thesis),
      { temperature: 0.1, maxTokens: 8192 },
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

  // Complète unitairement si le batch a renvoyé trop peu (troncature/quota) —
  // garantit une shortlist exploitable d'au moins 3 startups.
  const minShortlist = Math.min(3, top10.length);
  if (scoredCandidates.length < minShortlist) {
    const already = new Set(scoredCandidates.map((s) => s.name));
    for (const candidate of top10) {
      if (scoredCandidates.length >= minShortlist) break;
      if (already.has(candidate.name)) continue;
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

  // Défense en profondeur 1 : éliminer le bruit (articles, programmes, réseaux)
  const realCompanies = scoredCandidates.filter(
    (s) => !(s.redFlags ?? []).some((f: string) => /pas une entreprise/i.test(String(f))),
  );

  // Défense en profondeur 2 : GATE STADE déterministe. Pour une thèse early
  // (stage.max <= serie-b), on écarte toute société trop avancée — soit signalée
  // par l'IA (redFlag hors-stade), soit trahie par sa description (licorne, série
  // C+, méga-levée, cotation). Évite qu'une Mistral/licorne gagne par hasard.
  const stageMax = String(thesis?.stage?.max ?? "serie-b").toLowerCase();
  const earlyThesis = !/serie-c|série-c|serie-d|growth|late/.test(stageMax);
  // Rang du stade max visé (pour comparer au stade réel Dealroom).
  const STAGE_RANK: Record<string, number> = {
    "pre-seed": 0, "seed": 1, "series a": 2, "serie-a": 2, "série a": 2,
    "series b": 3, "serie-b": 3, "série b": 3, "series c": 4, "serie-c": 4,
    "series d": 5, "series e": 6, growth: 7, ipo: 8, public: 8,
  };
  const maxRank = STAGE_RANK[stageMax] ?? 3;
  const looksTooLate = (s: any): boolean => {
    // 1) Vérité terrain Dealroom : stade réel > stade max visé → hors-cible.
    const dr = s.dealroomStage as string | undefined;
    if (dr && STAGE_RANK[dr] !== undefined && STAGE_RANK[dr] > maxRank + 1) return true;
    // 2) Signalé par l'IA.
    const flags = (s.redFlags ?? []).join(" ").toLowerCase();
    if (/hors-stade|trop avanc|trop financ/.test(flags)) return true;
    // 3) Heuristique sur la description (fallback si pas de donnée Dealroom).
    const text = String((s.descriptions ?? []).join(" ")).toLowerCase();
    return /\bseries\s+[c-z]\b|\bs[ée]rie\s+[c-z]\b|s[ée]rie\s*c\+|\bunicorn\b|\blicorne\b|\bipo\b|cot[ée]e?\s+en\s+bourse|nasdaq|euronext|valuation\s*\$?\s*\d+(\.\d+)?\s*(b|bn|billion|milliard)|\b\d{3,}\s*(m€|m\$|\s*million)/.test(text);
  };
  const stageFiltered = earlyThesis ? realCompanies.filter((s) => !looksTooLate(s)) : realCompanies;
  const stageBase = stageFiltered.length > 0 ? stageFiltered : realCompanies;

  // Défense en profondeur 3 : éliminer les startups mal alignées (thesisFit < 55)
  // thesisFit est maintenant dominant (45-50%) donc c'est un gate keeper strict.
  const wellAligned = stageBase.filter((s) => (s.scores?.thesisFit ?? 0) >= 55);

  const finalShortlist = wellAligned.length > 0 ? wellAligned : stageBase.length > 0 ? stageBase : scoredCandidates;

  // Seuil de viabilité : si le meilleur candidat score < 35, le sourcing a
  // échoué à trouver des entreprises pertinentes (résultats retail, bruit).
  // On lève une erreur pour que le watchdog retry plutôt que de lancer une DD
  // inutile sur un score de 13.
  // Seuil bas : les startups deeptech hard-science ont naturellement peu de signal web
  // → scores plus faibles que le SaaS B2B. On bloque seulement les < 20 (bruit pur).
  const VIABLE_SCORE = 20;
  if (finalShortlist[0]?.totalWeighted < VIABLE_SCORE) {
    throw new Error(
      `Sourcing insuffisant : meilleur score ${finalShortlist[0]?.totalWeighted ?? 0}/100 ` +
      `(seuil ${VIABLE_SCORE}). Candidats : ${finalShortlist.slice(0, 3).map((c) => c.name).join(", ")}`,
    );
  }

  const pickedStartup = finalShortlist[0];

  if (!pickedStartup) {
    throw new Error("Impossible de scorer les candidats");
  }

  // Shortlist : on conserve TOUTES les startups scorées (pas seulement la n°1)
  // avec leur analyse qualitative — pour un affichage multi-startup.
  await updateJob(supabase, job.id, {
    picked_startup: pickedStartup,
    shortlist: finalShortlist,
    status: "pick_done",
    current_step: 5,
  });

  // Mémoire utilisateur : mémorise les sociétés proposées pour ne pas les
  // re-sourcer lors des prochains runs de cet utilisateur.
  if (job.user_id) {
    await saveSourcedCompanies(
      supabase,
      job.user_id,
      job.id,
      finalShortlist.map((c: any) => ({ name: c.name, url: c.url })),
    );
  }

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
        // Site officiel détecté à l'enrichissement si dispo ; jamais une page
        // d'agrégateur (les requêtes site: y seraient gâchées).
        companyWebsite: (() => {
          const site = pickedStartup.website || pickedStartup.url;
          return /annuaire-entreprises|github\.com|linkedin\.com|news\.ycombinator|pappers\.fr|societe\.com/i
            .test(site)
            ? undefined
            : site;
        })(),
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

  let finalResult: unknown;
  if (!ddResp.ok) {
    const txt = await ddResp.text();
    // Idempotence : si une tentative précédente a terminé l'analyse mais que
    // l'orchestrateur est mort avant d'écrire final_result, le retry reçoit
    // 400 "déjà analysé". On récupère alors le rapport déjà stocké au lieu
    // de condamner le job.
    const { data: ddJob } = await supabase
      .from("due_diligence_jobs")
      .select("status, result")
      .eq("id", job.dd_job_id)
      .single();
    if (ddJob?.status === "analyze_done" && ddJob.result) {
      logger.info("DD déjà analysée — récupération du rapport existant", {
        pipelineId: job.id,
        ddJobId: job.dd_job_id,
      });
      finalResult = ddJob.result;
    } else {
      throw new Error(`DD analyze échoué: ${ddResp.status} — ${txt}`);
    }
  } else {
    finalResult = await ddResp.json();
  }
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
// Extrait l'user_id du JWT (si le front a envoyé le token user, pas l'anon).
async function getUserId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  req: Request,
): Promise<string | null> {
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    const { data } = await supabase.auth.getUser(token);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

// Plafond de jobs actifs : borne le coût (recherche/Gemini) en cas d'abus de
// l'anon key (publique par design). Un job dure ~2-4 min — un utilisateur
// légitime n'atteint jamais ces seuils.
const MAX_ACTIVE_JOBS_PER_USER = 5;
const MAX_ACTIVE_ANONYMOUS_JOBS = 10;
// Note : plafond de jobs CONCURRENTS (anti-abus de coût), pas un quota total.
// Les comptes n'ont aucune limite d'analyses cumulées.

async function countActiveJobs(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string | null,
): Promise<number> {
  // Ne compte que les jobs RÉELLEMENT en cours (démarrés < 15 min). Un job
  // légitime dure ~2-4 min ; au-delà il est figé/abandonné et ne doit PAS
  // verrouiller le compte (sinon l'utilisateur ne peut plus lancer d'analyse).
  const recent = new Date(Date.now() - 15 * 60_000).toISOString();
  let q = supabase
    .from("pipeline_jobs")
    .select("id", { count: "exact", head: true })
    .not("status", "in", "(dd_done,error)")
    .gte("started_at", recent);
  q = userId === null ? q.is("user_id", null) : q.eq("user_id", userId);
  const { count, error } = await q;
  if (error) {
    logger.warn("countActiveJobs erreur — plafond ignoré", { error: error.message });
    return 0;
  }
  return count ?? 0;
}

async function handleStart(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  body: any,
  req: Request,
): Promise<Response> {
  const { fundName, customThesis } = body;
  const userId = await getUserId(supabase, req);

  const active = await countActiveJobs(supabase, userId);
  const cap = userId ? MAX_ACTIVE_JOBS_PER_USER : MAX_ACTIVE_ANONYMOUS_JOBS;
  if (active >= cap) {
    return jsonResp(
      { error: "Trop d'analyses en cours. Attendez la fin d'un pipeline avant d'en relancer un." },
      429,
      req,
    );
  }

  const { data: job, error } = await supabase
    .from("pipeline_jobs")
    .insert({
      user_id: userId,
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

  // Claim optimiste : deux invocations concurrentes (watchdog poll + cron sweep,
  // ou double fireContinue) lisent le même snapshot — seule celle qui réussit
  // cette mise à jour conditionnelle exécute l'étape, l'autre s'arrête là.
  if (!["dd_done", "error"].includes(status)) {
    const { data: claimed, error: claimError } = await supabase
      .from("pipeline_jobs")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", pipelineId)
      .eq("status", status)
      .eq("updated_at", job.updated_at)
      .select("id");
    if (claimError) {
      logger.warn("Claim échoué — on continue sans verrou", {
        pipelineId,
        error: claimError.message,
      });
    } else if (!claimed || claimed.length === 0) {
      logger.info("Étape déjà prise en charge par une autre invocation — skip", {
        pipelineId,
        status,
      });
      return jsonResp({ ok: true, skipped: "already_claimed" }, 200, req);
    }
  }

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
  // Bump CONDITIONNEL (eq retry_count) : si le poll status et le cron sweep
  // détectent le même job figé au même moment, un seul des deux relance.
  const { data: bumped, error: bumpError } = await supabase
    .from("pipeline_jobs")
    .update({ retry_count: retry + 1, updated_at: new Date().toISOString() })
    .eq("id", job.id)
    .eq("retry_count", retry)
    .select("id");
  if (bumpError) throw new Error(`DB update error: ${bumpError.message}`);
  if (!bumped || bumped.length === 0) {
    logger.info("Watchdog : relance déjà déclenchée ailleurs — skip", {
      pipelineId: job.id,
    });
    return;
  }
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
    .order("updated_at", { ascending: true }) // les plus anciens d'abord
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
      "id, status, current_step, total_steps, picked_startup, shortlist, error_message, dd_job_id, completed_at, thesis_analysis, created_at, started_at, updated_at, retry_count, max_retries, final_result",
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
      shortlist: job.shortlist,
      errorMessage: job.error_message,
      ddJobId: job.dd_job_id,
      completedAt: job.completed_at,
      thesisSummary,
      createdAt: job.created_at,
      startedAt: job.started_at,
      // Rapport DD complet, uniquement à l'état terminal : le front arrête de
      // poller à dd_done, donc envoyé une seule fois — et il évite de RE-payer
      // une due diligence complète (~30 recherches + 3 IA) au clic.
      ...(job.status === "dd_done" && job.final_result
        ? { finalResult: job.final_result }
        : {}),
    },
    200,
    req,
  );
}

// ============================================================
// ACTION: history — liste les analyses passées de l'utilisateur
// ============================================================
async function handleHistory(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  req: Request,
): Promise<Response> {
  const userId = await getUserId(supabase, req);
  if (!userId) return jsonResp({ jobs: [] }, 200, req);

  const { data, error } = await supabase
    .from("pipeline_jobs")
    .select("id, status, picked_startup, thesis_analysis, created_at, completed_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    logger.warn("handleHistory erreur", { error: error.message });
    return jsonResp({ jobs: [] }, 200, req);
  }

  const jobs = (data ?? []).map((j: any) => ({
    id: j.id,
    status: j.status,
    company: j.picked_startup?.name ?? null,
    sectors: j.thesis_analysis?.sectors ?? [],
    stage: j.thesis_analysis?.stage ?? null,
    geography: j.thesis_analysis?.geography?.primary ?? null,
    createdAt: j.created_at,
    hasReport: j.status === "dd_done",
  }));
  return jsonResp({ jobs }, 200, req);
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

  // "continue" est une action interne (self-invocation fireContinue) : seul le
  // service-role peut la déclencher. Sinon, tout porteur de l'anon key (publique)
  // pourrait rejouer une étape en boucle (coût recherche/Gemini ×N, races).
  if (action === "continue") {
    const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (bearer !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      return jsonResp({ error: "Action réservée" }, 403, req);
    }
  }

  switch (action) {
    case "start":
      return handleStart(supabase, body, req);
    case "continue":
      return handleContinue(supabase, body, req);
    case "status":
      return handleStatus(supabase, body, req);
    case "history":
      return handleHistory(supabase, req);
    case "sweep":
      return handleSweep(supabase, req);
    default:
      return jsonResp({ error: `Action inconnue: ${action}` }, 400, req);
  }
});
