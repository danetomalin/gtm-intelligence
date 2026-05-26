-- Migration 0020: customer_enrichment table for R-CE (Customer Enrichment).
--
-- Second of four ICP sub-agents. R-CE takes the approved super_user_cohort
-- domains and looks up firmographics, technographics, and trigger signals via
-- web search + (eventually) Apollo / Clearbit / BuiltWith API adapters. v1
-- runs mock-first (web search only) per the Cap 4 adapter pattern.
--
-- No HITL gate on this one — the framework only calls out Gate 1 (post-R-CR)
-- and Gate 2 (post-R-VC). R-CE's output is structured enrichment data with
-- no editorial judgment for PMM to overrule mid-flow; it feeds straight into
-- S-IC for the final synthesis where the canonical HITL gate lives.

create table if not exists customer_enrichment (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,

  -- FK to the cohort this enrichment is built from. Lineage matters: S-IC
  -- joins enrichment + VoC via the shared cohort id.
  super_user_cohort_id     uuid references super_user_cohorts(id) on delete set null,

  -- Firmographic clusters: industries / employee bands / revenue tiers /
  -- geographies that dominate the cohort.
  -- Shape: { industry: [{label, account_count, pct}], employee_band: [...], ... }
  firmographic_clusters    jsonb not null default '{}'::jsonb,

  -- Technographic signals: tools observed in the cohort's stack, weighted
  -- by adoption frequency.
  -- Shape: { uses: [{tool, account_count, pct}], missing: [...], integrations: [...] }
  technographic_signals    jsonb not null default '{}'::jsonb,

  -- Trigger signals: corporate events that surface the need.
  -- Shape: [{ trigger_type, description, observed_in_accounts, confidence }]
  trigger_signals          jsonb not null default '[]'::jsonb,

  -- Provenance of each enrichment row so PMM can audit.
  -- Shape: [{ provider, request_url, fetched_at, confidence }]
  enrichment_sources       jsonb not null default '[]'::jsonb,

  -- Summary fields surfaced in the card
  total_accounts_enriched  integer not null default 0,
  coverage_pct             numeric(5,2),     -- % of cohort that returned usable data

  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists customer_enrichment_brand_idx
  on customer_enrichment (brand_id, created_at desc);

create index if not exists customer_enrichment_cohort_idx
  on customer_enrichment (super_user_cohort_id);

alter table customer_enrichment enable row level security;

create policy customer_enrichment_all on customer_enrichment
  for all
  using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

drop trigger if exists customer_enrichment_set_updated_at on customer_enrichment;
create trigger customer_enrichment_set_updated_at
  before update on customer_enrichment
  for each row execute function set_updated_at();
