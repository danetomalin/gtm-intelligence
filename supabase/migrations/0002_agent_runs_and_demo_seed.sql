-- Migration 0002: agent_code on run_history + relax created_by for demo + seed Throughline tenant.

-- ============================================================================
-- run_history additions for agent-level tracking
-- ============================================================================
alter table run_history
  add column if not exists agent_code text,
  add column if not exists summary    text;

create index if not exists run_history_agent_code_idx on run_history (agent_code);

-- ============================================================================
-- Relax created_by NOT NULL for demo mode (no auth user yet to attribute rows)
-- Will be tightened back up once real auth is wired.
-- ============================================================================
alter table organizations alter column created_by drop not null;
alter table brands        alter column created_by drop not null;

-- ============================================================================
-- Seed: Throughline as the prototype tenant + brand.
-- Fixed UUIDs so n8n workflows can reference them deterministically.
-- ============================================================================
insert into organizations (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Throughline Demo')
on conflict (id) do nothing;

insert into brands (id, organization_id, name, website_url, additional_context)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Throughline',
  'https://throughline.io',
  'AI Native Workflow Modernization System for enterprise GTM teams. Multi-tenant SaaS that runs the GTM intelligence agent pipeline on a brand and exposes the output through an authenticated dashboard.'
)
on conflict (id) do nothing;
