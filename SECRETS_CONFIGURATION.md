# Secrets Configuration Guide

This document lists ALL secrets required to run AI-VC. **NEVER commit .env with real secrets.**

## Supabase (Required)

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...  # Anon key from Settings > API
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # Service role key (NEVER expose client-side)
SUPABASE_URL=https://your-project.supabase.co
```

Get these from: https://app.supabase.com > Settings > API

## AI Providers

### Google Gemini (Recommended)

```
AI_PROVIDER=gemini  # or "vertex"
GEMINI_API_KEY=AIzaSy...              # API key from https://makersuite.google.com/app/apikey
GEMINI_KEY_2=AIzaSy...                # Alternative/backup key
GEMINI_MODEL=gemini-2.5-pro           # gemini-2.5-pro, gemini-2.0-flash, gemini-1.5-pro
```

**Free tier**: 15 requests/minute, no credit card required.

### Google Vertex AI (Enterprise)

```
AI_PROVIDER=vertex
VERTEX_AI_PROJECT_ID=my-gcp-project
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-2.5-pro
VERTEX_AI_CREDENTIALS={"type":"service_account",...}  # JSON credentials file
```

### Groq API (Fast, free alternative)

```
GROQ_API_KEY=gsk_...  # From https://console.groq.com
```

## Search APIs

### Serper (Primary search)

```
SERPER_API_KEY=xxxxxxx              # From https://serper.dev
# Free tier: 100 searches/month
# Paid: $20 for 5,000 searches
```

### Brave Search (Fallback)

```
BRAVE_API_KEY=xxxxxxx               # From https://brave.com/search/api
# Free tier: 100 requests/month
# Paid: $1 per 1,000 requests
```

## Stripe (Payment Processing)

```
STRIPE_SECRET_KEY=sk_live_xxxxxxx   # Signing key from https://dashboard.stripe.com
STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # Public key for frontend
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxx # Webhook secret
STRIPE_PRICE_ID_STARTER=price_xxx   # Price ID for $99/mo plan
STRIPE_PRICE_ID_PROFESSIONAL=price_yyy  # Price ID for $399/mo plan
```

Get from: https://dashboard.stripe.com > Developers > API keys

## Optional: DigitalOcean AI Agents

```
DO_AGENT_ENDPOINT=https://api.digitalocean.com/v2/compute/agents
DO_AGENT_API_KEY=xxxxxxx            # DigitalOcean API token
```

## Setting Secrets in Supabase (for Edge Functions)

1. Go to: https://app.supabase.com > Project > Functions
2. Click "Secrets" or navigate to "Edge Functions" > your function
3. Add each secret:
   - GEMINI_API_KEY
   - SERPER_API_KEY
   - BRAVE_API_KEY
   - STRIPE_SECRET_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - (others as needed)

## Setting Secrets in Vercel (for frontend environment)

1. Go to: https://vercel.com/dashboard > Project > Settings > Environment Variables
2. Add public variables (with VITE_ prefix):
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PUBLISHABLE_KEY
3. Add secret variables:
   - STRIPE_PUBLISHABLE_KEY (frontend only)

## Local Development (.env file)

Create `.env.local` with all secrets for local testing:

```bash
# Copy .env.example and add real secrets
cp .env.example .env.local

# Then run
npm run dev
```

**IMPORTANT**: `.env.local` is in `.gitignore` — it's local-only.

## Security Best Practices

✅ **DO**:
- Rotate API keys regularly
- Use different keys for dev/staging/prod
- Store secrets in environment variables, never in code
- Limit API key permissions (e.g., Serper read-only)
- Use Supabase RLS to restrict database access

❌ **DON'T**:
- Commit `.env` with real secrets
- Share API keys in messages/docs
- Use the same key for dev and production
- Embed secrets in code or comments
- Expose SUPABASE_SERVICE_ROLE_KEY to frontend

## Verifying Secrets Are Set

```bash
# In Edge Function:
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_KEY) {
  throw new Error("GEMINI_API_KEY not configured");
}

# In React component:
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
```

## Cost Estimation (Monthly)

| Service | Free Tier | Paid Tier | Estimated Cost |
|---------|-----------|-----------|---|
| Serper | 100 searches | $20/5k | $10-50 |
| Brave | 100 requests | $1/1k | $5-20 |
| Gemini API | 15 req/min | Free | $0 |
| Stripe | 0% fee | 2.9% + $0.30 | Variable |
| Supabase | 500MB DB | $25/mo | $25+ |
| **Total** | — | — | **$40-100/mo** |

## Troubleshooting

### "Unauthorized" error in Edge Function
→ Secret not set in Supabase dashboard, or name mismatch
→ Check Supabase Functions > Secrets

### Gemini API rate limit (429)
→ Free tier = 15 req/min. Use fallback to Serper/Brave
→ Or upgrade to paid tier

### Serper "Invalid API key"
→ Key copied incorrectly or doesn't have search permission
→ Regenerate key at https://serper.dev

### .env not loaded in frontend
→ Use VITE_ prefix for frontend variables
→ Variable names are case-sensitive
→ Restart dev server after adding .env

---

**Last updated**: 2026-05-25  
**Questions?** See CONFIGURATION_AI.md for more details
