-- Migration 0004: roadmap_items table + RLS. Output target for A3 Roadmap Steering.

create table if not exists roadmap_items (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  brand_id            uuid not null references brands(id) on delete cascade,
  item_date           date not null default current_date,
  title               text not null,
  category            text,
  summary             text,
  evidence            text,
  usable_score        integer check (usable_score is null or usable_score between 1 and 10),
  usable_rationale    text,
  valuable_score      integer check (valuable_score is null or valuable_score between 1 and 10),
  valuable_rationale  text,
  feasible_score      integer check (feasible_score is null or feasible_score between 1 and 10),
  feasible_rationale  text,
  viable_score        integer check (viable_score is null or viable_score between 1 and 10),
  viable_rationale    text,
  overall_score       numeric(4,2),
  recommendation      text check (recommendation is null or recommendation in ('build','investigate','defer','kill')),
  priority            text check (priority is null or priority in ('critical','high','medium','low')),
  tags                text,
  sources             text,
  created_at          timestamptz not null default now()
);

create index if not exists roadmap_items_brand_id_idx       on roadmap_items (brand_id, created_at desc);
create index if not exists roadmap_items_overall_score_idx  on roadmap_items (brand_id, overall_score desc);

alter table roadmap_items enable row level security;

create policy roadmap_items_all on roadmap_items
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
