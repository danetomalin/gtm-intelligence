import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Full-artifact fetch for the Command Center review modal.
// Same whitelist as the approval transition endpoint.

const ALLOWED = new Set<string>([
  "content_outputs",
  "sales_collateral",
  "counter_narrative_memos",
  "enablement_assets",
  "super_user_cohorts",
  "voc_extractions",
  "icp_definitions",
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get("table") ?? "";
  const id = searchParams.get("id") ?? "";
  if (!ALLOWED.has(table)) {
    return NextResponse.json({ error: `Unknown or disallowed table: ${table}` }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const admin = await createAdminClient();
  const { data, error } = await admin.from(table).select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ row: data });
}
