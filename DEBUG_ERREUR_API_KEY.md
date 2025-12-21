# 🔍 Debug : Erreur API Key Persistante

## ✅ Vérifications à Faire

### 1. Vérifier que le Secret est Bien Configuré

Dans Supabase Dashboard :

1. **Allez dans "Secrets"** (menu de gauche, sous "Functions")
2. **Vérifiez que vous voyez** :
   - `GEMINI_API_KEY` dans la liste
   - Le nom doit être EXACTEMENT `GEMINI_API_KEY` (en majuscules)
   - La valeur doit être votre clé API Gemini (commence par `AIza...`)

**Si le secret n'existe pas** :
- Cliquez sur "Add Secret"
- Nom : `GEMINI_API_KEY`
- Valeur : Votre clé API Gemini
- Save

### 2. Vérifier les Logs de l'Edge Function

Dans Supabase Dashboard :

1. **Allez dans "Edge Functions"**
2. **Cliquez sur `analyze-fund`**
3. **Allez dans l'onglet "Logs"** (en haut)
4. **Regardez les dernières lignes** - quelle erreur voyez-vous ?

### 3. Vérifier le Code Déployé

Dans Supabase Dashboard :

1. **Allez dans "Edge Functions"** → `analyze-fund`
2. **Allez dans l'onglet "Code"**
3. **Vérifiez que le code contient** :
   - `const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");`
   - La vérification de la clé API

### 4. Tester Directement dans la Console du Navigateur

Ouvrez votre application (localhost:8080) et dans la console (F12), exécutez :

```javascript
// Vérifier les variables d'environnement
console.log("SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("SUPABASE_KEY:", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "✅ Configuré" : "❌ Manquant");
```

### 5. Tester l'Edge Function Directement

Dans la console du navigateur (F12), exécutez :

```javascript
const testFunction = async () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  console.log("Testing Edge Function...");
  console.log("URL:", `${supabaseUrl}/functions/v1/analyze-fund`);
  
  const response = await fetch(`${supabaseUrl}/functions/v1/analyze-fund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
    },
    body: JSON.stringify({
      fundName: "Sequoia Capital",
      params: { numberOfStartups: 1 }
    }),
  });
  
  const text = await response.text();
  console.log("Status:", response.status);
  console.log("Response:", text);
  
  try {
    const data = JSON.parse(text);
    console.log("Parsed data:", data);
  } catch (e) {
    console.error("Not JSON:", e);
  }
};

testFunction();
```

---

## 🐛 Erreurs Communes et Solutions

### Erreur : "GEMINI_API_KEY not configured"

**Solution** :
1. Vérifiez que le secret existe dans Supabase Dashboard → Secrets
2. Vérifiez que le nom est EXACTEMENT `GEMINI_API_KEY` (majuscules)
3. Attendez 10-30 secondes après avoir ajouté le secret
4. Redéployez la fonction (allez dans Code → Deploy)

### Erreur : "API Key not found" ou "Invalid API key"

**Solution** :
1. Vérifiez que votre clé API Gemini est valide
2. Allez sur https://makersuite.google.com/app/apikey
3. Vérifiez que la clé n'est pas expirée
4. Générez une nouvelle clé si nécessaire
5. Mettez à jour le secret dans Supabase

### Erreur : "Rate limit exceeded"

**Solution** :
- Attendez 1 minute et réessayez
- Gemini gratuit : 15 requêtes/minute max

### Erreur : 404 ou "Function not found"

**Solution** :
1. Vérifiez que la fonction s'appelle bien `analyze-fund`
2. Vérifiez l'URL dans votre code frontend
3. Redéployez la fonction

---

## 📝 Informations à Me Donner

Pour que je puisse vous aider, dites-moi :

1. **Quelle est l'erreur EXACTE** que vous voyez ?
   - Dans l'application ?
   - Dans la console du navigateur (F12) ?
   - Dans les logs Supabase ?

2. **Le secret `GEMINI_API_KEY` existe-t-il** dans Supabase Dashboard → Secrets ?

3. **Quel est le statut** dans les logs de l'Edge Function ?

4. **Avez-vous redéployé** la fonction après avoir ajouté le secret ?

