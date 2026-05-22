# Throughline

> AI Native Workflow Modernization System for enterprise GTM teams.

Multi-tenant SaaS that runs the GTM Intelligence agent pipeline on a customer's brand and surfaces the output as a live, authenticated dashboard.

## Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4
- **Auth & DB**: Supabase (auth, Postgres, Row-Level Security)
- **Orchestration**: n8n Cloud (existing A0–A9 chain)
- **Hosting**: Vercel (app), Supabase (db), n8n Cloud (workflows)

## Project structure

```
throughline-app/
  src/
    app/
      page.tsx                  # Landing page
      login/                    # Magic-link sign-in
      auth/callback/            # Supabase auth callback handler
      api/
        auth/sign-out/          # POST handler to clear session
        onboarding/             # POST handler that creates org + brand + kicks off n8n
      (app)/                    # Authenticated routes — layout requires session
        dashboard/              # Brand intel report renderer
        onboarding/             # First-time brand setup form
    lib/
      supabase/                 # SSR + browser clients, middleware helper
      utils.ts                  # cn() class merger
      env.ts                    # Zod-validated env config
    middleware.ts               # Refreshes session + auth-route gating
  supabase/
    migrations/0001_init.sql    # Multi-tenant schema with RLS
  .env.example                  # Env var schema
```

## Setup

1. Copy `.env.example` → `.env.local`, fill in Supabase + n8n values.
2. Apply the migration: `supabase db push` (or paste `supabase/migrations/0001_init.sql` into the SQL editor).
3. `npm run dev` — local dev on http://localhost:3000.

## Multi-tenancy model

- **Organization** = tenant. One per customer.
- **Profile** = auth user, scoped to one organization (Phase 1 — multi-seat comes later).
- **Brand** = the company a customer wants intel on. One or more per organization.
- **RLS policy**: every tenant-scoped row carries `organization_id`. Policies enforce that a user can only read/write rows in organizations they have a profile in.

## n8n integration boundary

Phase 1 hybrid: n8n data tables stay the working storage during a run. At the end of A9, the chain POSTs the executive report into Supabase keyed by `organization_id` + `brand_id`. The frontend reads only from Supabase, never from n8n directly.

A0's form trigger gets replaced by a webhook trigger that accepts `tenantId`, `brandId`, plus the original brand fields.

## Deploy

Vercel auto-deploys on push to `main`. Set env vars in Vercel dashboard. DNS → throughline.io once registered.
