// Stripe checkout session creation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Errors, errorResponse, successResponse, handleCORS } from "../_shared/errors.ts";
import { authenticatedHandler, deductAPICall } from "../_shared/jwt-auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

interface CheckoutRequest {
  tier: "starter" | "professional";
}

serve(async (req) => {
  // CORS preflight
  const corsRes = handleCORS(req);
  if (corsRes) return corsRes;

  return authenticatedHandler(req, async (userId, req) => {
    try {
      const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw Errors.internal("Configuration missing");
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const body = await req.json() as CheckoutRequest;

      // Validate tier
      if (!["starter", "professional"].includes(body.tier)) {
        throw Errors.badRequest("Invalid subscription tier");
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("stripe_customer_id, email")
        .eq("id", userId)
        .single();

      if (!profile) {
        throw Errors.notFound("User profile");
      }

      // Get or create Stripe customer
      let stripeCustomerId = profile.stripe_customer_id;
      if (!stripeCustomerId) {
        const customerRes = await fetch("https://api.stripe.com/v1/customers", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            email: profile.email,
            metadata: JSON.stringify({ supabase_user_id: userId }),
          }).toString(),
        });

        if (!customerRes.ok) {
          throw Errors.external("Stripe", { status: customerRes.status });
        }

        const customer = await customerRes.json();
        stripeCustomerId = customer.id;

        // Save customer ID
        await supabase
          .from("user_profiles")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", userId);
      }

      // Create checkout session
      const priceId = body.tier === "starter"
        ? Deno.env.get("STRIPE_PRICE_ID_STARTER")
        : Deno.env.get("STRIPE_PRICE_ID_PROFESSIONAL");

      if (!priceId) {
        throw Errors.internal(`Price ID missing for tier: ${body.tier}`);
      }

      const checkoutRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          customer: stripeCustomerId,
          line_items: JSON.stringify([
            {
              price: priceId,
              quantity: 1,
            },
          ]),
          mode: "subscription",
          success_url: `${req.headers.get("origin")}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${req.headers.get("origin")}/pricing`,
          allow_promotion_codes: "true",
        }).toString(),
      });

      if (!checkoutRes.ok) {
        throw Errors.external("Stripe", { status: checkoutRes.status });
      }

      const session = await checkoutRes.json();
      return successResponse({ url: session.url }, req);
    } catch (error) {
      if (error instanceof Errors.constructor) {
        return errorResponse(error as any, req);
      }
      return errorResponse(new Error(String(error)), req);
    }
  });
});
