-- Migration 0019: product_cost_model table for R-PP gross margin context.
--
-- R-PP today snapshots competitor pricing without any profitability lens.
-- This table captures the customer's own per-tier cost of goods sold so
-- R-PP can compute gross margin, flag pricing changes that breach the floor,
-- and compare against competitor margin estimates (which come in Phase B).
--
-- Decisions (2026-05-26):
-- - Granularity: per pricing tier ('Free' / 'Pro' / 'Enterprise' style)
-- - Payment processing is treated as a variable COGS component
-- - Margin floor is per-tier (Free can run negative, Enterprise floors high)
-- - PMM enters COGS manually via onboarding; integration with Stripe + cloud
--   billing APIs is a v2 / Phase B+ concern
--
-- gross_margin_pct is a STORED generated column so the value stays consistent
-- with the inputs without trigger maintenance. The formula:
--   ((price - sum(per-unit COGS) - (price * payments_pct)) / price) * 100

create table if not exists product_cost_model (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  brand_id                 uuid not null references brands(id) on delete cascade,

  tier_name                text not null,
  tier_order               integer not null default 0,   -- display order on the cost-model page

  -- Variable cost components, USD per active user per month
  cogs_compute_usd         numeric(10,4) not null default 0,   -- hosting / Vercel / Supabase compute
  cogs_storage_usd         numeric(10,4) not null default 0,   -- storage allocation
  cogs_llm_usd             numeric(10,4) not null default 0,   -- AI / LLM token cost
  cogs_third_party_usd     numeric(10,4) not null default 0,   -- external APIs / data feeds
  cogs_payments_pct        numeric(6,4) not null default 0.029, -- payment processing rate (e.g. Stripe 2.9%)
  cogs_payments_fixed_usd  numeric(10,4) not null default 0.30, -- per-transaction fixed fee
  cogs_support_usd         numeric(10,4) not null default 0,   -- customer support allocation
  cogs_other_usd           numeric(10,4) not null default 0,   -- misc / unallocated variable

  -- Pricing
  list_price_usd           numeric(10,2) not null default 0,    -- list price per user/mo
  effective_price_usd      numeric(10,2) not null default 0,    -- after typical discounting

  -- Computed gross margin percentage. STORED so we can index/order by it.
  -- Returns NULL when price is zero (Free tier) so we don't divide by zero.
  gross_margin_pct numeric(6,2) generated always as (
    case
      when effective_price_usd > 0 then
        round(
          (
            (
              effective_price_usd
              - cogs_compute_usd
              - cogs_storage_usd
              - cogs_llm_usd
              - cogs_third_party_usd
              - cogs_support_usd
              - cogs_other_usd
              - (effective_price_usd * cogs_payments_pct)
              - cogs_payments_fixed_usd
            ) / effective_price_usd
          ) * 100,
          2
        )
      else null
    end
  ) stored,

  -- Floor below which a pricing change should be flagged. Per-tier.
  margin_floor_pct         numeric(5,2),

  notes                    text,
  effective_date           date not null default current_date,

  created_by               uuid references profiles(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  unique (brand_id, tier_name)
);

create index if not exists product_cost_model_brand_idx
  on product_cost_model (brand_id, tier_order);

alter table product_cost_model enable row level security;

create policy product_cost_model_all on product_cost_model
  for all
  using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

-- Keep updated_at fresh
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists product_cost_model_set_updated_at on product_cost_model;
create trigger product_cost_model_set_updated_at
  before update on product_cost_model
  for each row execute function set_updated_at();
