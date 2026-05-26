-- Migration 0024: broaden pricing_intelligence.pricing_model check.
--
-- Background: during the 2026-05-26 Hims E2E test, R-PP failed on
-- check constraint violation because Gemini generated "subscription" for
-- D2C subscription competitors (Ro, Curology, Keeps, BlueChew) — a
-- perfectly valid pricing model that wasn't in the original enum. Also
-- added "freemium" as another common SaaS pricing pattern. The 0010
-- migration was updated in-place for the source-of-truth, this migration
-- runs the ALTER on existing Supabase instances.

alter table pricing_intelligence
  drop constraint if exists pricing_intelligence_pricing_model_check;

alter table pricing_intelligence
  add constraint pricing_intelligence_pricing_model_check
  check (
    pricing_model is null
    or pricing_model in (
      'tiered','usage','seat','flat','hybrid','custom',
      'subscription','freemium','unknown'
    )
  );
