// Test manuel des heuristiques de dedup-ranker (exécuter: deno run test-dedup.ts)
import { deduplicateAndRank } from "./dedup-ranker.ts";

const Y = new Date().getFullYear();
const results = [
  // Produit de grand groupe (host corporate) → exclu malgré 2 mentions
  { title: "Bijira - API Management", url: "https://wso2.com/bijira", description: `lancé en ${Y}`, source: "brave", category: "press" },
  { title: "Bijira - API Management", url: "https://wso2.com/bijira", description: "API platform", source: "serper", category: "french_tech" },
  // Produit sous-page d'un domaine inconnu, nom ≠ domaine → exclu malgré 2 mentions
  { title: "Zenflow - workflow engine", url: "https://bigsoftcorp.com/products/zenflow", description: `released ${Y}`, source: "brave", category: "press" },
  { title: "Zenflow - workflow engine", url: "https://bigsoftcorp.com/products/zenflow", description: "workflow", source: "serper", category: "icp_precision" },
  // Vraie startup, racine de domaine → gardée
  { title: "Acme Robotics - Home", url: "https://acmerobotics.io", description: `seed round ${Y}`, source: "brave", category: "press" },
  { title: "Acme Robotics raises seed", url: "https://acmerobotics.io/news/seed", description: `funding ${Y}`, source: "serper", category: "french_tech" },
  // Sous-page de la startup avec son nom dans le titre → gardée (groupée)
  { title: "Acme Robotics | Team", url: "https://acmerobotics.io/team", description: "founders", source: "brave", category: "talent_signals" },
  // GitHub org (agrégateur) → jamais filtré par la règle sous-page
  { title: "quantumleap", url: "https://github.com/quantumleap", description: `GitHub org créé ${Y}`, source: "github", category: "github" },
  // Startup dont le nom matche le domaine, sous-page → gardée
  { title: "Mistral AI - La Plateforme", url: "https://mistral.ai/products/plateforme", description: `${Y}`, source: "brave", category: "press" },
  { title: "Mistral AI - Careers", url: "https://mistral.ai/careers", description: "hiring", source: "serper", category: "talent_signals" },
];

const ranked = deduplicateAndRank(results as any);
const names = ranked.map((c) => c.name);
console.log("Candidats:", names);

const assert = (cond: boolean, msg: string) => {
  if (!cond) { console.error("FAIL:", msg); Deno.exit(1); }
  console.log("OK:", msg);
};
assert(!names.includes("Bijira"), "wso2.com/bijira exclu (host corporate)");
assert(!names.includes("Zenflow"), "bigsoftcorp.com/products/zenflow exclu (sous-page produit)");
assert(names.includes("Acme Robotics"), "acmerobotics.io gardé");
assert(names.includes("quantumleap"), "org GitHub gardée");
assert(names.includes("Mistral AI"), "mistral.ai/products gardé (nom matche domaine)");
const acme = ranked.find((c) => c.name === "Acme Robotics")!;
assert(acme.mentionCount === 3, `Acme groupé (3 mentions, vu ${acme.mentionCount})`);
assert(acme.recencyScore === 10, `récence année courante = 10 (vu ${acme.recencyScore})`);
console.log("Tous les tests passent.");
