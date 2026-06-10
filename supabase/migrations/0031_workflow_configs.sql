-- ============================================================
-- 0031: workflow_configs — per-workflow instruction warehouse
-- (Phase C). Each workflow's operating instructions (the system
-- prompt the Vercel-native runner uses) live here, org-scoped.
-- API credentials deliberately do NOT live here: BYOK keys stay
-- browser-side (localStorage) and flow per-request through
-- /api/llm. This table is non-secret configuration only.
-- ============================================================

create table workflow_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  workflow_code text not null,               -- matches agentTooling codes (R-CI, D-QB, ...)
  instructions text not null default '',     -- system prompt / operating instructions
  model_override text,                       -- optional per-workflow model (null = org default)
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, workflow_code)
);
create index workflow_configs_org_idx on workflow_configs (organization_id);

alter table workflow_configs enable row level security;
create policy "org members" on workflow_configs for all
  using (organization_id in (select current_org_ids()));

create trigger workflow_configs_updated_at before update on workflow_configs
  for each row execute function set_updated_at();
