-- Migration 0010: pricing_intelligence table for R-PP (Pricing & Packaging
-- Intelligence). Highest-impact Phase 3 agent; lands first to establish the
-- Phase 3 build pattern.
--
-- R-PP reads R-CI competitive_dossiers + R-MS market_signals and synthesizes
-- a per-competitor pricing snapshot: pricing model, tier breakdown, recent
-- changes, and the positioning implications of each shift.
--
-- Research-layer table (R-*), so no HITL approval columns. Output is input
-- to S-BC battlecards and S-PO positioning, not customer-facing.

create table if not exists pricing_intelligence (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,
  competitor_name          text not null,
  snapshot_date            date not null default current_date,
  pricing_model            text check (pricing_model is null or pricing_model in ('tiered','usage','seat','flat','hybrid','custom','unknown')),
  tiers                    jsonb,
  packaging_observations   text,
  pricing_velocity         text check (pricing_velocity is null or pricing_velocity in ('stable','changing','recently_changed','unknown')),
  recent_changes           text,
  positioning_implications text,
  sources                  text,
  created_at               timestamptz not null default now()
);

create index if not exists pricing_intelligence_brand_id_idx        on pricing_intelligence (brand_id, created_at desc);
create index if not exists pricing_intelligence_competitor_name_idx on pricing_intelligence (brand_id, competitor_name, snapshot_date desc);

alter table pricing_intelligence enable row level security;

create policy pricing_intelligence_all on pricing_intelligence
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
