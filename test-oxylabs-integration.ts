import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://anxyjsgrittdwrizqcgi.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueHlqc2dyaXR0ZHdyaXpxY2dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ4MTUzOTksImV4cCI6MTc1MDM2NzM5OX0.1K1O6-HwULpKCVvM9U7L7nWZ_YnJvVJ-VC_XLFrQwKY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function testOxylabsIntegration() {
  console.log("🧪 Testing Oxylabs Integration...\n");

  // First, sign in (use test account if you have one, or create a session)
  const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
    email: "rayan.ouabri1@gmail.com",
    password: "", // You'll need to provide this or use an existing session
  });

  if (signInError) {
    console.error("❌ Login failed:", signInError.message);
    return;
  }

  console.log("✅ Logged in");

  // Call pipeline-orchestrator
  const testPayload = {
    action: "start",
    fundName: "Test Fund",
    startupName: "TestAI",
    thesis: "AI infrastructure tools",
    sectors: ["AI", "Infrastructure"],
    stage: "Series A",
    geography: "France",
    pitchDeck: "https://example.com/deck.pdf",
  };

  console.log("\n📤 Calling pipeline-orchestrator with payload:");
  console.log(JSON.stringify(testPayload, null, 2));

  const response = await fetch(`${SUPABASE_URL}/functions/v1/pipeline-orchestrator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.session.access_token}`,
    },
    body: JSON.stringify(testPayload),
  });

  const result = await response.json();

  console.log("\n📥 Response from pipeline-orchestrator:");
  console.log(JSON.stringify(result, null, 2));

  if (result.pipelineId) {
    console.log("\n✅ Pipeline started with ID:", result.pipelineId);
    console.log("   Check Supabase dashboard for job progress");
  } else {
    console.log("\n❌ Pipeline failed:", result.error || "Unknown error");
  }
}

testOxylabsIntegration().catch(console.error);
