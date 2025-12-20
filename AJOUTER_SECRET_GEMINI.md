# 🚀 Guide Ultra-Simple : Ajouter la Clé API Gemini

## ⚡ Action Requise (2 minutes)

Vous devez ajouter le secret `GEMINI_API_KEY` dans Supabase. C'est la **seule étape manuelle** nécessaire.

---

## 📋 Étapes Détaillées

### 1️⃣ Ouvrir Supabase Dashboard

👉 **Cliquez ici** : https://app.supabase.com/project/bdsetpsitqhzpnitxibo/functions/analyze-fund

Ou suivez ces étapes :
1. Allez sur https://app.supabase.com
2. Connectez-vous
3. Sélectionnez le projet **"rayanouabri's Project"**

### 2️⃣ Aller dans Edge Functions

Dans le menu de gauche, cliquez sur **"Edge Functions"** (ou **"Functions"**)

### 3️⃣ Ouvrir la fonction `analyze-fund`

Cliquez sur **"analyze-fund"** dans la liste

### 4️⃣ Accéder aux Secrets

**Option A** (la plus simple) :
- En haut de la page, cherchez un onglet **"Settings"** ou **"⚙️ Settings"**
- Cliquez dessus
- Cherchez la section **"Secrets"** ou **"Environment Variables"**

**Option B** (si Option A ne fonctionne pas) :
- Dans le menu de gauche, allez dans **"Project Settings"**
- Cliquez sur **"Edge Functions"**
- Cherchez **"Secrets"**

### 5️⃣ Ajouter le Secret

1. Cliquez sur **"Add Secret"** ou **"New Secret"** ou **"Create Secret"**
2. Remplissez :
   - **Name** (ou **Nom**) : `GEMINI_API_KEY` ⚠️ **EXACTEMENT comme ça, en majuscules**
   - **Value** (ou **Valeur**) : `AIzaSyDum1TiEMtDv9TgmpkgiOwV_AAO0GOPa4s`
3. Cliquez sur **"Save"** ou **"Add"** ou **"Create"**

### 6️⃣ Vérifier

Vous devriez voir `GEMINI_API_KEY` dans la liste des secrets (la valeur sera masquée avec des `***`)

---

## ✅ Vérification Rapide

Une fois le secret ajouté :

1. **Attendez 10-30 secondes** (propagation)

2. **Testez l'application** :
   ```bash
   npm run dev
   ```
   Puis ouvrez http://localhost:8080

3. **Lancez une analyse** :
   - Entrez "Sequoia Capital" (ou un autre fond VC)
   - Cliquez sur "Analyze"
   - Si ça fonctionne → ✅ **C'est bon !**
   - Si erreur → Voir section "Dépannage" ci-dessous

---

## 🐛 Dépannage

### Erreur : "GEMINI_API_KEY is not configured"

**Solutions** :
1. ✅ Vérifiez que le nom est exactement `GEMINI_API_KEY` (majuscules, pas d'espaces)
2. ✅ Vérifiez que vous avez bien cliqué sur "Save"
3. ✅ Attendez 30 secondes et réessayez
4. ✅ Vérifiez les logs : Edge Functions > `analyze-fund` > **Logs**

### Je ne trouve pas "Secrets"

**Essayez ces chemins** :
- Edge Functions > `analyze-fund` > Settings > Secrets
- Project Settings > Edge Functions > Secrets
- Edge Functions > Settings (en haut à droite) > Secrets

### Lien Direct

👉 **Lien direct vers votre fonction** : https://app.supabase.com/project/bdsetpsitqhzpnitxibo/functions/analyze-fund

---

## 📞 Besoin d'Aide ?

Si vous bloquez, dites-moi :
- À quelle étape vous êtes
- Ce que vous voyez à l'écran
- Le message d'erreur exact (si erreur)

---

**Temps estimé** : 2 minutes ⏱️

