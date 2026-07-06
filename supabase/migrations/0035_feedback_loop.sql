-- Migration 0035: the output→input feedback loop (BACKLOG item 1).
--
-- Two tables + one column:
--   workflow_feedback — verdicts + comments on artifacts. status 'new'
--     feedback rides the next run's context verbatim ("USER FEEDBACK —
--     must respect") until it is applied or dismissed.
--   brand_learnings — layer 5 of the brand code: durable operating
--     learnings promoted from feedback (or performance, later).
--     Active learnings reach EVERY workflow run. Artifacts are
--     hypotheses; brand code is accepted truth; feedback/approval are
--     the promotion gates.
--   brand_competitors.active — structured feedback action: "that's not
--     a competitor" deactivates the row instead of becoming prompt text.

-- ---------- workflow_feedback ----------
create table if not exists workflow_feedback (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  brand_id         uuid references brands(id) on delete cascade,
  workflow_code    text not null,
  artifact_table   text,
  artifact_id      uuid,
  verdict          text not null check (verdict in ('keep', 'not_relevant', 'needs_change')),
  comment          text not null default '',
  -- Where the feedback should apply: this workflow's behavior, or the
  -- brand itself (candidate for promotion into the brand code).
  scope            text not null default 'workflow' check (scope in ('workflow', 'brand')),
  status           text not null default 'new' check (status in ('new', 'applied', 'dismissed')),
  applied_via      text check (applied_via is null or applied_via in ('structured_action', 'brand_learning', 'instructions', 'dismissed')),
  created_by       text not null default '',
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz
);

create index if not exists workflow_feedback_code_idx
  on workflow_feedback (organization_id, workflow_code, status);
create index if not exists workflow_feedback_artifact_idx
  on workflow_feedback (artifact_table, artifact_id);

alter table workflow_feedback enable row level security;
create policy "org members" on workflow_feedback for all
  using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

-- ---------- brand_learnings (brand code, layer 5) ----------
create table if not exists brand_learnings (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  brand_id         uuid not null references brands(id) on delete cascade,
  statement        text not null,
  -- Which brand-code layer the learning belongs to.
  layer            text not null default 'operating'
    check (layer in ('identity', 'strategy', 'market', 'customer', 'operating')),
  source           text not null default 'feedback'
    check (source in ('feedback', 'performance', 'approval_pattern', 'manual')),
  confidence       text not null default 'confirmed'
    check (confidence in ('confirmed', 'probable', 'tentative')),
  -- Provenance back to what taught us this.
  evidence_table   text,
  evidence_id      uuid,
  active           boolean not null default true,
  created_by       text not null default '',
  created_at       timestamptz not null default now()
);

create index if not exists brand_learnings_brand_idx
  on brand_learnings (organization_id, brand_id, active);

alter table brand_learnings enable row level security;
create policy "org members" on brand_learnings for all
  using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

-- ---------- competitor deactivation (structured feedback action) ----------
alter table brand_competitors
  add column if not exists active boolean not null default true;
