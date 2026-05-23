-- Migration 0007: feedback_themes table + RLS. Output target for A4 Customer Feedback.

create table if not exists feedback_themes (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references organizations(id) on delete cascade,
  brand_id             uuid not null references brands(id) on delete cascade,
  theme_name           text not null,
  category             text,
  summary              text,
  representative_quotes text,
  frequency            text,
  urgency              text,
  revenue_impact       text,
  strategic_alignment  text,
  recommended_action   text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists feedback_themes_brand_id_idx on feedback_themes (brand_id, created_at desc);

alter table feedback_themes enable row level security;

create policy feedback_themes_all on feedback_themes
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
