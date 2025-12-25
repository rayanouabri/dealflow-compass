# 🔍 Debug : Problème Edge Function

## 🎯 Test Direct de l'Edge Function

Pour identifier le problème exact, testons l'Edge Function directement :

### Test 1 : Vérifier que l'Edge Function répond

Ouvrez la console du navigateur (F12) et exécutez ce code :

```javascript
const testFunction = async () => {
  const supabaseUrl = 'https://bdsetpsitqhzpnitxibo.supabase.co';
  const supabaseKey = 'VOTRE_ANON_KEY'; // Remplacez par votre clé
  
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

### Test 2 : Vérifier les secrets

Dans Supabase Dashboard :
1. Allez dans Edge Functions > analyze-fund > Settings > Secrets
2. Vérifiez que `GEMINI_API_KEY` existe
3. (Optionnel) Vérifiez que `BRAVE_API_KEY` existe si vous voulez l'enrichissement web

### Test 3 : Vérifier les variables d'environnement frontend

Dans la console du navigateur :
```javascript
console.log("SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("SUPABASE_KEY:", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20) + "...");
```

## 🐛 Problèmes Possibles

### Problème 1 : Edge Function ne répond pas
- Vérifiez que l'URL est correcte
- Vérifiez que la clé API est correcte
- Vérifiez les logs dans Supabase Dashboard

### Problème 2 : Secret GEMINI_API_KEY non configuré
- L'Edge Function retournera une erreur claire
- Vérifiez dans Supabase Dashboard > Secrets

### Problème 3 : CORS ou authentification
- Vérifiez que les headers sont corrects
- Vérifiez que la clé API est valide

### Problème 4 : Cache du navigateur
- Faites un hard refresh : Ctrl+Shift+R
- Videz le cache du navigateur

## 📝 Informations à Me Donner

Pour que je puisse vous aider, donnez-moi :
1. Le message d'erreur exact dans la console (F12)
2. Le status code de la réponse (dans Network tab)
3. Le contenu de la réponse (dans Network tab)
4. Si `GEMINI_API_KEY` est bien configuré dans Supabase (et `BRAVE_API_KEY` si vous voulez l’enrichissement web)

