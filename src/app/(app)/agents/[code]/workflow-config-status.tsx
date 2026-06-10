"use client";
// Read-only config status for a workflow page (replaced the Configure
// button 2026-06-09 — Settings is the single editing surface). Shows
// which instructions and credential profile this workflow runs on,
// both configured in /settings.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  isConfigured,
  loadCredentialStore,
  resolveCredential,
} from "@/lib/llm/apiConfig";

export function WorkflowConfigStatus({ agentCode }: { agentCode: string }) {
  const [customized, setCustomized] = useState<boolean | null>(null);
  const [credLabel, setCredLabel] = useState<string | null>(null);
  const [credOk, setCredOk] = useState(false);

  useEffect(() => {
    const store = loadCredentialStore();
    const resolved = resolveCredential(agentCode, store);
    if (resolved) {
      const assigned = !!store.assignments[agentCode.toUpperCase()];
      setCredLabel(`${resolved.name}${assigned ? "" : " (default)"}`);
      setCredOk(isConfigured(resolved));
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/workflows/${agentCode.toLowerCase()}/config`);
        const body = await res.json();
        if (!cancelled) {
          setCustomized((body.config?.instructions ?? "").trim().length > 0);
        }
      } catch {
        if (!cancelled) setCustomized(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentCode]);

  return (
    <div className="flex justify-end text-xs text-text-dim">
      <span>
        {customized === null ? "…" : customized ? "Custom instructions" : "Default instructions"}
        {" · "}
        {credLabel === null ? (
          <span className="text-warn">no credentials saved</span>
        ) : credOk ? (
          <>runs on {credLabel}</>
        ) : (
          <span className="text-warn">{credLabel} has no key</span>
        )}
        {" · "}
        <Link href="/settings" className="text-accent">
          Edit in Settings
        </Link>
      </span>
    </div>
  );
}
