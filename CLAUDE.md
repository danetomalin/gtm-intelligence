# Throughline SaaS app

This is the Throughline product — a multi-tenant SaaS that runs the existing GTM Intelligence n8n chain (A0–A9) on customers' brands and exposes the output through an authenticated dashboard.

**Stack:** Next.js 16 App Router + TypeScript + Tailwind v4 + Supabase (auth + Postgres + RLS) + n8n Cloud (orchestration) + Vercel (hosting).

**Multi-tenancy:** Organizations are tenants. Every tenant-scoped table carries `organization_id`. RLS policies enforce isolation via the `current_org_ids()` helper.

**Data boundary:** Phase 1 is a hybrid — n8n data tables stay the working storage during a chain run; A9 syncs the final executive_report row into Supabase keyed by `organization_id` + `brand_id`. The frontend reads only from Supabase. Migration to full Supabase data layer is a Phase 2 task once we commit.

**Route groups:**
- `src/app/(app)/` — authenticated routes (dashboard, onboarding). Layout enforces session.
- `src/app/login/`, `src/app/auth/callback/` — public auth flow.
- `src/app/api/` — route handlers (onboarding webhook → n8n, sign-out).

**n8n contract:**
- App POSTs to `${N8N_WEBHOOK_BASE_URL}${N8N_WEBHOOK_INIT_BRAND}` on onboarding submit.
- Payload: `{ tenantId, brandId, brandName, websiteUrl, additionalContext }`.
- A0 form trigger replaced by webhook trigger accepting those fields.
- A9 final step writes back to Supabase `executive_reports` via REST.

**Domain:** throughline.io (planned). Demo on Vercel preview URL until DNS lands.

**Auth pattern:** Supabase `@supabase/ssr` (Server Components + cookies). Magic-link email auth only. No password, no OAuth providers yet — added later if needed.

**Critical rules:**
- Server-side reads use `createClient` from `lib/supabase/server.ts`. Browser reads use `createClient` from `lib/supabase/client.ts`. Admin/service-role bypass for RLS-aware bootstrap operations only — never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- Always validate user session before mutations in route handlers.
- The middleware refreshes the session via `getUser()` on every request — do not remove that call.
- All schema changes go through `supabase/migrations/<n>_<slug>.sql`. Never `ALTER TABLE` in code.
- Theme tokens live in `src/app/globals.css` under `@theme {}`. Tailwind v4 reads them at build time.
