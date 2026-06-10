// ============================================================
// APP-WIDE CREDENTIAL STORE — bring-your-own-key, managed in
// Settings. Multiple NAMED credential profiles, one marked default,
// plus per-workflow assignments (workflow code -> profile id).
// Everything lives ONLY in the user's browser (localStorage) and
// rides each request to the /api/llm proxy as headers. Nothing is
// persisted server-side.
//
// Back-compat: loadApiConfig() returns the default profile in the
// original single-config shape, so existing consumers (cs-health
// llmClient, Ask Jon) keep working unchanged.
// ============================================================

export type Provider = "google" | "anthropic" | "openai" | "opensource";

export interface ApiConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string; // empty = provider default
}

export interface CredentialProfile extends ApiConfig {
  id: string;
  name: string; // user-facing label, e.g. "Anthropic prod", "Gemini cheap"
}

export interface CredentialStore {
  profiles: CredentialProfile[];
  defaultId: string | null;
  // workflow code (e.g. "R-CI") -> profile id. Missing/unknown ids
  // fall back to the default profile.
  assignments: Record<string, string>;
  // Tavily web-search key for native research workflows (browser-local,
  // sent per-request as x-search-key — never persisted server-side).
  searchApiKey?: string;
}

export const PROVIDER_PRESETS: Record<Provider, { label: string; defaultModel: string; defaultBaseUrl: string; keyHint: string; models: string[] }> = {
  google: {
    label: "Google",
    defaultModel: "gemini-2.5-pro",
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
    keyHint: "AIza...",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
  },
  anthropic: {
    label: "Anthropic",
    defaultModel: "claude-sonnet-4-6",
    defaultBaseUrl: "https://api.anthropic.com",
    keyHint: "sk-ant-...",
    models: ["claude-sonnet-4-6", "claude-opus-4-8", "claude-haiku-4-5"],
  },
  openai: {
    label: "OpenAI",
    defaultModel: "gpt-4o",
    defaultBaseUrl: "https://api.openai.com",
    keyHint: "sk-...",
    models: ["gpt-4o", "gpt-4o-mini", "o3", "o4-mini"],
  },
  opensource: {
    label: "Open Source",
    defaultModel: "",
    defaultBaseUrl: "",
    keyHint: "your API key",
    models: [],
  },
};

const STORE_KEY = "throughline.credentials";
// Pre-multi-profile keys — migrated on first read.
const LEGACY_SINGLE_KEY = "throughline.apiConfig";
const LEGACY_CS_KEY = "cs-health.apiConfig";

export function defaultConfig(provider: Provider = "anthropic"): ApiConfig {
  const p = PROVIDER_PRESETS[provider];
  return { provider, apiKey: "", model: p.defaultModel, baseUrl: "" };
}

export function newProfileId(): string {
  return `cred_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyStore(): CredentialStore {
  return { profiles: [], defaultId: null, assignments: {} };
}

function parseLegacySingle(raw: string): ApiConfig {
  const parsed = JSON.parse(raw) as Omit<Partial<ApiConfig>, "provider"> & { provider?: string };
  let rawProvider = parsed.provider;
  if (rawProvider === "custom") rawProvider = "opensource";
  const provider = (rawProvider && rawProvider in PROVIDER_PRESETS ? rawProvider : "anthropic") as Provider;
  return { ...defaultConfig(provider), ...parsed, provider };
}

export function loadCredentialStore(): CredentialStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CredentialStore>;
      return {
        profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
        defaultId: parsed.defaultId ?? null,
        assignments: parsed.assignments ?? {},
        searchApiKey: parsed.searchApiKey ?? "",
      };
    }
    // One-time migration: single-config era -> one "Default" profile.
    const legacy =
      window.localStorage.getItem(LEGACY_SINGLE_KEY) ??
      window.localStorage.getItem(LEGACY_CS_KEY);
    if (legacy) {
      const cfg = parseLegacySingle(legacy);
      const profile: CredentialProfile = {
        ...cfg,
        id: newProfileId(),
        name: `${PROVIDER_PRESETS[cfg.provider].label} (migrated)`,
      };
      const store: CredentialStore = {
        profiles: [profile],
        defaultId: profile.id,
        assignments: {},
      };
      saveCredentialStore(store);
      return store;
    }
    return emptyStore();
  } catch {
    return emptyStore();
  }
}

export function saveCredentialStore(store: CredentialStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function getDefaultProfile(store?: CredentialStore): CredentialProfile | null {
  const s = store ?? loadCredentialStore();
  if (s.profiles.length === 0) return null;
  return s.profiles.find((p) => p.id === s.defaultId) ?? s.profiles[0];
}

// Resolve which credentials a given workflow runs on: its assigned
// profile if one exists, otherwise the default profile.
export function resolveCredential(
  workflowCode: string,
  store?: CredentialStore,
): CredentialProfile | null {
  const s = store ?? loadCredentialStore();
  const assignedId = s.assignments[workflowCode.toUpperCase()];
  if (assignedId) {
    const assigned = s.profiles.find((p) => p.id === assignedId);
    if (assigned) return assigned;
  }
  return getDefaultProfile(s);
}

export function setSearchApiKey(key: string): CredentialStore {
  const s = loadCredentialStore();
  s.searchApiKey = key.trim();
  saveCredentialStore(s);
  return s;
}

export function getSearchApiKey(): string {
  return loadCredentialStore().searchApiKey ?? "";
}

export function setAssignment(workflowCode: string, profileId: string | null): CredentialStore {
  const s = loadCredentialStore();
  const code = workflowCode.toUpperCase();
  if (profileId === null) {
    delete s.assignments[code];
  } else {
    s.assignments[code] = profileId;
  }
  saveCredentialStore(s);
  return s;
}

// ── Back-compat single-config API (default profile view) ──────────

export function loadApiConfig(): ApiConfig {
  const def = getDefaultProfile();
  if (!def) return defaultConfig();
  const { provider, apiKey, model, baseUrl } = def;
  return { provider, apiKey, model, baseUrl };
}

export function saveApiConfig(config: ApiConfig): void {
  // Legacy setter: updates (or creates) the default profile.
  const s = loadCredentialStore();
  const def = getDefaultProfile(s);
  if (def) {
    Object.assign(def, config);
  } else {
    const profile: CredentialProfile = {
      ...config,
      id: newProfileId(),
      name: PROVIDER_PRESETS[config.provider].label,
    };
    s.profiles.push(profile);
    s.defaultId = profile.id;
  }
  saveCredentialStore(s);
}

export function clearApiConfig(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORE_KEY);
  window.localStorage.removeItem(LEGACY_SINGLE_KEY);
  window.localStorage.removeItem(LEGACY_CS_KEY);
}

export function isConfigured(config: ApiConfig): boolean {
  return config.apiKey.trim().length > 0;
}
