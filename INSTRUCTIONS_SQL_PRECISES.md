# 📝 Instructions Précises : Exécuter le SQL dans Supabase

## 🎯 Objectif
Créer la table `analysis_history` dans votre nouveau projet Supabase.

---

## 📋 Étapes Détaillées

### Étape 1 : Accéder au SQL Editor

1. **Ouvrez** votre navigateur
2. **Allez sur** : [https://app.supabase.com](https://app.supabase.com)
3. **Connectez-vous** à votre compte
4. **Sélectionnez** votre nouveau projet (celui que vous venez de créer)
5. **Dans le menu de gauche**, cherchez **"SQL Editor"**
   - C'est une icône qui ressemble à `</>` ou à un éditeur de code
   - Ou cherchez "SQL" dans le menu
6. **Cliquez sur "SQL Editor"**

---

### Étape 2 : Créer une Nouvelle Requête

1. **Dans la page SQL Editor**, vous verrez :
   - Une barre d'outils en haut
   - Une zone d'édition de code au centre
   - Peut-être des exemples de requêtes

2. **Cliquez sur le bouton** :
   - **"New Query"** (en haut à gauche)
   - OU **"+"** (bouton plus)
   - OU **"Create new query"**

3. **Une nouvelle fenêtre/onglet** s'ouvre avec un éditeur vide

---

### Étape 3 : Copier le SQL

**Copiez EXACTEMENT ce code SQL** :

```sql
-- Create table for analysis history
CREATE TABLE public.analysis_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_name TEXT NOT NULL,
  startup_name TEXT NOT NULL,
  investment_thesis JSONB,
  pitch_deck JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

-- Create policy for public read/write access (no auth required for demo)
CREATE POLICY "Allow public read access" 
ON public.analysis_history 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access" 
ON public.analysis_history 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_analysis_history_created_at ON public.analysis_history(created_at DESC);
```

**Instructions** :
1. **Sélectionnez TOUT le code** ci-dessus (depuis `-- Create table` jusqu'à `DESC);`)
2. **Copiez** (Ctrl+C ou Clic droit → Copy)
3. **Retournez dans Supabase SQL Editor**
4. **Collez** dans l'éditeur (Ctrl+V ou Clic droit → Paste)

---

### Étape 4 : Exécuter la Requête

**Option A : Via le bouton**
1. **Regardez en bas à droite** de l'éditeur
2. **Cliquez sur le bouton** :
   - **"Run"** (bouton vert)
   - OU **"Execute"**
   - OU **"▶ Run"** (icône play)

**Option B : Via le raccourci clavier**
1. **Appuyez sur** : `Ctrl + Enter` (Windows) ou `Cmd + Enter` (Mac)

---

### Étape 5 : Vérifier le Résultat

**Vous devriez voir** :

1. **Un message de succès** en bas :
   - ✅ "Success. No rows returned"
   - OU ✅ "Query executed successfully"
   - OU un message vert de confirmation

2. **Dans le panneau de résultats** (en bas) :
   - Peut-être vide (c'est normal, on crée juste la table)
   - OU un message de confirmation

**Si vous voyez une erreur** :
- ❌ Copiez le message d'erreur
- Vérifiez que vous avez bien collé TOUT le SQL
- Vérifiez que vous êtes dans le bon projet

---

### Étape 6 : Vérifier que la Table est Créée

1. **Dans le menu de gauche**, cliquez sur **"Table Editor"**
   - Ou cherchez "Tables" dans le menu

2. **Vous devriez voir** :
   - Une liste de tables
   - **`analysis_history`** dans la liste ✅

3. **Si vous voyez `analysis_history`** :
   - ✅ **C'est bon !** La table est créée
   - Vous pouvez cliquer dessus pour voir sa structure

---

## 🎯 Résumé Visuel des Étapes

```
1. Supabase Dashboard
   ↓
2. Menu gauche → "SQL Editor"
   ↓
3. Cliquez "New Query"
   ↓
4. Collez le SQL (tout le bloc ci-dessus)
   ↓
5. Cliquez "Run" ou Ctrl+Enter
   ↓
6. Vérifiez le message de succès
   ↓
7. Table Editor → Vérifiez que "analysis_history" existe
```

---

## 🐛 Dépannage

### Erreur : "relation already exists"
- **Cause** : La table existe déjà
- **Solution** : C'est OK, passez à l'étape suivante

### Erreur : "syntax error"
- **Cause** : Le SQL n'est pas complet
- **Solution** : Vérifiez que vous avez copié TOUT le code (depuis `CREATE TABLE` jusqu'à `DESC);`)

### Erreur : "permission denied"
- **Cause** : Vous n'avez pas les droits
- **Solution** : Vérifiez que vous êtes bien connecté et dans le bon projet

### Pas de bouton "Run" visible
- **Solution** : Essayez `Ctrl + Enter` (Windows) ou `Cmd + Enter` (Mac)

---

## ✅ Checklist

- [ ] J'ai ouvert Supabase Dashboard
- [ ] J'ai sélectionné mon nouveau projet
- [ ] J'ai cliqué sur "SQL Editor"
- [ ] J'ai créé une nouvelle requête ("New Query")
- [ ] J'ai collé TOUT le code SQL
- [ ] J'ai cliqué sur "Run" (ou Ctrl+Enter)
- [ ] J'ai vu un message de succès
- [ ] J'ai vérifié dans "Table Editor" que `analysis_history` existe

---

## 📸 À Quoi Ça Ressemble

**SQL Editor dans Supabase** :
```
┌─────────────────────────────────────┐
│  SQL Editor                         │
├─────────────────────────────────────┤
│  [New Query] [Save] [Run]          │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ -- Create table...            │ │
│  │ CREATE TABLE...               │ │
│  │ ...                           │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Results]                          │
│  ✅ Success. No rows returned       │
└─────────────────────────────────────┘
```

---

**Une fois que c'est fait, dites-moi et on passe à l'étape suivante !** 🚀

