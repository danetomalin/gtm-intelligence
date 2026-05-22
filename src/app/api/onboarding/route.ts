import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  organizationName: z.string().min(1).max(200),
  brandName: z.string().min(1).max(200),
  websiteUrl: z.string().url().max(500),
  additionalContext: z.string().max(5000).optional().default(""),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Admin client to bypass RLS for the bootstrap (org + profile + brand
  // creation in one transaction, all keyed to this authenticated user).
  const admin = await createAdminClient();

  // Idempotent: if the user already has an org, reuse it.
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let organizationId = existingProfile?.organization_id ?? null;

  if (!organizationId) {
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ name: body.organizationName, created_by: user.id })
      .select("id")
      .single();
    if (orgError || !org) {
      return NextResponse.json(
        { error: orgError?.message ?? "Could not create organization" },
        { status: 500 },
      );
    }
    organizationId = org.id;

    const { error: profileError } = await admin.from("profiles").insert({
      user_id: user.id,
      organization_id: organizationId,
      role: "owner",
      email: user.email,
    });
    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 },
      );
    }
  }

  // Create the brand row.
  const { data: brand, error: brandError } = await admin
    .from("brands")
    .insert({
      organization_id: organizationId,
      name: body.brandName,
      website_url: body.websiteUrl,
      additional_context: body.additionalContext,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (brandError || !brand) {
    return NextResponse.json(
      { error: brandError?.message ?? "Could not create brand" },
      { status: 500 },
    );
  }

  // Kick off the n8n run. The webhook is fire-and-forget — A0 chains its own
  // 60s waits internally, so we just need to deliver the payload.
  const base = process.env.N8N_WEBHOOK_BASE_URL;
  const path = process.env.N8N_WEBHOOK_INIT_BRAND;
  if (base && path) {
    try {
      await fetch(`${base}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env.N8N_WEBHOOK_SECRET
            ? { "x-throughline-secret": process.env.N8N_WEBHOOK_SECRET }
            : {}),
        },
        body: JSON.stringify({
          tenantId: organizationId,
          brandId: brand.id,
          brandName: body.brandName,
          websiteUrl: body.websiteUrl,
          additionalContext: body.additionalContext,
        }),
      });
    } catch (err) {
      // Non-fatal — the brand row exists; user can retry via "Run again".
      console.error("n8n webhook call failed", err);
    }
  }

  // Record a run history entry.
  await admin.from("run_history").insert({
    organization_id: organizationId,
    brand_id: brand.id,
    status: "running",
    triggered_by: user.id,
  });

  return NextResponse.json({ ok: true, brandId: brand.id });
}
