-- Migration 0019: super_user_cohorts table for R-CR (Customer Revenue Analyst).
--
-- First of four ICP sub-agents per Capability 10. R-CR sorts the customer
-- base by NRR / LTV / adoption signals and produces a top-decile "super user"
-- cohort. The cohort lands in pending_review (HITL Gate 1 per the framework's
-- explicit checkpoint) before downstream agents (R-CE enrichment, R-VC voice
-- of customer) read from it. The Gate 1 PMM review catches the failure mode
-- of legacy whales pulling the cohort toward yesterday's customer instead of
-- tomorrow's.
--
-- HITL approval columns are included from day one (matches Cap 6 pattern).
-- Cohort lineage: every R-CR run creates a new row; is_active flag marks the
-- current canonical cohort. Downstream agents (R-CE, R-VC) join via FK to the
-- approved cohort.

create table if not exists super_user_cohorts (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,

  -- Versioning + canonical-state. Only one active per brand.
  version                  integer not null default 1,
  is_active                boolean not null default false,

  -- Cohort framing
  cohort_name              text,                -- e.g. 'Q2 2026 super users — post-pricing-change'
  methodology              text,                -- short prose explaining the filter logic
  filter_criteria          jsonb,               -- structured criteria the agent applied

  -- The cohort itself. Each entry holds account-level snapshot + quant scores.
  -- Shape (per element):
  --   { name, domain, segment, nrr_pct, ltv_usd, adoption_score,
  --     support_ticket_volume, included_reason, ... }
  cohort_accounts          jsonb not null default '[]'::jsonb,
  -- account_count was a STORED generated column using jsonb_array_length but
  -- n8n's supabaseTool sometimes stores $fromAI JSON output as a jsonb
  -- scalar string instead of a true array, which makes jsonb_array_length()
  -- fail at insert time. Dropped 2026-05-26; the card reads from
  -- jsonb_array_length(cohort_accounts) at render time instead.

  -- Accounts the agent FLAGGED but excluded. PMM reviews these too in case
  -- the agent over-filtered.
  excluded_accounts        jsonb not null default '[]'::jsonb,

  -- Drift / sanity indicators surfaced in the Review Queue
  legacy_concentration_pct numeric(5,2),        -- % of cohort that's > 3 years old
  segment_dominance_pct    numeric(5,2),        -- % of cohort in the single largest segment

  -- Source provenance
  sources                  text,                -- markdown-style; what data was read

  -- HITL state machine (matches Cap 6 schema)
  approval_status          text not null default 'pending_review'
    check (approval_status in ('draft','pending_review','approved','needs_revision','rejected','published')),
  risk_tier                text not null default 'high'
    check (risk_tier in ('low','medium','high')),
  reviewer_comment         text,
  approved_by              uuid references profiles(user_id) on delete set null,
  approved_at              timestamptz,
  published_at             timestamptz,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists super_user_cohorts_brand_idx
  on super_user_cohorts (brand_id, created_at desc);

create index if not exists super_user_cohorts_active_idx
  on super_user_cohorts (brand_id) where is_active = true;

create index if not exists super_user_cohorts_pending_idx
  on super_user_cohorts (brand_id, approval_status)
  where approval_status in ('pending_review','needs_revision');

-- Only one cohort can be active per brand. Partial unique index enforces it.
create unique index if not exists super_user_cohorts_one_active_per_brand
  on super_user_cohorts (brand_id) where is_active = true;

alter table super_user_cohorts enable row level security;

create policy super_user_cohorts_all on super_user_cohorts
  for all
  using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

drop trigger if exists super_user_cohorts_set_updated_at on super_user_cohorts;
create trigger super_user_cohorts_set_updated_at
  before update on super_user_cohorts
  for each row execute function set_updated_at();
