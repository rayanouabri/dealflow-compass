/**
 * Script de test pour vérifier l'intégration DigitalOcean Agent
 * Usage: deno run --allow-net --allow-env test-do-agent.ts
 */

import { callDigitalOceanAgent, formatSourcingPrompt } from "./supabase/functions/_shared/digitalocean-agent.ts";

async function testDigitalOceanAgent() {
  console.log("🧪 Test de l'agent DigitalOcean...\n");

  // Test 1: Sourcing simple
  console.log("📋 Test 1: Sourcing de startups");
  try {
    const sourcingPrompt = formatSourcingPrompt(
      undefined,
      {
        sectors: ["defense", "aerospace"],
        stage: "seed",
        geography: "Europe",
        ticketSize: "1-3M",
      },
      ["defense", "aerospace"],
      "seed",
      "Europe",
      3
    );

    console.log("Prompt généré:");
    console.log(sourcingPrompt.substring(0, 200) + "...\n");

    const response = await callDigitalOceanAgent(sourcingPrompt);
    console.log("✅ Réponse reçue!");
    console.log(`📊 Longueur: ${response.output.length} caractères`);
    console.log(`💾 Tokens utilisés: ${JSON.stringify(response.usage || "N/A")}`);
    console.log("\n📝 Extrait de la réponse:");
    console.log(response.output.substring(0, 500) + "...\n");
  } catch (error) {
    console.error("❌ Erreur:", error instanceof Error ? error.message : String(error));
    return;
  }

  // Test 2: Due Diligence
  console.log("\n📋 Test 2: Due Diligence");
  try {
    const { formatDueDiligencePrompt } = await import("./supabase/functions/_shared/digitalocean-agent.ts");
    const ddPrompt = formatDueDiligencePrompt(
      "Mistral AI",
      "https://mistral.ai",
      "Startup française d'IA, fondée par Arthur Mensch"
    );

    console.log("Prompt généré:");
    console.log(ddPrompt.substring(0, 200) + "...\n");

    const response = await callDigitalOceanAgent(ddPrompt);
    console.log("✅ Réponse reçue!");
    console.log(`📊 Longueur: ${response.output.length} caractères`);
    console.log(`💾 Tokens utilisés: ${JSON.stringify(response.usage || "N/A")}`);
    console.log("\n📝 Extrait de la réponse:");
    console.log(response.output.substring(0, 500) + "...\n");
  } catch (error) {
    console.error("❌ Erreur:", error instanceof Error ? error.message : String(error));
    return;
  }

  console.log("✅ Tous les tests sont passés!");
}

// Vérifier que les secrets sont configurés
const DO_AGENT_ENDPOINT = Deno.env.get("DO_AGENT_ENDPOINT");
const DO_AGENT_API_KEY = Deno.env.get("DO_AGENT_API_KEY");

if (!DO_AGENT_ENDPOINT || !DO_AGENT_API_KEY) {
  console.error("❌ Erreur: Les secrets DO_AGENT_ENDPOINT et DO_AGENT_API_KEY doivent être configurés");
  console.log("\n💡 Pour tester localement, définis-les comme variables d'environnement:");
  console.log("   export DO_AGENT_ENDPOINT='https://...'");
  console.log("   export DO_AGENT_API_KEY='...'");
  Deno.exit(1);
}

console.log("✅ Secrets détectés");
console.log(`📍 Endpoint: ${DO_AGENT_ENDPOINT.substring(0, 50)}...`);
console.log(`🔑 API Key: ${DO_AGENT_API_KEY.substring(0, 10)}...\n`);

testDigitalOceanAgent().catch(console.error);
