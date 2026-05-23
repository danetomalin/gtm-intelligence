-- Migration 0008: content_outputs (A6) + sales_collateral (A8) tables + RLS.

create table if not exists content_outputs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  brand_id        uuid not null references brands(id) on delete cascade,
  channel         text not null,
  topic           text,
  target_persona  text,
  content         text,
  messaging_refs  text,
  proof_pending   boolean default false,
  created_at      timestamptz not null default now()
);
create index if not exists content_outputs_brand_id_idx on content_outputs (brand_id, created_at desc);
alter table content_outputs enable row level security;
create policy content_outputs_all on content_outputs
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

create table if not exists sales_collateral (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  brand_id          uuid not null references brands(id) on delete cascade,
  collateral_type   text not null,
  target_account    text,
  target_segment    text,
  competitors       text,
  content           text,
  positioning_refs  text,
  messaging_refs    text,
  source_data_date  date,
  stale_flag        boolean default false,
  created_at        timestamptz not null default now()
);
create index if not exists sales_collateral_brand_id_idx on sales_collateral (brand_id, created_at desc);
alter table sales_collateral enable row level security;
create policy sales_collateral_all on sales_collateral
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

-- NOTE: A8 (Sales Narrative) workflow uses Gemini 2.5 Pro (not Flash).
-- Flash triggers an n8n Tools Agent V3 batch executor bug:
-- "Cannot read properties of undefined (reading 'parts')" when the model
-- returns a function-call-only candidate with no content.parts array.
-- Pro doesn't hit it. maxIterations capped at 8.
