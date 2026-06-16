// ============================================================
// SHARED CREDENTIALS (server-side registry)
//
// A curated list of LLM credentials that the org admin pre-loads
// into Vercel env vars. Members never see the key value — they
// pick a profile by id, and /api/llm resolves the env-var key
// server-side at call time via x-llm-shared-id.
//
// To add a new shared profile:
//   1. Add a new entry to SHARED_PROFILES below
//   2. Set the matching env var on Vercel (Production + Preview)
//   3. Redeploy
//
// listShared() auto-filters entries whose env var isn't set so
// members never see a profile they can't use.
//
// SECURITY: never import this module into a 'use client' file.
// It reads process.env; the bundle would expose key names to the
// browser. /api/credentials/shared + /api/llm are the only
// consumers.
// ============================================================

import type { Provider } from "./apiConfig";

export interface SharedCredentialEntry {
  id: string;
  name: string;
  provider: Provider;
  model: string;
  envVarName: string;
  baseUrl?: string;
  description?: string;
}

const SHARED_PROFILES: SharedCredentialEntry[] = [
  {
    id: "shared-gemini-demo",
    name: "Demo Team Gemini",
    provider: "google",
    model: "gemini-2.5-flash",
    envVarName: "SHARED_GEMINI_KEY",
    description:
      "Org-managed Gemini key for demo runs. No setup required.",
  },
  {
    id: "shared-anthropic-demo",
    name: "Demo Team Claude",
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    envVarName: "SHARED_ANTHROPIC_KEY",
    description:
      "Org-managed Anthropic key for demo runs. No setup required.",
  },
];

export interface SharedCredentialMetadata {
  id: string;
  name: string;
  provider: Provider;
  model: string;
  baseUrl: string;
  description: string | null;
}

function envValue(name: string): string | null {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v : null;
}

export function listShared(): SharedCredentialMetadata[] {
  return SHARED_PROFILES
    .filter((p) => envValue(p.envVarName) !== null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      provider: p.provider,
      model: p.model,
      baseUrl: p.baseUrl ?? "",
      description: p.description ?? null,
    }));
}

export interface ResolvedSharedCredential {
  id: string;
  name: string;
  provider: Provider;
  model: string;
  baseUrl: string;
  apiKey: string;
}

// Server-only. NEVER expose the returned apiKey to a client
// component or response body. Consumers should use it to make
// an outbound provider call and discard.
export function resolveShared(id: string): ResolvedSharedCredential | null {
  const entry = SHARED_PROFILES.find((p) => p.id === id);
  if (!entry) return null;
  const apiKey = envValue(entry.envVarName);
  if (!apiKey) return null;
  return {
    id: entry.id,
    name: entry.name,
    provider: entry.provider,
    model: entry.model,
    baseUrl: entry.baseUrl ?? "",
    apiKey,
  };
}

export function isSharedId(id: string | null | undefined): boolean {
  if (!id) return false;
  return SHARED_PROFILES.some((p) => p.id === id);
}
