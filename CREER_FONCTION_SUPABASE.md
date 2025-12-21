# 🚀 Créer l'Edge Function dans Supabase Dashboard

## 📍 Vous êtes ici : Edge Functions (rayanouabri's Project)

## ✅ Étapes pour Créer la Fonction `analyze-fund`

### Étape 1 : Ouvrir l'Éditeur

1. **Cliquez sur le bouton** "**<> Via Editor**" 
   - Ou cliquez sur "**Open Editor**" dans la carte "Via Editor"

2. **Une nouvelle page s'ouvre** avec un éditeur de code

### Étape 2 : Nommer la Fonction

1. **En haut de l'éditeur**, vous verrez un champ pour le nom
2. **Tapez** : `analyze-fund`
3. (Laissez les autres options par défaut)

### Étape 3 : Copier le Code

1. **Ouvrez le fichier local** : `supabase/functions/analyze-fund/index.ts`
   - Dans votre éditeur de code (VS Code, etc.)
   - Ou ouvrez-le depuis le dossier du projet

2. **Sélectionnez TOUT le contenu** (Ctrl+A)

3. **Copiez** (Ctrl+C)

4. **Retournez dans Supabase Dashboard** (dans l'éditeur)

5. **Supprimez tout le code par défaut** dans l'éditeur Supabase (Ctrl+A puis Delete)

6. **Collez votre code** (Ctrl+V)

### Étape 4 : Déployer

1. **Cliquez sur le bouton "Deploy"** (en haut à droite de l'éditeur)
   - Ou appuyez sur Ctrl+S (Save)

2. **Attendez quelques secondes** - vous verrez un message de confirmation

✅ **La fonction est maintenant créée et déployée !**

---

## 🔐 Étape 5 : Configurer le Secret GEMINI_API_KEY

### Maintenant, ajoutez la clé API Gemini :

1. **Dans le menu de gauche** (toujours dans Supabase Dashboard)
   - Cliquez sur **"Secrets"** (sous "Functions")

2. **Ou** dans la page de votre fonction `analyze-fund` :
   - Cliquez sur l'onglet **"Settings"** (en haut)
   - Puis **"Secrets"**

3. **Cliquez sur "Add Secret"** ou **"New Secret"**

4. **Remplissez** :
   - **Name** : `GEMINI_API_KEY` (exactement comme ça, en majuscules)
   - **Value** : Votre clé API Gemini (obtenue sur https://makersuite.google.com/app/apikey)
     - Elle commence par `AIza...`

5. **Cliquez sur "Save"**

---

## ✅ Vérification

Une fois terminé :

1. ✅ La fonction `analyze-fund` existe dans la liste
2. ✅ Le code est déployé
3. ✅ Le secret `GEMINI_API_KEY` est configuré

---

## 🧪 Tester

1. **Retournez dans votre application** (localhost:8080)
2. **Rafraîchissez la page** (Ctrl+Shift+R)
3. **Testez une analyse** :
   - Entrez "Sequoia Capital"
   - Cliquez sur "Générer 1 startup(s)"
   - Ça devrait fonctionner maintenant ! 🎉

---

## 🆘 Si vous avez besoin d'aide

**Dites-moi** :
- Avez-vous réussi à ouvrir l'éditeur ?
- Voyez-vous le champ pour nommer la fonction ?
- Avez-vous pu copier-coller le code ?

Je peux vous guider à chaque étape ! 🚀

