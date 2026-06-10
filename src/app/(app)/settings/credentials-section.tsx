"use client";
// Settings → API Credentials. Multiple NAMED credential profiles
// (e.g. "Anthropic prod", "Gemini cheap"), one marked default.
// Workflows run on their assigned profile or fall back to the
// default — assignment lives on each workflow row below and on the
// workflow page's Configure panel. Keys live only in this browser's
// localStorage and ride each request to /api/llm.

import { useEffect, useState } from "react";
import {
  PROVIDER_PRESETS,
  defaultConfig,
  loadCredentialStore,
  saveCredentialStore,
  newProfileId,
  type CredentialProfile,
  type CredentialStore,
  type Provider,
} from "@/lib/llm/apiConfig";
import { callLLM } from "@/features/cs-health/lib/llmClient";

type TestState = { status: "testing" | "ok" | "fail"; detail: string };

type Draft = Omit<CredentialProfile, "id"> & { id: string | null };

function emptyDraft(): Draft {
  return { id: null, name: "", ...defaultConfig() };
}

export function CredentialsSection() {
  const [store, setStore] = useState<CredentialStore>({ profiles: [], defaultId: null, assignments: {} });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [tests, setTests] = useState<Record<string, TestState>>({});

  // Fire a minimal request through /api/llm with THIS profile's
  // credentials — proves provider, model, and key together.
  async function testProfile(p: CredentialProfile) {
    setTests((t) => ({ ...t, [p.id]: { status: "testing", detail: "" } }));
    const started = Date.now();
    const res = await callLLM(
      [{ role: "user", content: "Reply with exactly: OK" }],
      { maxTokens: 1024, config: { provider: p.provider, apiKey: p.apiKey, model: p.model, baseUrl: p.baseUrl } },
    );
    const ms = Date.now() - started;
    setTests((t) => ({
      ...t,
      [p.id]: res.ok && res.text.trim()
        ? { status: "ok", detail: `${p.model || "default model"} responded in ${(ms / 1000).toFixed(1)}s` }
        : { status: "fail", detail: res.error ?? "Empty response — check the model name." },
    }));
  }

  useEffect(() => {
    setStore(loadCredentialStore());
  }, []);

  function commit(next: CredentialStore) {
    saveCredentialStore(next);
    setStore({ ...next });
  }

  function startEdit(p?: CredentialProfile) {
    setShowKey(false);
    setDraft(p ? { ...p } : emptyDraft());
  }

  function saveDraft() {
    if (!draft) return;
    const next = { ...store, profiles: [...store.profiles] };
    if (draft.id) {
      const i = next.profiles.findIndex((p) => p.id === draft.id);
      if (i >= 0) next.profiles[i] = { ...(draft as CredentialProfile) };
    } else {
      const profile: CredentialProfile = { ...(draft as Draft), id: newProfileId() } as CredentialProfile;
      if (!profile.name.trim()) profile.name = PROVIDER_PRESETS[profile.provider].label;
      next.profiles.push(profile);
      if (!next.defaultId) next.defaultId = profile.id;
    }
    commit(next);
    setDraft(null);
  }

  function remove(id: string) {
    const next = { ...store, profiles: store.profiles.filter((p) => p.id !== id) };
    if (next.defaultId === id) next.defaultId = next.profiles[0]?.id ?? null;
    // Drop assignments pointing at the removed profile.
    next.assignments = Object.fromEntries(
      Object.entries(store.assignments).filter(([, pid]) => pid !== id),
    );
    commit(next);
  }

  function setDefault(id: string) {
    commit({ ...store, defaultId: id });
  }

  const preset = draft ? PROVIDER_PRESETS[draft.provider] : null;
  const assignCounts = new Map<string, number>();
  for (const pid of Object.values(store.assignments)) {
    assignCounts.set(pid, (assignCounts.get(pid) ?? 0) + 1);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase tracking-wider text-text-muted">
          Saved credentials
        </div>
        <button
          type="button"
          onClick={() => startEdit()}
          className="rounded-md bg-accent-strong px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          Add credential
        </button>
      </div>

      {store.profiles.length === 0 && !draft && (
        <p className="text-sm text-text-muted">
          No credentials saved yet. Add one to power workflow runs and the
          Customer Health copilot.
        </p>
      )}

      <ul className="divide-y divide-border">
        {store.profiles.map((p) => {
          const isDefault = p.id === store.defaultId;
          const count = assignCounts.get(p.id) ?? 0;
          return (
            <li key={p.id} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{p.name}</span>
                  {isDefault && (
                    <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                      Default
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-dim mt-0.5">
                  {PROVIDER_PRESETS[p.provider].label} · {p.model || "default model"} ·{" "}
                  {p.apiKey ? `key …${p.apiKey.slice(-4)}` : "no key"}
                  {count > 0 && ` · assigned to ${count} workflow${count === 1 ? "" : "s"}`}
                </div>
                {tests[p.id] && tests[p.id].status !== "testing" && (
                  <div className={`text-xs mt-1 ${tests[p.id].status === "ok" ? "text-win" : "text-danger"}`}>
                    {tests[p.id].status === "ok" ? `✓ Connection verified — ${tests[p.id].detail}` : `✗ ${tests[p.id].detail}`}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                <button
                  type="button"
                  disabled={tests[p.id]?.status === "testing"}
                  onClick={() => testProfile(p)}
                  className="rounded-md border border-accent/40 bg-accent-bg px-2.5 py-1.5 font-medium text-accent hover:opacity-80 disabled:opacity-50"
                >
                  {tests[p.id]?.status === "testing" ? "Testing…" : "Test"}
                </button>
                {!isDefault && (
                  <button type="button" onClick={() => setDefault(p.id)} className="rounded-md border border-border px-2.5 py-1.5 text-text-muted hover:text-text">
                    Make default
                  </button>
                )}
                <button type="button" onClick={() => startEdit(p)} className="rounded-md border border-border px-2.5 py-1.5 text-text-muted hover:text-text">
                  Edit
                </button>
                <button type="button" onClick={() => remove(p.id)} className="rounded-md border border-border px-2.5 py-1.5 text-danger/80 hover:text-danger">
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {draft && preset && (
        <div className="mt-4 rounded-md border border-border bg-surface p-4">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-3">
            {draft.id ? "Edit credential" : "New credential"}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-text-muted">Name</span>
              <input
                type="text"
                value={draft.name}
                placeholder={`e.g. ${preset.label} production`}
                onChange={(e) => setDraft((d) => d && { ...d, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>
            <label className="block">
              <span className="text-xs text-text-muted">Provider</span>
              <select
                value={draft.provider}
                onChange={(e) => {
                  const provider = e.target.value as Provider;
                  setDraft((d) => d && { ...d, ...defaultConfig(provider), provider, name: d.name, apiKey: d.apiKey, id: d.id });
                }}
                className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
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
                value={draft.model}
                placeholder={preset.defaultModel || "model id"}
                onChange={(e) => setDraft((d) => d && { ...d, model: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>
            {draft.provider === "opensource" && (
              <label className="block">
                <span className="text-xs text-text-muted">Base URL (OpenAI-compatible)</span>
                <input
                  type="text"
                  value={draft.baseUrl}
                  placeholder="https://your-endpoint.example.com/v1"
                  onChange={(e) => setDraft((d) => d && { ...d, baseUrl: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </label>
            )}
            <label className="block md:col-span-2">
              <span className="text-xs text-text-muted">API key</span>
              <div className="mt-1 flex gap-2">
                <input
                  type={showKey ? "text" : "password"}
                  value={draft.apiKey}
                  placeholder={preset.keyHint}
                  onChange={(e) => setDraft((d) => d && { ...d, apiKey: e.target.value })}
                  className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-text font-mono focus:outline-none focus:ring-1 focus:ring-accent"
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
              onClick={saveDraft}
              className="rounded-md bg-accent-strong px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
            >
              {draft.id ? "Save changes" : "Save credential"}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-md border border-border px-4 py-2 text-sm text-text-muted hover:text-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-text-dim leading-relaxed">
        Keys are stored only in this browser and sent per-request to the
        /api/llm proxy. API usage bills to the key&apos;s own account. Each
        workflow runs on its assigned credential (set below or on the
        workflow&apos;s Configure panel); anything unassigned uses the default.
      </p>
    </div>
  );
}
