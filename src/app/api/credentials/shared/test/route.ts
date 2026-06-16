// ============================================================
// POST /api/credentials/shared/test
//
// Body: { id: string }
// Resolves the shared profile server-side, pings the LLM with a
// tiny prompt through the same callProvider mechanism /api/llm
// uses, returns { ok, latencyMs, error? } without exposing the
// key value.
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/supabase/session";
import { resolveShared } from "@/lib/llm/sharedCredentials";
import { callProvider } from "@/lib/llm/providers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }
  const resolved = resolveShared(body.id);
  if (!resolved) {
    return NextResponse.json(
      { error: "unknown_or_not_configured" },
      { status: 400 },
    );
  }

  const t0 = Date.now();
  try {
    const result = await callProvider(
      {
        provider: resolved.provider,
        apiKey: resolved.apiKey,
        model: resolved.model,
        baseUrl: resolved.baseUrl,
      },
      [{ role: "user", content: "ping" }],
      { maxTokens: 8 },
    );
    const latencyMs = Date.now() - t0;
    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        latencyMs,
        error: result.error ?? `HTTP ${result.status ?? 502}`,
      });
    }
    return NextResponse.json({ ok: true, latencyMs });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      latencyMs: Date.now() - t0,
      error: err instanceof Error ? err.message : "Network error",
    });
  }
}
