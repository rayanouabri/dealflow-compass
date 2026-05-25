# AI-VC: Due Diligence & Sourcing Platform

Smart investment analysis tool powered by Gemini/Vertex AI. Analyze startups, validate theses, and source candidates with AI-driven insights.

## Stack

- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS
- **Backend**: Supabase (Auth, Edge Functions)
- **AI**: Google Gemini 2.5-pro (via Gemini API or Vertex AI)
- **Search**: Brave Search API
- **Deployment**: Vercel

## Key Pages

- `/` — Landing page with pricing
- `/analyser` — Fund thesis input & analysis
- `/analyse` — Startup analysis results
- `/due-diligence` — Company deep-dive
- `/due-diligence/result` — DD findings
- `/pipeline` — Deal progress tracking

## Core Features

**Analysis** → Evaluates startups against fund thesis (team, market, fit)  
**Due Diligence** → Validates company data (location, founding, founders)  
**Sourcing** → Discovers relevant startups via web search  
**Ranking** → Scores and deduplicates candidates  

## Architecture

```
src/
├── pages/          # Route components
├── components/     # Reusable UI + logic (Analysis, Auth, Chat, etc)
├── hooks/          # Custom hooks (useTrial, useAuth)
├── integrations/   # Supabase client & types
└── lib/            # Utilities

supabase/
├── functions/
│   ├── analyze-fund           # Evaluates thesis + startup fit
│   ├── ai-qa                  # Chat & AI Q&A
│   ├── ninja-sourcing         # Web search + deduplication
│   ├── due-diligence          # Company validation
│   ├── pipeline-orchestrator  # Workflow automation
│   └── _shared/               # Shared utilities
```

## Database

**Tables**: `analysis_history` (fund + startup analyses)  
**Auth**: Supabase (email/password)  
**RLS**: User-scoped queries  

## Development

```bash
npm install
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production build
npm run lint         # ESLint check
```

## Environment Setup

See [CONFIGURATION_AI.md](CONFIGURATION_AI.md) for Gemini/Vertex AI + Brave API setup.

Required secrets in Supabase Edge Functions:
- `GEMINI_API_KEY` or `VERTEX_AI_*` (AI provider)
- `BRAVE_API_KEY` (search)

## Deployment

Auto-deploys via Vercel on `main` push. Environment variables managed via Vercel dashboard.

## Security

See [SECURITY_AUDIT.md](SECURITY_AUDIT.md). Key points:
- Only anon Supabase key exposed client-side
- RLS enforces user isolation
- Rate limiting + CORS on Edge Functions
- Headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy

## Notes

- Bun for package management (bun.lockb)
- shadcn/ui components pre-built
- Recharts for fund/portfolio visualizations
- Zod for form validation
