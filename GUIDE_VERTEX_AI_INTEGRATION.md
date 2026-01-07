# Guide d'intégration Vertex AI Agent

Ce guide vous explique comment intégrer votre agent Vertex AI existant dans AI-VC pour :
1. ✅ Analyser les startups
2. ✅ Chatter avec l'agent en temps réel

---

## 📋 Prérequis

- ✅ Agent Vertex AI créé sur Google Cloud
- ✅ Projet Google Cloud avec Vertex AI API activée
- ✅ Service Account avec les permissions nécessaires

---

## 🔑 Étape 1 : Obtenir les credentials Google Cloud

### 1.1 Créer un Service Account

```bash
# Dans Google Cloud Console
1. Allez sur : IAM & Admin > Service Accounts
2. Cliquez "CREATE SERVICE ACCOUNT"
3. Nom : "ai-vc-vertex-agent"
4. Description : "Service account pour AI-VC Vertex AI integration"
5. Cliquez "CREATE AND CONTINUE"
```

### 1.2 Attribuer les rôles nécessaires

Ajoutez ces rôles au Service Account :
- `Vertex AI User` (roles/aiplatform.user)
- `Vertex AI Agent User` (roles/aiplatform.agentUser)
- `Service Account Token Creator` (roles/iam.serviceAccountTokenCreator)

### 1.3 Télécharger la clé JSON

```bash
1. Dans la liste des Service Accounts, cliquez sur celui créé
2. Onglet "KEYS" > "ADD KEY" > "Create new key"
3. Format : JSON
4. Téléchargez le fichier JSON (gardez-le en sécurité !)
```

---

## 🔧 Étape 2 : Configuration Supabase

### 2.1 Ajouter les secrets dans Supabase

```bash
# Dans Supabase Dashboard
1. Allez sur : Edge Functions > Settings > Secrets
2. Ajoutez ces variables :

GOOGLE_CLOUD_PROJECT_ID=votre-project-id
VERTEX_AI_LOCATION=us-central1  # ou votre région
VERTEX_AI_AGENT_ID=votre-agent-id
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"..."}  # Contenu du JSON téléchargé
```

### 2.2 Obtenir votre Agent ID

```bash
# Dans Google Cloud Console
1. Allez sur : Vertex AI > Agent Builder
2. Cliquez sur votre agent
3. Copiez l'ID (format : projects/PROJECT_ID/locations/LOCATION/agents/AGENT_ID)
```

---

## 💻 Étape 3 : Modifier les Edge Functions

### 3.1 Créer une fonction Vertex AI helper

Créez : `supabase/functions/_shared/vertex-ai.ts`

```typescript
interface VertexAIConfig {
  projectId: string;
  location: string;
  agentId: string;
  credentials: any;
}

export async function getAccessToken(credentials: any): Promise<string> {
  const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  
  const jwtClaimSetEncoded = btoa(JSON.stringify(jwtClaimSet));
  const signatureInput = `${jwtHeader}.${jwtClaimSetEncoded}`;
  
  // Pour Supabase Edge Functions, utiliser Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureInput);
  const privateKey = credentials.private_key;
  
  // Importer la clé
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data);
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${signatureInput}.${signatureBase64}`;
  
  // Échanger JWT contre access token
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  
  const tokenData = await response.json();
  return tokenData.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function callVertexAgent(
  config: VertexAIConfig,
  query: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  const accessToken = await getAccessToken(config.credentials);
  
  const endpoint = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/agents/${config.agentId}:predict`;
  
  // Construire le contexte de conversation
  const messages = [
    ...conversationHistory.map(msg => ({
      role: msg.role === "user" ? "user" : "agent",
      content: msg.content,
    })),
    { role: "user", content: query },
  ];
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      instances: [{ messages }],
      parameters: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vertex AI Error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return data.predictions?.[0]?.content || "Pas de réponse de l'agent";
}
```

### 3.2 Modifier `analyze-fund/index.ts`

Ajoutez l'option Vertex AI :

```typescript
// Au début du fichier
import { callVertexAgent } from "../_shared/vertex-ai.ts";

// Dans la fonction serve, après avoir récupéré les clés API
const USE_VERTEX_AI = Deno.env.get("USE_VERTEX_AI") === "true";
const VERTEX_CONFIG = {
  projectId: Deno.env.get("GOOGLE_CLOUD_PROJECT_ID"),
  location: Deno.env.get("VERTEX_AI_LOCATION") || "us-central1",
  agentId: Deno.env.get("VERTEX_AI_AGENT_ID"),
  credentials: JSON.parse(Deno.env.get("GOOGLE_CREDENTIALS") || "{}"),
};

// Remplacer les appels Groq/Gemini par Vertex AI
if (USE_VERTEX_AI && VERTEX_CONFIG.projectId) {
  console.log("Using Vertex AI Agent for analysis");
  
  const vertexPrompt = `${systemPrompt}\n\n${userPrompt}`;
  content = await callVertexAgent(VERTEX_CONFIG, vertexPrompt);
} else if (AI_PROVIDER === "groq") {
  // ... code Groq existant
} else {
  // ... code Gemini existant
}
```

### 3.3 Modifier `ai-qa/index.ts`

Ajoutez Vertex AI pour le chat :

```typescript
import { callVertexAgent } from "../_shared/vertex-ai.ts";

// Dans la fonction serve
const USE_VERTEX_AI = Deno.env.get("USE_VERTEX_AI") === "true";

if (USE_VERTEX_AI) {
  const VERTEX_CONFIG = {
    projectId: Deno.env.get("GOOGLE_CLOUD_PROJECT_ID")!,
    location: Deno.env.get("VERTEX_AI_LOCATION") || "us-central1",
    agentId: Deno.env.get("VERTEX_AI_AGENT_ID")!,
    credentials: JSON.parse(Deno.env.get("GOOGLE_CREDENTIALS") || "{}"),
  };
  
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  answer = await callVertexAgent(VERTEX_CONFIG, fullPrompt, conversationHistory);
}
```

---

## 🎨 Étape 4 : Ajouter l'option dans l'interface

### 4.1 Créer un toggle pour Vertex AI

Dans `src/pages/Index.tsx`, ajoutez :

```typescript
const [useVertexAI, setUseVertexAI] = useState(false);

// Dans le JSX, avant le bouton Analyze
<div className="flex items-center gap-2 mb-4">
  <input
    type="checkbox"
    id="vertex-ai"
    checked={useVertexAI}
    onChange={(e) => setUseVertexAI(e.target.checked)}
    className="rounded"
  />
  <label htmlFor="vertex-ai" className="text-sm">
    🤖 Utiliser Vertex AI Agent (plus précis)
  </label>
</div>
```

### 4.2 Passer le paramètre à l'API

Modifiez l'appel API :

```typescript
const response = await fetch(functionUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseKey}`,
    'apikey': supabaseKey,
    'x-use-vertex-ai': useVertexAI ? 'true' : 'false', // Nouveau header
  },
  body: JSON.stringify(requestBody),
});
```

### 4.3 Lire le header dans la fonction

Dans `analyze-fund/index.ts` :

```typescript
const USE_VERTEX_AI = req.headers.get('x-use-vertex-ai') === 'true' || 
                      Deno.env.get("USE_VERTEX_AI") === "true";
```

---

## 🚀 Étape 5 : Déploiement

### 5.1 Créer le dossier _shared

```bash
mkdir -p supabase/functions/_shared
# Créez le fichier vertex-ai.ts avec le code fourni
```

### 5.2 Déployer les fonctions

```bash
# Déployer analyze-fund
supabase functions deploy analyze-fund

# Déployer ai-qa
supabase functions deploy ai-qa
```

### 5.3 Vérifier les secrets

```bash
# Dans Supabase Dashboard > Edge Functions > Settings > Secrets
# Vérifiez que tous les secrets sont présents :
✅ GOOGLE_CLOUD_PROJECT_ID
✅ VERTEX_AI_LOCATION
✅ VERTEX_AI_AGENT_ID
✅ GOOGLE_CREDENTIALS
✅ USE_VERTEX_AI (optionnel, mettre "true" pour forcer)
```

---

## 🧪 Étape 6 : Tester l'intégration

### 6.1 Test depuis l'interface

```bash
1. Allez sur votre application
2. Cochez "Utiliser Vertex AI Agent"
3. Lancez une analyse
4. Vérifiez les logs dans Supabase Functions
```

### 6.2 Test du chat

```bash
1. Ouvrez le chat AI (après une analyse)
2. Posez une question
3. Vérifiez que la réponse vient de Vertex AI
```

### 6.3 Logs de debug

Dans Supabase Dashboard :
```bash
Edge Functions > analyze-fund > Logs
# Cherchez : "Using Vertex AI Agent for analysis"
```

---

## ⚠️ Résolution des problèmes

### Erreur : "Invalid credentials"
```bash
✅ Vérifiez que GOOGLE_CREDENTIALS est un JSON valide
✅ Vérifiez que le Service Account a les bons rôles
✅ Vérifiez que Vertex AI API est activée
```

### Erreur : "Agent not found"
```bash
✅ Vérifiez VERTEX_AI_AGENT_ID (format complet)
✅ Vérifiez que l'agent existe dans la région spécifiée
✅ Vérifiez VERTEX_AI_LOCATION
```

### Erreur : "Authentication failed"
```bash
✅ Régénérez un access token manuellement pour tester
✅ Vérifiez la date/heure du serveur Supabase
✅ Vérifiez que la clé privée n'a pas été corrompue
```

---

## 💡 Conseils et optimisations

### 1. Cache des tokens
```typescript
// Mettre en cache l'access token (valide 1h)
let cachedToken: { token: string; expiry: number } | null = null;

export async function getAccessToken(credentials: any): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiry > now) {
    return cachedToken.token;
  }
  
  const token = await generateNewToken(credentials);
  cachedToken = {
    token,
    expiry: now + 3500000, // 58 minutes
  };
  return token;
}
```

### 2. Fallback automatique
```typescript
// Si Vertex AI échoue, utiliser Groq/Gemini
try {
  if (USE_VERTEX_AI) {
    content = await callVertexAgent(VERTEX_CONFIG, prompt);
  }
} catch (vertexError) {
  console.error("Vertex AI failed, falling back to Groq:", vertexError);
  // Utiliser Groq/Gemini
}
```

### 3. Streaming des réponses
Pour des réponses plus fluides, implémentez le streaming :
```typescript
// À implémenter si votre agent Vertex AI supporte le streaming
```

---

## 📊 Coûts Vertex AI

- **Requêtes** : ~$0.25 per 1K characters
- **Stockage conversations** : ~$0.10 per GB/month
- **Agent Builder** : Inclus dans Vertex AI

💡 **Optimisation** : Utilisez Vertex AI uniquement pour les analyses complexes, Groq pour le reste.

---

## ✅ Checklist finale

- [ ] Service Account créé avec les bons rôles
- [ ] Clé JSON téléchargée et sécurisée
- [ ] Secrets configurés dans Supabase
- [ ] Fichier `_shared/vertex-ai.ts` créé
- [ ] `analyze-fund/index.ts` modifié
- [ ] `ai-qa/index.ts` modifié
- [ ] Fonctions déployées
- [ ] Interface mise à jour avec toggle
- [ ] Tests effectués (analyse + chat)
- [ ] Logs vérifiés

---

## 🎯 Résultat final

Vous aurez :
- ✅ **Analyse par Vertex AI** : Analyses plus précises et contextuelles
- ✅ **Chat avec l'agent** : Conversation naturelle avec mémoire
- ✅ **Fallback automatique** : Groq/Gemini si Vertex AI échoue
- ✅ **Toggle interface** : Choix entre Vertex AI et modèles alternatifs

🚀 **Votre agent Vertex AI est maintenant intégré dans AI-VC !**

