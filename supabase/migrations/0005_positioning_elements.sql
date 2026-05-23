-- Migration 0005: positioning_elements table + RLS. Output target for A5 Positioning Engine.

create table if not exists positioning_elements (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  brand_id            uuid not null references brands(id) on delete cascade,
  element_type        text not null check (element_type in (
                        'competitive_alternatives',
                        'distinct_capabilities',
                        'differentiated_value',
                        'best_fit_accounts',
                        'market_category'
                      )),
  content             text,
  evidence            text,
  last_change_reason  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists positioning_elements_brand_id_idx on positioning_elements (brand_id, created_at desc);

alter table positioning_elements enable row level security;

create policy positioning_elements_all on positioning_elements
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
