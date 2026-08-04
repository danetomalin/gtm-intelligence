// Hardcoded demo tenant + brand. When real auth/multi-tenancy lands, these
// come from the user's session instead.
// 2026-06-10: pointed at Deputy (workforce management) — the real-world
// analog of the Halcyon CS portfolio, so the marketing brand and the
// customer base finally tell one story. Seeded by scripts/seed-deputy-brand.ts.
// The old Hims brand (81e05ef2-455f-4823-8e41-24ca799ae895) keeps its rows
// in the DB, inert — flip back anytime, or wait for the brand switcher.
export const DEMO_TENANT_ID = "11111111-1111-1111-1111-111111111111";
export const DEMO_BRAND_ID = "55555555-5555-5555-5555-555555555555";
export const DEMO_BRAND_NAME = "Deputy";
export const DEMO_BRAND_WEBSITE = "https://www.deputy.com/";

// CS Health demo tenant: Halcyon, a fictional workforce management
// platform whose 30-account portfolio powers the Customer Health
// workspace. Seeded by scripts/seed-cs-health.ts (migration 0030).
export const DEMO_CS_ORG_ID = "33333333-3333-3333-3333-333333333333";
export const DEMO_CS_BRAND_ID = "44444444-4444-4444-4444-444444444444";
export const DEMO_CS_COMPANY = "Halcyon";

// Live-connector testing org (migration 0036): real HubSpot/Zendesk syncs
// write here so the Halcyon demo portfolio is never touched. Point the
// dashboard at it with CS_HEALTH_ORG_ID env var when verifying.
export const INTEGRATION_TEST_ORG_ID = "66666666-6666-6666-6666-666666666666";
