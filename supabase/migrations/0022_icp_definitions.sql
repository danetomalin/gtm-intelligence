-- Migration 0022: icp_definitions table for S-IC (ICP Synthesizer).
--
-- Final of four ICP sub-agents. S-IC merges the quantitative cohort
-- (R-CR + R-CE) with the qualitative pain extraction (R-VC) into the
-- canonical ICP document. One active row per brand (partial unique index
-- enforces it). Versioning preserves history.
--
-- Decisions (locked 2026-05-26):
-- - Single canonical ICP per brand (Decision 14)
-- - Anti-ICP captured inline as jsonb (Decision 15)
-- - S-PO auto-refresh on approval via post-approval hook (Decision 16)
-- - First ICP auto-seeded after R-BR onboarding (Decision 17)

create table if not exists icp_definitions (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,

  -- Versioning + canonical-state
  version                  integer not null default 1,
  is_active                boolean not null default false,

  -- FK chain enforces lineage: every ICP traces back to the cohort, the
  -- enrichment, and the VoC extraction that produced it. Set null on
  -- feeder delete so cleaning up upstream doesn't vaporize the ICP.
  super_user_cohort_id     uuid references super_user_cohorts(id) on delete set null,
  customer_enrichment_id   uuid references customer_enrichment(id) on delete set null,
  voc_extraction_id        uuid references voc_extractions(id) on delete set null,

  -- Identity
  segment_name             text,
  one_line_definition      text,

  -- Firmographics (cleaned + structured from R-CE clusters)
  -- Shape: { industries: [], employee_range: {min, max},
  --   revenue_range: {min, max, currency}, geographies: [],
  --   growth_stage: string, business_model: string }
  firmographics            jsonb not null default '{}'::jsonb,

  -- Technographics: tools + integrations + missing-stack signals
  -- Shape: { uses: [], has_in_stack: [], missing: [], integration_signals: [] }
  technographics           jsonb not null default '{}'::jsonb,

  -- Trigger signals: events that surface the need
  -- Shape: [{ event, frequency_pct, typical_time_to_buy }]
  trigger_signals          jsonb not null default '[]'::jsonb,

  -- Primary pains, ordered
  -- Shape: [{ rank, pain, vocabulary_examples, severity }]
  primary_pains            jsonb not null default '[]'::jsonb,

  -- Buying committee
  -- Shape: [{ role, influence_weight, primary_pain_focus }]
  buying_committee         jsonb not null default '[]'::jsonb,
  typical_sales_cycle      text,

  -- Anti-ICP — the secret weapon
  -- Shape: [{ description, why_excluded, observable_signal }]
  anti_icp                 jsonb not null default '[]'::jsonb,

  -- Provenance
  evidence_basis           text,
  sources                  text,

  -- HITL state machine
  approval_status          text not null default 'pending_review'
    check (approval_status in ('draft','pending_review','approved','needs_revision','rejected','published')),
  risk_tier                text not null default 'high'
    check (risk_tier in ('low','medium','high')),
  reviewer_comment         text,
  approved_by              uuid references profiles(user_id) on delete set null,
  approved_at              timestamptz,
  published_at             timestamptz,

  -- S-PO sync state: when did S-PO last refresh from this ICP version?
  spo_refreshed_at         timestamptz,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists icp_definitions_brand_idx
  on icp_definitions (brand_id, created_at desc);

-- Single canonical ICP per brand enforced via partial unique index
create unique index if not exists icp_definitions_one_active_per_brand
  on icp_definitions (brand_id) where is_active = true;

create index if not exists icp_definitions_pending_idx
  on icp_definitions (brand_id, approval_status)
  where approval_status in ('pending_review','needs_revision');

alter table icp_definitions enable row level security;

create policy icp_definitions_all on icp_definitions
  for all
  using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

drop trigger if exists icp_definitions_set_updated_at on icp_definitions;
create trigger icp_definitions_set_updated_at
  before update on icp_definitions
  for each row execute function set_updated_at();
