// ============================================================
// Seed Deputy as the active demo brand (replaces Hims).
// Run: node_modules/.bin/jiti scripts/seed-deputy-brand.ts
// Idempotent upserts. Hims rows stay in the DB under their old
// brand_id (inert, recoverable) — the app pointer moves to Deputy
// via demo-context.ts.
// ============================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEMO_TENANT_ID = "11111111-1111-1111-1111-111111111111";
export const DEPUTY_BRAND_ID = "55555555-5555-5555-5555-555555555555";

const COMPETITORS = [
  {
    name: "When I Work",
    domain: "wheniwork.com",
    keywords: "employee scheduling, time clock, shift planning, SMB",
    risk_level: "HIGH",
  },
  {
    name: "Homebase",
    domain: "joinhomebase.com",
    keywords: "free scheduling, time tracking, small business, payroll",
    risk_level: "HIGH",
  },
  {
    name: "7shifts",
    domain: "7shifts.com",
    keywords: "restaurant scheduling, labor compliance, tip pooling",
    risk_level: "MEDIUM",
  },
  {
    name: "Legion",
    domain: "legion.co",
    keywords: "AI workforce management, demand forecasting, enterprise retail",
    risk_level: "MEDIUM",
  },
  {
    name: "Workforce.com",
    domain: "workforce.com",
    keywords: "workforce management, wage compliance, scheduling",
    risk_level: "MEDIUM",
  },
  {
    name: "UKG Ready",
    domain: "ukg.com",
    keywords: "HCM suite, workforce management, enterprise, payroll",
    risk_level: "LOW",
  },
];

function env(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

async function main() {
  const e = env();
  const supa = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: orgRow, error: orgErr } = await supa
    .from("organizations").select("created_by").limit(1).single();
  if (orgErr) throw orgErr;

  const { error: brandErr } = await supa.from("brands").upsert(
    {
      id: DEPUTY_BRAND_ID,
      organization_id: DEMO_TENANT_ID,
      name: "Deputy",
      website_url: "https://www.deputy.com/",
      additional_context:
        "Deputy is a workforce management platform for shift-based and hourly teams: employee scheduling, time & attendance, demand-based labor forecasting, and wage/hour compliance (including fair-workweek regulations). Customers span hospitality, retail, healthcare, manufacturing, and services, from SMB to enterprise. Key competitors: When I Work and Homebase (SMB scheduling), 7shifts (restaurant vertical), Legion (AI-driven enterprise WFM), Workforce.com, and UKG Ready (enterprise HCM suites). Differentiation pressure points: ease of use vs enterprise depth, compliance automation, demand forecasting accuracy, and integrations with payroll/POS ecosystems.",
      created_by: orgRow.created_by,
    },
    { onConflict: "id" },
  );
  if (brandErr) throw brandErr;

  // Replace the competitor set for Deputy (idempotent: delete + insert).
  const del = await supa.from("brand_competitors").delete().eq("brand_id", DEPUTY_BRAND_ID);
  if (del.error) throw del.error;
  const { error: compErr } = await supa.from("brand_competitors").insert(
    COMPETITORS.map((c) => ({
      organization_id: DEMO_TENANT_ID,
      brand_id: DEPUTY_BRAND_ID,
      ...c,
    })),
  );
  if (compErr) throw compErr;

  console.log(`Seeded Deputy brand (${DEPUTY_BRAND_ID}) with ${COMPETITORS.length} competitors.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
