-- Migration 0012: R-BR Brand Repository (Brand Code Ingestion).
--
-- Four new tables. R-BR reads a conversational questionnaire (or, post-MVP,
-- uploaded brand documents) and writes structured records that every other
-- agent's Build Context will then read in subsequent runs (per PLAN §3a).
--
-- brand_voice_rules    — tone, banned phrases, preferred terminology, etc.
-- brand_proof_points   — quantified claims, customer quotes, ROI metrics
-- product_capabilities — feature → benefit mappings, gap analyses
-- brand_assets         — raw uploaded files (power-user path; MVP unused)
--
-- buyer_personas already exists from migration 0011 with the Throughline
-- placeholder row. R-BR upserts into that table to replace the placeholder.

-- ============================================================================
-- brand_voice_rules
-- ============================================================================

create table if not exists brand_voice_rules (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  brand_id        uuid not null references brands(id) on delete cascade,
  rule_type       text check (rule_type is null or rule_type in ('tone','banned_phrase','preferred_term','formatting','do_not_say','always_say','reading_level')),
  rule            text not null,
  rationale       text,
  example_before  text,
  example_after   text,
  sources         text,
  created_at      timestamptz not null default now()
);
create index if not exists brand_voice_rules_brand_id_idx on brand_voice_rules (brand_id, rule_type);
alter table brand_voice_rules enable row level security;
drop policy if exists brand_voice_rules_all on brand_voice_rules;
create policy brand_voice_rules_all on brand_voice_rules
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

-- ============================================================================
-- brand_proof_points
-- ============================================================================

create table if not exists brand_proof_points (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  brand_id              uuid not null references brands(id) on delete cascade,
  proof_type            text check (proof_type is null or proof_type in ('metric','customer_quote','case_study_excerpt','third_party_validation','award','certification')),
  claim                 text not null,
  attribution           text,
  customer_name         text,
  customer_segment      text,
  positioning_alignment text,
  legal_status          text check (legal_status is null or legal_status in ('approved','pending_legal','anonymize_only','do_not_use')),
  sources               text,
  created_at            timestamptz not null default now()
);
create index if not exists brand_proof_points_brand_id_idx on brand_proof_points (brand_id, proof_type);
alter table brand_proof_points enable row level security;
drop policy if exists brand_proof_points_all on brand_proof_points;
create policy brand_proof_points_all on brand_proof_points
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

-- ============================================================================
-- product_capabilities
-- ============================================================================

create table if not exists product_capabilities (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations(id) on delete cascade,
  brand_id           uuid not null references brands(id) on delete cascade,
  capability_name    text not null,
  category           text,
  feature_description text,
  buyer_benefit      text,
  competitive_gap    text,
  status             text check (status is null or status in ('ga','beta','alpha','planned','sunset')),
  sources            text,
  created_at         timestamptz not null default now()
);
create index if not exists product_capabilities_brand_id_idx on product_capabilities (brand_id, category);
alter table product_capabilities enable row level security;
drop policy if exists product_capabilities_all on product_capabilities;
create policy product_capabilities_all on product_capabilities
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

-- ============================================================================
-- brand_assets (power-user upload path; MVP unused, prepped for Phase 4 v2)
-- ============================================================================

create table if not exists brand_assets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  brand_id        uuid not null references brands(id) on delete cascade,
  asset_type      text check (asset_type is null or asset_type in ('style_guide','product_one_pager','case_study','customer_transcript','sales_call_recording','positioning_doc','other')),
  file_name       text,
  storage_path    text,
  mime_type       text,
  size_bytes      bigint,
  extracted       boolean default false,
  created_at      timestamptz not null default now()
);
create index if not exists brand_assets_brand_id_idx on brand_assets (brand_id, asset_type);
alter table brand_assets enable row level security;
drop policy if exists brand_assets_all on brand_assets;
create policy brand_assets_all on brand_assets
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
