# 🔍 Debug : Secret GEMINI_API_KEY Non Reconnu

## ✅ Vous êtes CERTAIN que la clé est dans les secrets, mais ça ne fonctionne pas ?

Plusieurs raisons possibles. Vérifions étape par étape :

---

## 🔍 Vérification 1 : Nom du Secret

### Le nom DOIT être EXACTEMENT :

```
GEMINI_API_KEY
```

**Vérifiez** :
- ✅ Toutes les lettres en **MAJUSCULES**
- ✅ Un seul underscore `_` (pas de tiret `-`)
- ✅ Pas d'espaces avant/après
- ✅ Pas de guillemets

**❌ Noms INCORRECTS** :
- `gemini_api_key` (minuscules)
- `GEMINI-API-KEY` (tirets)
- `GEMINI_API_KEY ` (espace à la fin)
- `"GEMINI_API_KEY"` (guillemets)

---

## 🔍 Vérification 2 : Valeur du Secret

### La clé DOIT être :

```
AIzaSyC3mtxB-6jdeNVG1RWyoT-D6Kl-rD2m-Vs
```

**Vérifiez** :
- ✅ Commence par `AIza`
- ✅ Pas d'espaces avant/après
- ✅ Pas de retours à la ligne
- ✅ La clé complète (pas tronquée)

**Dans Supabase Dashboard** :
1. **Allez dans** : **Secrets**
2. **Trouvez** `GEMINI_API_KEY`
3. **Cliquez sur l'icône "👁️"** (eye) pour voir la valeur
4. **Vérifiez** qu'elle correspond exactement à : `AIzaSyC3mtxB-6jdeNVG1RWyoT-D6Kl-rD2m-Vs`

---

## 🔍 Vérification 3 : Redéployer l'Edge Function

**⚠️ IMPORTANT** : Après avoir ajouté/modifié un secret, vous DEVEZ redéployer l'Edge Function !

### Pourquoi ?
Les secrets sont injectés au moment du déploiement. Si vous ajoutez un secret après le déploiement, la fonction ne le verra pas.

### Comment redéployer :

1. **Allez dans** : **Edge Functions** → `analyze-fund`
2. **Cliquez sur l'onglet "Code"**
3. **Cliquez simplement sur "Deploy"** (même si le code n'a pas changé)
   - Cela force la fonction à recharger les secrets
4. **Attendez** 10-20 secondes

---

## 🔍 Vérification 4 : Vérifier que la Clé Gemini est Valide

La clé peut être expirée ou invalide. Testons-la :

### Test Direct de la Clé Gemini

Dans la console du navigateur (F12), exécutez :

```javascript
const testGeminiKey = async () => {
  const apiKey = 'AIzaSyC3mtxB-6jdeNVG1RWyoT-D6Kl-rD2m-Vs';
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Test'
            }]
          }]
        })
      }
    );
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Clé Gemini VALIDE !');
      console.log('Réponse:', data);
    } else {
      console.error('❌ Clé Gemini INVALIDE ou EXPIRÉE');
      console.error('Erreur:', data);
    }
  } catch (error) {
    console.error('❌ Erreur réseau:', error);
  }
};

testGeminiKey();
```

**Si ça retourne une erreur** :
- La clé est invalide ou expirée
- Il faut en générer une nouvelle sur [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

---

## 🔍 Vérification 5 : Vérifier les Logs de l'Edge Function

1. **Allez dans** : **Edge Functions** → `analyze-fund` → **Logs**
2. **Regardez** les dernières entrées
3. **Cherchez** des messages comme :
   - `GEMINI_API_KEY not configured`
   - `Invalid API key`
   - `API Key not found`

**Si vous voyez "GEMINI_API_KEY not configured"** :
- Le secret n'est pas accessible
- Redéployez la fonction (voir Vérification 3)

---

## 🔧 Solution : Supprimer et Recréer le Secret

Parfois, il faut supprimer et recréer le secret :

1. **Allez dans** : **Secrets**
2. **Trouvez** `GEMINI_API_KEY`
3. **Supprimez-le** (icône poubelle)
4. **Attendez** 5 secondes
5. **Cliquez sur "Add Secret"**
6. **Remplissez** :
   - **Name** : `GEMINI_API_KEY` (exactement)
   - **Value** : `AIzaSyC3mtxB-6jdeNVG1RWyoT-D6Kl-rD2m-Vs`
7. **Save**
8. **Redéployez** l'Edge Function (voir Vérification 3)

---

## 🔧 Solution Alternative : Vérifier la Clé dans le Code

Si vous voulez tester avec la clé directement (temporairement, pour debug) :

1. **Dans Supabase Dashboard** : **Edge Functions** → `analyze-fund` → **Code**
2. **Trouvez** la ligne : `const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");`
3. **Temporairement**, remplacez par :
   ```typescript
   const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "AIzaSyC3mtxB-6jdeNVG1RWyoT-D6Kl-rD2m-Vs";
   ```
4. **Deploy**
5. **Testez**
6. **Si ça fonctionne** : Le problème vient de la récupération du secret
7. **Remettez** le code original et supprimez/recréez le secret

---

## ✅ Checklist Complète

- [ ] Le secret s'appelle EXACTEMENT `GEMINI_API_KEY` (majuscules)
- [ ] La valeur est exactement `AIzaSyC3mtxB-6jdeNVG1RWyoT-D6Kl-rD2m-Vs` (pas d'espaces)
- [ ] L'Edge Function a été redéployée APRÈS avoir ajouté le secret
- [ ] La clé Gemini est valide (testée directement)
- [ ] Les logs ne montrent pas "GEMINI_API_KEY not configured"
- [ ] J'ai supprimé et recréé le secret si nécessaire

---

## 🆘 Si Rien Ne Fonctionne

1. **Générez une NOUVELLE clé Gemini** :
   - Allez sur [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
   - Créez une nouvelle clé API
   - Remplacez l'ancienne dans Supabase Secrets

2. **Vérifiez les logs** dans Supabase pour voir l'erreur exacte

3. **Testez la clé directement** avec le script ci-dessus

---

**Dites-moi ce que vous trouvez dans les logs et si la clé est valide !** 🔍

