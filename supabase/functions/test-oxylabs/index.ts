import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 400,
    });
  }

  const user = Deno.env.get("OXYLABS_USER");
  const pass = Deno.env.get("OXYLABS_PASS");

  if (!user || !pass) {
    return new Response(
      JSON.stringify({ error: "OXYLABS_USER or OXYLABS_PASS missing" }),
      { status: 500 }
    );
  }

  try {
    const auth = btoa(`${user}:${pass}`);
    const request = {
      source: "google",
      url: "https://www.google.com/search?q=startup&num=5",
      render: "html",
    };

    const response = await fetch("https://realtime.oxylabs.io/v1/queries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(45000),
    });

    const data = await response.json();

    return new Response(JSON.stringify({
      status: response.status,
      job: data.job,
      results_count: data.results?.length || 0,
      error: !response.ok ? "API error" : null,
    }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({
      error: String(err),
      message: err instanceof Error ? err.message : "Unknown error",
    }), { status: 500 });
  }
});
