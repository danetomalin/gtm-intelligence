// ============================================================
// LLM CLIENT — browser-side helper. Reads the user's API config
// from localStorage and calls our proxy route with the key in
// request headers. Used by the settings "test connection" and by
// every AI feature (maturity diagnostic, QBR narratives, etc.).
// ============================================================

import { loadApiConfig, type ApiConfig } from "./apiConfig";

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmResult {
  ok: boolean;
  text: string;
  error?: string;
}

export async function callLLM(
  messages: LlmMessage[],
  opts?: { maxTokens?: number; system?: string; config?: ApiConfig }
): Promise<LlmResult> {
  const config = opts?.config ?? loadApiConfig();
  try {
    const res = await fetch("/api/llm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-llm-provider": config.provider,
        "x-llm-key": config.apiKey,
        "x-llm-model": config.model,
        "x-llm-base-url": config.baseUrl,
      },
      body: JSON.stringify({ messages, maxTokens: opts?.maxTokens ?? 1024, system: opts?.system }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, text: "", error: data.error ?? `HTTP ${res.status}` };
    return { ok: true, text: data.text ?? "" };
  } catch (e) {
    return { ok: false, text: "", error: e instanceof Error ? e.message : "Network error" };
  }
}
