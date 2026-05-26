-- Migration 0017: Capability 7 — Launch Readiness.
--
-- launches is a first-class object that coordinates artifacts across workflows.
-- Each launch carries a tier that defines the required artifact matrix
-- (PLAN §7b: Flagship / Feature / Bug Fix / Revenue Growth / Revenue Retention).
--
-- launch_artifacts is the junction between a launch and the specific output
-- rows produced for it across content_outputs / sales_collateral /
-- counter_narrative_memos / enablement_assets / launch_plans / etc. No schema
-- changes to existing delivery tables — link rows are the canonical tie.
--
-- readiness_pct is computed in the app layer to avoid a circular table refresh.

create table if not exists launches (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  brand_id            uuid not null references brands(id) on delete cascade,
  name                text not null,
  tier                text not null check (tier in (
    'flagship','feature','bugfix','revenue_growth','revenue_retention'
  )),
  product_summary     text,
  launch_date_target  date,
  status              text not null default 'draft' check (status in (
    'draft','in_progress','ready','shipped','post_mortem'
  )),
  linked_signal_id    uuid references market_signals(id) on delete set null,
  created_by          uuid references auth.users(id) on delete set null,
  shipped_at          timestamptz,
  post_mortem_at      timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists launches_brand_id_idx on launches (brand_id, status, launch_date_target);
create index if not exists launches_tier_idx     on launches (brand_id, tier, created_at desc);
alter table launches enable row level security;
drop policy if exists launches_all on launches;
create policy launches_all on launches
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

create table if not exists launch_artifacts (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,
  launch_id                uuid not null references launches(id) on delete cascade,
  artifact_table           text not null check (artifact_table in (
    'content_outputs','sales_collateral','counter_narrative_memos',
    'enablement_assets','launch_plans','battlecards','analyst_briefings',
    'campaign_sends'
  )),
  artifact_id              uuid,
  agent_code               text not null,
  required                 boolean not null default true,
  produced                 boolean not null default false,
  status_when_produced     text,
  notes                    text,
  created_at               timestamptz not null default now(),
  produced_at              timestamptz
);
create index if not exists launch_artifacts_launch_idx on launch_artifacts (launch_id, agent_code);
create index if not exists launch_artifacts_brand_id_idx on launch_artifacts (brand_id, created_at desc);
alter table launch_artifacts enable row level security;
drop policy if exists launch_artifacts_all on launch_artifacts;
create policy launch_artifacts_all on launch_artifacts
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
