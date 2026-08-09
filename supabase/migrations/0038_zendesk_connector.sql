-- ============================================================
-- Migration 0038: Zendesk connector prerequisites.
-- (design: docs/zendesk-connector-design.md)
--
-- 1. accounts.domain — the cross-source join key. HubSpot's API
--    returns it but the sync previously dropped it; Zendesk orgs
--    join to accounts on this column.
-- 2. connector_sync_state — generic cursor persistence (Dimension
--    3): stateful sources (Zendesk incremental exports) store a
--    cursor per stream; stateless sources never write here.
-- 3. 'syncing' status — in-flight guard for sync-all/cron.
-- ============================================================

alter table accounts add column if not exists domain text;
create index if not exists accounts_org_domain_idx
  on accounts (organization_id, domain);

create table if not exists connector_sync_state (
  organization_id  uuid not null references organizations(id) on delete cascade,
  source_id        text not null,
  stream           text not null,               -- e.g. 'tickets'
  cursor           text not null,
  updated_at       timestamptz not null default now(),
  primary key (organization_id, source_id, stream)
);

alter table connector_sync_state enable row level security;
create policy "org members" on connector_sync_state for all
  using (organization_id in (select current_org_ids()));

alter table connector_credentials
  drop constraint if exists connector_credentials_status_check;
alter table connector_credentials
  add constraint connector_credentials_status_check
  check (status in ('configured', 'syncing', 'connected', 'error'));
