-- Migration 0003: Seed Throughline's competitive landscape so A1 has competitors
-- to iterate over. A1 produces one dossier per row in brand_competitors.

do $$
begin
  if not exists (
    select 1 from brand_competitors
    where brand_id = '22222222-2222-2222-2222-222222222222'
  ) then
    insert into brand_competitors
      (organization_id, brand_id, name, domain, keywords, tracking_categories, latest_messaging, latest_pricing_summary, latest_product_state, risk_level)
    values
      (
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        'Crayon',
        'crayon.co',
        'competitive intelligence, battlecards, sales enablement, signal capture',
        'Positioning, Pricing, Product, Talent',
        'AI-powered competitive intelligence platform that captures, analyzes, and shares competitor activity to enable sales teams.',
        'Tiered SaaS: Starter ~$11k/yr, Pro ~$25k/yr, Enterprise custom.',
        'Web tracking, slack-based battlecard delivery, recent push into AI-summarized signals.',
        'MEDIUM'
      ),
      (
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        'Klue',
        'klue.com',
        'sales battlecards, win/loss, CRM integration, competitive enablement',
        'Positioning, Pricing, Product, Talent',
        'Competitive enablement built for revenue teams — the battlecard tool sales reps actually use.',
        'Enterprise pricing only; quotes typically $25k–$80k/yr.',
        'Deep Salesforce integration, AI-assisted battlecard generation, win/loss workflow.',
        'MEDIUM'
      ),
      (
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        'Kompyte',
        'kompyte.com',
        'competitor monitoring, web scraping, change detection, sales alerts',
        'Positioning, Product',
        'Automated competitor tracking across web, social, and ads.',
        'Mid-market SaaS pricing, ~$10k–$20k/yr.',
        'Crawler-first signal capture, lighter on synthesis.',
        'LOW'
      ),
      (
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        'In-house PMM toolchain',
        '',
        'spreadsheets, Notion, Loom, ad-hoc battlecards, owner-dependent workflows',
        'Positioning, Messaging, Battlecards',
        'Owner-dependent ad-hoc CI work product built in Notion + Slack threads.',
        'Effectively the cost of a PMM rotation — one rebuilds every ~18 months.',
        'Notion wiki + Slack + occasional Loom. Resets when the PMM rotates.',
        'HIGH'
      );
  end if;
end $$;
