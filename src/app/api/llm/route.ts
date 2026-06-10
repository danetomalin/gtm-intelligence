// ============================================================
// LLM PROXY ROUTE — provider-agnostic pass-through.
// The user's API key arrives in request headers, is forwarded to
// the chosen provider, and is NEVER logged or persisted.
// Fallback: if no user key is provided and the provider is
// Anthropic, the platform's ANTHROPIC_API_KEY env var is used
// (lets Dane run the app without configuring a key in the UI).
// Provider mechanics live in src/lib/llm/providers.ts, shared with
// the native workflow runner.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { callProvider } from "@/lib/llm/providers";

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
  const provider = req.headers.get("x-llm-provider") ?? "anthropic";
  const model = req.headers.get("x-llm-model") ?? "";
  const baseUrl = req.headers.get("x-llm-base-url") ?? "";
  let apiKey = req.headers.get("x-llm-key") ?? "";

  // Platform fallback for Anthropic only
  if (!apiKey && provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
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
