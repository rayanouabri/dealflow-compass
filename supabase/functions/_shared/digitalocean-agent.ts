/**
 * Helper pour appeler l'agent DigitalOcean GenAI
 * Utilisé pour le sourcing de startups et la due diligence
 */

interface DigitalOceanAgentRequest {
  input: string;
  stream?: boolean;
}

interface DigitalOceanAgentResponse {
  output: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

/**
 * Appelle l'agent DigitalOcean avec une requête
 * @param prompt - Le prompt à envoyer à l'agent
 * @param endpointUrl - L'URL de l'endpoint de l'agent (optionnel, prend depuis env si non fourni)
 * @param apiKey - La clé d'API (optionnel, prend depuis env si non fourni)
 * @returns La réponse de l'agent
 */
export async function callDigitalOceanAgent(
  prompt: string,
  endpointUrl?: string,
  apiKey?: string
): Promise<DigitalOceanAgentResponse> {
  const DO_AGENT_ENDPOINT = endpointUrl || Deno.env.get("DO_AGENT_ENDPOINT");
  const DO_AGENT_API_KEY = apiKey || Deno.env.get("DO_AGENT_API_KEY");

  if (!DO_AGENT_ENDPOINT || !DO_AGENT_API_KEY) {
    throw new Error(
      "Configuration DigitalOcean Agent manquante. Ajoutez DO_AGENT_ENDPOINT et DO_AGENT_API_KEY dans les secrets Supabase."
    );
  }

  const requestBody: DigitalOceanAgentRequest = {
    input: prompt,
    stream: false, // On veut une réponse complète, pas un stream
  };

  try {
    const response = await fetch(DO_AGENT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DO_AGENT_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `DigitalOcean Agent API error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    
    // Format de réponse peut varier selon l'API DigitalOcean
    // On s'adapte aux formats possibles
    if (data.output) {
      return {
        output: data.output,
        usage: data.usage,
      };
    } else if (data.response) {
      return {
        output: data.response,
        usage: data.usage,
      };
    } else if (typeof data === 'string') {
      return {
        output: data,
      };
    } else {
      // Si la structure est différente, on retourne le JSON stringifié
      return {
        output: JSON.stringify(data, null, 2),
      };
    }
  } catch (error) {
    console.error("DigitalOcean Agent call failed:", error);
    throw error;
  }
}

/**
 * Formate une requête de sourcing pour l'agent DigitalOcean
 * @param fundName - Nom du fond (optionnel)
 * @param customThesis - Thèse personnalisée (optionnel)
 * @param sectors - Secteurs cibles
 * @param stage - Stade d'investissement
 * @param geography - Géographie cible
 * @param numberOfStartups - Nombre de startups à sourcer
 * @returns Le prompt formaté pour l'agent
 */
export function formatSourcingPrompt(
  fundName?: string,
  customThesis?: {
    sectors?: string[];
    stage?: string;
    geography?: string;
    ticketSize?: string;
    description?: string;
  },
  sectors?: string[],
  stage?: string,
  geography?: string,
  numberOfStartups: number = 5
): string {
  let prompt = "";

  if (fundName) {
    prompt += `Thèse d'investissement du fond : "${fundName}"\n\n`;
  }

  if (customThesis) {
    prompt += "THÈSE PERSONNALISÉE :\n";
    if (customThesis.sectors?.length) {
      prompt += `- Secteurs : ${customThesis.sectors.join(", ")}\n`;
    }
    if (customThesis.stage) {
      prompt += `- Stade : ${customThesis.stage}\n`;
    }
    if (customThesis.geography) {
      prompt += `- Géographie : ${customThesis.geography}\n`;
    }
    if (customThesis.ticketSize) {
      prompt += `- Ticket : ${customThesis.ticketSize}\n`;
    }
    if (customThesis.description) {
      prompt += `- Description : ${customThesis.description}\n`;
    }
    prompt += "\n";
  } else {
    // Utiliser les paramètres directs
    if (sectors?.length) {
      prompt += `Secteurs recherchés : ${sectors.join(", ")}\n`;
    }
    if (stage) {
      prompt += `Stade : ${stage}\n`;
    }
    if (geography) {
      prompt += `Géographie : ${geography}\n`;
    }
    prompt += "\n";
  }

  prompt += `MISSION : Sourcer ${numberOfStartups} startup(s) qui correspondent PARFAITEMENT à cette thèse.\n\n`;
  prompt += `IMPORTANT :\n`;
  prompt += `- Cherche des startups RÉELLES avec des sources vérifiables (site web, LinkedIn, articles)\n`;
  prompt += `- Détecte les signaux faibles (recrutement massif, brevets, spin-offs, incubateurs)\n`;
  prompt += `- Ne te limite PAS à Crunchbase - utilise aussi presse spécialisée, blogs tech, LinkedIn, GitHub, etc.\n`;
  prompt += `- Pour chaque startup, donne : nom, site web (URL), localisation, secteur, stade, description, pourquoi elle matche, signes forts, signaux faibles, funding connu, et AU MOINS 3 sources avec URLs\n`;
  prompt += `- Réponds en FRANÇAIS\n`;
  prompt += `- Format : liste claire et structurée, avec sources citées pour chaque info\n`;

  return prompt;
}

/**
 * Formate une requête de due diligence pour l'agent DigitalOcean
 * @param companyName - Nom de l'entreprise
 * @param companyWebsite - Site web (optionnel)
 * @param additionalContext - Contexte additionnel (optionnel)
 * @returns Le prompt formaté pour l'agent
 */
export function formatDueDiligencePrompt(
  companyName: string,
  companyWebsite?: string,
  additionalContext?: string
): string {
  let prompt = `DUE DILIGENCE COMPLÈTE sur l'entreprise : "${companyName}"\n\n`;

  if (companyWebsite) {
    prompt += `Site web : ${companyWebsite}\n\n`;
  }

  if (additionalContext) {
    prompt += `Contexte additionnel : ${additionalContext}\n\n`;
  }

  prompt += `MISSION : Effectuer une due diligence PROFESSIONNELLE de niveau VC senior.\n\n`;
  prompt += `SECTIONS À ANALYSER :\n`;
  prompt += `1. Présentation entreprise (nom, tagline, secteur, stade, localisation, fondée en)\n`;
  prompt += `2. Produit & Technologie (description, proposition de valeur, stack technique, brevets)\n`;
  prompt += `3. Marché (TAM/SAM/SOM avec sources, CAGR, tendances)\n`;
  prompt += `4. Financements (historique complet des levées avec montants, dates, investisseurs, sources)\n`;
  prompt += `5. Métriques & Traction (ARR/MRR, croissance, clients, NRR, CAC, LTV, churn, burn rate, runway)\n`;
  prompt += `6. Équipe (fondateurs avec LinkedIn, background, taille équipe, recrutements clés)\n`;
  prompt += `7. Concurrence (paysage concurrentiel, avantages compétitifs, moat)\n`;
  prompt += `8. Risques (marché, exécution, financiers, concurrentiels, réglementaires)\n`;
  prompt += `9. Opportunités (croissance, expansion marché/produit, valeur stratégique)\n`;
  prompt += `10. Recommandation (INVEST/WATCH/PASS avec justification, multiple cible, ticket suggéré)\n\n`;
  prompt += `RÈGLES CRITIQUES :\n`;
  prompt += `- CHAQUE information doit avoir sa SOURCE avec URL\n`;
  prompt += `- Ne JAMAIS inventer de données ou d'URLs\n`;
  prompt += `- Si une info n'est pas disponible, indique "Non disponible - aucune source trouvée"\n`;
  prompt += `- Utilise plusieurs types de sources : presse, Crunchbase, LinkedIn, rapports, sites officiels\n`;
  prompt += `- Réponds en FRANÇAIS\n`;
  prompt += `- Format : rapport structuré et professionnel, prêt pour un Investment Committee\n`;

  return prompt;
}
