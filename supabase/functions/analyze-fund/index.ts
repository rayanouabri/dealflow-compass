import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fundName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Analyzing fund: ${fundName}`);

    const systemPrompt = `You are an expert venture capital analyst with deep knowledge of the global VC ecosystem. 
Your task is to analyze a VC fund and generate a complete investment analysis.

You must respond with a valid JSON object containing:
1. "investmentThesis": Object with the fund's investment criteria:
   - "sectors": Array of focus sectors (e.g., ["AI/ML", "Enterprise SaaS", "Fintech"])
   - "stage": Investment stage (e.g., "Series A-B")
   - "geography": Target regions (e.g., "North America, Europe")
   - "ticketSize": Average investment size (e.g., "$5M - $25M")
   - "description": Brief description of their thesis

2. "startup": Object with a matched startup opportunity:
   - "name": Startup name
   - "tagline": One-line description
   - "sector": Primary sector
   - "stage": Current funding stage
   - "location": Headquarters
   - "founded": Year founded
   - "teamSize": Number of employees

3. "pitchDeck": Array of 8 slide objects, each with:
   - "title": Slide title
   - "content": Detailed content (2-4 paragraphs)
   - "keyPoints": Array of 3-4 bullet points
   - "metrics": Optional object with relevant KPIs

The slides should be:
1. Title & The Ask (investment amount, valuation)
2. The Problem (market pain point)
3. The Solution (product/technology)
4. Market Size (TAM/SAM/SOM with figures)
5. Traction & Metrics (ARR, growth, users)
6. Why This Fund? (strategic fit with their thesis)
7. The Team (founders and key hires)
8. Investment Recommendation (conclusion)

Make the content professional, data-driven, and compelling for a GP review.
Use realistic metrics and market data. Be specific and quantitative.`;

    const userPrompt = `Analyze the venture capital fund "${fundName}" and generate a complete investment memo for a matching startup opportunity.

The fund is: ${fundName}

Generate a detailed analysis with:
1. Their investment thesis and criteria
2. A startup that perfectly matches their thesis
3. An 8-slide investment memo/pitch deck

Respond ONLY with valid JSON, no markdown formatting.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("Raw AI response:", content.substring(0, 500));

    // Parse the JSON response
    let analysisResult;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      analysisResult = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Content was:", content);
      throw new Error("Failed to parse AI analysis response");
    }

    console.log("Analysis complete for:", fundName);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-fund function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
