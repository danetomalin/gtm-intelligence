-- Migration 0027: deployment_assessments + deployment_formats tables.
--
-- Two-agent pipeline turning an approved Collateral Library artifact into
-- shippable deployment formats (one-pager, slide deck, email sequence,
-- LinkedIn post, etc.):
--
--   D-DA (Deployment Assessor): reads an approved source artifact + brand
--     context + personas + positioning. Recommends WHICH formats fit, with
--     a fit score and rationale per format. Lands in pending_review so the
--     PMM picks which to actually produce.
--
--   D-DP (Deployment Producer): fires per format the user approves. Reads
--     the assessment + source artifact + brand context. Generates the
--     structured content for that specific format. Lands in pending_review.
--     Approved rows show up in the unified Collateral Library alongside
--     source artifacts, with lineage back to the source preserved.
--
-- "Source artifact" is one of: content_outputs (D-MG), sales_collateral
-- (D-SN), counter_narrative_memos (D-CN), enablement_assets (D-OB/QB/HP/
-- WW/XP/RT). Polymorphic by (source_artifact_table, source_artifact_id)
-- since we can't FK across all four.

-- ============================================================================
-- deployment_assessments
-- ============================================================================
create table if not exists deployment_assessments (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,

  -- Source artifact (polymorphic FK). The combination of table + id
  -- uniquely identifies the approved Library row this assessment is for.
  source_artifact_table    text not null
    check (source_artifact_table in (
      'content_outputs',
      'sales_collateral',
      'counter_narrative_memos',
      'enablement_assets'
    )),
  source_artifact_id       uuid not null,

  -- The recommendation payload. Each entry:
  --   { format, audience, channel, fit_score (0-10), rationale, priority }
  -- format is one of: one_pager, slide_deck, email_sequence, linkedin_post,
  --   linkedin_carousel, video_script, faq, infographic
  recommended_formats      jsonb not null default '[]'::jsonb,

  -- Formats the agent considered but ruled out, with why. Surfacing this
  -- lets the reviewer challenge the agent's reasoning instead of silently
  -- under-fanning a high-value source.
  skipped_formats          jsonb not null default '[]'::jsonb,

  -- Free-text "what would I want to know" — typically a one-line summary
  -- of the strongest deployment opportunity.
  headline                 text,
  rationale                text,

  -- HITL state machine (matches Cap 6 pattern)
  approval_status          text not null default 'pending_review'
    check (approval_status in (
      'draft','pending_review','approved','needs_revision','rejected','published'
    )),
  risk_tier                text not null default 'medium'
    check (risk_tier in ('low','medium','high')),
  reviewer_comment         text,
  approved_by              uuid references profiles(user_id) on delete set null,
  approved_at              timestamptz,
  published_at             timestamptz,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists deployment_assessments_brand_idx
  on deployment_assessments (brand_id, created_at desc);

create index if not exists deployment_assessments_source_idx
  on deployment_assessments (source_artifact_table, source_artifact_id);

create index if not exists deployment_assessments_pending_idx
  on deployment_assessments (brand_id, approval_status)
  where approval_status in ('pending_review','needs_revision');

alter table deployment_assessments enable row level security;

create policy deployment_assessments_all on deployment_assessments
  for all
  using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

drop trigger if exists deployment_assessments_set_updated_at on deployment_assessments;
create trigger deployment_assessments_set_updated_at
  before update on deployment_assessments
  for each row execute function set_updated_at();

-- ============================================================================
-- deployment_formats
-- ============================================================================
create table if not exists deployment_formats (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,

  -- Lineage. The assessment is optional (allows direct format generation in
  -- the future) but the source link is required so the Library can render
  -- "derived from X" on every fork.
  assessment_id            uuid references deployment_assessments(id) on delete set null,
  source_artifact_table    text not null
    check (source_artifact_table in (
      'content_outputs',
      'sales_collateral',
      'counter_narrative_memos',
      'enablement_assets'
    )),
  source_artifact_id       uuid not null,

  -- Format type. Each format renders with its own card and (eventually)
  -- generates an actual file via a downstream skill (pptx, pdf, docx).
  format_type              text not null
    check (format_type in (
      'one_pager',
      'slide_deck',
      'email_sequence',
      'linkedin_post',
      'linkedin_carousel',
      'video_script',
      'faq',
      'infographic'
    )),

  title                    text,

  -- Structured body. Shape depends on format_type. Examples:
  --   one_pager:        { sections: [{heading, body}], cta }
  --   slide_deck:       { slides: [{title, bullets[], speaker_notes, image_prompt}] }
  --   email_sequence:   { emails: [{subject, preview, body, send_after_days}] }
  --   linkedin_post:    { hook, body, cta, hashtags[] }
  --   linkedin_carousel:{ slides: [{title, body, image_prompt}], caption }
  --   video_script:     { scenes: [{visual, voiceover, duration_sec}] }
  --   faq:              { qa_pairs: [{q, a}] }
  --   infographic:      { sections: [{kind, headline, datapoint, visual_prompt}] }
  body_json                jsonb not null default '{}'::jsonb,

  -- Plain-text fallback for previews / search.
  body_markdown            text,

  -- Generated file pointer (populated by a later render step — pptx skill,
  -- pdf skill, etc). Null until rendering happens.
  rendered_file_url        text,
  rendered_file_kind       text,

  -- Audience / channel hints carried forward from the assessment so the
  -- distribution adapters (X-EM, X-LI, X-OR, X-AP) can route correctly.
  audience                 text,
  channel                  text,

  -- HITL state machine
  approval_status          text not null default 'pending_review'
    check (approval_status in (
      'draft','pending_review','approved','needs_revision','rejected','published'
    )),
  risk_tier                text not null default 'medium'
    check (risk_tier in ('low','medium','high')),
  reviewer_comment         text,
  approved_by              uuid references profiles(user_id) on delete set null,
  approved_at              timestamptz,
  published_at             timestamptz,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists deployment_formats_brand_idx
  on deployment_formats (brand_id, created_at desc);

create index if not exists deployment_formats_source_idx
  on deployment_formats (source_artifact_table, source_artifact_id);

create index if not exists deployment_formats_assessment_idx
  on deployment_formats (assessment_id);

create index if not exists deployment_formats_pending_idx
  on deployment_formats (brand_id, approval_status)
  where approval_status in ('pending_review','needs_revision');

create index if not exists deployment_formats_published_idx
  on deployment_formats (brand_id, approval_status)
  where approval_status in ('approved','published');

alter table deployment_formats enable row level security;

create policy deployment_formats_all on deployment_formats
  for all
  using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

drop trigger if exists deployment_formats_set_updated_at on deployment_formats;
create trigger deployment_formats_set_updated_at
  before update on deployment_formats
  for each row execute function set_updated_at();

-- Apply the jsonb-string unwrap trigger from migration 0025 to body_json
-- so Gemini's $fromAI artifacts don't break the UI.
create or replace function unwrap_deployment_formats_jsonb() returns trigger as $$
begin
  NEW.body_json := unwrap_jsonb_string(NEW.body_json);
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists unwrap_deployment_formats_jsonb_trg on deployment_formats;
create trigger unwrap_deployment_formats_jsonb_trg
  before insert or update on deployment_formats
  for each row execute function unwrap_deployment_formats_jsonb();

-- Same protection for deployment_assessments.recommended_formats /
-- skipped_formats (both are jsonb arrays Gemini will write via $fromAI).
create or replace function unwrap_deployment_assessments_jsonb() returns trigger as $$
begin
  NEW.recommended_formats := unwrap_jsonb_string(NEW.recommended_formats);
  NEW.skipped_formats     := unwrap_jsonb_string(NEW.skipped_formats);
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists unwrap_deployment_assessments_jsonb_trg on deployment_assessments;
create trigger unwrap_deployment_assessments_jsonb_trg
  before insert or update on deployment_assessments
  for each row execute function unwrap_deployment_assessments_jsonb();
