"use client";
// Per-workflow credential picker — used on Settings workflow rows and
// the workflow page's Configure panel. Writes the assignment into the
// browser-local credential store; "Default" clears the assignment so
// the workflow follows whatever the default profile is.

import { useEffect, useState } from "react";
import {
  loadCredentialStore,
  setAssignment,
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

  useEffect(() => {
    setStore(loadCredentialStore());
  }, []);

  if (!store) return null;
  const code = workflowCode.toUpperCase();
  const value = store.assignments[code] ?? "";

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
          Default{store.profiles.length === 0 ? " (none saved)" : ""}
        </option>
        {store.profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
