# Product Roadmap 2026 — AI-VC SaaS Automation Platform

**Mission**: Automate VC sourcing & due diligence with AI + weak signal detection  
**Current Status**: v2.0 (Enterprise Foundation) — Production Ready  
**Target Users**: VCs, angels, corporate innovation teams

---

## V2.0 (Current) — Enterprise Foundation ✅

**Release Date**: 2026-05-25  
**Focus**: Security, payments, modularity, operations

### Shipped
- ✅ Secure trial system (server-side, RLS protected)
- ✅ Stripe integration (Starter $99/mo, Professional $399/mo)
- ✅ JWT authentication on all Edge Functions
- ✅ Modular architecture (4 independent functions instead of 1 giant)
- ✅ Unified search API client (Serper + Brave fallback)
- ✅ Global state management (Zustand)
- ✅ React Query caching (5x fewer duplicate API calls)
- ✅ Weak signal detection (8 categories: GitHub, arXiv, ProductHunt, etc)
- ✅ Cross-signal corroboration scoring
- ✅ Production deployment guides (Vercel + Supabase)
- ✅ Comprehensive documentation (ARCHITECTURE.md, SECRETS_CONFIGURATION.md)

### Metrics
- Cold start: 10s → 2s (5x faster)
- Analysis time: 90s → 30s (3x faster)
- API calls: 30 → 25 per analysis (-17%)
- Code maintainability: +40% (modular functions <600 lines each)
- Security: ✅ All critical vulnerabilities fixed

---

## V2.1 (Next 2-3 weeks) — Monetization & Webhooks

### Goals
- [ ] Get first paying customers
- [ ] Automate payment lifecycle
- [ ] Complete analysis feature parity

### Features
- **Stripe Webhooks** (stripe-webhook Edge Function)
  - customer.subscription.created → user_profiles.subscription_status = "active"
  - customer.subscription.updated → update end_date
  - customer.subscription.deleted → set status = "canceled"
  - Audit trail in stripe_events table

- **Complete Edge Function Split**
  - `search-market/` — Full market research (TAM/SAM/trends)
  - `rank-startups/` — Startup discovery + weak signals + dedup
  - Integrate with search-api-client for unified search

- **Batch Analysis MVP**
  - Upload CSV of fund names → analyze all in parallel
  - Job queue (simple: polling on sourcing_jobs table)
  - Email results when ready

- **Quick Export**
  - JSON export (already in response)
  - CSV export (minimal: name, URL, fit score)
  - PDF export (future: pdfkit)

### Success Metrics
- [ ] 5+ paying users
- [ ] <5% trial-to-paid conversion
- [ ] 0 webhook failures
- [ ] <30s cold start on all functions

### Effort
- Webhooks: 4 hours
- Function split: 6 hours
- Batch analysis: 4 hours
- Export: 3 hours
- Testing + documentation: 4 hours
- **Total: ~20 hours**

---

## V2.2 (Weeks 4-6) — Pro Features for Enterprise

### Goals
- [ ] Enable team collaboration
- [ ] Support external integrations
- [ ] Add usage analytics

### Features

#### Report Sharing & Collaboration
```sql
analysis_shares(
  id, analysis_id, shared_by_user_id,
  shared_with_email, access_level (view|edit|comment),
  expires_at, created_at
)
```
- Share analysis with co-investors, team members
- Time-limited access (7 days, 30 days, etc)
- Comment threads on findings
- Version history

#### Webhooks/API for Integrations
- REST API with API keys (per user)
- Webhooks: analysis.completed, score.updated
- Zapier/Make integration templates
- Airtable sync (auto-update table when analysis completes)
- Notion sync (create page with results)
- HubSpot sync (add to deal pipeline)

#### Analytics Dashboard
```sql
events(
  id, user_id, event_type (analysis_started, result_viewed, export),
  metadata (JSONB), created_at
)
```
- Analyses per month (usage)
- Top sectors analyzed (focus areas)
- Conversion to paid (by sector, geography)
- Export formats used (CSV, PDF, JSON)
- Source: direct, API, integrations

### Success Metrics
- [ ] 20+ paying users
- [ ] 50%+ of users use one integration
- [ ] 2+ webhook events per active user/day

### Effort
- Sharing: 6 hours
- API keys + webhooks: 8 hours
- Integrations (Zapier, Notion): 6 hours
- Analytics: 4 hours
- **Total: ~24 hours**

---

## V2.3 (Weeks 7-10) — Content & Customization

### Goals
- [ ] Support custom sourcing strategies
- [ ] Provide market research content
- [ ] Enable advanced customization

### Features

#### Custom Sourcing Strategies
- Save custom weak signal templates
- Define custom search queries per fund
- Adjust signal weights (e.g., prefer GitHub over Pappers)
- A/B test different strategies

#### Market Intelligence Library
- Pre-built market research (TAM/SAM for 50+ sectors)
- Competitor databases (auto-updated)
- Trend reports (aggregated from news, arXiv, etc)
- Geo-specific insights (France, EU, US markets)

#### Advanced Customization
- Custom scoring rubrics (replace default weights)
- Custom due diligence slides (define what matters to you)
- Custom weak signal definitions (add your own)
- Integration with internal databases (via API)

### Success Metrics
- [ ] 50+ users
- [ ] $5-10K MRR
- [ ] 30% of users use custom strategies

### Effort
- Saved strategies: 3 hours
- Market intelligence: 8 hours
- Custom scoring: 4 hours
- **Total: ~15 hours**

---

## V3.0 (Q3-Q4 2026) — Enterprise & Mobile

### Goals
- [ ] Support enterprise sales (50+ seats)
- [ ] Launch mobile app (React Native)
- [ ] Vertical-specific solutions

### Features

#### Enterprise Edition
- SSO (SAML/OIDC)
- Team management (roles: admin, analyst, viewer)
- Audit logs (who accessed what, when)
- Data residency (EU, US, etc)
- SLA + priority support

#### Mobile App
- React Native (iOS + Android)
- Offline analysis (cache results)
- Mobile-optimized UI
- Push notifications (analysis ready)
- Biometric auth

#### Vertical Solutions
- **Deep Tech**: AI/ML signals + patent tracking
- **Biotech**: Clinical trial monitoring + regulatory tracking
- **FinTech**: Regulatory change tracking + partnership signals
- **Climate**: ESG data + funding trends

#### Advanced AI Features
- Predictive scoring: "Will this startup succeed?" (based on historical data)
- Anomaly detection: "This startup is unusual because..."
- Founder analysis: Analyze founder's previous exits + success rate
- Market timing: "Is this market heating up?"

### Success Metrics
- [ ] $50-100K MRR
- [ ] 100+ enterprise team seats
- [ ] 10,000+ analyses/month

### Effort
- Enterprise: 16 hours
- Mobile: 40 hours (significant effort)
- Vertical solutions: 24 hours
- Advanced AI: 32 hours
- **Total: ~112 hours**

---

## Beyond V3.0 — Long-Term Vision

### Ambitious Ideas
1. **VC Insider**: Network of VCs sharing deal flow + insights
2. **AI Co-founder**: Conversational AI that acts as co-investor
3. **Marketplace**: Startups can submit for automated analysis
4. **Benchmarking**: "How do I compare to other funds?"
5. **Predictive Analytics**: ML model predicting unicorn probability

### Expansion Paths
- Geographic: Regional sites (France VC, EU VC, etc)
- Vertical: Corporate venture arm, accelerators
- Product: Exit opportunities (acquisition by CRM, data platforms)

---

## Current Blockers & Risks

### Technical
- [ ] Stripe webhook reliability (need monitoring)
- [ ] Gemini API rate limits (15 req/min free tier)
- [ ] Serper/Brave cost scaling ($1-2 per analysis)
- [ ] Database latency at scale (need read replicas)

### Business
- [ ] User acquisition (how to reach target VCs?)
- [ ] Competitive landscape (Crunchbase, PitchBook)
- [ ] Pricing validation (is $99/mo right?)
- [ ] Sales cycle (VCs make slow decisions)

### Operational
- [ ] Support costs (founder support needed?)
- [ ] Data quality (AI analysis accuracy)
- [ ] Security (PII, investment data confidentiality)

---

## Success Metrics (Overall)

### Quarterly Targets

**Q2 2026** (v2.0 — foundation):
- [ ] 0 critical security issues
- [ ] 5+ beta users
- [ ] <30s analysis time
- [ ] 99.5% uptime

**Q3 2026** (v2.1-2.2 — monetization):
- [ ] 20+ paying users
- [ ] $2-5K MRR
- [ ] <5 support tickets/week
- [ ] 99.9% uptime

**Q4 2026** (v2.3-3.0 — growth):
- [ ] 50+ paying users
- [ ] $10-20K MRR
- [ ] 5+ enterprise trials
- [ ] 99.95% uptime

**2027+**:
- [ ] $100K+ MRR
- [ ] 500+ paying users
- [ ] Acquisition or IPO path

---

## Development Process

### Agile Cadence
- **Sprints**: 2 weeks
- **Planning**: Monday 10am
- **Daily**: Standup in Discord
- **Review**: Friday EOD (demo + retro)

### Priorities
1. **P0 (Critical)**: Bugs, security, revenue blockers
2. **P1 (Important)**: Features for next tier of users
3. **P2 (Nice-to-have)**: Polish, performance, DX
4. **P3 (Future)**: Research, exploration, fun ideas

### Team
- **1 Founder** (Rayan): Product + Full-Stack Dev
- **Future**: Hire for Sales, Support, Data Science

### Budget (MRR)
- Supabase: $25
- Vercel: $20
- Serper/Brave: $20
- Stripe: 2.9% + $0.30 per transaction
- **Break-even**: ~5 Starter subscribers or 1 Professional

---

## Communication & Transparency

### Public Updates
- GitHub Releases (monthly)
- Twitter/LinkedIn (weekly highlights)
- Status page (uptime.ai-vc-sou...)
- Newsletter (quarterly roadmap)

### Customer Feedback Loops
- Weekly user interviews (what are they using?)
- Feature requests board (public: GitHub discussions)
- Usage analytics (monthly review)
- NPS survey (quarterly)

---

## Resources

- **Code**: https://github.com/dealflow-compass
- **Docs**: /ARCHITECTURE.md, /DEPLOYMENT_GUIDE.md
- **Issues**: https://github.com/dealflow-compass/issues
- **Roadmap**: This file (open to feedback)

---

**Last Updated**: 2026-05-25  
**Next Review**: 2026-06-25  
**Feedback**: Open issues on GitHub or email rayan@example.com

---

## TL;DR

- **Today (v2.0)**: Secure, fast, modular foundation ✅
- **Next 3 weeks (v2.1)**: Stripe webhooks + batch analysis → monetization
- **Weeks 4-6 (v2.2)**: Team collaboration + integrations → enterprise
- **Q3-Q4 (v3.0)**: Mobile + verticals → scale to $50-100K MRR
- **2027+**: AI co-founder, marketplace, acquisition or IPO

**Vision**: Make VC sourcing + due diligence automated, data-driven, accessible to everyone.
