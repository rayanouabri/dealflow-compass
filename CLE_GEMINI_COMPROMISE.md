# 🚨 Clé Gemini Compromise - Solution

## 🐛 Problème Identifié

**Erreur dans les logs Supabase** :
```
"Your API key was reported as leaked. Please use another API key."
```

**Cause** : La clé Gemini `AIzaSyC3mtxB-6jdeNVG1RWyoT-D6Kl-rD2m-Vs` a été **compromise** (probablement exposée publiquement ou commitée dans Git) et Google l'a **désactivée**.

---

## ✅ Solution : Générer une Nouvelle Clé Gemini

### Étape 1 : Générer une Nouvelle Clé

1. **Allez sur** : [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. **Connectez-vous** avec votre compte Google
3. **Cliquez sur "Create API Key"** ou **"Get API Key"**
4. **Sélectionnez** un projet (ou créez-en un nouveau)
5. **Une nouvelle clé sera générée**
6. **Copiez-la** (elle commencera par `AIza...`)

### Étape 2 : Mettre à Jour dans Supabase Secrets

1. **Allez sur** : [https://app.supabase.com](https://app.supabase.com)
2. **Sélectionnez** votre projet
3. **Allez dans** : **Secrets** (menu de gauche, sous "Functions")
4. **Trouvez** `GEMINI_API_KEY`
5. **Cliquez sur l'icône "✏️ Edit"** (ou supprimez et recréez)
6. **Remplacez** l'ancienne valeur par votre **nouvelle clé**
7. **Cliquez sur "Save"**

### Étape 3 : Redéployer l'Edge Function

**⚠️ IMPORTANT** : Après avoir mis à jour le secret, redéployez !

1. **Allez dans** : **Edge Functions** → `analyze-fund`
2. **Cliquez sur l'onglet "Code"**
3. **Cliquez sur "Deploy"** (même si le code n'a pas changé)
4. **Attendez** 10-20 secondes

### Étape 4 : Tester

1. **Retournez dans votre application** : http://localhost:8080
2. **Rafraîchissez** la page (Ctrl+Shift+R)
3. **Testez une analyse** :
   - Tapez `Sequoia Capital`
   - Cliquez sur "Générer 1 startup(s)"
   - Ça devrait fonctionner maintenant ! 🎉

---

## 🔒 Sécurité : Empêcher que ça se Reproduise

### Vérifier que .env n'est PAS dans Git

Le fichier `.env` contient votre clé. Vérifions qu'il n'est pas commité :

1. **Vérifiez** que `.env` est dans `.gitignore` ✅ (c'est déjà le cas)
2. **Vérifiez** que `.env` n'est pas dans Git :
   ```bash
   git ls-files | grep .env
   ```
   - Si rien ne s'affiche, c'est bon ✅
   - Si `.env` apparaît, il faut le supprimer de Git

### Si .env a été Commité par Erreur

Si le fichier `.env` a été commité dans Git avec la clé :

1. **Supprimez-le de Git** (mais gardez-le localement) :
   ```bash
   git rm --cached .env
   git commit -m "Remove .env from git (contains sensitive data)"
   git push
   ```

2. **Régénérez la clé** (elle est compromise)

3. **Vérifiez** que personne n'a cloné le repo avec la clé compromise

---

## 📝 Résumé

1. ✅ **Générer une nouvelle clé Gemini** sur Google AI Studio
2. ✅ **Mettre à jour** le secret dans Supabase
3. ✅ **Redéployer** l'Edge Function
4. ✅ **Tester** que ça fonctionne
5. ✅ **Vérifier** que `.env` n'est pas dans Git

---

**Une fois que vous avez généré la nouvelle clé et mis à jour dans Supabase, dites-moi et on teste !** 🚀

