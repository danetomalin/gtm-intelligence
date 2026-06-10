// Hardcoded demo tenant + brand. Matches the seed in supabase/migrations/0002.
// When real auth/multi-tenancy lands, these come from the user's session instead.
// Pointed at the Hims brand created via the /onboarding form on 2026-05-26 so
// the live dashboard renders the full E2E pipeline output (150+ rows across
// 27 tables). Swap back to the Throughline seed (22222222-...) if you want
// the empty-state demo, or to any other brand_id once a brand switcher lands.
export const DEMO_TENANT_ID = "11111111-1111-1111-1111-111111111111";
export const DEMO_BRAND_ID = "81e05ef2-455f-4823-8e41-24ca799ae895";
export const DEMO_BRAND_NAME = "Hims";
export const DEMO_BRAND_WEBSITE = "https://www.hims.com/";

// CS Health demo tenant: Halcyon, a fictional workforce management
// platform whose 30-account portfolio powers the Customer Health
// workspace. Seeded by scripts/seed-cs-health.ts (migration 0030).
export const DEMO_CS_ORG_ID = "33333333-3333-3333-3333-333333333333";
export const DEMO_CS_BRAND_ID = "44444444-4444-4444-4444-444444444444";
export const DEMO_CS_COMPANY = "Halcyon";
