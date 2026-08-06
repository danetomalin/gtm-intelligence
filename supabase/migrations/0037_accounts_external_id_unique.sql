-- ============================================================
-- Migration 0037: make the accounts (organization_id, external_id)
-- index a FULL unique index.
--
-- 0030 created it as a partial index (WHERE external_id IS NOT
-- NULL). Postgres ON CONFLICT cannot target a partial index via
-- PostgREST/supabase-js (there's no way to supply the predicate),
-- so the HubSpot connector's account upsert fails with "no unique
-- or exclusion constraint matching the ON CONFLICT specification".
--
-- A full unique index behaves identically for our data: Postgres
-- treats NULLs as distinct, so manual/seeded accounts with NULL
-- external_id remain unrestricted.
-- ============================================================

drop index if exists accounts_org_external_idx;
create unique index accounts_org_external_idx
  on accounts (organization_id, external_id);
