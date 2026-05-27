// POST /api/deployments/:id/render
//
// Reads a deployment_formats row, dispatches to the format-appropriate
// renderer, uploads the generated file to Supabase Storage (bucket:
// deployment-renders), and writes rendered_file_url + rendered_file_kind
// back to the row.
//
// Manual trigger per design (Dane's choice, 2026-05-26): the user clicks
// "Render to .docx/.pptx/.md" on the approved Library card. Auto-on-approve
// is a future option; this route is the same regardless.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  renderDeployment,
  type DeploymentFormatRow,
} from "@/lib/deployment-renderers";

const STORAGE_BUCKET = "deployment-renders";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const admin = await createAdminClient();

  const { data: row, error: readErr } = await admin
    .from("deployment_formats")
    .select(
      "id, brand_id, format_type, title, body_json, body_markdown, approval_status",
    )
    .eq("id", id)
    .single();

  if (readErr || !row) {
    return NextResponse.json(
      { error: readErr?.message ?? "Deployment format not found" },
      { status: 404 },
    );
  }

  // Allow render even before approval — the UI buttons should still gate
  // by status, but the API stays permissive so a reviewer can preview a
  // pending row's rendered output before approving.

  let rendered;
  try {
    rendered = await renderDeployment(row as DeploymentFormatRow);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Render failed for unknown reason",
      },
      { status: 500 },
    );
  }

  // Path layout: <brand_id>/<format_id>-<timestamp>.<ext> — versioned by
  // timestamp so re-rendering a row doesn't clobber the prior file.
  const ts = Date.now();
  const objectPath = `${row.brand_id}/${row.id}-${ts}.${rendered.extension}`;

  const { error: uploadErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, rendered.buffer, {
      contentType: rendered.mimeType,
      upsert: true,
    });

  if (uploadErr) {
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);

  const { error: updateErr } = await admin
    .from("deployment_formats")
    .update({
      rendered_file_url: publicUrl,
      rendered_file_kind: rendered.extension,
    })
    .eq("id", row.id);

  if (updateErr) {
    return NextResponse.json(
      { error: `Row update failed: ${updateErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: row.id,
    rendered_file_url: publicUrl,
    rendered_file_kind: rendered.extension,
    bytes: rendered.buffer.length,
  });
}
