# 🚀 Créer la Fonction analyze-fund MAINTENANT

## 📍 Vous êtes ici : Edge Functions (Supabase Dashboard)

Je vois que vous êtes dans la section Edge Functions. Créons la fonction `analyze-fund` :

---

## ✅ Étapes Détaillées

### Étape 1 : Ouvrir l'Éditeur

1. **Dans la page Edge Functions**, vous voyez plusieurs options
2. **Cliquez sur** : **"<> Via Editor"** → **"Open Editor"**
   - C'est la carte avec "Create and edit functions directly in the browser"
3. **Une nouvelle page s'ouvre** avec un éditeur de code

---

### Étape 2 : Nommer la Fonction

1. **En haut de l'éditeur**, vous verrez un champ pour le nom
2. **Tapez exactement** : `analyze-fund`
   - ⚠️ **Important** : Utilisez un tiret `-`, pas un underscore `_`
3. (Laissez les autres options par défaut)

---

### Étape 3 : Copier le Code

1. **Dans VS Code** (ou votre éditeur), ouvrez le fichier :
   - `supabase/functions/analyze-fund/index.ts`

2. **Sélectionnez TOUT le contenu** :
   - Appuyez sur `Ctrl + A` (sélectionner tout)
   - Puis `Ctrl + C` (copier)

3. **Retournez dans Supabase Dashboard** (dans l'éditeur qui vient de s'ouvrir)

4. **Dans l'éditeur Supabase** :
   - **Sélectionnez tout** le code par défaut (Ctrl+A)
   - **Supprimez-le** (Delete ou Backspace)
   - **Collez** votre code (Ctrl+V)

---

### Étape 4 : Déployer

1. **Regardez en haut à droite** de l'éditeur
2. **Cliquez sur le bouton** :
   - **"Deploy"** (bouton vert)
   - OU **"Save"**
   - OU appuyez sur `Ctrl + S`

3. **Attendez quelques secondes**
   - Vous verrez un message de confirmation
   - La fonction est maintenant déployée ! ✅

---

### Étape 5 : Configurer le Secret GEMINI_API_KEY

**⚠️ IMPORTANT** : Sans ce secret, la fonction ne fonctionnera pas !

1. **Dans le menu de gauche** (toujours dans Supabase Dashboard)
   - Cliquez sur **"Secrets"** (sous "Functions")

2. **Cliquez sur "Add Secret"**

3. **Remplissez** :
   - **Name** : `GEMINI_API_KEY` (exactement comme ça, en majuscules)
   - **Value** : `AIzaSyC3mtxB-6jdeNVG1RWyoT-D6Kl-rD2m-Vs`

4. **Cliquez sur "Save"**

---

## ✅ Vérification

Après avoir créé la fonction et ajouté le secret :

1. ✅ **Retournez dans Edge Functions**
   - Vous devriez voir `analyze-fund` dans la liste

2. ✅ **Cliquez sur `analyze-fund`**
   - Vous devriez voir le code que vous avez collé

3. ✅ **Allez dans "Logs"** (onglet en haut)
   - Vous devriez voir les logs (même s'ils sont vides pour l'instant)

---

## 🧪 Tester

1. **Retournez dans votre application** : http://localhost:8080
2. **Rafraîchissez** la page (Ctrl+Shift+R)
3. **Testez une analyse** :
   - Tapez `Sequoia Capital`
   - Cliquez sur "Générer 1 startup(s)"
   - Ça devrait fonctionner maintenant ! 🎉

---

## 🐛 Si vous avez des Problèmes

### La fonction n'apparaît pas après déploiement
- Attendez 10-20 secondes
- Rafraîchissez la page (F5)
- Vérifiez dans Edge Functions que `analyze-fund` est listée

### Erreur lors du déploiement
- Vérifiez que vous avez bien collé TOUT le code
- Vérifiez qu'il n'y a pas d'erreurs de syntaxe dans l'éditeur
- Essayez de redéployer

### L'analyse ne fonctionne toujours pas
- Vérifiez que le secret `GEMINI_API_KEY` est bien configuré
- Attendez 30 secondes après avoir ajouté le secret
- Vérifiez les logs dans Edge Functions → Logs

---

**Suivez ces étapes et dites-moi quand c'est fait !** 🚀

