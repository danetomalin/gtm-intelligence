// POST /api/brand-kit
//
// Updates the brand kit fields (primary_color, secondary_color, logo_url,
// font_family, footer_text) on a brands row. Demo mode keeps things
// permissive — no auth check, just a brandId in the body. Tighten when
// real auth lands.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  brandId: z.string().uuid(),
  primary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/u, "must be a 6-char hex")
    .nullable()
    .optional(),
  secondary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/u, "must be a 6-char hex")
    .nullable()
    .optional(),
  logo_url: z.string().url().nullable().optional(),
  font_family: z.string().max(80).nullable().optional(),
  footer_text: z.string().max(500).nullable().optional(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Invalid body",
      },
      { status: 400 },
    );
  }

  const admin = await createAdminClient();
  const { brandId, ...patch } = body;

  // Filter out undefined keys so a partial save doesn't null out values
  // the editor wasn't touching.
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) cleaned[k] = v;
  }

  const { error } = await admin
    .from("brands")
    .update(cleaned)
    .eq("id", brandId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
