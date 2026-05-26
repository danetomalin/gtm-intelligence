import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID, DEMO_TENANT_ID } from "@/lib/demo-context";

// Cost-model CRUD for the active brand. POST upserts every tier in one shot
// (the onboarding form is "save the whole set", not row-by-row). GET returns
// the current tiers ordered for display.
//
// Auth: demo-mode bypass is in effect platform-wide; multi-tenant scope comes
// via DEMO_BRAND_ID + DEMO_TENANT_ID for now. When real auth ships, swap
// these for session-derived values.

type IncomingTier = {
  tier_name?: string;
  tier_order?: number;
  cogs_compute_usd?: number;
  cogs_storage_usd?: number;
  cogs_llm_usd?: number;
  cogs_third_party_usd?: number;
  cogs_payments_pct?: number;
  cogs_payments_fixed_usd?: number;
  cogs_support_usd?: number;
  cogs_other_usd?: number;
  list_price_usd?: number;
  effective_price_usd?: number;
  margin_floor_pct?: number | null;
  notes?: string | null;
};

function clampNumber(v: unknown, fallback = 0): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return v;
}

export async function GET() {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("product_cost_model")
    .select(
      "id, tier_name, tier_order, cogs_compute_usd, cogs_storage_usd, cogs_llm_usd, cogs_third_party_usd, cogs_payments_pct, cogs_payments_fixed_usd, cogs_support_usd, cogs_other_usd, list_price_usd, effective_price_usd, gross_margin_pct, margin_floor_pct, notes, effective_date, updated_at",
    )
    .eq("brand_id", DEMO_BRAND_ID)
    .order("tier_order", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tiers: data ?? [] });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { tiers?: IncomingTier[] } | null;
  if (!body || !Array.isArray(body.tiers)) {
    return NextResponse.json({ error: "expected { tiers: [...] }" }, { status: 400 });
  }
  const admin = await createAdminClient();

  // Build upsert rows. Skip tiers with no tier_name.
  const rows = body.tiers
    .filter((t) => typeof t.tier_name === "string" && t.tier_name.trim().length > 0)
    .map((t, idx) => ({
      organization_id: DEMO_TENANT_ID,
      brand_id: DEMO_BRAND_ID,
      tier_name: t.tier_name!.trim(),
      tier_order: t.tier_order ?? idx + 1,
      cogs_compute_usd: clampNumber(t.cogs_compute_usd),
      cogs_storage_usd: clampNumber(t.cogs_storage_usd),
      cogs_llm_usd: clampNumber(t.cogs_llm_usd),
      cogs_third_party_usd: clampNumber(t.cogs_third_party_usd),
      cogs_payments_pct: clampNumber(t.cogs_payments_pct, 0.029),
      cogs_payments_fixed_usd: clampNumber(t.cogs_payments_fixed_usd, 0.3),
      cogs_support_usd: clampNumber(t.cogs_support_usd),
      cogs_other_usd: clampNumber(t.cogs_other_usd),
      list_price_usd: clampNumber(t.list_price_usd),
      effective_price_usd: clampNumber(t.effective_price_usd),
      margin_floor_pct:
        typeof t.margin_floor_pct === "number" && Number.isFinite(t.margin_floor_pct)
          ? t.margin_floor_pct
          : null,
      notes: typeof t.notes === "string" ? t.notes : null,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "no valid tiers in payload" }, { status: 400 });
  }

  // Upsert by (brand_id, tier_name) — the unique constraint on the table.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("product_cost_model")
    .upsert(rows, { onConflict: "brand_id,tier_name" })
    .select("id, tier_name, gross_margin_pct");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ saved: data });
}
