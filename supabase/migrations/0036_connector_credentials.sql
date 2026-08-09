-- ============================================================
-- Migration 0036: real connector layer, step 1 (HubSpot).
-- Per-org connector credentials + a dedicated Integration Test
-- org so live syncs never touch the Halcyon demo portfolio.
--
-- Credentials are encrypted at the APPLICATION layer (AES-256-GCM,
-- key in CONNECTOR_ENCRYPTION_KEY env var) before insert — a DB
-- leak alone exposes no secrets. See src/lib/connectors/crypto.ts.
-- ============================================================

create table if not exists connector_credentials (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  source_id        text not null,              -- 'hubspot' | 'zendesk' | ...
  base_url         text not null default '',   -- override for staging/mock targets
  encrypted        jsonb not null,             -- { iv, tag, data } — AES-256-GCM, base64
  status           text not null default 'configured'
    check (status in ('configured', 'connected', 'error')),
  last_synced_at   timestamptz,
  last_result      jsonb not null default '{}'::jsonb,  -- counts from the last sync
  last_error       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, source_id)
);

create index if not exists connector_credentials_org_idx
  on connector_credentials (organization_id);

alter table connector_credentials enable row level security;
create policy "org members" on connector_credentials for all
  using (organization_id in (select current_org_ids()));

drop trigger if exists connector_credentials_updated_at on connector_credentials;
create trigger connector_credentials_updated_at
  before update on connector_credentials
  for each row execute function set_updated_at();

-- Dedicated org for live-integration testing: connector syncs write
-- here, keeping Halcyon (3333...) demo data untouched.
insert into organizations (id, name)
values ('66666666-6666-6666-6666-666666666666', 'Integration Test')
on conflict (id) do nothing;
