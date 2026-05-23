-- Migration 0006: battlecards table + RLS. Output target for A7 Battlecard Generator.

create table if not exists battlecards (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,
  competitor_name          text not null,
  elevator_pitch           text,
  value_prop               text,
  features_benefits        text,
  target_personas          text,
  pain_points              text,
  qualifying_questions     text,
  competitor_profile       text,
  competitor_strengths     text,
  competitor_weaknesses    text,
  kill_points              text,
  objections               text,
  success_stories          text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists battlecards_brand_id_idx        on battlecards (brand_id, created_at desc);
create index if not exists battlecards_competitor_name_idx on battlecards (brand_id, competitor_name);

alter table battlecards enable row level security;

create policy battlecards_all on battlecards
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
