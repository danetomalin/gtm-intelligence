-- Migration 0021: voc_extractions table for R-VC (Voice of Customer).
--
-- Third of four ICP sub-agents. R-VC extracts the emotional why and the
-- compelling events behind purchases from customer evidence + win/loss notes
-- + feedback themes. v1 reads existing Throughline tables; v2 ingests real
-- Gong / Chorus / Zoom transcripts when the integration layer lands.
--
-- HITL Gate 2 lives here. Drift indicator surfaced in the card: what % of
-- the top-pain text came from a single customer transcript. Trigger > 25%
-- flags "verify this represents the cohort, not a vocal outlier." PMM can
-- approve, edit pain ordering / vocabulary, or mark a customer as
-- over-weighted (R-VC re-runs with that customer down-weighted).

create table if not exists voc_extractions (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,

  -- FK to the cohort this VoC extraction was built from. S-IC joins on this
  -- to merge VoC with enrichment for the same cohort.
  super_user_cohort_id     uuid references super_user_cohorts(id) on delete set null,

  -- Top pains, ordered by frequency × severity. Per the framework: 3 core
  -- pains is the target. Shape:
  -- [{ rank, pain, vocabulary_examples: [...], severity, frequency_pct,
  --    source_transcript_count, single_customer_concentration_pct }]
  top_pains                jsonb not null default '[]'::jsonb,

  -- Pain vocabulary: the exact words customers use, separated from the
  -- analyst-summarized pain so messaging can borrow phrasing verbatim.
  -- Shape: { theme: [phrase1, phrase2, ...], ... }
  pain_vocabulary          jsonb not null default '{}'::jsonb,

  -- Compelling events that triggered the purchase. Shape:
  -- [{ event, frequency_pct, time_to_purchase_days, sample_quote }]
  compelling_events        jsonb not null default '[]'::jsonb,

  -- Buying committee roles observed in the cohort. Shape:
  -- [{ role, influence_weight, typical_pain_focus, observed_in_pct }]
  buying_committee         jsonb not null default '[]'::jsonb,

  -- Drift indicators (HITL Gate 2 explicit checks)
  source_transcript_count  integer not null default 0,
  single_customer_pct      numeric(5,2),  -- % of top-pain text from one customer
  cohort_coverage_pct      numeric(5,2),  -- % of cohort accounts contributing

  -- Provenance
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

  -- Down-weight register so Gate 2 edits influence the re-run
  downweighted_customers   jsonb not null default '[]'::jsonb,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists voc_extractions_brand_idx
  on voc_extractions (brand_id, created_at desc);

create index if not exists voc_extractions_cohort_idx
  on voc_extractions (super_user_cohort_id);

create index if not exists voc_extractions_pending_idx
  on voc_extractions (brand_id, approval_status)
  where approval_status in ('pending_review','needs_revision');

alter table voc_extractions enable row level security;

create policy voc_extractions_all on voc_extractions
  for all
  using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

drop trigger if exists voc_extractions_set_updated_at on voc_extractions;
create trigger voc_extractions_set_updated_at
  before update on voc_extractions
  for each row execute function set_updated_at();
