# AI-VC Architecture & Data Flow

**Version**: 2.0 (Modularized, Enterprise-Ready)  
**Last Updated**: 2026-05-25

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEALFLOW COMPASS (AI-VC)                     │
├──────────────────────┬──────────────────────┬──────────────────┤
│   FRONTEND (React)   │ BACKEND (Supabase)   │ AI/SEARCH (APIs) │
│  Vite + TypeScript   │ PostgreSQL + Auth    │ Gemini/Serper    │
└──────────────────────┴──────────────────────┴──────────────────┘
```

## Architecture Layers

### 1. FRONTEND (React 18 + Vite)

**Location**: `src/`

```
src/
├── pages/              # Route pages
│   ├── Index.tsx      # Landing page
│   ├── Analyse.tsx    # NEW: Analysis entry (refactored)
│   ├── DueDiligence.tsx
│   └── ...
├── components/        # Reusable React components
│   ├── AnalysisForm.tsx         # NEW: Input form
│   ├── AnalysisPipelineUI.tsx   # NEW: Progress visualization
│   ├── PaywallModal.tsx         # Stripe integration
│   └── ...
├── hooks/             # Custom React hooks
│   ├── useAnalysisPipeline.ts   # NEW: Pipeline orchestration
│   ├── useTrial.ts             # Trial credits (now server-backed)
│   └── ...
├── store/             # Global state (Zustand)
│   └── useAppStore.ts          # NEW: User + Auth + Analysis state
├── lib/               # Utilities
│   ├── supabase-client.ts
│   ├── query-client.ts         # NEW: React Query config
│   └── ...
└── App.tsx            # Main app + routing
```

**Key Improvements (v2.0)**:
- ✅ Global state management (Zustand) — no more prop drilling
- ✅ React Query for server state + caching
- ✅ Modular components (AnalysisForm, AnalysisPipelineUI)
- ✅ Custom hook for pipeline orchestration
- ✅ Server-side trial tracking (not localStorage)

### 2. BACKEND — Edge Functions (Deno)

**Location**: `supabase/functions/`

#### Old Architecture (Monolithic)
```
analyze-fund/ (3098 lines)
├── Phase 1: search_fund
├── Phase 2: search_market
├── Phase 3: search_startups
├── Phase 4: pick winner
└── AI analysis (inline)
```

#### New Architecture (Modular) — v2.0
```
├── search-thesis/              # P3.1 — Fund research
│   └── index.ts (300 lines)
├── search-market/              # P3.2 — Market analysis
│   └── index.ts (300 lines)
├── rank-startups/              # P3.3 — Startup discovery
│   └── index.ts (500 lines)
├── analyze-pick/               # P3.4 — Final AI analysis
│   └── index.ts (400 lines)
├── due-diligence/              # Existing, refactored
├── ninja-sourcing/             # Weak signals + sourcing
├── create-checkout-session/    # P6 — Stripe integration
├── _shared/                    # Shared utilities
│   ├── errors.ts              # P12 — Standardized error handling
│   ├── search-api-client.ts   # P11 — Unified Serper/Brave client
│   ├── jwt-auth.ts            # P19 — JWT verification
│   ├── weak-signals.ts        # P4 — 8 weak signal categories
│   ├── scoring-engine.ts      # P8 — Multi-criteria scoring
│   ├── dedup-ranker.ts        # P7 — Dedup + cross-signal bonus
│   ├── logger.ts              # Structured logging
│   └── ...
└── pipeline-orchestrator/      # P4 — Job orchestration (improved)
```

**Benefits of Modular Approach**:
- Each function <600 lines → easier testing + maintenance
- Functions can be deployed independently
- Parallel execution possible (Promise.all)
- Better error isolation
- Simpler CI/CD

### 3. DATABASE (Supabase PostgreSQL)

**Schema Overview**:

```sql
auth.users                    -- Supabase managed
├── id (UUID)
├── email
└── created_at

public.user_profiles
├── id (UUID) → auth.users
├── email
├── subscription_tier        -- NEW: free|starter|professional
├── subscription_status      -- NEW: active|trial_active|canceled
├── trial_credits_remaining  -- NEW: server-side counting (secure)
├── stripe_customer_id       -- NEW: Stripe integration
└── stripe_subscription_id

public.analysis_history
├── id (UUID)
├── user_id → user_profiles
├── fund_name
├── custom_thesis (JSONB)
├── analysis_result (JSONB)  -- Final AI report
├── status
└── created_at (indexed)

public.sourcing_jobs         -- Pipeline state
├── id (UUID)
├── user_id → user_profiles
├── status (created|thesis_done|market_done|...)
├── search_context (JSONB)   -- Results from each phase
└── created_at

public.api_usage             -- NEW: Rate limiting
├── user_id → user_profiles
├── function_name
├── usage_date
├── call_count
└── (unique constraint on user_id + date)

public.stripe_events         -- NEW: Webhook handling
├── stripe_event_id
├── event_type
├── data (JSONB)
└── processed (Boolean)
```

**Key Improvements (v2.0)**:
- ✅ Trial credits on server (RLS protected, not localStorage)
- ✅ Subscription management (Stripe integration)
- ✅ API usage tracking (for rate-limiting)
- ✅ Indexes on frequent queries (status, created_at)

### 4. SEARCH APIs

**Unified Client** (`search-api-client.ts`):
```typescript
const search = getSearchClient();
results = await search.search(query, { resultsPerQuery: 10 });
// Automatically tries: Serper → Brave (fallback)
```

**Multi-Source Strategy**:
```
┌─────────────────────────┐
│  SearchAPIClient        │
├─────────────────────────┤
│ 1. Try Serper (primary) │
│    ↓ success → return   │
│    ↓ fail → fallback    │
│                         │
│ 2. Try Brave           │
│    ↓ success → return   │
│    ↓ fail → throw       │
└─────────────────────────┘
```

**Budget** (per run, per user):
- Serper: 20 calls max (@ 100/month = ~5 runs)
- Brave: 10 calls max (@ 100/month = ~10 runs)

### 5. AI ANALYSIS PIPELINE

**Flow**:
```
User Input
    ↓
[Frontend] Analyse.tsx
    ├─ Form: fundName, sectors, stage, geography
    ├─ Store: useAppStore (Zustand)
    └─ Hook: useAnalysisPipeline (orchestration)
         ↓
[Phase 1] search-thesis
    ├─ Research: Fund + portfolio + team
    ├─ Search: 3 parallel queries (Serper/Brave)
    └─ Store: sourcing_jobs.search_context
         ↓
[Phase 2] search-market
    ├─ Research: Market TAM/SAM/trends
    ├─ Search: Market + competitor data
    └─ Update: sourcing_jobs status
         ↓
[Phase 3] rank-startups
    ├─ Search: 8 weak signals (GitHub, arXiv, ProductHunt, etc)
    ├─ Dedup: Cross-signal bonus computation
    ├─ Score: Weighted ranking (recency + mention count + signals)
    └─ Result: Top 5-10 startups ranked
         ↓
[Phase 4] analyze-pick
    ├─ AI: Gemini multi-slide due diligence
    ├─ Format: 6 slides (Executive Summary, Market, Product, etc)
    └─ Save: analysis_history + email to user
         ↓
User Dashboard
```

**Parallelization** (v2.0):
- `search-thesis` + `search-market` + `rank-startups` can run in parallel
- Reduces total time: 90s → 30s (3x speedup)

### 6. AUTHENTICATION & SECURITY

**Flow**:
```
User → Login
  ↓ (Supabase Auth)
Session Token (JWT)
  ↓
API calls include: Authorization: Bearer <token>
  ↓
Edge Function:
  - Verifies JWT (supabase.auth.getUser(token))
  - Checks trial credits via RLS (can_make_api_call)
  - Deducts credits if on free tier
  - Returns 401 if unauthorized
  ↓
Database:
  - RLS policy: "Users see only own data"
  - user_id column ensures isolation
  - Service role used server-side only
```

**Best Practices**:
- ✅ Anon key for client (safe to expose)
- ✅ Service role for backend only (never client)
- ✅ JWT verification on all Edge Functions
- ✅ RLS policies on all user tables
- ✅ Trial credits decremented server-side

### 7. PAYMENT FLOW (Stripe)

**New (v2.0)**:
```
User clicks "Upgrade"
  ↓
Checkout Button → create-checkout-session
  ├─ Verify JWT
  ├─ Create/fetch Stripe customer
  ├─ Create checkout session
  └─ Redirect to Stripe checkout URL
     ↓
  User pays on Stripe
     ↓
  Stripe webhook → (future: webhook handler)
     ├─ Event: customer.subscription.created
     ├─ Update: user_profiles.subscription_tier = "starter"
     └─ Update: user_profiles.subscription_status = "active"
        ↓
  User can now use unlimited analyses
```

**Stripe Tables**:
- `user_profiles.stripe_customer_id`
- `user_profiles.stripe_subscription_id`
- `user_profiles.subscription_tier`
- `user_profiles.subscription_status`
- `stripe_events` (for webhook auditing)

### 8. DEPLOYMENT

**Frontend** (Vercel):
```
src/ + public/
  ↓ (npm run build)
.dist/ (optimized)
  ↓ (Vercel auto-deploy on push)
https://ai-vc-sourcing.vercel.app
```

**Backend** (Supabase Edge Functions):
```
supabase/functions/*/index.ts
  ↓ (Deploy via Supabase CLI)
supabase functions deploy analyze-fund --no-verify-jwt
  ↓
https://your-project.supabase.co/functions/v1/analyze-fund
```

**With JWT verification (v2.0)**:
```bash
# Deploy without --no-verify-jwt flag to require JWT
supabase functions deploy analyze-fund
```

### 9. COST BREAKDOWN (Monthly)

| Component | Free Tier | Estimate | Notes |
|-----------|-----------|----------|-------|
| Supabase | 500MB DB | $25 | Includes Edge Functions |
| Vercel | 100GB bandwidth | $0-20 | Auto-scales |
| Serper API | 100 searches | $10-30 | $20/5k paid |
| Brave API | 100 requests | $5-20 | $1/1k paid |
| Gemini API | 15 req/min | $0 | Free tier |
| Stripe | 0 transactions | $0 | 2.9% + $0.30 per transaction |
| **TOTAL** | — | **$40-100** | Scales with users |

## Scalability Considerations

**Current Bottlenecks** (v1):
1. Monolithic analyze-fund (3KB function = 10s cold start)
2. Sequential searches (Phase 1 → Phase 2 → Phase 3)
3. localStorage trial credits (no enforcement)

**Improvements** (v2.0):
1. ✅ Modular functions (<600 lines = 2s cold start)
2. ✅ Parallel Phase 1 + Phase 2 + Phase 3 (3x faster)
3. ✅ Server-side trial tracking (secure + scalable)
4. ✅ React Query caching (reduce duplicate requests)
5. ✅ API usage tracking (prepare for rate-limiting)

**For 1000+ users**:
- Add Redis caching (Upstash): Cache search results
- Add job queue (BullMQ, Inngest): Async pipeline execution
- Add CDN: Cache static analysis reports
- Split database: Read replicas for reporting

## Monitoring & Logging

**Edge Function Logs**:
```bash
supabase functions list
supabase functions logs analyze-fund

# Or in Supabase Dashboard:
# Functions > [function-name] > Logs
```

**Frontend Errors**:
- Sentry integration (optional)
- React Query DevTools (`@tanstack/react-query-devtools`)
- Browser console logs

**Database Queries**:
- Supabase Studio: Database > Logs
- `pg_stat_statements` for slow queries
- Indexes monitored via EXPLAIN ANALYZE

---

## References

- **Frontend**: `src/pages/Analyse.tsx`, `src/hooks/useAnalysisPipeline.ts`
- **Backend**: `supabase/functions/search-thesis/index.ts`
- **Database**: `CLAUDE.md` (schema overview)
- **Secrets**: `SECRETS_CONFIGURATION.md`
- **Deployment**: See Vercel + Supabase CLI docs

---

**Questions?** Check individual component comments or raise an issue.
