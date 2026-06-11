import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Cancel a run that is still marked `running`. The serverless engine
 * can't be aborted mid-flight, but anything past the 60s ceiling is
 * already dead — this clears the row so the UI unblocks. If the
 * function somehow finishes later, its update loses (status already
 * terminal, guarded by .eq below).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("run_history")
    .update({
      status: "canceled",
      finished_at: new Date().toISOString(),
      error_message: "Canceled from the Command Center.",
    })
    .eq("id", id)
    .eq("status", "running")
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Run not found or already finished." },
      { status: 409 },
    );
  }
  return NextResponse.json({ canceled: id });
}
