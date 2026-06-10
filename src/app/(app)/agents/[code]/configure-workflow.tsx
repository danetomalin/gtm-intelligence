"use client";
// Slim per-workflow Configure (Phase C). Edits this workflow's
// operating instructions — the same workflow_configs row Settings
// edits. Credentials are deliberately NOT here: they're centralized
// in /settings (decision 2026-06-09 — one key store, not 28).

import { useEffect, useState } from "react";
import Link from "next/link";
import { isConfigured, loadApiConfig } from "@/lib/llm/apiConfig";
import { InstructionsEditor } from "../../settings/instructions-editor";

export function ConfigureWorkflow({
  agentCode,
  defaultInstructions,
}: {
  agentCode: string;
  defaultInstructions: string;
}) {
  const [open, setOpen] = useState(false);
  const [credsOk, setCredsOk] = useState<boolean | null>(null);

  useEffect(() => {
    setCredsOk(isConfigured(loadApiConfig()));
  }, [open]);

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
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="text-xs uppercase tracking-wider text-text-muted">
              Operating instructions — {agentCode}
            </div>
            <div className="text-xs text-text-dim">
              {credsOk === null ? null : credsOk ? (
                <span className="text-win">Credentials configured</span>
              ) : (
                <span className="text-warn">No API credentials yet</span>
              )}
              {" · "}
              <Link href="/settings" className="text-accent">
                Manage in Settings
              </Link>
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
