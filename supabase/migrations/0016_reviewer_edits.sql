-- Migration 0016: reviewer_edits — captures reviewer edits-as-feedback.
--
-- The full edit-in-place editor lands later (UI build). This table is the
-- schema half so:
--   1. The agent prompts can already include "read recent reviewer_edits"
--      logic when we get there.
--   2. The /api/approvals route can append a reviewer_edits row whenever a
--      reviewer rejects or requests-revision with a comment — partial signal
--      until verbatim diffs land.
--   3. Phase 7's observability dashboard reads edit counts per agent code.

create table if not exists reviewer_edits (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  brand_id        uuid not null references brands(id) on delete cascade,
  artifact_table  text not null check (artifact_table in ('content_outputs','sales_collateral','counter_narrative_memos','enablement_assets')),
  artifact_id     uuid not null,
  agent_code      text,
  reviewer_id     uuid references auth.users(id) on delete set null,
  edit_type       text not null check (edit_type in ('comment','diff','rejection','revision_request')),
  comment         text,
  diff_before     text,
  diff_after      text,
  patterns_jsonb  jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists reviewer_edits_artifact_idx   on reviewer_edits (artifact_table, artifact_id);
create index if not exists reviewer_edits_agent_code_idx on reviewer_edits (brand_id, agent_code, created_at desc);
alter table reviewer_edits enable row level security;
drop policy if exists reviewer_edits_all on reviewer_edits;
create policy reviewer_edits_all on reviewer_edits
  for all using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
