# 🔧 Corriger l'Erreur CORS

## 🐛 Problème Identifié

L'erreur CORS indique que l'Edge Function ne répond pas correctement ou n'est pas déployée.

**Erreur** : `Access to fetch at 'https://anxyjsgrittdwrizqcgi.supabase.co/functions/v1/a...' has been blocked by CORS policy`

---

## ✅ Solutions

### Solution 1 : Vérifier que l'Edge Function est Déployée

1. **Allez sur** : [https://app.supabase.com](https://app.supabase.com)
2. **Sélectionnez** votre projet
3. **Allez dans** : **Edge Functions** (menu de gauche)
4. **Vérifiez** que `analyze-fund` existe dans la liste
5. **Si elle n'existe pas** : Créez-la (voir guide de migration)

### Solution 2 : Redéployer l'Edge Function avec le Code Corrigé

Le code a été corrigé pour mieux gérer CORS. Redéployez :

1. **Allez dans** : **Edge Functions** → `analyze-fund`
2. **Cliquez sur l'onglet "Code"**
3. **Ouvrez** le fichier local : `supabase/functions/analyze-fund/index.ts`
4. **Copiez TOUT le contenu** (Ctrl+A puis Ctrl+C)
5. **Dans Supabase**, supprimez tout le code existant
6. **Collez** le nouveau code (Ctrl+V)
7. **Cliquez sur "Deploy"**

### Solution 3 : Vérifier les Secrets

1. **Allez dans** : **Secrets** (menu de gauche, sous "Functions")
2. **Vérifiez** que `GEMINI_API_KEY` existe
3. **Si elle n'existe pas** : Ajoutez-la avec la valeur : `AIzaSyC3mtxB-6jdeNVG1RWyoT-D6Kl-rD2m-Vs`

### Solution 4 : Vérifier l'URL dans .env

1. **Ouvrez** le fichier `.env`
2. **Vérifiez** que l'URL est correcte :
   ```env
   VITE_SUPABASE_URL=https://anxyjsgrittdwrizqcgi.supabase.co
   ```
3. **Redémarrez** le serveur après modification

---

## 🔍 Vérification Étape par Étape

### 1. Tester l'Edge Function Directement

Dans la console du navigateur (F12), exécutez :

```javascript
const testFunction = async () => {
  const supabaseUrl = 'https://anxyjsgrittdwrizqcgi.supabase.co';
  const supabaseKey = 'sb_publishable_BqZzi-MJAaFbWVpzZnhG5g_adTl8psN';
  
  console.log("Testing Edge Function...");
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-fund`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8080',
      },
    });
    
    console.log("OPTIONS Status:", response.status);
    console.log("CORS Headers:", {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
    });
    
    if (response.status === 204) {
      console.log("✅ CORS OK!");
    } else {
      console.error("❌ CORS Problem:", response.status);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
};

testFunction();
```

### 2. Vérifier les Logs

1. **Dans Supabase Dashboard** : **Edge Functions** → `analyze-fund` → **Logs**
2. **Regardez** les dernières entrées
3. **Si vous voyez des erreurs** : Copiez-les et dites-moi

---

## 📝 Modifications Apportées au Code

### Headers CORS Améliorés

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',  // ✅ Ajouté
  'Access-Control-Max-Age': '86400',  // ✅ Ajouté
};
```

### Réponse OPTIONS Améliorée

```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, { 
    status: 204,  // ✅ Status 204 au lieu de 200
    headers: corsHeaders 
  });
}
```

### Gestion d'Erreur Améliorée dans le Frontend

Le frontend gère maintenant mieux les erreurs de réseau.

---

## ✅ Checklist de Correction

- [ ] Edge Function `analyze-fund` existe dans Supabase
- [ ] Edge Function redéployée avec le nouveau code
- [ ] Secret `GEMINI_API_KEY` configuré dans Supabase
- [ ] Fichier `.env` contient la bonne URL
- [ ] Serveur redémarré après modification de `.env`
- [ ] Test OPTIONS dans la console retourne 204
- [ ] L'analyse fonctionne sans erreur CORS

---

## 🆘 Si le Problème Persiste

1. **Vérifiez les logs** dans Supabase Dashboard → Edge Functions → Logs
2. **Testez l'Edge Function** directement dans la console (voir ci-dessus)
3. **Vérifiez** que vous utilisez la bonne clé (anon, pas service_role)
4. **Vérifiez** que le projet Supabase est actif (pas suspendu)

---

**Après avoir redéployé l'Edge Function, testez à nouveau !** 🚀

