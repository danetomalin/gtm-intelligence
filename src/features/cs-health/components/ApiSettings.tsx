"use client";
// API Keys section — user-selectable provider + bring-your-own-key.
// Rendered inside the Settings panel. Key is stored only in this
// browser (localStorage) and sent per-request to the proxy route.

import { useEffect, useState } from "react";
import {
  PROVIDER_PRESETS,
  clearApiConfig,
  defaultConfig,
  loadApiConfig,
  saveApiConfig,
  type ApiConfig,
  type Provider,
} from "@/features/cs-health/lib/apiConfig";
import { callLLM } from "@/features/cs-health/lib/llmClient";

const label: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: "var(--fg-secondary)", marginBottom: 6, display: "block" };
const input: React.CSSProperties = { width: "100%", height: 36, padding: "0 12px", fontSize: 13, border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", color: "var(--fg-primary)", background: "hsl(var(--card))", outline: "none", boxSizing: "border-box" };
export const btnPrimary: React.CSSProperties = { height: 36, padding: "0 18px", fontSize: 13, fontWeight: 400, cursor: "pointer", border: "none", borderRadius: "0.75rem", background: "var(--primary)", color: "white", transition: "all 150ms ease-in-out" };
export const btnNeutral: React.CSSProperties = { height: 36, padding: "0 16px", fontSize: 13, fontWeight: 400, cursor: "pointer", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", background: "hsl(var(--card))", color: "var(--fg-primary)", transition: "all 150ms ease-in-out" };

interface ModelEntry {
  id: string;
  label: string;
}

export default function ApiKeysSection() {
  const [config, setConfig] = useState<ApiConfig>(defaultConfig());
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [customModel, setCustomModel] = useState(false);

  useEffect(() => {
    setConfig(loadApiConfig());
  }, []);

  const preset = PROVIDER_PRESETS[config.provider];

  function setProvider(p: Provider) {
    const d = defaultConfig(p);
    setConfig((c) => ({ ...d, apiKey: c.apiKey }));
    setTestResult(null);
    setSaved(false);
    setModels([]);
    setModelsError(null);
    setCustomModel(false);
  }

  async function loadModels() {
    if (!config.apiKey.trim()) {
      setModelsError("Enter an API key first.");
      return;
    }
    setLoadingModels(true);
    setModelsError(null);
    try {
      const res = await fetch("/api/llm/models", {
        method: "POST",
        headers: {
          "x-llm-provider": config.provider,
          "x-llm-key": config.apiKey,
          "x-llm-base-url": config.baseUrl,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setModelsError(data.error ?? `Failed (HTTP ${res.status})`);
        setModels([]);
      } else {
        const list: ModelEntry[] = data.models ?? [];
        setModels(list);
        setModelsError(list.length === 0 ? "No models returned for this key." : null);
        // If current model isn't in the list, keep it but mark as custom
        if (list.length > 0 && config.model && !list.some((m) => m.id === config.model)) {
          setCustomModel(true);
        }
      }
    } catch {
      setModelsError("Network error while fetching models.");
    }
    setLoadingModels(false);
  }

  function handleSave() {
    saveApiConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClear() {
    clearApiConfig();
    setConfig(defaultConfig(config.provider));
    setTestResult(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    saveApiConfig(config);
    // Generous budget: Gemini 2.5 spends thinking tokens from maxTokens,
    // so small budgets return empty text even when auth succeeds.
    const res = await callLLM([{ role: "user", content: "Reply with exactly: OK" }], { maxTokens: 1024, config });
    setTesting(false);
    setTestResult(
      res.ok && res.text.trim()
        ? { ok: true, msg: `Connected — ${config.model} responded.` }
        : res.ok
          ? { ok: false, msg: "Connected but the model returned empty text — check the model name." }
          : { ok: false, msg: res.error ?? "Connection failed." }
    );
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--fg-secondary)", lineHeight: 1.5, marginBottom: 16 }}>
        Bring your own key. It is stored only in this browser and sent per-request — never saved on our servers. AI features (maturity diagnostic, QBR narratives) run on your account.
      </div>

      <div style={{ marginBottom: 14 }}>
        <span style={label}>Provider</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(Object.keys(PROVIDER_PRESETS) as Provider[]).map((p) => (
            <button key={p} onClick={() => setProvider(p)} style={{ flex: 1, minHeight: 36, padding: "8px 6px", fontSize: 12, fontWeight: 400, cursor: "pointer", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", background: config.provider === p ? "hsl(var(--foreground))" : "hsl(var(--card))", color: config.provider === p ? "hsl(var(--background))" : "var(--fg-secondary)", transition: "all 150ms ease-in-out" }}>
              {PROVIDER_PRESETS[p].label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <span style={label}>API Key</span>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type={showKey ? "text" : "password"}
            value={config.apiKey}
            placeholder={preset.keyHint}
            onChange={(e) => { setConfig({ ...config, apiKey: e.target.value }); setTestResult(null); }}
            style={{ ...input, flex: 1 }}
            autoComplete="off"
            spellCheck={false}
          />
          <button onClick={() => setShowKey(!showKey)} style={{ ...btnNeutral, fontSize: 12, color: "var(--fg-secondary)" }}>
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <span style={label}>
            Model
            <button type="button" onClick={loadModels} disabled={loadingModels} style={{ marginLeft: 8, border: "none", background: "none", fontSize: 11, fontWeight: 500, color: "var(--primary)", cursor: loadingModels ? "wait" : "pointer", padding: 0 }}>
              {loadingModels ? "Loading…" : models.length > 0 ? "Reload list" : "Load available models"}
            </button>
          </span>
          {models.length > 0 && !customModel ? (
            <select
              value={models.some((m) => m.id === config.model) ? config.model : ""}
              onChange={(e) => {
                if (e.target.value === "__custom__") { setCustomModel(true); return; }
                setConfig({ ...config, model: e.target.value });
                setTestResult(null);
              }}
              style={{ ...input, appearance: "auto", cursor: "pointer" }}
            >
              {!models.some((m) => m.id === config.model) && <option value="" disabled>Select a model…</option>}
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.label === m.id ? m.id : `${m.label} (${m.id})`}</option>
              ))}
              <option value="__custom__">Custom — type a model name…</option>
            </select>
          ) : (
            <input type="text" value={config.model} placeholder={preset.defaultModel || "model name"} onChange={(e) => setConfig({ ...config, model: e.target.value })} style={input} spellCheck={false} />
          )}
          {customModel && models.length > 0 && (
            <button type="button" onClick={() => setCustomModel(false)} style={{ border: "none", background: "none", fontSize: 11, color: "var(--fg-tertiary)", cursor: "pointer", padding: "4px 0 0" }}>
              ← back to model list
            </button>
          )}
          {modelsError && <div style={{ fontSize: 11, color: "hsl(28 90% 38%)", marginTop: 4 }}>{modelsError}</div>}
        </div>
        <div>
          <span style={label}>Base URL {config.provider !== "opensource" && <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>}</span>
          <input type="text" value={config.baseUrl} placeholder={preset.defaultBaseUrl || "https://your-endpoint.com"} onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })} style={input} spellCheck={false} />
        </div>
      </div>
      {config.provider === "opensource" && <div style={{ fontSize: 10, color: "var(--fg-tertiary)", marginTop: -8, marginBottom: 12 }}>Point at any OpenAI-compatible endpoint serving open-source models — Together, Groq, Fireworks, vLLM, local Ollama, etc. Enter the model name your endpoint expects (e.g. a Llama, Mistral, or Qwen variant).</div>}

      {testResult && (
        <div style={{ fontSize: 11, fontWeight: 600, padding: "8px 10px", marginBottom: 12, borderRadius: "0.5rem", background: testResult.ok ? "hsl(var(--success) / 0.12)" : "hsl(var(--destructive) / 0.12)", color: testResult.ok ? "hsl(135 59% 32%)" : "hsl(359 75% 42%)", lineHeight: 1.4 }}>
          {testResult.msg}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={handleSave} style={btnPrimary}>
          {saved ? "Saved ✓" : "Save"}
        </button>
        <button onClick={handleTest} disabled={testing || !config.apiKey || !config.model} style={{ ...btnNeutral, cursor: testing ? "wait" : "pointer", opacity: !config.apiKey || !config.model ? 0.5 : 1 }}>
          {testing ? "Testing..." : "Test Connection"}
        </button>
        <button onClick={handleClear} style={{ marginLeft: "auto", height: 36, padding: "0 12px", fontSize: 13, fontWeight: 400, cursor: "pointer", border: "none", borderRadius: "0.75rem", background: "none", color: "hsl(var(--destructive))" }}>
          Clear Key
        </button>
      </div>
    </div>
  );
}
