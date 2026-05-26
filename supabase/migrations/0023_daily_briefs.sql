-- Migration 0023: daily_briefs table for S-DB (Daily Brief Synthesizer).
--
-- The "what should I focus on today" surface lives at the top of /dashboard.
-- PMM clicks "Brief me", S-DB reads the platform snapshot (pending HITL load,
-- high-impact signals, launches in flight, margin floor breaches, stale runs)
-- and writes a ranked focus-item set. The dashboard renders the latest brief
-- and lets the user refresh on demand.
--
-- Briefs are versioned implicitly by created_at — each run inserts a new row.
-- The dashboard reads the most recent row per brand. No HITL approval gate;
-- this is an internal-only surface for the operator.

create table if not exists daily_briefs (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  brand_id            uuid not null references brands(id) on delete cascade,

  generated_at        timestamptz not null default now(),

  -- The headline focus items. Shape per element:
  --   { rank, title, why, action, related_artifact: {table, id, label} | null }
  focus_items         jsonb not null default '[]'::jsonb,

  -- One-line summary the agent produces alongside the items. Renders as a
  -- subtitle above the ranked list.
  headline            text,

  -- The structured snapshot fed to the LLM. Captured for debugging + future
  -- replay of "what did Throughline see when it suggested X?"
  platform_snapshot   jsonb,

  -- Provenance + cost tracking
  model               text default 'gemini-2.5-flash',
  prompt_tokens       integer,
  completion_tokens   integer,

  created_at          timestamptz not null default now()
);

create index if not exists daily_briefs_brand_idx
  on daily_briefs (brand_id, created_at desc);

alter table daily_briefs enable row level security;

create policy daily_briefs_all on daily_briefs
  for all
  using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
