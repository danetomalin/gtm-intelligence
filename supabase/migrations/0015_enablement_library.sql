-- Migration 0015: Phase 6B — Cap 5 Enablement Collateral Library.
--
-- Single unified table (enablement_assets) for every internal collateral
-- artifact regardless of which sub-agent produced it. Versions live in a
-- separate table so refreshes append rather than overwrite. The four v1
-- sub-agents (D-OB Objection Handler, D-QB QBR Template, D-HP Customer
-- Health Playbook, D-WW Win Wire) all write into the same library with
-- different asset_type values.
--
-- Per the no-scheduled-runs policy, the staleness scanner from PLAN §5b is
-- deferred. v1 ships a manual "Scan for stale" button later. Assets get a
-- freshness_state but nobody flips them on a timer.
--
-- HITL approval columns live on every row from inception so refreshed assets
-- route through the Review Queue.

create table if not exists enablement_assets (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,
  asset_type               text not null check (asset_type in (
    'objection_handler','qbr_template','customer_health_playbook','win_wire',
    'expansion_play','renewal_talk_track','battlecard','one_pager','demo_script',
    'onboarding_kit','case_study_brief','discovery_question_bank'
  )),
  audience                 text not null default 'sales' check (audience in ('sales','customer_success','both','marketing','partner')),
  title                    text not null,
  body_markdown            text,
  body_jsonb               jsonb,
  source_refs              text,
  staleness_trigger_jsonb  jsonb,
  last_refreshed_at        timestamptz not null default now(),
  freshness_state          text not null default 'current' check (freshness_state in ('current','stale','regenerating')),
  version                  integer not null default 1,
  current_version_id       uuid,
  owner_profile_id         uuid references profiles(user_id) on delete set null,
  produced_by              text,
  -- HITL approval columns (same pattern as content_outputs / sales_collateral
  -- / counter_narrative_memos).
  approval_status          text not null default 'pending_review'
    check (approval_status in ('draft','pending_review','needs_revision','approved','published','rejected')),
  risk_tier                text not null default 'medium'
    check (risk_tier in ('low','medium','high')),
  assigned_reviewer_id     uuid references profiles(user_id) on delete set null,
  reviewer_comment         text,
  approved_at              timestamptz,
  approved_by              uuid references auth.users(id) on delete set null,
  published_at             timestamptz,
  created_at               timestamptz not null default now()
);
create index if not exists enablement_assets_brand_id_idx        on enablement_assets (brand_id, created_at desc);
create index if not exists enablement_assets_asset_type_idx      on enablement_assets (brand_id, asset_type, freshness_state);
create index if not exists enablement_assets_approval_status_idx on enablement_assets (brand_id, approval_status, created_at desc);
alter table enablement_assets enable row level security;
drop policy if exists enablement_assets_all on enablement_assets;
create policy enablement_assets_all on enablement_assets
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

create table if not exists enablement_asset_versions (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  brand_id          uuid not null references brands(id) on delete cascade,
  asset_id          uuid not null references enablement_assets(id) on delete cascade,
  version           integer not null,
  body_markdown     text,
  body_jsonb        jsonb,
  produced_by       text,
  diff_summary      text,
  created_at        timestamptz not null default now()
);
create index if not exists enablement_asset_versions_asset_idx on enablement_asset_versions (asset_id, version desc);
alter table enablement_asset_versions enable row level security;
drop policy if exists enablement_asset_versions_all on enablement_asset_versions;
create policy enablement_asset_versions_all on enablement_asset_versions
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

create table if not exists enablement_distribution_log (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  brand_id          uuid not null references brands(id) on delete cascade,
  asset_id          uuid not null references enablement_assets(id) on delete cascade,
  surface           text not null check (surface in ('in_app','slack_digest','email_digest','highspot','seismic','drive','notion')),
  pushed_at         timestamptz not null default now(),
  pushed_by         uuid references auth.users(id) on delete set null,
  engagement_jsonb  jsonb
);
create index if not exists enablement_distribution_log_asset_idx on enablement_distribution_log (asset_id, pushed_at desc);
alter table enablement_distribution_log enable row level security;
drop policy if exists enablement_distribution_log_all on enablement_distribution_log;
create policy enablement_distribution_log_all on enablement_distribution_log
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
