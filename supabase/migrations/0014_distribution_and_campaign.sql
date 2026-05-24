-- Migration 0014: Phase 6A — Cap 4 Distribution + S-CP Campaign Performance.
--
-- Four new tables that together carry the closed-loop story:
--   distribution_channels  — per-tenant channel configuration + live/mock mode
--   campaign_sends         — what was distributed, to whom, via which channel
--   campaign_metrics       — opens / clicks / replies / conversions per send
--   campaign_performance   — S-CP's per-segment / per-theme rollups
--
-- Mock-first pattern per PLAN §4d. Resend (X-EM) and Slack (X-SL) are easy to
-- run live from day one; LinkedIn / Outreach / Apollo ship as mock by default
-- and swap to live when API credentials arrive. The `source` column on
-- campaign_sends + campaign_metrics flags mock vs live rows so reviewers and
-- S-CP can include / exclude as needed.

-- ============================================================================
-- distribution_channels — per-tenant channel config
-- ============================================================================

create table if not exists distribution_channels (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references organizations(id) on delete cascade,
  brand_id             uuid not null references brands(id) on delete cascade,
  channel_type         text not null check (channel_type in ('resend','linkedin','outreach','apollo','slack')),
  display_name         text,
  mode                 text not null default 'mock' check (mode in ('live','mock')),
  credentials_encrypted text,
  configured_at        timestamptz not null default now(),
  last_used_at         timestamptz,
  unique (brand_id, channel_type)
);
alter table distribution_channels enable row level security;
drop policy if exists distribution_channels_all on distribution_channels;
create policy distribution_channels_all on distribution_channels
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

-- Seed the four primary external channels for the Throughline demo tenant in
-- mock mode. Tenants can flip to live + paste credentials via admin settings.
insert into distribution_channels (organization_id, brand_id, channel_type, display_name, mode)
values
  ('11111111-1111-1111-1111-111111111111'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'resend',   'Resend Email',     'mock'),
  ('11111111-1111-1111-1111-111111111111'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'linkedin', 'LinkedIn Queue',   'mock'),
  ('11111111-1111-1111-1111-111111111111'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'outreach', 'Outreach.io',      'mock'),
  ('11111111-1111-1111-1111-111111111111'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'apollo',   'Apollo.io',        'mock')
on conflict (brand_id, channel_type) do nothing;

-- ============================================================================
-- campaign_sends — every distribution event, real or mock
-- ============================================================================

create table if not exists campaign_sends (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  brand_id            uuid not null references brands(id) on delete cascade,
  channel_type        text not null check (channel_type in ('resend','linkedin','outreach','apollo','slack')),
  source              text not null default 'mock' check (source in ('live','mock')),
  artifact_table      text not null check (artifact_table in ('content_outputs','sales_collateral','counter_narrative_memos')),
  artifact_id         uuid not null,
  audience_descriptor text,
  audience_size       integer check (audience_size is null or audience_size >= 0),
  external_send_id    text,
  status              text not null default 'sent' check (status in ('queued','sent','sent_mock','failed','cancelled')),
  sent_at             timestamptz not null default now(),
  error_message       text
);
create index if not exists campaign_sends_brand_id_idx     on campaign_sends (brand_id, sent_at desc);
create index if not exists campaign_sends_artifact_idx     on campaign_sends (artifact_table, artifact_id);
create index if not exists campaign_sends_channel_type_idx on campaign_sends (brand_id, channel_type, sent_at desc);
alter table campaign_sends enable row level security;
drop policy if exists campaign_sends_all on campaign_sends;
create policy campaign_sends_all on campaign_sends
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

-- ============================================================================
-- campaign_metrics — per-send engagement events
-- ============================================================================

create table if not exists campaign_metrics (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  brand_id        uuid not null references brands(id) on delete cascade,
  send_id         uuid not null references campaign_sends(id) on delete cascade,
  source          text not null default 'mock' check (source in ('live','mock')),
  event_type      text not null check (event_type in ('delivered','opened','clicked','replied','converted','bounced','unsubscribed','spam')),
  event_at        timestamptz not null default now(),
  recipient_hash  text,
  metadata        jsonb
);
create index if not exists campaign_metrics_send_id_idx    on campaign_metrics (send_id, event_at desc);
create index if not exists campaign_metrics_brand_id_idx   on campaign_metrics (brand_id, event_type, event_at desc);
alter table campaign_metrics enable row level security;
drop policy if exists campaign_metrics_all on campaign_metrics;
create policy campaign_metrics_all on campaign_metrics
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

-- ============================================================================
-- campaign_performance — S-CP rollups that feed the closed loop
-- ============================================================================

create table if not exists campaign_performance (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,
  scope                    text check (scope is null or scope in ('messaging_theme','channel','persona','positioning_element','overall')),
  scope_value              text,
  window_label             text,
  sends_count              integer,
  open_rate_pct            numeric(5,2),
  click_through_rate_pct   numeric(5,2),
  reply_rate_pct           numeric(5,2),
  attributed_pipeline_usd  numeric(14,2),
  outperforms_baseline_pct numeric(6,2),
  winning_theme            text,
  losing_theme             text,
  narrative               text,
  recommendation           text,
  sources                  text,
  created_at               timestamptz not null default now()
);
create index if not exists campaign_performance_brand_id_idx on campaign_performance (brand_id, created_at desc);
alter table campaign_performance enable row level security;
drop policy if exists campaign_performance_all on campaign_performance;
create policy campaign_performance_all on campaign_performance
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
