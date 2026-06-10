"use client";
// Settings → API Credentials. ONE credential store for every workflow
// and the CS copilot (decision 2026-06-09: centralize in Settings, not
// 28 per-workflow panels). The key lives only in this browser's
// localStorage and rides each request to /api/llm — never persisted
// server-side while auth is off.

import { useEffect, useState } from "react";
import {
  PROVIDER_PRESETS,
  defaultConfig,
  isConfigured,
  loadApiConfig,
  saveApiConfig,
  clearApiConfig,
  type ApiConfig,
  type Provider,
} from "@/lib/llm/apiConfig";

export function CredentialsSection() {
  const [cfg, setCfg] = useState<ApiConfig>(defaultConfig());
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState<"idle" | "saved" | "cleared">("idle");

  useEffect(() => {
    setCfg(loadApiConfig());
  }, []);

  function setProvider(p: Provider) {
    setCfg((c) => ({ ...defaultConfig(p), apiKey: c.apiKey }));
    setSaved("idle");
  }

  function onSave() {
    saveApiConfig(cfg);
    setSaved("saved");
  }

  function onClear() {
    clearApiConfig();
    setCfg(defaultConfig());
    setSaved("cleared");
  }

  const configured = isConfigured(cfg);
  const preset = PROVIDER_PRESETS[cfg.provider];

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase tracking-wider text-text-muted">
          Provider & key
        </div>
        <span
          className={
            configured
              ? "rounded-full bg-win-bg text-win px-2.5 py-0.5 text-[11px] font-semibold"
              : "rounded-full bg-warn-bg text-warn px-2.5 py-0.5 text-[11px] font-semibold"
          }
        >
          {configured ? "Configured" : "Not configured"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs text-text-muted">Provider</span>
          <select
            value={cfg.provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {(Object.keys(PROVIDER_PRESETS) as Provider[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDER_PRESETS[p].label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-text-muted">Model</span>
          <input
            type="text"
            value={cfg.model}
            placeholder={preset.defaultModel || "model id"}
            onChange={(e) => {
              setCfg((c) => ({ ...c, model: e.target.value }));
              setSaved("idle");
            }}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>

        {cfg.provider === "opensource" && (
          <label className="block md:col-span-2">
            <span className="text-xs text-text-muted">Base URL (OpenAI-compatible)</span>
            <input
              type="text"
              value={cfg.baseUrl}
              placeholder="https://your-endpoint.example.com/v1"
              onChange={(e) => {
                setCfg((c) => ({ ...c, baseUrl: e.target.value }));
                setSaved("idle");
              }}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
        )}

        <label className="block md:col-span-2">
          <span className="text-xs text-text-muted">API key</span>
          <div className="mt-1 flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={cfg.apiKey}
              placeholder={preset.keyHint}
              onChange={(e) => {
                setCfg((c) => ({ ...c, apiKey: e.target.value }));
                setSaved("idle");
              }}
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="rounded-md border border-border px-3 py-2 text-xs text-text-muted hover:text-text"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          className="rounded-md bg-accent-strong px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          Save credentials
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-border px-4 py-2 text-sm text-text-muted hover:text-text"
        >
          Clear
        </button>
        {saved !== "idle" && (
          <span className="text-xs text-text-dim">
            {saved === "saved" ? "Saved to this browser." : "Cleared."}
          </span>
        )}
      </div>

      <p className="mt-4 text-xs text-text-dim leading-relaxed">
        Your key is stored only in this browser and sent per-request to the
        /api/llm proxy, which forwards it to the provider. API usage bills to
        your own account. Every workflow run and the Customer Health copilot
        use these credentials.
      </p>
    </div>
  );
}
