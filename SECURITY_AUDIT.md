# Audit de sécurité — AI-VC

**Date**: Janvier 2025  
**Périmètre**: Frontend (Vite/React), Supabase (auth, Edge Functions), déploiement Vercel.

---

## 1. Résumé

| Catégorie | Statut | Actions |
|-----------|--------|---------|
| Secrets / API keys | ✅ OK | Anon key uniquement côté client |
| Authentification | ✅ OK | Supabase Auth, localStorage |
| XSS | ✅ OK | Pas d’injection HTML utilisateur |
| Dépendances (npm) | ⚠️ À surveiller | 2 vulnérabilités modérées restantes |
| CORS Edge Functions | ⚠️ À durcir | Restreindre à l’origine de l’app |
| Headers sécurité | ⚠️ Recommandé | CSP, X-Frame-Options (Vercel) |

---

## 2. Secrets et clés API

- **Client** : Utilise uniquement `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` (clé anon / publishable).  
  ✅ Ces valeurs sont prévues pour être exposées côté frontend.
- **Edge Functions** : Gemini, Brave, etc. sont dans les **Secrets** Supabase (Dashboard → Edge Functions → Settings → Secrets).  
  ✅ Pas de clé sensible dans le dépôt.
- **À faire** : Ne jamais committer `.env` ou `SECRETS_SUPABASE.txt` (déjà dans `.gitignore` si nécessaire). Vérifier que les secrets Supabase ne sont pas écrasés par des valeurs en dur.

**Recommandation** : Conserver les clés dans Supabase Secrets / Vercel Env. Ne pas les mettre dans le code.

---

## 3. Authentification

- **Supabase Auth** : Connexion / inscription via `supabase.auth.signInWithPassword`, `signUp`.  
  ✅ Mots de passe non stockés en clair.
- **Session** : `localStorage`, `persistSession: true`, `autoRefreshToken: true`.  
  ✅ Config standard Supabase.
- **RLS** : Vérifier que les politiques RLS sur `analysis_history` et autres tables restrictent bien l’accès par `user_id`.  
  **Recommandation** : Contrôler les politiques dans Supabase Dashboard → Authentication → Policies.

---

## 4. XSS et injection

- **`dangerouslySetInnerHTML`** : Utilisé uniquement dans `chart.tsx` pour injecter des styles CSS générés à partir de config (thèmes).  
  ✅ Pas de contenu utilisateur. Risque faible.
- **Contenu utilisateur** : Affiché via React (échappement par défaut). Pas d’usage de `innerHTML` ou `eval` sur des données utilisateur.  
  ✅ Pas de vecteur XSS identifié.

**Recommandation** : Éviter d’utiliser `dangerouslySetInnerHTML` pour du contenu utilisateur (ex. réponses IA, champs libres). Si nécessaire, utiliser une lib de sanitization (ex. DOMPurify).

---

## 5. Dépendances (npm audit)

- **Avant `npm audit fix`** : React Router (XSS/redirect), esbuild, glob, js-yaml, lodash, Vite, etc.
- **Après `npm audit fix`** : Plusieurs correctifs appliqués. Restent notamment :
  - **esbuild** (modéré) : requêtes vers le serveur de dev.  
    Impact limité en production (build uniquement).
  - **Vite** : dépend d’esbuild ; vulnérabilités connues sur le serveur de dev / build.

**Recommandations** :
1. Lancer `npm audit` et `npm audit fix` régulièrement.
2. Pour tout résoudre : `npm audit fix --force` (montée Vite 7, possible breaking changes). À faire dans une branche dédiée, avec tests.
3. En production, s’assurer de ne pas exposer le serveur Vite ; utiliser uniquement les builds statiques (ex. Vercel).

---

## 6. CORS (Edge Functions)

- **État actuel** : CORS restreint aux origines autorisées dans `analyze-fund` et `ai-qa` :
  - `https://ai-vc-sourcing.vercel.app`
  - `http://localhost:8080`, `http://localhost:5173`
  - `http://127.0.0.1:8080`, `http://127.0.0.1:5173`
- Les réponses utilisent `Access-Control-Allow-Origin: <origin>` uniquement si l’origine est dans la liste, sinon la première de la liste.

**Fait.** Adapter `ALLOWED_ORIGINS` si vous ajoutez des domaines (preview Vercel, etc.).

---

## 7. Headers HTTP (Vercel)

- **CSP** : Non configuré.  
  **Recommandation** : Ajouter une Content-Security-Policy si vous souhaitez durcir davantage.
- **X-Frame-Options, X-Content-Type-Options, Referrer-Policy** : Configurés dans `vercel.json` :
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **HSTS** : Géré par Vercel si HTTPS.  
  ✅ OK tant que le domaine est en HTTPS.

**Fait** pour les trois headers ci-dessus.

---

## 8. Edge Functions (analyze-fund, ai-qa)

- **Auth** : Déployées avec `--no-verify-jwt` ; les fonctions ne vérifient pas le JWT Supabase.  
  L’accès repose sur la connaissance de l’URL + anon key. Toute personne pouvant appeler l’API peut l’utiliser.
- **Recommandation** :  
  - Soit activer la vérification JWT (`verify_jwt: true`) et envoyer le token utilisateur dans `Authorization` depuis le client.  
  - Soit garder `no-verify-jwt` mais limiter fortement les abus (rate limiting, CORS restreint, quotas côté Supabase/Gemini/Brave).

- **Validation des entrées** : Les corps de requête sont parsés en JSON.  
  **Recommandation** : Valider (ex. via Zod) `fundName`, `customThesis`, `params`, etc., et rejeter les requêtes mal formées (400).

---

## 9. Checklist rapide

- [ ] Vérifier RLS sur toutes les tables utilisées (ex. `analysis_history`).
- [ ] Restreindre CORS des Edge Functions aux origines de l’app.
- [ ] Ajouter `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` (et CSP si possible).
- [ ] S’assurer que `.env` et fichiers de secrets ne sont jamais commités.
- [ ] Relancer `npm audit` / `npm audit fix` après chaque mise à jour de deps.
- [ ] Décider si les Edge Functions doivent exiger un JWT (verify_jwt) ou rester ouvertes avec d’autres contrôles.

---

## 10. Références

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Vercel Security Headers](https://vercel.com/docs/security/secure-headers)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Router Security Advisory](https://github.com/advisories/GHSA-2w69-qvjg-hvjx)
