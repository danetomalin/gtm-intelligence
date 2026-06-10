// GET/PUT /api/workflows/[code]/config — one workflow's operating
// instructions (the system prompt the Vercel-native runner uses).
// Backed by workflow_configs; same row whether edited from Settings
// or the workflow page's Configure panel. Demo-mode permissive.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_TENANT_ID } from "@/lib/demo-context";

const putSchema = z.object({
  instructions: z.string().max(20000),
  modelOverride: z.string().max(120).nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("workflow_configs")
    .select("workflow_code, instructions, model_override, updated_at")
    .eq("organization_id", DEMO_TENANT_ID)
    .eq("workflow_code", code.toUpperCase())
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ config: data ?? null });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  let body: z.infer<typeof putSchema>;
  try {
    body = putSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid body" },
      { status: 400 },
    );
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("workflow_configs")
    .upsert(
      {
        organization_id: DEMO_TENANT_ID,
        workflow_code: code.toUpperCase(),
        instructions: body.instructions,
        model_override: body.modelOverride ?? null,
      },
      { onConflict: "organization_id,workflow_code" },
    )
    .select("workflow_code, instructions, model_override, updated_at")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ config: data });
}
