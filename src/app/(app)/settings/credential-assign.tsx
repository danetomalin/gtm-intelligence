"use client";
// Per-workflow credential picker — used on Settings workflow rows and
// the workflow page's Configure panel. Writes the assignment into the
// browser-local credential store; "Default" clears the assignment so
// the workflow follows whatever the default profile is.

import { useEffect, useState } from "react";
import {
  loadCredentialStore,
  setAssignment,
  subscribeSharedProfiles,
  type CredentialProfile,
  type CredentialStore,
} from "@/lib/llm/apiConfig";

export function CredentialAssign({
  workflowCode,
  onChanged,
}: {
  workflowCode: string;
  onChanged?: () => void;
}) {
  const [store, setStore] = useState<CredentialStore | null>(null);
  const [shared, setShared] = useState<CredentialProfile[]>([]);

  useEffect(() => {
    setStore(loadCredentialStore());
    // Subscribe to the shared profile fetch so this dropdown
    // re-renders when the server list arrives (and on later
    // refreshes if SHARED_*_KEY env vars are rotated).
    return subscribeSharedProfiles(setShared);
  }, []);

  if (!store) return null;
  const code = workflowCode.toUpperCase();
  const value = store.assignments[code] ?? "";
  const noOptions = store.profiles.length === 0 && shared.length === 0;

  return (
    <label className="inline-flex items-center gap-2 text-xs text-text-muted">
      Credentials
      <select
        value={value}
        onChange={(e) => {
          const next = setAssignment(code, e.target.value || null);
          setStore({ ...next });
          onChanged?.();
        }}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
      >
        <option value="">
          Default{noOptions ? " (none saved)" : ""}
        </option>
        {shared.length > 0 && (
          <optgroup label="Shared (org-managed)">
            {shared.map((p) => (
              <option key={p.id} value={p.id}>
                🔒 {p.name}
              </option>
            ))}
          </optgroup>
        )}
        {store.profiles.length > 0 && (
          <optgroup label="Personal">
            {store.profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </label>
  );
}
