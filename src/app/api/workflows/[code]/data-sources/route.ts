import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_TENANT_ID } from "@/lib/demo-context";

// Per-workflow external data source assignments (placeholder tier —
// see migration 0033). GET lists, PUT upserts one, DELETE removes one.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("workflow_data_sources")
    .select("id, source_id, source_name, pull_instructions, enabled, connection_status, created_at")
    .eq("organization_id", DEMO_TENANT_ID)
    .eq("workflow_code", code.toUpperCase())
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sources: data ?? [] });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  let body: { source_id?: string; source_name?: string; pull_instructions?: string; enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  if (!body.source_id || !body.source_name) {
    return NextResponse.json({ error: "source_id and source_name are required" }, { status: 400 });
  }
  const admin = await createAdminClient();
  const { error } = await admin.from("workflow_data_sources").upsert(
    {
      organization_id: DEMO_TENANT_ID,
      workflow_code: code.toUpperCase(),
      source_id: body.source_id,
      source_name: body.source_name,
      pull_instructions: body.pull_instructions ?? "",
      enabled: body.enabled ?? true,
    },
    { onConflict: "organization_id,workflow_code,source_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("source_id");
  if (!sourceId) return NextResponse.json({ error: "source_id query param required" }, { status: 400 });
  const admin = await createAdminClient();
  const { error } = await admin
    .from("workflow_data_sources")
    .delete()
    .eq("organization_id", DEMO_TENANT_ID)
    .eq("workflow_code", code.toUpperCase())
    .eq("source_id", sourceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
