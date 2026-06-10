// GET /api/workflows/config — all workflow instruction rows for the demo org.
// Powers the Settings "Workflow Instructions" list. Demo-mode permissive.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_TENANT_ID } from "@/lib/demo-context";

export async function GET() {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("workflow_configs")
    .select("workflow_code, instructions, model_override, updated_at")
    .eq("organization_id", DEMO_TENANT_ID);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ configs: data ?? [] });
}
