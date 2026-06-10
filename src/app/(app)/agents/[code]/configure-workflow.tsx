"use client";
// Slim per-workflow Configure (Phase C). Edits this workflow's
// operating instructions — the same workflow_configs row Settings
// edits — and assigns which saved credential profile the workflow
// runs on. Credential profiles themselves are managed centrally in
// /settings (one key store, not 28).

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  isConfigured,
  loadCredentialStore,
  resolveCredential,
} from "@/lib/llm/apiConfig";
import { CredentialAssign } from "../../settings/credential-assign";
import { InstructionsEditor } from "../../settings/instructions-editor";

export function ConfigureWorkflow({
  agentCode,
  defaultInstructions,
}: {
  agentCode: string;
  defaultInstructions: string;
}) {
  const [open, setOpen] = useState(false);
  const [credLabel, setCredLabel] = useState<string | null>(null);
  const [credOk, setCredOk] = useState(false);
  const [storeVersion, setStoreVersion] = useState(0);

  useEffect(() => {
    const store = loadCredentialStore();
    const resolved = resolveCredential(agentCode, store);
    if (!resolved) {
      setCredLabel(null);
      setCredOk(false);
      return;
    }
    const assigned = !!store.assignments[agentCode.toUpperCase()];
    setCredLabel(`${resolved.name}${assigned ? "" : " (default)"}`);
    setCredOk(isConfigured(resolved));
  }, [agentCode, open, storeVersion]);

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-text-muted hover:text-text hover:bg-card-hover transition"
        >
          Configure
          <span className="text-[10px]">{open ? "▾" : "▸"}</span>
        </button>
      </div>

      {open && (
        <div className="mt-4 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <div className="text-xs uppercase tracking-wider text-text-muted">
              Operating instructions — {agentCode}
            </div>
            <div className="flex items-center gap-3">
              <CredentialAssign
                workflowCode={agentCode}
                onChanged={() => setStoreVersion((v) => v + 1)}
              />
              <span className="text-xs text-text-dim">
                {credLabel === null ? (
                  <span className="text-warn">No credentials saved</span>
                ) : credOk ? (
                  <span className="text-win">Runs on {credLabel}</span>
                ) : (
                  <span className="text-warn">{credLabel} has no key</span>
                )}
                {" · "}
                <Link href="/settings" className="text-accent">
                  Manage in Settings
                </Link>
              </span>
            </div>
          </div>
          <InstructionsEditor
            code={agentCode}
            defaultInstructions={defaultInstructions}
          />
        </div>
      )}
    </>
  );
}
