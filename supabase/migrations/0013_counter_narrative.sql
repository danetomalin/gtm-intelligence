-- Migration 0013: counter_narrative_memos (D-CN output) + HITL columns.
--
-- D-CN is the only autonomous-firing agent in the platform (PLAN §3f). It
-- watches R-MS market_signals and fires when a signal meets the compound
-- trigger rule (Decision #4):
--
--   impact_score >= 8
--   OR (impact_score >= 7 AND sentiment = 'bearish'
--       AND category IN ('competitive_positioning', 'regulatory_watch'))
--
-- D-CN is a Delivery-layer (D-*) agent, so the output table carries the full
-- HITL approval-column set from inception per PLAN §6g (and mirrors what
-- migration 0009 retrofitted onto content_outputs and sales_collateral).

create table if not exists counter_narrative_memos (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,
  triggering_signal_id     uuid references market_signals(id) on delete set null,
  triggering_signal_summary text,
  competitor_named         text,
  category                 text,
  rep_talking_points       text,
  suggested_linkedin_post  text,
  email_reply_template     text,
  positioning_anchor       text,
  sources                  text,
  -- HITL approval columns (mirrors migration 0009 pattern).
  approval_status          text not null default 'pending_review'
    check (approval_status in ('draft','pending_review','needs_revision','approved','published','rejected')),
  risk_tier                text not null default 'medium'
    check (risk_tier in ('low','medium','high')),
  assigned_reviewer_id     uuid references profiles(user_id) on delete set null,
  reviewer_comment         text,
  approved_at              timestamptz,
  approved_by              uuid references auth.users(id) on delete set null,
  published_at             timestamptz,
  created_at               timestamptz not null default now()
);
create index if not exists counter_narrative_memos_brand_id_idx        on counter_narrative_memos (brand_id, created_at desc);
create index if not exists counter_narrative_memos_approval_status_idx on counter_narrative_memos (brand_id, approval_status, created_at desc);
alter table counter_narrative_memos enable row level security;
drop policy if exists counter_narrative_memos_all on counter_narrative_memos;
create policy counter_narrative_memos_all on counter_narrative_memos
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
