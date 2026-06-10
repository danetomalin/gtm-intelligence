// ============================================================
// API CONFIG — user-selectable, bring-your-own-key.
// The key lives ONLY in the user's browser (localStorage) and is
// sent per-request to our proxy route, which forwards it to the
// chosen provider. Nothing is persisted server-side.
// ============================================================

export type Provider = "google" | "anthropic" | "openai" | "opensource";

export interface ApiConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string; // empty = provider default
}

export const PROVIDER_PRESETS: Record<Provider, { label: string; defaultModel: string; defaultBaseUrl: string; keyHint: string }> = {
  google: {
    label: "Google",
    defaultModel: "gemini-2.5-pro",
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
    keyHint: "AIza...",
  },
  anthropic: {
    label: "Anthropic",
    defaultModel: "claude-sonnet-4-6",
    defaultBaseUrl: "https://api.anthropic.com",
    keyHint: "sk-ant-...",
  },
  openai: {
    label: "OpenAI",
    defaultModel: "gpt-4o",
    defaultBaseUrl: "https://api.openai.com",
    keyHint: "sk-...",
  },
  opensource: {
    label: "Open Source",
    defaultModel: "",
    defaultBaseUrl: "",
    keyHint: "your API key",
  },
};

const STORAGE_KEY = "cs-health.apiConfig";

export function defaultConfig(provider: Provider = "anthropic"): ApiConfig {
  const p = PROVIDER_PRESETS[provider];
  return { provider, apiKey: "", model: p.defaultModel, baseUrl: "" };
}

export function loadApiConfig(): ApiConfig {
  if (typeof window === "undefined") return defaultConfig();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig();
    const parsed = JSON.parse(raw) as Omit<Partial<ApiConfig>, "provider"> & { provider?: string };
    // migrate legacy "custom" provider to "opensource"
    let rawProvider = parsed.provider;
    if (rawProvider === "custom") rawProvider = "opensource";
    const provider = (rawProvider && rawProvider in PROVIDER_PRESETS ? rawProvider : "anthropic") as Provider;
    return { ...defaultConfig(provider), ...parsed, provider };
  } catch {
    return defaultConfig();
  }
}

export function saveApiConfig(config: ApiConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearApiConfig(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function isConfigured(config: ApiConfig): boolean {
  return config.apiKey.trim().length > 0;
}
