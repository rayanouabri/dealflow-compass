# Project Context: AI-VC

## What It Does

SaaS for VCs/angel investors to analyze startups against their thesis. Features:
- **Fund thesis** → startup fit analysis (via Gemini AI)
- **Due diligence** → company validation (founding, location, founders)
- **Sourcing** → web search to find relevant startups
- **Pipeline tracking** → deal progress visualization

## Stack Essentials

- **Frontend**: React 18 (Vite) + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI**: Google Gemini 2.5-pro (Gemini API or Vertex AI — configured via Supabase secrets)
- **Search**: Brave Search API (web sourcing)
- **Hosting**: Vercel (auto-deploy on main)

## Key Files

**Pages** (src/pages/):
- `Analyser.tsx` — Fund + startup input, calls analyze-fund function
- `DueDiligence.tsx` — Company DD form, validation
- `DueDiligenceResult.tsx` — DD results display
- `Index.tsx` — Landing page with pricing/auth

**Components**:
- `AnalysisParameters.tsx` — Fund thesis customization
- `InvestmentCriteria.tsx` — Thesis form with presets
- `AnalysisHistory.tsx` — Past analyses list
- `AuthProvider.tsx`, `LoginForm.tsx` — Auth logic
- `AIQAChat.tsx` — Chat interface for AI questions
- `PaywallModal.tsx` — Trial/pricing gates

**Edge Functions** (supabase/functions/):
- `analyze-fund/index.ts` — Main analysis (thesis vs startup)
- `ninja-sourcing/index.ts` — Web search + ranking
- `due-diligence/index.ts` — Company validation
- `ai-qa/index.ts` — Chat endpoint
- `_shared/` — Shared utilities (AI client, search, scoring, logging)

**Database**:
- `analysis_history` — Stores fund name, startup name, thesis, pitch deck, created_at
- RLS: `user_id` column enforces access control (add to schema if missing)

## Development Flow

1. **Local dev**: `npm run dev` (Vite on port 5173)
2. **Functions**: Deploy via Supabase CLI or dashboard; test with `supabase functions serve` locally
3. **Secrets**: Set in Supabase Edge Functions dashboard (GEMINI_API_KEY, BRAVE_API_KEY, etc)
4. **Deploy**: Push to main → Vercel auto-deploys

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
