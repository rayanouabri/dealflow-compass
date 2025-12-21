# 🧪 Test Direct de l'Edge Function

## 🎯 Test dans la Console du Navigateur

Pour vérifier si le secret `GEMINI_API_KEY` est bien configuré, testons directement l'Edge Function :

### Étape 1 : Ouvrir la Console

1. Ouvrez votre application : http://localhost:8080
2. Ouvrez la console (F12 > Console)

### Étape 2 : Tester l'Edge Function Directement

Copiez-collez ce code dans la console :

```javascript
const testEdgeFunction = async () => {
  const supabaseUrl = 'https://bdsetpsitqhzpnitxibo.supabase.co';
  const supabaseKey = 'VOTRE_ANON_KEY'; // Remplacez par votre clé depuis .env
  
  console.log('Testing Edge Function...');
  
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
  console.log('Status:', response.status);
  console.log('Response:', text);
  
  try {
    const data = JSON.parse(text);
    console.log('Parsed data:', data);
    
    if (data.error) {
      console.error('ERROR:', data.error);
    }
  } catch (e) {
    console.error('Not JSON:', e);
  }
};

testEdgeFunction();
```

**Remplacez `VOTRE_ANON_KEY`** par votre clé Supabase depuis votre fichier `.env` (variable `VITE_SUPABASE_PUBLISHABLE_KEY`).

### Étape 3 : Analyser le Résultat

**Si vous voyez** :
- `Status: 500` + `"GEMINI_API_KEY not configured"` → Le secret n'est pas configuré
- `Status: 403` + `"Invalid or expired Gemini API key"` → La clé Gemini est invalide/expirée
- `Status: 429` + `"Rate limit exceeded"` → Limite Gemini atteinte (attendre 30-60s)
- `Status: 200` → Ça fonctionne ! ✅

## 🔍 Vérification Alternative

Dans Supabase Dashboard :
1. Allez dans Edge Functions > analyze-fund > **Logs**
2. Lancez une analyse depuis l'application
3. Regardez les logs en temps réel
4. Vous verrez l'erreur exacte

---

**Dites-moi ce que vous voyez dans la console après avoir exécuté le test.**

