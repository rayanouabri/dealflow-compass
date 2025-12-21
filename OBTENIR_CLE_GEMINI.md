# 🔑 Comment Obtenir une Vraie Clé API Gemini

## ⚠️ Problème Identifié

La clé que vous avez mise (`b9b40ee9e562af3df88326afa011157a1bfca574dd9c0bb89b47994a3308f9ba`) **n'est PAS une clé API Gemini valide**.

Les clés API Gemini :
- ✅ Commencent par `AIza...`
- ✅ Font environ 39 caractères
- ✅ Ont un format spécifique

## 📝 Étapes pour Obtenir une Vraie Clé API Gemini

### Étape 1 : Aller sur Google AI Studio

1. **Ouvrez votre navigateur**
2. **Allez sur** : [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
3. **Connectez-vous** avec votre compte Google

### Étape 2 : Créer une Clé API

1. **Cliquez sur** "**Create API Key**" ou "**Get API Key**"
2. **Sélectionnez un projet Google Cloud** :
   - Si vous avez déjà un projet, sélectionnez-le
   - Sinon, cliquez sur "**Create a new project**" (c'est gratuit)
3. **Votre clé API sera générée automatiquement**
4. **Elle ressemblera à** : `AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567`
   - Commence par `AIza`
   - Fait environ 39 caractères

### Étape 3 : Copier la Clé

1. **Cliquez sur "Copy"** pour copier la clé
2. **⚠️ IMPORTANT** : Gardez-la précieusement, vous ne pourrez plus la voir après !

---

## 🔐 Étape 4 : Mettre à Jour le Secret dans Supabase

### Dans Supabase Dashboard :

1. **Allez dans** : **Secrets** (menu de gauche, sous "Functions")
2. **Trouvez** `GEMINI_API_KEY` dans la liste
3. **Cliquez sur** l'icône **✏️ Edit** (ou le bouton "Edit")
4. **Remplacez l'ancienne valeur** par votre nouvelle clé API Gemini
   - La nouvelle clé doit commencer par `AIza...`
5. **Cliquez sur "Save"**

### OU si vous préférez supprimer et recréer :

1. **Supprimez** l'ancien secret `GEMINI_API_KEY`
2. **Cliquez sur "Add Secret"**
3. **Nom** : `GEMINI_API_KEY`
4. **Valeur** : Votre nouvelle clé (commence par `AIza...`)
5. **Save**

---

## 🔄 Étape 5 : Redéployer la Fonction

**⚠️ IMPORTANT** : Après avoir mis à jour le secret, vous DEVEZ redéployer la fonction !

1. **Allez dans** : **Edge Functions** → `analyze-fund`
2. **Cliquez sur l'onglet "Code"**
3. **Cliquez sur "Deploy"** (ou appuyez sur Ctrl+S)

**OU** si vous êtes dans l'éditeur :
- Cliquez simplement sur "**Deploy**" en haut à droite

---

## ✅ Étape 6 : Attendre et Tester

1. **Attendez 10-30 secondes** (propagation du secret)
2. **Retournez dans votre application** (localhost:8080)
3. **Rafraîchissez la page** (Ctrl+Shift+R)
4. **Testez une analyse** :
   - Entrez "Sequoia Capital"
   - Cliquez sur "Générer 1 startup(s)"
   - Ça devrait fonctionner maintenant ! 🎉

---

## 🔍 Vérification

### Votre clé API Gemini doit :

✅ Commencer par `AIza`  
✅ Faire environ 39 caractères  
✅ Être unique (chaque clé est différente)  
✅ Être visible dans Supabase Dashboard → Secrets → `GEMINI_API_KEY`

### Exemple de clé valide :

```
AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567
```

### Exemple de clé INVALIDE (ce que vous aviez) :

```
b9b40ee9e562af3df88326afa011157a1bfca574dd9c0bb89b47994a3308f9ba
❌ Ne commence pas par AIza
❌ Format incorrect
```

---

## 🆘 Si Vous Ne Trouvez Pas "Create API Key"

1. **Vérifiez que vous êtes bien connecté** avec votre compte Google
2. **Essayez** : [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
3. **Ou** : [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)

---

## 💡 Note Importante

- ✅ **C'est GRATUIT** : Gemini API offre 15 requêtes/minute gratuitement
- ✅ **Pas de carte bancaire** requise pour commencer
- ✅ **1,500 requêtes/jour** gratuites

Une fois que vous avez la bonne clé, tout devrait fonctionner ! 🚀

