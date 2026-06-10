-- ============================================================
-- 0030: CS Health tables (Phase B of the cs-health merge)
-- Lifted from cs-health-app supabase/migrations/0001_init.sql.
-- organizations / profiles / current_org_ids() / set_updated_at()
-- already exist in this database, so only the 8 health tables land.
-- ============================================================

-- ---------- Core entities ----------

create table accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  external_id text,                          -- CRM id once connectors land
  name text not null,
  csm text,
  arr numeric not null default 0,
  segment text not null check (segment in ('ENT','MM','SMB')),
  stage text not null check (stage in ('Implementation','Launch','Steady State','Renewal Window')),
  sentiment_trend text check (sentiment_trend in ('positive','stable','declining')),
  flags jsonb not null default '{}'::jsonb,             -- tier1/tier2 override flags
  ttv jsonb not null default '{}'::jsonb,               -- daysToFirstValue, valueTrajectory, trajectoryScore
  sentiment jsonb not null default '{}'::jsonb,         -- csmRating, emailResponseTrend, meetingTone, verbatimTheme
  adoption_signals jsonb not null default '{}'::jsonb,  -- userPenetration, featureBreadth, trajectoryNote
  renewal_date date,
  is_first_renewal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index accounts_org_idx on accounts (organization_id);
create unique index accounts_org_external_idx on accounts (organization_id, external_id) where external_id is not null;

-- Raw VAR pillar inputs per account per observation date.
-- One row per scoring run; the engines read the latest row.
create table var_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  account_id uuid not null references accounts (id) on delete cascade,
  as_of date not null,
  value_score int not null check (value_score between 0 and 100),
  adoption_score int not null check (adoption_score between 0 and 100),
  relationship_score int not null check (relationship_score between 0 and 100),
  expansion_inputs jsonb not null default '{}'::jsonb,  -- 7 Section 2A signals
  data_confidence jsonb not null default '{}'::jsonb,   -- score, completeness, recency, sourceDiversity, note
  source text not null default 'manual',                -- manual | csv | connector:<id>
  created_at timestamptz not null default now(),
  unique (account_id, as_of)
);
create index var_metrics_org_idx on var_metrics (organization_id);
create index var_metrics_account_asof_idx on var_metrics (account_id, as_of desc);

-- ---------- Engine outputs (snapshots, computed server-side) ----------

create table health_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  account_id uuid not null references accounts (id) on delete cascade,
  as_of date not null,
  score int not null check (score between 0 and 100),
  band text not null check (band in ('Healthy','At Risk','Critical')),
  tier1 text,
  penalty_reasons jsonb not null default '[]'::jsonb,
  weights jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (account_id, as_of)
);
create index health_snapshots_org_idx on health_score_snapshots (organization_id);
create index health_snapshots_account_asof_idx on health_score_snapshots (account_id, as_of desc);

create table expansion_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  account_id uuid not null references accounts (id) on delete cascade,
  as_of date not null,
  score int not null check (score between 0 and 100),
  band text not null check (band in ('Expansion Ready','Warming','Not Ready')),
  upsell_signal boolean not null default false,
  cross_sell_signal boolean not null default false,
  timing_signal boolean not null default false,
  blocking_factor text,
  components jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (account_id, as_of)
);
create index expansion_scores_org_idx on expansion_scores (organization_id);

create table renewal_forecasts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  account_id uuid not null references accounts (id) on delete cascade,
  as_of date not null,
  likelihood int not null check (likelihood between 0 and 100),
  likelihood_band text not null check (likelihood_band in ('High','Medium','Low')),
  model_component int not null,
  sentiment_component int not null,
  model_weight numeric not null,
  sentiment_weight numeric not null,
  confidence_tier text not null check (confidence_tier in ('model-driven','blended','sentiment-dominant')),
  adjustments jsonb not null default '{}'::jsonb,  -- firstRenewalAdjustment, expansionBoost
  created_at timestamptz not null default now(),
  unique (account_id, as_of)
);
create index renewal_forecasts_org_idx on renewal_forecasts (organization_id);

-- ---------- Churn intelligence (optimization loop ground truth) ----------

create table churn_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  account_id uuid references accounts (id) on delete set null,
  account_name text not null,
  segment text not null,
  arr numeric not null default 0,
  churn_date date not null,
  primary_reason text not null check (primary_reason in ('CR-01','CR-02','CR-03','CR-04','CR-05','CR-06','CR-07')),
  secondary_reason text check (secondary_reason in ('CR-01','CR-02','CR-03','CR-04','CR-05','CR-06','CR-07')),
  health_90d int,
  health_60d int,
  health_30d int,
  csm_notes text,
  missed_signals jsonb not null default '[]'::jsonb,
  learnings text,
  created_at timestamptz not null default now()
);
create index churn_events_org_idx on churn_events (organization_id);

-- ---------- Settings ----------

create table integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  source_id text not null,                  -- matches features/cs-health/lib/integrations.ts ids
  status text not null default 'connected' check (status in ('connected','pending','error','disconnected')),
  config jsonb not null default '{}'::jsonb, -- non-secret connector config; secrets go to Vault later
  connected_at timestamptz not null default now(),
  unique (organization_id, source_id)
);
create index integration_connections_org_idx on integration_connections (organization_id);

create table alert_prefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  profile_id uuid not null references profiles (user_id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,  -- mirrors localStorage AlertPrefs shape
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

-- ---------- RLS ----------

alter table accounts enable row level security;
alter table var_metrics enable row level security;
alter table health_score_snapshots enable row level security;
alter table expansion_scores enable row level security;
alter table renewal_forecasts enable row level security;
alter table churn_events enable row level security;
alter table integration_connections enable row level security;
alter table alert_prefs enable row level security;

create policy "org members" on accounts for all
  using (organization_id in (select current_org_ids()));
create policy "org members" on var_metrics for all
  using (organization_id in (select current_org_ids()));
create policy "org members" on health_score_snapshots for all
  using (organization_id in (select current_org_ids()));
create policy "org members" on expansion_scores for all
  using (organization_id in (select current_org_ids()));
create policy "org members" on renewal_forecasts for all
  using (organization_id in (select current_org_ids()));
create policy "org members" on churn_events for all
  using (organization_id in (select current_org_ids()));
create policy "org members" on integration_connections for all
  using (organization_id in (select current_org_ids()));
create policy "org members" on alert_prefs for all
  using (organization_id in (select current_org_ids()));

-- updated_at trigger for accounts (set_updated_at() already exists)
create trigger accounts_updated_at before update on accounts
  for each row execute function set_updated_at();
