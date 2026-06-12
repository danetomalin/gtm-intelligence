-- Migration 0033: per-workflow external data source assignments.
-- Placeholder tier: assignments + pull instructions are real and the
-- engine surfaces them in run context, but no live connector is wired
-- yet (connection_status stays 'placeholder'). The connector layer
-- swaps in later without changing this schema.

create table if not exists workflow_data_sources (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations(id) on delete cascade,
  workflow_code      text not null,
  source_id          text not null,
  source_name        text not null,
  pull_instructions  text not null default '',
  enabled            boolean not null default true,
  connection_status  text not null default 'placeholder'
    check (connection_status in ('placeholder', 'connected', 'error')),
  created_at         timestamptz not null default now(),
  unique (organization_id, workflow_code, source_id)
);

create index if not exists workflow_data_sources_code_idx
  on workflow_data_sources (organization_id, workflow_code);

alter table workflow_data_sources enable row level security;
create policy "org members" on workflow_data_sources for all
  using (organization_id in (select current_org_ids()));
