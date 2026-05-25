# AI Configuration: Gemini vs Vertex AI

Configure your AI provider (Gemini or Vertex AI) and model selection for analysis functions.

## Setup

Set secrets in Supabase Dashboard → Edge Functions → Settings → Secrets

## Option 1: Gemini (Recommended)

**Secrets**:
- `AI_PROVIDER` = `gemini` (default if omitted)
- `GEMINI_API_KEY` — Get free key at https://makersuite.google.com/app/apikey
- `GEMINI_MODEL` (optional, default `gemini-2.5-pro`)
  - `gemini-2.5-pro` (recommended, most capable)
  - `gemini-2.0-flash` (fastest)
  - `gemini-1.5-pro` (very capable)
  - `gemini-1.5-flash` (fast, good)
- `BRAVE_API_KEY` — Web search API key

## Option 2: Vertex AI (Google Cloud)

**Prerequisites**:
- GCP project with Vertex AI API enabled
- Service Account with "Vertex AI User" role

**Secrets**:
- `AI_PROVIDER` = `vertex`
- `VERTEX_AI_PROJECT_ID` — GCP project ID
- `VERTEX_AI_CREDENTIALS` — Service Account JSON (key.json from GCP)
- `VERTEX_AI_LOCATION` (optional, default `us-central1`)
- `VERTEX_AI_MODEL` (optional, default `gemini-pro`)
- `BRAVE_API_KEY`

**Get credentials**:
1. Google Cloud Console → IAM & Admin → Service Accounts
2. Create → grant "Vertex AI User" role → download JSON key
3. Paste JSON in `VERTEX_AI_CREDENTIALS` secret

## Switch Providers

1. Update `AI_PROVIDER` secret in Supabase
2. Add corresponding secrets (GEMINI_* or VERTEX_AI_*)
3. Redeploy Edge Functions (or wait for next Vercel deploy)

## Current Default

**`gemini-2.5-pro`** — Most capable, recommended.

To change, set `GEMINI_MODEL` secret and redeploy functions.

## Model Comparison

| Model | Speed | Quality | Cost |
|-------|-------|---------|------|
| `gemini-2.5-pro` | Fast | Excellent | Free |
| `gemini-2.0-flash` | Fastest | Good | Free |
| `gemini-1.5-pro` | Slow | Excellent | Paid (Vertex) |

## Deploy

After updating secrets, redeploy Edge Functions:
```bash
npx supabase functions deploy analyze-fund
npx supabase functions deploy ai-qa
```
Or push to main → Vercel auto-deploys.
