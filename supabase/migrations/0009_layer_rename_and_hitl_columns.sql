-- Migration 0009: Layer-prefixed agent rename + HITL approval columns.
--
-- Two changes, bundled because they both ship in Phase 1 and both touch tables
-- that downstream phases will design against (see throughline-app/PLAN.md
-- §3a, §6g):
--
--   1. Backfill run_history.agent_code from A1–A8 → layer-prefixed codes.
--      New codes: R-CI, R-MS, S-RM, R-CF, S-PO, D-MG, S-BC, D-SN.
--      A0 is left untouched (Brand Initializer is not in the rename scope;
--      its eventual replacement is R-BR in Phase 4).
--
--   2. Add HITL approval columns to every existing D-* table
--      (content_outputs from D-MG, sales_collateral from D-SN). New D-* and
--      X-* tables created in later phases must include these columns from
--      inception. Future D-* / X-* migrations must mirror this column set.
--
-- Approval lifecycle (Capability 6 §6a):
--   draft → pending_review → approved → published
--                ↘ needs_revision → reviewer revises → approved
--                ↘ rejected
--
-- Risk tiers (§6b):
--   medium (default for internal-facing)
--   high (default for customer-facing or compliance-sensitive)
--   low (tenant opt-in only, requires explicit allow-list)

-- ============================================================================
-- 1. Agent code rename
-- ============================================================================

update run_history set agent_code = 'R-CI' where agent_code = 'A1';
update run_history set agent_code = 'R-MS' where agent_code = 'A2';
update run_history set agent_code = 'S-RM' where agent_code = 'A3';
update run_history set agent_code = 'R-CF' where agent_code = 'A4';
update run_history set agent_code = 'S-PO' where agent_code = 'A5';
update run_history set agent_code = 'D-MG' where agent_code = 'A6';
update run_history set agent_code = 'S-BC' where agent_code = 'A7';
update run_history set agent_code = 'D-SN' where agent_code = 'A8';

-- ============================================================================
-- 2. HITL columns on content_outputs (D-MG output)
-- ============================================================================

alter table content_outputs
  add column if not exists approval_status      text,
  add column if not exists risk_tier            text,
  add column if not exists assigned_reviewer_id uuid references profiles(user_id) on delete set null,
  add column if not exists reviewer_comment     text,
  add column if not exists approved_at          timestamptz,
  add column if not exists approved_by          uuid references auth.users(id) on delete set null,
  add column if not exists published_at         timestamptz;

-- Existing rows are legacy outputs from before HITL shipped. Treat as
-- approved-but-not-published so they keep rendering normally without
-- back-flooding the Review Queue (Phase 5 UI).
update content_outputs
   set approval_status = 'approved',
       risk_tier       = 'medium'
 where approval_status is null;

alter table content_outputs
  alter column approval_status set default 'pending_review',
  alter column approval_status set not null,
  alter column risk_tier       set default 'medium',
  alter column risk_tier       set not null;

alter table content_outputs
  add constraint content_outputs_approval_status_check
    check (approval_status in ('draft','pending_review','needs_revision','approved','published','rejected'));

alter table content_outputs
  add constraint content_outputs_risk_tier_check
    check (risk_tier in ('low','medium','high'));

-- ============================================================================
-- 3. HITL columns on sales_collateral (D-SN output)
-- ============================================================================

alter table sales_collateral
  add column if not exists approval_status      text,
  add column if not exists risk_tier            text,
  add column if not exists assigned_reviewer_id uuid references profiles(user_id) on delete set null,
  add column if not exists reviewer_comment     text,
  add column if not exists approved_at          timestamptz,
  add column if not exists approved_by          uuid references auth.users(id) on delete set null,
  add column if not exists published_at         timestamptz;

update sales_collateral
   set approval_status = 'approved',
       risk_tier       = 'medium'
 where approval_status is null;

alter table sales_collateral
  alter column approval_status set default 'pending_review',
  alter column approval_status set not null,
  alter column risk_tier       set default 'medium',
  alter column risk_tier       set not null;

alter table sales_collateral
  add constraint sales_collateral_approval_status_check
    check (approval_status in ('draft','pending_review','needs_revision','approved','published','rejected'));

alter table sales_collateral
  add constraint sales_collateral_risk_tier_check
    check (risk_tier in ('low','medium','high'));
