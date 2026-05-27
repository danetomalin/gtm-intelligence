-- Migration 0029: editable positioning statement override on `brands`.
--
-- The S-PO page auto-composes a Dunford-style positioning statement from
-- the five approved elements. That stays the default. But PMMs often want
-- to hand-tune the exact wording for the canonical statement the org
-- rallies behind. This column stores that override.
--
-- Semantics:
--   NULL            -> show the auto-composed statement (derived live)
--   non-null text   -> show this hand-edited statement instead
--
-- "Reset to auto" in the UI sets it back to NULL. The auto-composer never
-- writes here — only an explicit user edit does — so a fresh S-PO run
-- updating the elements won't clobber a hand-tuned statement, and clearing
-- the override re-exposes the (now-updated) auto version.

alter table brands
  add column if not exists positioning_statement text;

comment on column brands.positioning_statement is
  'Hand-edited positioning statement override. NULL = use the auto-composed statement derived from the five positioning_elements at render time.';
