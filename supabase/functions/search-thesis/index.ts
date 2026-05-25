// P3.1: Extract fund thesis research (modular, 1/4 of analyze-fund)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  Errors,
  errorResponse,
  successResponse,
  handleCORS,
} from "../_shared/errors.ts";
import { authenticatedHandler, deductAPICall } from "../_shared/jwt-auth.ts";
import { getSearchClient } from "../_shared/search-api-client.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

interface SearchThesisRequest {
  fundName: string;
  jobId?: string;
}

serve(async (req) => {
  const corsRes = handleCORS(req);
  if (corsRes) return corsRes;

  return authenticatedHandler(req, async (userId, req) => {
    try {
      // Check trial credits
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw Errors.internal("Configuration missing");
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Deduct API call
      const canCall = await deductAPICall(userId, supabase);
      if (!canCall) {
        throw Errors.forbidden("Trial credits exhausted or subscription inactive");
      }

      const body = await req.json() as SearchThesisRequest;

      if (!body.fundName || body.fundName.trim().length < 2) {
        throw Errors.badRequest("Fund name required (min 2 chars)");
      }

      const fundName = body.fundName.trim();
      const search = getSearchClient();

      // Parallel fund research
      const [fundResults, portfolioResults, teamResults] = await Promise.all([
        search.search(`"${fundName}" fund investment thesis sectors stages`, {
          resultsPerQuery: 5,
        }),
        search.search(`"${fundName}" portfolio companies investments`, {
          resultsPerQuery: 5,
        }),
        search.search(`"${fundName}" founders partners team`, {
          resultsPerQuery: 3,
        }),
      ]);

      const fundThesisContext =
        fundResults.map((r) => `${r.title}: ${r.description}`).join("\n") +
        "\n\nPORTFOLIO EXAMPLES:\n" +
        portfolioResults.map((r) => `${r.title}: ${r.description}`).join("\n") +
        (teamResults.length
          ? "\n\nFUND TEAM/PARTNERS:\n" +
            teamResults.map((r) => `${r.title}: ${r.description}`).join("\n")
          : "");

      const fundSources = [...fundResults, ...portfolioResults]
        .slice(0, 8)
        .map((r) => ({ name: r.title.substring(0, 60), url: r.url }));

      // Update sourcing job if provided
      if (body.jobId) {
        await supabase
          .from("sourcing_jobs")
          .update({
            search_context: { fundThesisContext, fundSources },
            status: "thesis_done",
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.jobId)
          .eq("user_id", userId);
      }

      return successResponse(
        {
          fundThesisContext,
          fundSources,
          resultsCount: fundResults.length,
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
