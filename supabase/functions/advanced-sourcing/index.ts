// Advanced Weak Signal Sourcing — LinkedIn + Patents + Signals Combined
// Finds early-stage startups via multi-channel weak signal detection

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  Errors,
  errorResponse,
  successResponse,
  handleCORS,
} from "../_shared/errors.ts";
import { authenticatedHandler, deductAPICall } from "../_shared/jwt-auth.ts";
import { getSearchClient } from "../_shared/search-api-client.ts";
import { buildLinkedInQueries, extractLinkedInSignals } from "../_shared/linkedin-signals.ts";
import { buildIPPatentQueries, extractIPSignals } from "../_shared/ip-patent-signals.ts";
import { buildWeakSignalQueries, filterByStage } from "../_shared/weak-signals.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

interface AdvancedSourcingRequest {
  sectors: string[];
  geography: string;
  stage: string;
  numberOfStartups?: number;
}

interface SourcingResult {
  company: string;
  url: string;
  signals: Array<{
    type: string;
    strength: "weak" | "medium" | "strong";
    description: string;
    weight: number;
  }>;
  score: number;
  sources: string[];
}

serve(async (req) => {
  const corsRes = handleCORS(req);
  if (corsRes) return corsRes;

  return authenticatedHandler(req, async (userId, req) => {
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw Errors.internal("Configuration missing");
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Check trial credits
      const canCall = await deductAPICall(userId, supabase);
      if (!canCall) {
        throw Errors.forbidden("Trial credits exhausted or subscription inactive");
      }

      const body = (await req.json()) as AdvancedSourcingRequest;
      const { sectors, geography, stage, numberOfStartups = 5 } = body;

      if (!sectors || sectors.length === 0) {
        throw Errors.badRequest("Sectors required");
      }

      const sector = sectors[0];
      const year = new Date().getFullYear();
      const search = getSearchClient();

      // Collect all signals
      const allSignals = new Map<string, SourcingResult>();

      console.log(`[Advanced Sourcing] Starting for ${sector}, ${stage}, ${geography}`);

      // === PHASE 1: LINKEDIN SIGNALS ===
      console.log("[LinkedIn] Searching hiring, founders, investors...");
      const linkedinQueries = buildLinkedInQueries(sector, geography, year);
      for (const { query, signalType, weight } of linkedinQueries.slice(0, 8)) {
        try {
          const results = await search.search(query, { resultsPerQuery: 3 });
          for (const result of results) {
            const signal = extractLinkedInSignals(result.title, result.description);
            if (signal) {
              const company = extractCompanyFromTitle(result.title);
              if (!allSignals.has(company)) {
                allSignals.set(company, {
                  company,
                  url: result.url,
                  signals: [],
                  score: 0,
                  sources: [],
                });
              }

              const existing = allSignals.get(company)!;
              existing.signals.push({
                type: signal.type,
                strength: signal.strength,
                description: signal.description,
                weight: signal.weight,
              });
              existing.sources.push("linkedin");
              existing.score += weight;
            }
          }
          await sleep(1100);
        } catch (e) {
          console.warn(`LinkedIn query failed: ${e}`);
        }
      }

      // === PHASE 2: PATENTS & IP ===
      console.log("[Patents] Searching patents, IP, inventor movement...");
      const ipQueries = buildIPPatentQueries(sector, geography, year);
      for (const { query, signalType, weight } of ipQueries.slice(0, 8)) {
        try {
          const results = await search.search(query, { resultsPerQuery: 3 });
          for (const result of results) {
            const signal = extractIPSignals(result.title, result.description, result.url);
            if (signal) {
              const company = signal.organization || extractCompanyFromTitle(result.title);
              if (!allSignals.has(company)) {
                allSignals.set(company, {
                  company,
                  url: result.url,
                  signals: [],
                  score: 0,
                  sources: [],
                });
              }

              const existing = allSignals.get(company)!;
              existing.signals.push({
                type: signal.type,
                strength: signal.strength,
                description: signal.description,
                weight: signal.weight,
              });
              existing.sources.push("patents");
              existing.score += weight;
            }
          }
          await sleep(1100);
        } catch (e) {
          console.warn(`Patent query failed: ${e}`);
        }
      }

      // === PHASE 3: WEAK SIGNALS (existing) ===
      console.log("[Weak Signals] Searching GitHub, ProductHunt, arXiv, Pappers...");
      const weakSignalGroups = buildWeakSignalQueries(sector, geography, year);
      const filteredGroups = filterByStage(weakSignalGroups, stage);

      for (const group of filteredGroups.slice(0, 6)) {
        for (const query of group.queries.slice(0, 2)) {
          try {
            const results = await search.search(query, { resultsPerQuery: 3 });
            for (const result of results) {
              const company = extractCompanyFromTitle(result.title);
              if (!allSignals.has(company)) {
                allSignals.set(company, {
                  company,
                  url: result.url,
                  signals: [],
                  score: 0,
                  sources: [],
                });
              }

              const existing = allSignals.get(company)!;
              existing.signals.push({
                type: group.category,
                strength: "medium",
                description: result.description,
                weight: group.weight,
              });
              existing.sources.push(group.category);
              existing.score += group.weight;
            }
            await sleep(1100);
          } catch (e) {
            console.warn(`Weak signal query failed: ${e}`);
          }
        }
      }

      // === SCORING & RANKING ===
      const ranked = Array.from(allSignals.values())
        .filter((result) => {
          // Must have multiple signal types (cross-signal corroboration)
          const uniqueSignalTypes = new Set(result.signals.map((s) => s.type)).size;
          return result.signals.length >= 2 && uniqueSignalTypes >= 2;
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, numberOfStartups);

      console.log(`[Result] Found ${ranked.length} startups with multiple signals`);

      return successResponse(
        {
          results: ranked.map((r) => ({
            company: r.company,
            url: r.url,
            score: r.score,
            signalCount: r.signals.length,
            signals: r.signals,
            sources: Array.from(new Set(r.sources)),
          })),
          totalFound: allSignals.size,
          uniqueCompanies: ranked.length,
          signals: {
            linkedin: Array.from(allSignals.values())
              .flatMap((s) => s.signals)
              .filter((s) => /hiring|founder|investor|cofounder|department|advisor/.test(s.type))
              .length,
            patents: Array.from(allSignals.values())
              .flatMap((s) => s.signals)
              .filter((s) =>
                /patent|trademark|inventor|tech_journal|github/.test(s.type)
              ).length,
            weakSignals: Array.from(allSignals.values())
              .flatMap((s) => s.signals)
              .filter(
                (s) =>
                  /github|producthunt|arxiv|pappers|wellfound|show_hn|conference|job_board/.test(
                    s.type
                  )
              ).length,
          },
        },
        req
      );
    } catch (error) {
      if (error instanceof Errors.constructor || error instanceof Error) {
        return errorResponse(
          error instanceof Errors.constructor
            ? (error as any)
            : Errors.internal(error.message),
          req
        );
      }
      return errorResponse(Errors.internal(String(error)), req);
    }
  });
});

// === HELPERS ===

function extractCompanyFromTitle(title: string): string {
  // Extract company name from various patterns
  const patterns = [
    /^([A-Za-z0-9\-\.]+)(?:\s*\||$)/,
    /(?:at|from|company:|org:)\s*([A-Za-z0-9\-\.]+)/i,
    /^([A-Za-z0-9][A-Za-z0-9\s]{1,30}?)(?:\s*[-–—]|$)/,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      const company = match[1].trim();
      if (company.length > 2 && company.length < 100) {
        return company;
      }
    }
  }

  return title.split(" ")[0] || "Unknown";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
