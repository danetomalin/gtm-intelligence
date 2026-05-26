-- Migration 0025: BEFORE INSERT/UPDATE triggers that unwrap JSON-encoded
-- strings into proper jsonb arrays/objects.
--
-- Background: n8n's $fromAI() returns a JSON string when the agent generates
-- a complex value (array of objects, nested object). When the supabaseTool
-- node passes that string into a jsonb column, Postgres stores it as a jsonb
-- STRING rather than parsing it. The UI then crashes when components call
-- .map() / .length on what looks like an array but is actually a string.
--
-- We were patching this per-card in the frontend (R-CR cohort, R-VC pains,
-- R-PP tiers) but the structural fix lives in the DB: unwrap on write, once
-- and for all, brand-agnostic, future-proof. Future n8n workflows can write
-- string-encoded jsonb and the DB transparently lands on the right shape.
--
-- Affected tables and columns identified by jsonb_typeof(col) = 'string'
-- inspection on 2026-05-26.

-- Shared helper: if val is a jsonb scalar string, parse it; otherwise return
-- it untouched. Try/catch so malformed strings don't break the insert.
create or replace function unwrap_jsonb_string(val jsonb) returns jsonb as $$
begin
  if val is null then return null; end if;
  if jsonb_typeof(val) = 'string' then
    begin
      return (val #>> '{}')::jsonb;
    exception when others then
      return val;
    end;
  end if;
  return val;
end;
$$ language plpgsql immutable;

-- pricing_intelligence.tiers
create or replace function unwrap_pricing_intelligence_jsonb() returns trigger as $$
begin
  NEW.tiers := unwrap_jsonb_string(NEW.tiers);
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists unwrap_pricing_intelligence_jsonb_trg on pricing_intelligence;
create trigger unwrap_pricing_intelligence_jsonb_trg
  before insert or update on pricing_intelligence
  for each row execute function unwrap_pricing_intelligence_jsonb();

-- super_user_cohorts.cohort_accounts, excluded_accounts, filter_criteria
create or replace function unwrap_super_user_cohorts_jsonb() returns trigger as $$
begin
  NEW.cohort_accounts   := unwrap_jsonb_string(NEW.cohort_accounts);
  NEW.excluded_accounts := unwrap_jsonb_string(NEW.excluded_accounts);
  NEW.filter_criteria   := unwrap_jsonb_string(NEW.filter_criteria);
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists unwrap_super_user_cohorts_jsonb_trg on super_user_cohorts;
create trigger unwrap_super_user_cohorts_jsonb_trg
  before insert or update on super_user_cohorts
  for each row execute function unwrap_super_user_cohorts_jsonb();

-- voc_extractions.top_pains, pain_vocabulary, compelling_events, buying_committee
create or replace function unwrap_voc_extractions_jsonb() returns trigger as $$
begin
  NEW.top_pains         := unwrap_jsonb_string(NEW.top_pains);
  NEW.pain_vocabulary   := unwrap_jsonb_string(NEW.pain_vocabulary);
  NEW.compelling_events := unwrap_jsonb_string(NEW.compelling_events);
  NEW.buying_committee  := unwrap_jsonb_string(NEW.buying_committee);
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists unwrap_voc_extractions_jsonb_trg on voc_extractions;
create trigger unwrap_voc_extractions_jsonb_trg
  before insert or update on voc_extractions
  for each row execute function unwrap_voc_extractions_jsonb();

-- customer_enrichment.firmographic_clusters, technographic_signals, trigger_signals, enrichment_sources
create or replace function unwrap_customer_enrichment_jsonb() returns trigger as $$
begin
  NEW.firmographic_clusters := unwrap_jsonb_string(NEW.firmographic_clusters);
  NEW.technographic_signals := unwrap_jsonb_string(NEW.technographic_signals);
  NEW.trigger_signals       := unwrap_jsonb_string(NEW.trigger_signals);
  NEW.enrichment_sources    := unwrap_jsonb_string(NEW.enrichment_sources);
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists unwrap_customer_enrichment_jsonb_trg on customer_enrichment;
create trigger unwrap_customer_enrichment_jsonb_trg
  before insert or update on customer_enrichment
  for each row execute function unwrap_customer_enrichment_jsonb();

-- icp_definitions.anti_icp, buying_committee, firmographics, primary_pains, technographics, trigger_signals
create or replace function unwrap_icp_definitions_jsonb() returns trigger as $$
begin
  NEW.anti_icp         := unwrap_jsonb_string(NEW.anti_icp);
  NEW.buying_committee := unwrap_jsonb_string(NEW.buying_committee);
  NEW.firmographics    := unwrap_jsonb_string(NEW.firmographics);
  NEW.primary_pains    := unwrap_jsonb_string(NEW.primary_pains);
  NEW.technographics   := unwrap_jsonb_string(NEW.technographics);
  NEW.trigger_signals  := unwrap_jsonb_string(NEW.trigger_signals);
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists unwrap_icp_definitions_jsonb_trg on icp_definitions;
create trigger unwrap_icp_definitions_jsonb_trg
  before insert or update on icp_definitions
  for each row execute function unwrap_icp_definitions_jsonb();

-- daily_briefs.focus_items, platform_snapshot
create or replace function unwrap_daily_briefs_jsonb() returns trigger as $$
begin
  NEW.focus_items       := unwrap_jsonb_string(NEW.focus_items);
  NEW.platform_snapshot := unwrap_jsonb_string(NEW.platform_snapshot);
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists unwrap_daily_briefs_jsonb_trg on daily_briefs;
create trigger unwrap_daily_briefs_jsonb_trg
  before insert or update on daily_briefs
  for each row execute function unwrap_daily_briefs_jsonb();
