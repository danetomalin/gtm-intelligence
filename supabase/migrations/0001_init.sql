-- Throughline initial schema
-- Multi-tenant by organization. RLS enforces isolation on every table.

-- ============================================================================
-- Core tenancy tables
-- ============================================================================

create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references auth.users(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  organization_id  uuid not null references organizations(id) on delete cascade,
  email            text,
  role             text not null default 'owner' check (role in ('owner','admin','member')),
  created_at       timestamptz not null default now()
);
create index on profiles (organization_id);

create table brands (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  name                text not null,
  website_url         text,
  additional_context  text,
  created_by          uuid not null references auth.users(id) on delete restrict,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on brands (organization_id);

-- ============================================================================
-- Run history + executive reports (the tenant-facing output of the chain)
-- ============================================================================

create table run_history (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  brand_id         uuid not null references brands(id) on delete cascade,
  status           text not null default 'running' check (status in ('queued','running','success','error','canceled')),
  triggered_by     uuid references auth.users(id) on delete set null,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  error_message    text
);
create index on run_history (organization_id);
create index on run_history (brand_id, started_at desc);

create table executive_reports (
  id                         uuid primary key default gen_random_uuid(),
  organization_id            uuid not null references organizations(id) on delete cascade,
  brand_id                   uuid not null references brands(id) on delete cascade,
  run_id                     uuid references run_history(id) on delete set null,
  report_date                date not null default current_date,
  executive_summary          text,
  competitive_landscape      text,
  market_signals             text,
  roadmap_gaps               text,
  customer_feedback          text,
  positioning_framework      text,
  messaging_highlights       text,
  battlecard_summary         text,
  sales_readiness            text,
  strategic_recommendations  text,
  html_report                text,
  data_freshness             text,
  stale_flags                text,
  created_at                 timestamptz not null default now()
);
create index on executive_reports (organization_id);
create index on executive_reports (brand_id, created_at desc);

-- ============================================================================
-- Tenant-scoped working tables (mirror of the original 15 GTM Intelligence
-- data tables, but with organization_id + brand_id columns for multi-tenancy).
-- Phase-1 path uses n8n data tables as working storage during a run and only
-- syncs the executive_reports row into Supabase. These tables exist so a
-- future migration can land tenant-scoped working data here.
-- ============================================================================

create table brand_competitors (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,
  name                     text not null,
  domain                   text,
  linkedin_url             text,
  keywords                 text,
  tracking_categories      text,
  latest_messaging         text,
  latest_pricing_summary   text,
  latest_product_state     text,
  risk_level               text check (risk_level is null or risk_level in ('LOW','MEDIUM','HIGH')),
  updated_at               timestamptz not null default now()
);
create index on brand_competitors (brand_id);

create table competitive_dossiers (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,
  competitor_name          text not null,
  run_date                 date not null default current_date,
  strategic_move           text,
  messaging_drift          text,
  pricing_intelligence     text,
  product_signals          text,
  talent_signals           text,
  competitive_landmines    text,
  risk_assessment          text,
  risk_justification       text,
  sources                  text,
  created_at               timestamptz not null default now()
);
create index on competitive_dossiers (brand_id, run_date desc);

create table market_signals (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,
  signal_date              date not null default current_date,
  category                 text,
  headline                 text,
  summary                  text,
  strategic_commentary     text,
  impact_score             integer check (impact_score is null or impact_score between 1 and 10),
  sentiment                text check (sentiment is null or sentiment in ('bullish','bearish','neutral')),
  sentiment_reason         text,
  tags                     text,
  sources                  text,
  created_at               timestamptz not null default now()
);
create index on market_signals (brand_id, impact_score desc);

-- The remaining tenant-scoped working tables (Roadmap Items, Feedback Themes,
-- Positioning Elements, Battlecards, Sales Collateral, Buyer Personas,
-- Product Context, Business Rules, Content Outputs, Campaign Briefs) follow
-- the same pattern and are added in 0002_working_tables.sql once we commit
-- to migrating working storage off n8n data tables.

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_orgs_updated_at before update on organizations
  for each row execute function set_updated_at();
create trigger trg_brands_updated_at before update on brands
  for each row execute function set_updated_at();
create trigger trg_brand_competitors_updated_at before update on brand_competitors
  for each row execute function set_updated_at();

-- ============================================================================
-- Row-Level Security
-- A user can only see rows whose organization_id matches an organization they
-- have a profile in.
-- ============================================================================

alter table organizations         enable row level security;
alter table profiles              enable row level security;
alter table brands                enable row level security;
alter table run_history           enable row level security;
alter table executive_reports     enable row level security;
alter table brand_competitors     enable row level security;
alter table competitive_dossiers  enable row level security;
alter table market_signals        enable row level security;

-- Helper: SECURITY DEFINER function to fetch the caller's org_ids without
-- recursing through RLS.
create or replace function current_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select organization_id from profiles where user_id = auth.uid();
$$;

-- organizations: members can read their org; only the creator (initially) can update.
create policy org_select on organizations
  for select using (id in (select current_org_ids()));
create policy org_insert on organizations
  for insert with check (created_by = auth.uid());
create policy org_update on organizations
  for update using (id in (select current_org_ids()));

-- profiles: you can see profiles within your org; you can manage your own row.
create policy profile_select on profiles
  for select using (organization_id in (select current_org_ids()));
create policy profile_insert on profiles
  for insert with check (user_id = auth.uid());
create policy profile_update on profiles
  for update using (user_id = auth.uid());

-- brands + everything else: tenant-scoped via organization_id.
create policy brand_all on brands
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
create policy run_history_all on run_history
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
create policy executive_reports_all on executive_reports
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
create policy brand_competitors_all on brand_competitors
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
create policy competitive_dossiers_all on competitive_dossiers
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
create policy market_signals_all on market_signals
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
