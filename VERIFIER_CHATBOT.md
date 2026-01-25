# ✅ CHECKLIST POUR FAIRE MARCHER LE CHATBOT

## 🎯 PROBLÈME ACTUEL
Le chatbot ne marche toujours pas après redéploiement.

## 🔍 DIAGNOSTIC
**Cause probable** : Les secrets Vertex AI ne sont pas (bien) configurés dans Supabase.

---

## 📋 ÉTAPES À SUIVRE (5 minutes)

### 1️⃣ VÉRIFIER LES SECRETS SUPABASE

**Allez ici** : https://supabase.com/dashboard/project/anxyjsgrittdwrizqcgi/functions/secrets

**Vous devez voir ces 4 secrets** :

| Secret Name | Valeur attendue (début) | Statut |
|------------|-------------------------|--------|
| `VERTEX_PROJECT_ID` | `gen-lang-client-0331965398` | ❓ |
| `VERTEX_LOCATION` | `us-central1` | ❓ |
| `GOOGLE_CREDENTIALS` | `{"type":"service_account",...` | ❓ |
| `BRAVE_API_KEY` | `BSAjI6tJ9s5t2qMZZYNTtBDxHQhqXFJ` | ❓ |

**Si un secret MANQUE ou est VIDE** : Passez à l'étape 2.

**Si tous les secrets sont là** : Passez directement à l'étape 3.

---

### 2️⃣ AJOUTER LES SECRETS MANQUANTS

**Sur la même page** : https://supabase.com/dashboard/project/anxyjsgrittdwrizqcgi/functions/secrets

**Pour chaque secret manquant** :

1. Cliquez **"Add Secret"** (bouton bleu en haut à droite)
2. Dans "Secret Name", tapez exactement : `VERTEX_PROJECT_ID` (par exemple)
3. Dans "Secret Value", copiez la valeur depuis `SECRETS_SUPABASE.txt`
4. Cliquez **"Add"**
5. Répétez pour les 3 autres secrets

> 💡 **Astuce** : Le fichier `SECRETS_SUPABASE.txt` contient toutes les valeurs à copier-coller.

---

### 3️⃣ REDÉPLOYER LA FONCTION AI-QA

**Allez ici** : https://supabase.com/dashboard/project/anxyjsgrittdwrizqcgi/functions/ai-qa

**Cliquez** sur **"Deploy"** (bouton en haut à droite)

**Attendez** 30-60 secondes jusqu'à voir "Deployed successfully" ✅

---

### 4️⃣ TESTER LE CHATBOT

**1. Ouvrez** : https://ai-vc-sourcing.vercel.app

**2. Rafraîchissez** la page (Ctrl+Shift+R pour forcer le cache)

**3. Lancez une analyse** : Tapez "Sequoia Capital" et cliquez "Search"

**4. Attendez** la fin de l'analyse (30-60 secondes)

**5. Ouvrez le chatbot** : Cliquez sur l'icône en bas à droite

**6. Posez une question** : "Quels sont les risques ?"

**7. Vérifiez** :
   - ✅ Le chatbot répond (avec Vertex AI)
   - ✅ Pas d'erreur CORS dans la console (F12)

---

### 5️⃣ EN CAS D'ERREUR

**Si erreur CORS** :
1. Ouvrez la console (F12)
2. Copiez l'erreur exacte
3. Vérifiez les logs Supabase : https://supabase.com/dashboard/project/anxyjsgrittdwrizqcgi/functions/ai-qa/logs
4. Cherchez les erreurs en rouge

**Si "No AI provider configured"** :
- Les secrets ne sont pas bien configurés
- Retournez à l'étape 1

**Si le chatbot ne s'affiche pas** :
- Vous êtes peut-être sur la page d'accueil
- Le chatbot n'apparaît qu'après avoir lancé une analyse

---

## 🎯 RÉSULTAT ATTENDU

Après ces étapes, le chatbot devrait :
1. ✅ Apparaître en bas à droite après une analyse
2. ✅ Répondre à vos questions avec Vertex AI (Gemini Flash)
3. ✅ Aucune erreur dans la console

---

## 📞 BESOIN D'AIDE ?

**Faites une capture d'écran de** :
1. La page des secrets Supabase (masquez les valeurs sensibles)
2. Les logs de la fonction ai-qa
3. L'erreur dans la console (F12)

Et envoyez-les pour un diagnostic précis.
