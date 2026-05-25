# Deployment Guide (Vercel + Supabase)

**Target**: Production-ready SaaS with Stripe integration

## Pre-Deployment Checklist

- [ ] All secrets configured (Supabase + Vercel + Stripe)
- [ ] JWT verification enabled on Edge Functions
- [ ] RLS policies verified (`psql \dt` in Supabase)
- [ ] Stripe webhooks configured
- [ ] Tests passing (`npm test`)
- [ ] Type-check passing (`npm run lint`)
- [ ] No hardcoded secrets in code

## Step 1: Setup Supabase (Backend)

### 1.1 Database Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-id

# Push migrations
supabase migrations up

# Verify schema
supabase db pull  # Pulls schema snapshot
```

### 1.2 Set Edge Function Secrets

Go to: **Supabase Dashboard > Functions > Secrets**

Add these secrets:
- GEMINI_API_KEY
- SERPER_API_KEY
- BRAVE_API_KEY
- STRIPE_SECRET_KEY
- SUPABASE_SERVICE_ROLE_KEY (copy from Settings > API)

```bash
# Or via CLI
supabase secrets set GEMINI_API_KEY="AIzaSy..."
supabase secrets set SERPER_API_KEY="xxxxxxx"
# ... etc
```

### 1.3 Deploy Edge Functions

```bash
# Deploy individual functions
supabase functions deploy search-thesis
supabase functions deploy search-market
supabase functions deploy rank-startups
supabase functions deploy analyze-pick
supabase functions deploy create-checkout-session
supabase functions deploy due-diligence

# Or deploy all
supabase functions deploy
```

### 1.4 Setup Stripe Webhooks (if using payments)

1. Go to: **Stripe Dashboard > Webhooks**
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET`

## Step 2: Setup Vercel (Frontend)

### 2.1 Create Vercel Project

```bash
# Login to Vercel
vercel login

# Link project
vercel link
```

Or via UI: **https://vercel.com/new** > Import from GitHub

### 2.2 Environment Variables

Go to: **Vercel Dashboard > Settings > Environment Variables**

Add **public variables** (frontend, with VITE_ prefix):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
```

Add **secret variables** (backend redirect):
```
STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # For checkout button
```

### 2.3 Build & Deploy

```bash
# Local test build
npm run build

# Deploy to Vercel
vercel deploy --prod
```

Or push to GitHub → Vercel auto-deploys

## Step 3: Configure Stripe (Payments)

### 3.1 Create Products & Prices

Go to: **Stripe Dashboard > Products > Add Product**

**Starter Plan**:
- Name: "Starter"
- Price: $99/month
- Billing cycle: Monthly

**Professional Plan**:
- Name: "Professional"
- Price: $399/month
- Billing cycle: Monthly

Copy the **Price IDs** (price_1234...):
- Set in Vercel env vars:
  - STRIPE_PRICE_ID_STARTER=price_xxx
  - STRIPE_PRICE_ID_PROFESSIONAL=price_yyy

### 3.2 Setup Customer Portal

Go to: **Stripe Dashboard > Settings > Billing**

Enable Customer Portal:
- Allows users to manage subscriptions
- Cancel/update payment methods
- View invoices

## Step 4: Post-Deployment Verification

### 4.1 Test Frontend

```bash
# Open production URL
https://your-vercel-domain.vercel.app

# Check in DevTools > Application > Local Storage
# Should NOT have trial credits (removed)

# Test auth flow
- Sign up with email
- Check Supabase Auth → Users
```

### 4.2 Test Edge Functions

```bash
# Verify functions are accessible
curl -i https://your-project.supabase.co/functions/v1/search-thesis \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fundName":"Sequoia"}'

# Check function logs
supabase functions logs search-thesis
```

### 4.3 Test Payment Flow

```bash
# Stripe test mode (default)
# Use test card: 4242 4242 4242 4242
# Any future expiry, any CVC

1. Go to /pricing
2. Click "Upgrade" → Stripe checkout
3. Enter test card
4. Verify: Stripe test mode shows payment
5. Check Supabase: user_profiles.subscription_status = "active"
```

### 4.4 Test Trial System

```bash
# Create new user (free tier)
# Verify: user_profiles.trial_credits_remaining = 3

# Make API call
# Verify: trial_credits_remaining decremented to 2

# Use all 3 credits
# Verify: error "Trial credits exhausted"
```

## Step 5: Monitoring & Alerts

### 5.1 Supabase Monitoring

- **Database**: Supabase Dashboard > Reports
- **Logs**: Supabase Dashboard > Logs
- **Performance**: Query Inspector for slow queries

### 5.2 Vercel Monitoring

- **Analytics**: https://vercel.com/analytics
- **Logs**: https://vercel.com/docs/platform/logs
- **Errors**: Integration with Sentry (optional)

### 5.3 Stripe Monitoring

- **Revenue**: Stripe Dashboard > Revenue
- **Disputes**: Watch for chargebacks
- **Errors**: Check webhook failures

## Common Issues & Fixes

### "Unauthorized" on Edge Function Calls

**Problem**: JWT verification failing  
**Fix**:
```
1. Verify Authorization header is sent: Bearer <token>
2. Check token is valid: supabase.auth.getSession()
3. Check Edge Function has verify_jwt: true
4. Check SUPABASE_SERVICE_ROLE_KEY is set
```

### "Rate limit exceeded" from Serper/Brave

**Problem**: Hit API quota  
**Fix**:
```
1. Upgrade Serper/Brave paid tier
2. Implement caching (Redis)
3. Reduce results per query
4. Use fallback API (Brave if Serper fails)
```

### Stripe Webhook Not Firing

**Problem**: Payment goes through but subscription not activated  
**Fix**:
```
1. Check Stripe Webhooks > Recent Attempts
2. Verify endpoint URL is correct
3. Verify webhook secret is set
4. Check Edge Function logs: supabase functions logs stripe-webhook
5. Manually update user_profiles if needed (emergency)
```

### Database Connection Errors

**Problem**: "too many connections" from Edge Functions  
**Fix**:
```
1. Check Supabase connection pools
2. Reduce concurrent function invocations
3. Add connection pooling: pgBouncer
4. Use read replicas for high-traffic queries
```

## Maintenance Tasks

### Weekly
- [ ] Check Stripe webhook logs for failures
- [ ] Monitor Supabase database size
- [ ] Review error logs (Supabase + Vercel)

### Monthly
- [ ] Rotate API keys
- [ ] Review Stripe revenue & churn
- [ ] Analyze user behavior (upcoming: analytics)
- [ ] Test disaster recovery (backup)

### Quarterly
- [ ] Security audit (dependencies, secrets)
- [ ] Performance profiling
- [ ] Cost optimization review

## Rollback Procedures

### Vercel Frontend
```bash
# Rollback to previous deployment
vercel rollback
```

### Supabase Edge Functions
```bash
# Deploy previous version
git checkout HEAD~1 supabase/functions/search-thesis
supabase functions deploy search-thesis
```

### Database
```bash
# Rollback migration
supabase migrations down

# Or use Supabase branching (preview databases)
supabase branches create -- from main
```

## Database Backups

```bash
# Automatic: Supabase backs up daily (included)

# Manual backup
supabase db pull > backup-$(date +%Y%m%d).sql

# Restore
supabase db push < backup-20260525.sql
```

## Performance Optimization

### Frontend
```bash
# Analyze bundle
npm run build -- --analyze

# Optimize images
npm install -D @next/image  # or use Vercel Image Optimization
```

### Backend
```bash
# Profile Edge Functions
supabase functions logs analyze-fund --tail
# Look for slow searches or AI calls

# Optimize queries
EXPLAIN ANALYZE SELECT ...  # In Supabase SQL Editor
```

### Database
```bash
# Add indexes for slow queries
CREATE INDEX idx_analysis_user_created 
  ON analysis_history(user_id, created_at DESC);

# Vacuum tables
VACUUM ANALYZE;
```

---

**Questions?** See SECRETS_CONFIGURATION.md or ARCHITECTURE.md
