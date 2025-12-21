# 🔍 Comment Trouver ou Créer l'Edge Function dans Supabase

## 📍 Situation Actuelle

Vous êtes dans **Supabase Dashboard** → **rayanouabri's Project**

## 🎯 Option 1 : Trouver l'Edge Function Existante

### Si l'Edge Function existe déjà :

1. **Dans le menu de gauche** du Dashboard Supabase, cherchez :
   - **"Edge Functions"** ou **"Functions"**
   - Cliquez dessus

2. **Vous verrez une liste** de toutes vos Edge Functions
   - Cherchez une fonction qui pourrait s'appeler :
     - `analyze-fund` (nom attendu)
     - `analyze_fund` (avec underscore)
     - `analyzeFund` (camelCase)
     - Ou un autre nom similaire

3. **Cliquez sur la fonction** pour l'ouvrir

---

## 🆕 Option 2 : Créer une Nouvelle Edge Function

### Si vous ne voyez PAS d'Edge Function :

1. **Dans le menu de gauche**, cliquez sur **"Edge Functions"**

2. **Cliquez sur le bouton** :
   - **"New Function"** ou
   - **"Create Function"** ou
   - **"+"** (bouton plus)

3. **Remplissez le formulaire** :
   - **Nom de la fonction** : `analyze-fund`
   - (Laissez les autres options par défaut)

4. **Cliquez sur "Create"** ou **"Deploy"**

5. **Dans l'éditeur de code** qui s'ouvre :
   - **Supprimez tout le code par défaut**
   - **Copiez-collez** le contenu du fichier `supabase/functions/analyze-fund/index.ts`

6. **Cliquez sur "Deploy"** ou **"Save"**

---

## 🔐 Configurer le Secret GEMINI_API_KEY

### Une fois la fonction créée/trouvée :

1. **Dans la page de l'Edge Function**, cherchez :
   - Un onglet **"Settings"** (en haut)
   - Ou un bouton **"⚙️ Settings"** (icône d'engrenage)
   - Ou un menu **"Secrets"** dans la barre latérale

2. **Cliquez sur "Settings"** ou **"Secrets"**

3. **Ajoutez le secret** :
   - Cliquez sur **"Add Secret"** ou **"New Secret"**
   - **Nom** : `GEMINI_API_KEY` (exactement comme ça, en majuscules)
   - **Valeur** : Votre clé API Gemini (commence par `AIza...`)
   - Cliquez sur **"Save"**

---

## 📸 Aide Visuelle - Où Chercher

### Dans Supabase Dashboard :

```
┌─────────────────────────────────────┐
│  Supabase Dashboard                 │
├─────────────────────────────────────┤
│  [Menu Gauche]                       │
│  • Table Editor                      │
│  • SQL Editor                        │
│  • Edge Functions  ← CLIQUEZ ICI   │
│  • Database                         │
│  • Authentication                    │
│  • Storage                          │
└─────────────────────────────────────┘
```

### Dans Edge Functions :

```
┌─────────────────────────────────────┐
│  Edge Functions                     │
├─────────────────────────────────────┤
│  [Liste des fonctions]              │
│                                     │
│  • analyze-fund  ← VOTRE FONCTION  │
│    (ou un autre nom)                │
│                                     │
│  [+ New Function]  ← Si pas créée  │
└─────────────────────────────────────┘
```

---

## 🆘 Si Vous Ne Trouvez Pas "Edge Functions"

### Vérifiez que vous êtes au bon endroit :

1. **URL du Dashboard** : `https://app.supabase.com/project/uziptoizdbazdxgjqunp`
2. **Votre projet** : "rayanouabri's Project"
3. **Menu de gauche** : Cherchez "Edge Functions" ou "Functions"

### Si "Edge Functions" n'apparaît pas :

- Vérifiez que vous avez les **droits d'admin** sur le projet
- Essayez de rafraîchir la page (F5)
- Vérifiez que vous êtes sur le bon projet

---

## ✅ Vérification

Une fois que vous avez trouvé/créé la fonction :

1. ✅ La fonction `analyze-fund` existe
2. ✅ Le code est déployé (copié depuis `supabase/functions/analyze-fund/index.ts`)
3. ✅ Le secret `GEMINI_API_KEY` est configuré dans Settings > Secrets

---

## 📞 Besoin d'Aide ?

**Dites-moi** :
- Voyez-vous "Edge Functions" dans le menu de gauche ?
- Voyez-vous une liste de fonctions ?
- Quel est le nom exact de la fonction que vous voyez ?

Je pourrai vous guider plus précisément ! 🚀

