# Project Context: AI-VC

## What It Does

SaaS for VCs/angel investors. The user enters **their own investment criteria**
(multi-select sectors + stages, geography, optional free-text thesis/portfolio),
and the tool sources a genuinely on-thesis startup and writes a VC-grade due
diligence memo.

**Mission anti-biais (cœur du produit)** : ne PAS remonter les noms célèbres
(licornes, Mistral, etc.) ni les coquilles de registre. On veut des **pépites
discrètes, early-stage, réellement alignées** avec les critères. Tout est jugé
sur la pertinence à la thèse et le bon stade, jamais sur la notoriété.

Features: criteria → structured thesis → multi-source sourcing → criteria-aware
scoring + stage gate → due diligence (avec analyse comité d'investissement) →
historique réouvrable.

## Stack Essentials

- **Frontend**: React 18 (Vite) + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions Deno)
- **AI**: Google Gemini 2.5 (flash + pro), 5 clés en rotation (`ai-client.ts`)
- **Web search**: Oxylabs Real-time (Bing SERP) + Apify Google Search (couverture Google)
- **Données startups**: Dealroom.co (API publique sans auth) + INSEE SIRENE + Hacker News + GitHub
- **Hosting**: Vercel — ⚠️ l'auto-deploy GitHub est CASSÉ : déployer via `npx vercel deploy --prod --yes` PUIS `npx vercel alias set <url> ai-vc-sourcing.vercel.app` (voir mémoire vercel-deploy)

## Key Files

**Pages** (src/pages/):
- `Analyser.tsx` — Formulaire de critères (cases secteurs/stades + texte libre) → pipeline-orchestrator
- `PipelineProgress.tsx` — Suivi du pipeline + ouverture du rapport DD stocké
- `DueDiligenceResult.tsx` — Charge le rapport, délègue le rendu à `InvestmentMemo`
- `Index.tsx` — Landing (signup, "analyses illimitées")

**Components**:
- `CustomThesisInput.tsx` — Les cases à cocher multi (secteurs/stades) + texte libre
- `InvestmentMemo.tsx` — Rendu du rapport DD (mémo continu, dont section "Comité d'investissement")
- `AuthProvider.tsx`, `LoginForm.tsx`, `SignupForm.tsx` — Auth
- `AIQAChat.tsx` — Chat sur le rapport

**Edge Functions** (supabase/functions/):
- `pipeline-orchestrator/index.ts` — LE moteur : thèse → sourcing → picking → DD (self-invocation)
- `due-diligence/index.ts` — Recherche + analyse DD (appelée par le pipeline)
- `ai-qa/index.ts` — Chat endpoint
- `_shared/` — `oxylabs-client`, `apify-client`, `dealroom-client`, `listicle-miner`,
  `dedup-ranker`, `scoring-engine`, `entity-cleanup`, `ai-client`, `insee-sirene`, `hn-algolia`, `github-search`

**Database**:
- `analysis_history` — Stores fund name, startup name, thesis, pitch deck, created_at
- RLS: `user_id` column enforces access control (add to schema if missing)

## Development Flow

1. **Local dev**: `npm run dev` (Vite on port 5173)
2. **Functions**: Deploy via Supabase CLI or dashboard; test with `supabase functions serve` locally
3. **Secrets** (Supabase): `GEMINI_API_KEY`..`GEMINI_KEY_5`, `OXYLABS_USER/PASS`, `APIFY_TOKEN`, `INSEE_API_KEY`, `AI_DAILY_LIMIT`
4. **Deploy backend**: `supabase functions deploy <fn> --project-ref anxyjsgrittdwrizqcgi`
5. **Deploy frontend**: `npx vercel deploy --prod --yes` PUIS `npx vercel alias set <url> ai-vc-sourcing.vercel.app` (auto-deploy GitHub cassé)

## Common Tasks

**Add a fund analysis field**:
- Update `CustomThesis` type in `CustomThesisInput.tsx`
- Update `FUNDING_CRITERIA_PRESETS` if it's a preset option
- Update `thesis-analysis` prompt in Edge Function

**Change AI provider** (Gemini ↔ Vertex AI):
- See CONFIGURATION_AI.md, update Supabase secrets (`AI_PROVIDER`, `GEMINI_API_KEY` or `VERTEX_AI_*`)
- Redeploy Edge Functions (no code change needed if provider routing already in `ai-client.ts`)

**Add a new page/route**:
- Create file in `src/pages/`
- Import in `App.tsx` and add `<Route>` entry
- Add nav link in `Header.tsx` if needed

## Performance Notes

- `analysis_history` queries: use user_id + created_at index for pagination
- AI requests timeout at 120s; add retry logic if needed (see `ai-qa` function)
- Search results: deduplicate by domain (see `dedup-ranker.ts`)

## Security

✅ Anon Supabase key only (safe for client)  
✅ RLS on all user tables  
✅ Secrets in Supabase, never in code  
⚠️ CORS restrited on Edge Functions (whitelist preview URLs if needed)  
⚠️ Rate-limit AI calls if you scale (currently free quota)

See SECURITY_AUDIT.md for full audit.

## Config Files Reference

- `package.json` — Dependencies (React Router, React Query, Supabase, etc)
- `vite.config.ts` — Vite + SWC for fast builds
- `tailwind.config.ts` — Tailwind theme customization
- `tsconfig.json` — TypeScript strict mode on
- `vercel.json` — Headers, redirects for security
- `.env.example` — Local dev env vars (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)

## Debugging

**Auth issues**: Check Supabase Auth → Policies; enable RLS on tables  
**AI errors**: Check Supabase Functions logs (Supabase Dashboard → Edge Functions → [function] → Logs)  
**Build fails**: Clear `.next` and `dist/`, check TypeScript errors (`npm run lint`)  
**Performance**: Use Supabase Studio to check query plans on `analysis_history`

## Token Optimization for Claude

- This README replaces 13 scattered MD files. Reference it instead of rereading old docs.
- Keep CONFIGURATION_AI.md and SECURITY_AUDIT.md only if actively updating them.
- Use `/loop` or scheduled agents for recurring checks (don't re-read code every session).
- Tag important decisions in git commit messages so you can `git log --grep=` later.
