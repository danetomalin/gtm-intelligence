// POST /api/positioning-statement
//
// Sets or clears the hand-edited positioning statement override on a brand.
//   { brandId, statement: "..." }  -> save override
//   { brandId, statement: null }    -> clear override (revert to auto-composed)
//
// Demo-mode permissive — no auth check, brandId in the body. Tighten when
// real auth lands.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  brandId: z.string().uuid(),
  statement: z.string().max(4000).nullable(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid body" },
      { status: 400 },
    );
  }

  // Empty string is treated as a clear — keeps the column clean (NULL) so
  // the auto-composer takes back over.
  const value =
    body.statement && body.statement.trim().length > 0
      ? body.statement.trim()
      : null;

  const admin = await createAdminClient();
  const { error } = await admin
    .from("brands")
    .update({ positioning_statement: value })
    .eq("id", body.brandId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, positioning_statement: value });
}
