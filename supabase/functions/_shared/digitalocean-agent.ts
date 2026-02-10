/**
 * Helper pour appeler l'agent DigitalOcean GenAI
 * Utilisé pour le sourcing de startups et la due diligence
 * 
 * NOTE: L'API DigitalOcean Agents utilise un format spécifique.
 * L'endpoint doit être appelé avec le bon format de requête.
 */

interface DigitalOceanAgentResponse {
  output: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

/**
 * Appelle l'agent DigitalOcean avec une requête
 * Format attendu par l'API DigitalOcean GenAI Agents
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

  // Normaliser l'URL de l'endpoint
  let normalizedEndpoint = DO_AGENT_ENDPOINT.trim();
  
  // S'assurer que l'URL ne se termine pas par /
  normalizedEndpoint = normalizedEndpoint.replace(/\/+$/, '');
  
  console.log(`[DO Agent] Appel à: ${normalizedEndpoint.substring(0, 60)}...`);

  try {
    // Format de requête pour DigitalOcean GenAI Agents
    // Basé sur la documentation: https://docs.digitalocean.com/products/genai-platform/
    const requestBody = {
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      stream: false
    };

    const response = await fetch(normalizedEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DO_AGENT_API_KEY}`,
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DO Agent] Erreur ${response.status}: ${errorText.substring(0, 200)}`);
      throw new Error(`DigitalOcean Agent API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[DO Agent] ✅ Réponse reçue`);
    
    // Extraire la réponse selon le format de l'API
    let output = "";
    
    if (data.choices && data.choices[0]?.message?.content) {
      // Format OpenAI-like
      output = data.choices[0].message.content;
    } else if (data.output) {
      output = data.output;
    } else if (data.response) {
      output = data.response;
    } else if (data.message) {
      output = data.message;
    } else if (data.content) {
      output = data.content;
    } else if (typeof data === 'string') {
      output = data;
    } else {
      output = JSON.stringify(data, null, 2);
    }

    return {
      output,
      usage: data.usage,
    };
  } catch (error) {
    console.error("[DO Agent] Échec:", error);
    throw error;
  }
}

/**
 * Formate une requête de sourcing pour l'agent DigitalOcean
 * Prompt optimisé pour des résultats pertinents et sourcés
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
  let prompt = `# MISSION DE SOURCING VC PROFESSIONNEL

Tu es un analyste VC senior spécialisé dans le sourcing de startups. Tu dois identifier ${numberOfStartups} startup(s) qui correspondent PARFAITEMENT aux critères ci-dessous.

## CRITÈRES D'INVESTISSEMENT
`;

  if (fundName && fundName !== "Custom Thesis") {
    prompt += `\n**Fond de référence:** ${fundName}\n`;
    prompt += `Analyse la thèse d'investissement de ce fond et trouve des startups qui correspondent à leur stratégie.\n`;
  }

  if (customThesis) {
    prompt += `\n**Thèse personnalisée:**\n`;
    if (customThesis.sectors?.length) {
      prompt += `- Secteurs: ${customThesis.sectors.join(", ")}\n`;
    }
    if (customThesis.stage) {
      prompt += `- Stade: ${customThesis.stage}\n`;
    }
    if (customThesis.geography) {
      prompt += `- Géographie: ${customThesis.geography}\n`;
    }
    if (customThesis.ticketSize) {
      prompt += `- Ticket: ${customThesis.ticketSize}\n`;
    }
    if (customThesis.description) {
      prompt += `- Description: ${customThesis.description}\n`;
    }
  } else {
    if (sectors?.length) {
      prompt += `- Secteurs: ${sectors.join(", ")}\n`;
    }
    if (stage) {
      prompt += `- Stade: ${stage}\n`;
    }
    if (geography) {
      prompt += `- Géographie: ${geography}\n`;
    }
  }

  prompt += `
## RÈGLES STRICTES

1. **STARTUPS RÉELLES UNIQUEMENT** - Ne propose que des entreprises qui existent vraiment
2. **SOURCES OBLIGATOIRES** - Chaque information doit avoir une source vérifiable (URL)
3. **PAS DE CRUNCHBASE UNIQUEMENT** - Diversifie tes sources:
   - Presse spécialisée (TechCrunch, Les Echos, Maddyness, etc.)
   - LinkedIn (profils fondateurs, page entreprise)
   - Site web officiel de la startup
   - GitHub si pertinent
   - Articles de blog, podcasts, interviews
   - Communiqués de presse
4. **SIGNAUX FAIBLES** - Détecte:
   - Recrutements massifs (LinkedIn Jobs)
   - Nouveaux brevets déposés
   - Spin-offs d'entreprises/universités
   - Participation à des incubateurs/accélérateurs
   - Partenariats stratégiques récents
5. **MÉTRIQUES VÉRIFIABLES** - Si tu donnes des chiffres, cite la source
6. **SI PAS ASSEZ D'INFO** - Passe à une autre startup plus documentée

## FORMAT DE RÉPONSE (pour chaque startup)

\`\`\`
### [NOM DE LA STARTUP]

**Site web:** [URL vérifiée]
**Localisation:** [Ville, Pays]
**Secteur:** [Secteur principal]
**Stade:** [Pre-seed/Seed/Series A/etc.]
**Fondée en:** [Année]

**Description:**
[2-3 phrases sur ce que fait la startup]

**Pourquoi elle matche:**
[Explication de l'adéquation avec la thèse]

**Métriques connues:**
- [Métrique 1] - Source: [URL]
- [Métrique 2] - Source: [URL]

**Funding:**
- [Montant] - [Date] - [Investisseurs] - Source: [URL]

**Signaux forts:**
- [Signal 1]
- [Signal 2]

**Signaux faibles détectés:**
- [Signal 1] - Source: [URL]
- [Signal 2] - Source: [URL]

**Équipe clé:**
- [Fondateur 1] - [Background] - LinkedIn: [URL]
- [Fondateur 2] - [Background] - LinkedIn: [URL]

**Sources:**
1. [URL 1] - [Description]
2. [URL 2] - [Description]
3. [URL 3] - [Description]
\`\`\`

## IMPORTANT
- Réponds en FRANÇAIS
- Minimum 3 sources par startup
- Si une info n'est pas trouvable, indique "Non disponible"
- Priorise la qualité sur la quantité
`;

  return prompt;
}

/**
 * Formate une requête de due diligence pour l'agent DigitalOcean
 * Prompt optimisé pour un rapport complet et sourcé
 */
export function formatDueDiligencePrompt(
  companyName: string,
  companyWebsite?: string,
  additionalContext?: string
): string {
  let prompt = `# DUE DILIGENCE PROFESSIONNELLE

Tu es un analyste VC senior. Effectue une due diligence COMPLÈTE sur l'entreprise suivante.

## ENTREPRISE CIBLE
**Nom:** ${companyName}
`;

  if (companyWebsite) {
    prompt += `**Site web:** ${companyWebsite}\n`;
  }

  if (additionalContext) {
    prompt += `**Contexte:** ${additionalContext}\n`;
  }

  prompt += `
## RÈGLES CRITIQUES

1. **SOURCES OBLIGATOIRES** - Chaque information DOIT avoir une URL source
2. **PAS D'INVENTION** - Si tu ne trouves pas l'info, indique "Non disponible - aucune source trouvée"
3. **DIVERSITÉ DES SOURCES** - Utilise:
   - Site officiel de l'entreprise
   - Crunchbase, PitchBook, Dealroom
   - LinkedIn (entreprise + fondateurs)
   - Presse (TechCrunch, Les Echos, Maddyness, etc.)
   - Registres officiels (societe.com, Pappers, etc.)
   - GitHub si pertinent
4. **MÉTRIQUES VÉRIFIABLES** - Cite toujours la source des chiffres

## SECTIONS DU RAPPORT

### 1. PRÉSENTATION
- Nom, tagline, secteur
- Date de création
- Localisation (siège + bureaux)
- Nombre d'employés (avec source)

### 2. PRODUIT & TECHNOLOGIE
- Description du produit/service
- Proposition de valeur unique
- Stack technique (si disponible)
- Brevets déposés (avec numéros)
- Avantages technologiques

### 3. MARCHÉ
- TAM (Total Addressable Market) - avec source
- SAM (Serviceable Addressable Market) - avec source
- SOM (Serviceable Obtainable Market) - avec source
- CAGR du marché - avec source
- Tendances clés

### 4. FINANCEMENTS
Pour chaque levée:
- Montant
- Date
- Type (Seed, Series A, etc.)
- Investisseurs (lead + participants)
- Valorisation (si connue)
- Source (URL)

### 5. MÉTRIQUES & TRACTION
- ARR/MRR (avec source)
- Croissance YoY (avec source)
- Nombre de clients
- Clients notables
- NRR (Net Revenue Retention)
- CAC, LTV, ratio LTV/CAC
- Churn rate
- Burn rate estimé
- Runway estimé

### 6. ÉQUIPE
Pour chaque fondateur/C-level:
- Nom
- Rôle
- Background (études, expériences précédentes)
- LinkedIn URL
- Exits précédents

Taille de l'équipe totale (avec source)

### 7. CONCURRENCE
- Concurrents directs (avec URLs)
- Concurrents indirects
- Positionnement différenciant
- Avantages compétitifs (moat)

### 8. RISQUES
- Risques marché
- Risques exécution
- Risques financiers
- Risques concurrentiels
- Risques réglementaires

### 9. OPPORTUNITÉS
- Potentiel de croissance
- Expansion géographique possible
- Extension produit
- Valeur stratégique (M&A potentiel)

### 10. RECOMMANDATION
- Verdict: INVEST / WATCH / PASS
- Justification détaillée
- Multiple de valorisation cible
- Ticket suggéré
- Points de vigilance pour la suite

## FORMAT
- Réponds en FRANÇAIS
- Structure claire avec titres
- Chaque fait = une source URL
- Si info non trouvée = "Non disponible"
`;

  return prompt;
}
