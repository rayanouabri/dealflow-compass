# Changements - Transformation en Outil BPI France

## Résumé des modifications

Cette application a été transformée pour ressembler à un outil de BPI France, avec un nouveau design institutionnel et l'ajout d'une fonctionnalité d'IA pour poser des questions sur les startups analysées.

## 1. Changements de Design (Branding BPI France)

### Couleurs
- **Couleurs principales** : Gris foncé (#2C3E50) et Jaune vif (#FFD700) - couleurs de BPI France
- **Fond** : Passage d'un thème sombre à un thème clair, plus professionnel et institutionnel
- **Palette mise à jour** dans `src/index.css` :
  - Primary : Gris foncé/bleu (220 30% 25%)
  - Accent : Jaune vif (48 100% 50%)
  - Background : Blanc avec dégradés subtils

### Branding
- **Logo** : Changement de "DealFlow Compass" / "VC Match" vers "bpifrance.." (avec les deux points colorés)
- **Textes** : Mise à jour de tous les textes pour refléter l'identité BPI France
- **Footer** : Mise à jour avec mention BPI France

### Fichiers modifiés
- `src/index.css` : Nouvelle palette de couleurs BPI France
- `src/pages/Index.tsx` : Branding mis à jour
- `src/components/landing/Header.tsx` : Logo BPI France
- `src/components/landing/Footer.tsx` : Mentions BPI France

## 2. Nouvelle Fonctionnalité : Assistant IA Q&A

### Composant AI Q&A
Un nouveau composant `AIQAChat` permet aux utilisateurs de poser des questions sur les startups analysées.

**Fonctionnalités** :
- Chat interactif avec l'IA
- Questions contextuelles basées sur les données de la startup analysée
- Sources citées quand disponibles
- Suggestions de questions rapides (Stratégie, Métriques, Concurrence, Risques)
- Historique de conversation

**Fichier créé** : `src/components/AIQAChat.tsx`

### Edge Function pour Q&A
Une nouvelle fonction Supabase Edge Function gère les requêtes Q&A.

**Fonctionnalités** :
- Utilise Gemini API (ou Groq en fallback)
- Analyse les données de la startup, la thèse d'investissement, et l'historique de conversation
- Génère des réponses contextuelles et professionnelles
- Extrait et retourne les sources mentionnées

**Fichier créé** : `supabase/functions/ai-qa/index.ts`

### Intégration
- L'Assistant IA est accessible via un onglet dans la vue des résultats
- Deux onglets : "Rapport d'Analyse" et "Assistant IA"
- L'IA a accès à toutes les données de la startup analysée (métriques, rapport de due diligence, etc.)

## 3. Configuration requise

### Secrets Supabase
Pour que l'Assistant IA fonctionne, vous devez configurer un secret dans Supabase :

1. Allez dans **Supabase Dashboard** → **Edge Functions** → **ai-qa** → **Settings** → **Secrets**
2. Ajoutez l'un des secrets suivants :
   - `GEMINI_KEY_2` (recommandé) : Clé API Google Gemini
     - Obtenez-la sur : https://makersuite.google.com/app/apikey
   - `GROQ_API_KEY` (alternative) : Clé API Groq
     - Obtenez-la sur : https://console.groq.com

### Déploiement de l'Edge Function

```bash
# Depuis la racine du projet
supabase functions deploy ai-qa
```

## 4. Utilisation

### Pour les utilisateurs
1. Effectuez une analyse de startup comme d'habitude
2. Dans la vue des résultats, cliquez sur l'onglet **"Assistant IA"**
3. Posez des questions sur la startup analysée, par exemple :
   - "Quelle est la stratégie de croissance de cette entreprise ?"
   - "Quelles sont les métriques financières clés ?"
   - "Qui sont les principaux concurrents ?"
   - "Quels sont les risques principaux ?"

### Exemples de questions
- Questions sur les métriques : ARR, MRR, croissance, CAC, LTV, etc.
- Questions sur la stratégie : modèle économique, différenciation, etc.
- Questions sur le marché : taille du marché, concurrence, tendances
- Questions sur l'équipe : fondateurs, compétences, recrutements
- Questions sur les risques : risques identifiés, opportunités

## 5. Architecture technique

### Flux de données Q&A
```
Frontend (AIQAChat) 
  → Edge Function (ai-qa)
    → Gemini API / Groq API
      → Réponse avec sources
        → Affichage dans le chat
```

### Données utilisées par l'IA
- Informations de base de la startup (nom, secteur, stade, localisation, etc.)
- Métriques financières du rapport de due diligence
- Thèse d'investissement du fonds
- Historique de la conversation (5 derniers messages)

### Prompt système
L'IA est configurée pour :
- Répondre de manière professionnelle et précise
- Utiliser uniquement les données fournies
- Citer des sources quand disponibles
- Être transparent sur les limites des données
- Fournir des analyses structurées

## 6. Notes importantes

- **Système de sourcing et d'analyse** : Aucun changement fonctionnel, seul le design a été modifié
- **Compatibilité** : Toutes les fonctionnalités existantes restent intactes
- **Performance** : L'Assistant IA utilise les mêmes APIs que l'analyse principale (Gemini/Groq)
- **Sécurité** : Les clés API sont stockées comme secrets Supabase, jamais exposées au frontend

## 7. Prochaines étapes possibles

- Améliorer l'extraction de sources depuis les réponses de l'IA
- Ajouter la possibilité d'exporter les conversations Q&A
- Enrichir le contexte avec des recherches web supplémentaires
- Ajouter des suggestions de questions intelligentes basées sur les données disponibles

