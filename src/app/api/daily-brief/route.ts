import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID } from "@/lib/demo-context";

// GET /api/daily-brief — returns the latest brief for the active brand or null.
// The dashboard fetches the initial brief server-side, but polls this after
// an S-DB run completes so it can refresh without a full page reload.
export async function GET() {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("daily_briefs")
    .select("id, generated_at, headline, focus_items")
    .eq("brand_id", DEMO_BRAND_ID)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ brief: data ?? null });
}
