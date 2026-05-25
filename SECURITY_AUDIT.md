# Security Audit

**Date**: January 2025  
**Scope**: React/Vite frontend, Supabase (auth + Edge Functions), Vercel deployment

## Summary

| Area | Status | Note |
|------|--------|------|
| API Keys | ✅ | Anon-key only (safe for client) |
| Auth | ✅ | Supabase Auth + localStorage |
| XSS | ✅ | No user HTML injection |
| Dependencies | ✅ | npm audit run regularly |
| CORS | ✅ | Restricted to allowed origins |
| Headers | ✅ | X-Frame-Options, X-Content-Type-Options in vercel.json |

## Secrets

**Client side**: `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (safe, meant to be public)  
**Server side**: GEMINI_API_KEY, BRAVE_API_KEY, VERTEX_AI_* in Supabase secrets (never in code)  
**Requirement**: Never commit `.env` or secrets files

## Auth & Data

- Supabase Auth (email/password) with token refresh
- RLS on `analysis_history` — ensure policies restrict by user_id
- Check: Supabase Dashboard → Authentication → Policies

## XSS Prevention

- `dangerouslySetInnerHTML` only in chart.tsx (CSS from config, no user content)
- User content rendered via React (auto-escaped)
- No `innerHTML`, `eval()`, or templating with user input

## Dependencies

Run `npm audit` regularly. Known: esbuild + Vite have minor vulns (dev-only, not in production build).

## Edge Functions

**Current**: Deployed with `--no-verify-jwt` (open access if URL known)  
**Risk**: Any caller with the URL can use the API  
**Mitigation**: CORS restricted + rate-limiting in Gemini/Brave quotas  
**Future**: Enable `verify_jwt: true` + client sends auth token if public access risk grows

Input validation: Validate fundName, customThesis, params via Zod; reject malformed requests (400).

## CORS

Whitelisted origins in `analyze-fund` + `ai-qa` functions:
- `https://ai-vc-sourcing.vercel.app` (production)
- `http://localhost:5173` (dev)

Update `ALLOWED_ORIGINS` if adding preview URLs.

## HTTP Headers (vercel.json)

- `X-Frame-Options: DENY` (prevent clickjacking)
- `X-Content-Type-Options: nosniff` (prevent MIME sniffing)
- `Referrer-Policy: strict-origin-when-cross-origin`
- HSTS via Vercel (auto, HTTPS required)

## Checklist

- [ ] `npm audit` runs before deploy
- [ ] RLS policies tested on all user tables
- [ ] Secrets never hardcoded or committed
- [ ] CORS origins match your actual domains
- [ ] No `dangerouslySetInnerHTML` on user content

## Refs

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
