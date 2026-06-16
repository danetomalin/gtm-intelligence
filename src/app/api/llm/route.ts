// ============================================================
// LLM PROXY ROUTE — provider-agnostic pass-through.
//
// Three credential paths (resolution priority):
//   1. x-llm-shared-id → resolveShared() pulls the env-var key
//      server-side. Browser never sees the value. Org-managed
//      shared profile pattern (see lib/llm/sharedCredentials).
//      Provider/model/baseUrl are also overridden from the
//      registry so a member can't accidentally re-route a shared
//      key to a different endpoint.
//   2. x-llm-key + x-llm-provider + x-llm-model + x-llm-base-url
//      → personal BYOK headers (existing flow).
//   3. ANTHROPIC_API_KEY env var fallback (anthropic only, for
//      no-config local dev).
// Keys are NEVER logged or persisted. Provider mechanics live in
// src/lib/llm/providers.ts.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { callProvider } from "@/lib/llm/providers";
import { resolveShared, isSharedId } from "@/lib/llm/sharedCredentials";

export const runtime = "nodejs";
// Thinking models (Gemini 2.5 Pro, o-series) can take 30s+ with a
// large portfolio context — keep the function alive long enough.
export const maxDuration = 60;

interface LlmRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  system?: string;
}

export async function POST(req: NextRequest) {
  let provider = req.headers.get("x-llm-provider") ?? "anthropic";
  let model = req.headers.get("x-llm-model") ?? "";
  let baseUrl = req.headers.get("x-llm-base-url") ?? "";
  let apiKey = req.headers.get("x-llm-key") ?? "";

  // Shared profile path: server resolves the env-var key. Browser
  // sent only the profile id. Provider/model/baseUrl from the
  // registry override the headers so a member can't re-route a
  // shared key to a different endpoint.
  const sharedId = req.headers.get("x-llm-shared-id");
  if (sharedId && isSharedId(sharedId)) {
    const resolved = resolveShared(sharedId);
    if (!resolved) {
      return NextResponse.json(
        { error: "Shared profile env var is not configured on the server." },
        { status: 503 },
      );
    }
    provider = resolved.provider;
    model = model || resolved.model;
    baseUrl = resolved.baseUrl || baseUrl;
    apiKey = resolved.apiKey;
  } else if (!apiKey && provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    // Platform fallback for Anthropic only
    apiKey = process.env.ANTHROPIC_API_KEY;
  }

  let body: LlmRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages array required." }, { status: 400 });
  }

  const result = await callProvider(
    { provider, apiKey, model, baseUrl },
    body.messages,
    { system: body.system, maxTokens: body.maxTokens },
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 502 });
  }
  return NextResponse.json({ text: result.text });
}
