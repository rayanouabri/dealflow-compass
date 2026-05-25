// JWT authentication helper for Edge Functions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

interface JWTPayload {
  sub: string; // user ID
  aud: string;
  role: string;
  iat: number;
  exp: number;
}

export async function verifyJWT(req: Request): Promise<{ userId: string; token: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase configuration missing");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify token with Supabase
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Error(`JWT verification failed: ${error?.message}`);
  }

  return { userId: data.user.id, token };
}

// Middleware for secured functions
export async function authenticatedHandler(
  req: Request,
  handler: (userId: string, req: Request) => Promise<Response>
): Promise<Response> {
  try {
    const { userId } = await verifyJWT(req);
    return await handler(userId, req);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: error instanceof Error ? error.message : "Invalid token",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Check subscription status
export async function checkSubscriptionAccess(
  userId: string,
  supabase: any
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("subscription_tier, subscription_status, trial_credits_remaining")
    .eq("id", userId)
    .single();

  if (!profile) return false;

  // Free tier with trial credits
  if (profile.subscription_tier === "free") {
    return profile.trial_credits_remaining > 0;
  }

  // Paid tier with active subscription
  if (profile.subscription_tier in { starter: 1, professional: 1 }) {
    return profile.subscription_status === "active";
  }

  return false;
}

// Decrement trial credits
export async function deductAPICall(
  userId: string,
  supabase: any
): Promise<boolean> {
  const { data: can_call } = await supabase.rpc("can_make_api_call", {
    p_user_id: userId,
  });

  if (!can_call) {
    return false;
  }

  // Decrement trial credits if on free tier
  await supabase.rpc("decrement_trial_credits", {
    p_user_id: userId,
  });

  return true;
}
