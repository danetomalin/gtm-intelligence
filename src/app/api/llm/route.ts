// ============================================================
// LLM PROXY ROUTE — provider-agnostic pass-through.
// The user's API key arrives in request headers, is forwarded to
// the chosen provider, and is NEVER logged or persisted.
// Fallback: if no user key is provided and the provider is
// Anthropic, the platform's ANTHROPIC_API_KEY env var is used
// (lets Dane run the app without configuring a key in the UI).
// ============================================================

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
// Thinking models (Gemini 2.5 Pro, o-series) can take 30s+ with a
// large portfolio context — keep the function alive long enough.
export const maxDuration = 60;

interface LlmRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  system?: string;
}

const DEFAULT_BASE: Record<string, string> = {
  anthropic: "https://api.anthropic.com",
  openai: "https://api.openai.com",
  google: "https://generativelanguage.googleapis.com",
};

export async function POST(req: NextRequest) {
  const provider = req.headers.get("x-llm-provider") ?? "anthropic";
  const model = req.headers.get("x-llm-model") ?? "";
  const baseUrlHeader = req.headers.get("x-llm-base-url") ?? "";
  let apiKey = req.headers.get("x-llm-key") ?? "";

  // Platform fallback for Anthropic only
  if (!apiKey && provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    apiKey = process.env.ANTHROPIC_API_KEY;
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "No API key configured. Open API Settings and add your key." },
      { status: 401 }
    );
  }
  if (!model) {
    return NextResponse.json({ error: "No model specified in API Settings." }, { status: 400 });
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
  const maxTokens = Math.min(body.maxTokens ?? 1024, 8192);
  const baseUrl = (baseUrlHeader || DEFAULT_BASE[provider] || "").replace(/\/$/, "");
  if (!baseUrl) {
    return NextResponse.json({ error: "Open Source provider requires a base URL in API Settings." }, { status: 400 });
  }

  try {
    if (provider === "anthropic") {
      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          ...(body.system ? { system: body.system } : {}),
          messages: body.messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { error: data?.error?.message ?? `Provider error (HTTP ${res.status})` },
          { status: res.status }
        );
      }
      const text = Array.isArray(data.content)
        ? data.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("")
        : "";
      return NextResponse.json({ text });
    }

    if (provider === "google") {
      // Gemini API
      const contents = body.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const res = await fetch(`${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents,
          ...(body.system ? { systemInstruction: { parts: [{ text: body.system }] } } : {}),
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { error: data?.error?.message ?? `Provider error (HTTP ${res.status})` },
          { status: res.status }
        );
      }
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      const text = parts.map((p: { text?: string }) => p.text ?? "").join("");
      return NextResponse.json({ text });
    }

    // OpenAI and OpenAI-compatible (Open Source: Together, Groq, Fireworks, vLLM, Ollama, etc.)
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          ...(body.system ? [{ role: "system", content: body.system }] : []),
          ...body.messages,
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? `Provider error (HTTP ${res.status})` },
        { status: res.status }
      );
    }
    const text = data?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upstream request failed." },
      { status: 502 }
    );
  }
}
