# 🔧 Corriger l'Erreur "Invalid JWT" (401)

## 🐛 Problème Identifié

L'erreur `401 Unauthorized: Invalid JWT` signifie que la clé API utilisée n'est pas valide ou n'est pas la bonne.

**Erreur** : `{"code":401,"message":"Invalid JWT"}`

---

## ✅ Solution : Vérifier la Clé API

### Le Problème

La clé que vous utilisez (`sb_publishable_BqZzi-MJAaFbWVpzZnhG5g_adTl8psN`) est une **nouvelle clé publishable** de Supabase, mais elle doit être la **clé `anon` `public`** classique.

### Vérification dans Supabase

1. **Allez sur** : [https://app.supabase.com](https://app.supabase.com)
2. **Sélectionnez** votre projet : `anxyjsgrittdwrizqcgi`
3. **Allez dans** : **Settings** → **API**
4. **Regardez** la section "Project API keys"

### Vous Devriez Voir Deux Types de Clés

#### A. Clés Publishable (Nouvelles)
- Format : `sb_publishable_...`
- ⚠️ **Ces clés peuvent ne pas fonctionner avec toutes les Edge Functions**

#### B. Clés Anon (Classiques) ✅ À UTILISER
- Format : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (très longue)
- ✅ **C'est celle-ci qu'il faut utiliser**

---

## 🔧 Correction

### Option 1 : Utiliser la Clé Anon Classique (RECOMMANDÉ)

1. **Dans Supabase Dashboard** : **Settings** → **API**
2. **Cherchez** la section **"Project API keys"**
3. **Trouvez** la clé **`anon` `public`** (pas `sb_publishable_`)
4. **Copiez** cette clé (elle commence par `eyJhbG...`)
5. **Ouvrez** votre fichier `.env`
6. **Remplacez** :
   ```env
   # ❌ AVANT
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_BqZzi-MJAaFbWVpzZnhG5g_adTl8psN
   
   # ✅ APRÈS (remplacez par la vraie anon key)
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueHlqc2dyaXR0ZHdyaXpxY2dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ4NzY4MDAsImV4cCI6MjA1MDQ1MjgwMH0.votre_signature_ici
   ```
7. **Sauvegardez** le fichier `.env`
8. **Redémarrez** le serveur (Ctrl+C puis `npm run dev`)

### Option 2 : Si Vous Ne Voyez Pas la Clé Anon

1. **Dans Supabase Dashboard** : **Settings** → **API**
2. **Cherchez** un bouton **"Reveal"** ou **"Show"** à côté de `anon` `public`
3. **Cliquez dessus** pour révéler la clé
4. **Copiez-la** et mettez-la dans `.env`

### Option 3 : Régénérer la Clé Anon

Si vous ne trouvez pas la clé anon :

1. **Dans Supabase Dashboard** : **Settings** → **API**
2. **Cherchez** la section **"Project API keys"**
3. **Trouvez** `anon` `public`
4. **Cliquez sur l'icône** de régénération (ou "Reset")
5. **Copiez** la nouvelle clé
6. **Mettez-la** dans `.env`

---

## 🔍 Comment Reconnaître la Bonne Clé

### ✅ Clé Anon (Correcte)
- Commence par `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
- Très longue (plusieurs centaines de caractères)
- Format JWT classique

### ❌ Clé Publishable (Peut ne pas fonctionner)
- Commence par `sb_publishable_`
- Plus courte
- Format nouveau de Supabase

---

## ✅ Vérification

Après avoir mis à jour `.env` :

1. **Redémarrez** le serveur :
   ```bash
   # Arrêtez (Ctrl+C)
   npm run dev
   ```

2. **Rafraîchissez** l'application (Ctrl+Shift+R)

3. **Testez** une analyse :
   - L'erreur "Invalid JWT" ne devrait plus apparaître
   - L'analyse devrait fonctionner

---

## 🐛 Si le Problème Persiste

### Vérifier que la Clé est Correcte

Dans la console du navigateur (F12), exécutez :

```javascript
console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("Supabase Key:", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20) + "...");
```

**Vérifiez** :
- L'URL est correcte : `https://anxyjsgrittdwrizqcgi.supabase.co`
- La clé commence par `eyJhbG...` (pas `sb_publishable_`)

### Vérifier dans Supabase

1. **Settings** → **API**
2. **Vérifiez** que vous utilisez bien la clé du projet `anxyjsgrittdwrizqcgi`
3. **Vérifiez** que le projet est actif (pas suspendu)

---

## 📝 Résumé

**Le problème** : Vous utilisez une clé `sb_publishable_` qui peut ne pas fonctionner avec les Edge Functions.

**La solution** : Utilisez la clé `anon` `public` classique (commence par `eyJhbG...`).

**Où la trouver** : Supabase Dashboard → Settings → API → `anon` `public`

---

**Une fois que vous avez mis la bonne clé dans `.env` et redémarré, ça devrait fonctionner !** 🚀

