// ============================================================
// Server-side provider call — shared by the /api/llm proxy (chat
// copilots) and the native workflow runner. Keys arrive per-request
// and are never logged or persisted.
// ============================================================

export interface ProviderConfig {
  provider: string; // anthropic | openai | google | opensource
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface ProviderMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProviderResult {
  ok: boolean;
  text: string;
  error?: string;
  status?: number;
}

const DEFAULT_BASE: Record<string, string> = {
  anthropic: "https://api.anthropic.com",
  openai: "https://api.openai.com",
  google: "https://generativelanguage.googleapis.com",
};

export async function callProvider(
  config: ProviderConfig,
  messages: ProviderMessage[],
  opts?: { system?: string; maxTokens?: number },
): Promise<ProviderResult> {
  const { provider, apiKey, model } = config;
  const maxTokens = Math.min(opts?.maxTokens ?? 1024, 8192);
  const baseUrl = (config.baseUrl || DEFAULT_BASE[provider] || "").replace(/\/$/, "");

  if (!apiKey) return { ok: false, text: "", error: "No API key configured. Add credentials in Settings.", status: 401 };
  if (!model) return { ok: false, text: "", error: "No model specified in Settings.", status: 400 };
  if (!baseUrl) return { ok: false, text: "", error: "Open Source provider requires a base URL in Settings.", status: 400 };

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
          ...(opts?.system ? { system: opts.system } : {}),
          messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, text: "", error: data?.error?.message ?? `Provider error (HTTP ${res.status})`, status: res.status };
      }
      const text = Array.isArray(data.content)
        ? data.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("")
        : "";
      return { ok: true, text };
    }

    if (provider === "google") {
      const contents = messages.map((m) => ({
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
          ...(opts?.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, text: "", error: data?.error?.message ?? `Provider error (HTTP ${res.status})`, status: res.status };
      }
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      return { ok: true, text: parts.map((p: { text?: string }) => p.text ?? "").join("") };
    }

    // OpenAI and OpenAI-compatible endpoints
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
          ...(opts?.system ? [{ role: "system", content: opts.system }] : []),
          ...messages,
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, text: "", error: data?.error?.message ?? `Provider error (HTTP ${res.status})`, status: res.status };
    }
    return { ok: true, text: data?.choices?.[0]?.message?.content ?? "" };
  } catch (e) {
    return { ok: false, text: "", error: e instanceof Error ? e.message : "Upstream request failed.", status: 502 };
  }
}
