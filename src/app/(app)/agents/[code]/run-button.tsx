"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveCredential } from "@/lib/llm/apiConfig";

type Status = "idle" | "starting" | "running" | "success" | "error";

export function RunButton({
  agentCode,
  initialLastStatus,
}: {
  agentCode: string;
  initialLastStatus: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(
    initialLastStatus === "running" ? "running" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function onClick() {
    setStatus("starting");
    setError(null);
    try {
      // Native workflows execute on the credential profile assigned in
      // Settings (or the default). n8n-backed workflows ignore these.
      const cred = resolveCredential(agentCode);
      const res = await fetch(`/api/agents/${agentCode.toLowerCase()}/run`, {
        method: "POST",
        headers: cred
          ? {
              "x-llm-provider": cred.provider,
              "x-llm-key": cred.apiKey,
              "x-llm-model": cred.model,
              "x-llm-base-url": cred.baseUrl,
            }
          : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server returned ${res.status}`);
      }
      const { runId } = await res.json();
      setStatus("running");

      // Poll run_history every 4s for status changes. ~45s typical runtime.
      let elapsed = 0;
      pollRef.current = setInterval(async () => {
        elapsed += 4;
        try {
          const statusRes = await fetch(
            `/api/agents/${agentCode.toLowerCase()}/status?runId=${runId}`,
          );
          if (!statusRes.ok) return;
          const { status: runStatus } = await statusRes.json();
          if (runStatus === "success") {
            if (pollRef.current) clearInterval(pollRef.current);
            setStatus("success");
            router.refresh();
          } else if (runStatus === "error") {
            if (pollRef.current) clearInterval(pollRef.current);
            setStatus("error");
            setError("The agent run errored. Check n8n executions for detail.");
          }
        } catch {
          // swallow, keep polling
        }
        // Hard timeout after 3 minutes
        if (elapsed > 180) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus("error");
          setError("Run did not complete within 3 minutes.");
        }
      }, 4000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const disabled = status === "starting" || status === "running";

  const label =
    status === "starting"
      ? "Starting…"
      : status === "running"
        ? "Running…"
        : status === "success"
          ? "Run again"
          : status === "error"
            ? "Retry"
            : "Run now";

  return (
    <div className="flex-shrink-0 flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-md bg-accent-strong px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {disabled && (
          <span className="inline-block h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        )}
        {label}
      </button>
      {error && (
        <p className="text-xs text-danger max-w-xs text-right">{error}</p>
      )}
    </div>
  );
}
