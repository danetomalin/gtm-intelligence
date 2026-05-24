-- Migration 0011: remaining Phase 3 tables.
--
-- Five new tables for the rest of the Phase 3 agent build:
--   R-WL Win/Loss Analyst             → win_loss_analyses
--   R-EV Customer Evidence Curator    → customer_evidence
--   R-PF Product Feedback Synthesizer → product_feedback
--   S-AR Analyst Relations Prep       → analyst_briefings
--   S-LP Launch Planning              → launch_plans
--
-- Plus a placeholder `buyer_personas` row for the Throughline demo tenant so
-- S-LP has something to read before R-BR (Phase 4) ships and populates the
-- table for real (PLAN §3c, §3e). R-BR will upsert these rows on first run.
--
-- All research-layer (R-*) and synthesis-layer (S-*) tables, so no HITL
-- approval columns. Outputs feed downstream D-* agents, not customer-facing.

-- ============================================================================
-- buyer_personas (seeded once here; R-BR upserts in Phase 4)
-- ============================================================================

create table if not exists buyer_personas (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  brand_id          uuid not null references brands(id) on delete cascade,
  persona_name      text not null,
  title             text,
  segment           text,
  pain_points       text,
  goals             text,
  triggers          text,
  watering_holes    text,
  decision_criteria text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists buyer_personas_brand_id_idx on buyer_personas (brand_id, persona_name);
alter table buyer_personas enable row level security;
drop policy if exists buyer_personas_all on buyer_personas;
create policy buyer_personas_all on buyer_personas
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

insert into buyer_personas (organization_id, brand_id, persona_name, title, segment, pain_points, goals, triggers, watering_holes, decision_criteria)
values (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  'Solo PMM Operator',
  'Senior / Lead Product Marketing Manager',
  'Growth-stage SaaS, Series B–D, 50–500 employees',
  'Burdened by week-of-the-month grind (battlecards, signals, positioning refresh) with no team. Output rots the moment they rotate out.',
  'Operationalize the recurring PMM work product. Build a system the next person can pick up without losing context.',
  'New competitor enters; CMO requests refreshed positioning; sales team complains battlecards are stale; preparing for SKO or board update.',
  'Sharebird Slack community, Product Marketing Alliance, LinkedIn PMM thought leaders, Reforge cohort threads.',
  'Time-to-first-value under 1 week; transparent enough to justify replacing 4–6 hours/week of manual work; multi-tenant isolation for an agency or fractional setup.'
)
on conflict do nothing;

-- ============================================================================
-- R-WL: win_loss_analyses
-- ============================================================================

create table if not exists win_loss_analyses (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  brand_id          uuid not null references brands(id) on delete cascade,
  deal_id           text,
  deal_date         date not null default current_date,
  outcome           text check (outcome is null or outcome in ('win','loss','no_decision','closed_lost_to_competitor','closed_lost_to_status_quo')),
  account_name      text,
  account_segment   text,
  account_size      text,
  competitor        text,
  primary_factors   text,
  key_quotes        text,
  patterns_observed text,
  recommendation    text,
  sources           text,
  created_at        timestamptz not null default now()
);
create index if not exists win_loss_analyses_brand_id_idx on win_loss_analyses (brand_id, created_at desc);
alter table win_loss_analyses enable row level security;
drop policy if exists win_loss_analyses_all on win_loss_analyses;
create policy win_loss_analyses_all on win_loss_analyses
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

-- ============================================================================
-- R-EV: customer_evidence
-- ============================================================================

create table if not exists customer_evidence (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,
  customer_name            text,
  customer_segment         text,
  evidence_type            text check (evidence_type is null or evidence_type in ('quote','case_study','metric','nps_verbatim','review','reference_call_note')),
  content                  text not null,
  attribution              text,
  evidence_date            date,
  positioning_alignment    text,
  legal_status             text check (legal_status is null or legal_status in ('approved','pending_legal','anonymize_only','do_not_use')),
  sources                  text,
  created_at               timestamptz not null default now()
);
create index if not exists customer_evidence_brand_id_idx on customer_evidence (brand_id, created_at desc);
alter table customer_evidence enable row level security;
drop policy if exists customer_evidence_all on customer_evidence;
create policy customer_evidence_all on customer_evidence
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

-- ============================================================================
-- R-PF: product_feedback
-- ============================================================================

create table if not exists product_feedback (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,
  source                   text check (source is null or source in ('support_ticket','sales_call','nps_open','user_interview','community','review')),
  feedback_date            date,
  customer_segment         text,
  raw_excerpt              text,
  themed_summary           text,
  linked_roadmap_item_id   uuid references roadmap_items(id) on delete set null,
  severity                 text check (severity is null or severity in ('low','medium','high','critical')),
  recurrence_count         integer check (recurrence_count is null or recurrence_count >= 0),
  recommendation           text,
  sources                  text,
  created_at               timestamptz not null default now()
);
create index if not exists product_feedback_brand_id_idx on product_feedback (brand_id, created_at desc);
create index if not exists product_feedback_severity_idx on product_feedback (brand_id, severity, recurrence_count desc);
alter table product_feedback enable row level security;
drop policy if exists product_feedback_all on product_feedback;
create policy product_feedback_all on product_feedback
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

-- ============================================================================
-- S-AR: analyst_briefings
-- ============================================================================

create table if not exists analyst_briefings (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,
  analyst_firm             text not null,
  analyst_name             text,
  briefing_date            date,
  briefing_type            text check (briefing_type is null or briefing_type in ('initial','update','inquiry','quadrant_input','wave_input')),
  key_messages             text,
  proof_points             text,
  competitor_framing       text,
  questions_likely         text,
  positioning_anchor       text,
  sources                  text,
  created_at               timestamptz not null default now()
);
create index if not exists analyst_briefings_brand_id_idx on analyst_briefings (brand_id, created_at desc);
alter table analyst_briefings enable row level security;
drop policy if exists analyst_briefings_all on analyst_briefings;
create policy analyst_briefings_all on analyst_briefings
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

-- ============================================================================
-- S-LP: launch_plans
-- ============================================================================

create table if not exists launch_plans (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,
  launch_name              text not null,
  launch_type              text check (launch_type is null or launch_type in ('feature','product','announcement','rebrand','pricing_change','partnership')),
  launch_date_target       date,
  target_personas          text,
  messaging_pillars        text,
  channel_plan             text,
  success_metrics          text,
  positioning_anchor       text,
  sources                  text,
  created_at               timestamptz not null default now()
);
create index if not exists launch_plans_brand_id_idx on launch_plans (brand_id, created_at desc);
alter table launch_plans enable row level security;
drop policy if exists launch_plans_all on launch_plans;
create policy launch_plans_all on launch_plans
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
