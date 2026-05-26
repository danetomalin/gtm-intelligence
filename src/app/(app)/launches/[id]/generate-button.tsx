"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "firing" | "fired" | "error";

export function GenerateReadinessPackButton({
  launchId,
  remaining,
}: {
  launchId: string;
  remaining: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  async function generate() {
    if (remaining === 0) return;
    setStatus("firing");
    setError(null);
    try {
      const res = await fetch(`/api/launches/${launchId}/generate`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server returned ${res.status}`);
      }
      const body: { fired: number; errors: number } = await res.json();
      setStatus("fired");
      setSummary(`Fired ${body.fired} workflow(s)${body.errors ? `, ${body.errors} error(s)` : ""}.`);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={generate}
        disabled={status === "firing" || remaining === 0}
        className="inline-flex items-center gap-2 rounded-md bg-accent-strong px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "firing" && (
          <span className="inline-block h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        )}
        {remaining === 0
          ? "All required produced"
          : status === "firing"
            ? "Firing…"
            : status === "fired"
              ? "Generated"
              : `Generate readiness pack (${remaining})`}
      </button>
      {summary && (
        <p className="text-xs text-text-muted">{summary}</p>
      )}
      {error && (
        <p className="text-xs text-danger max-w-xs text-right">{error}</p>
      )}
    </div>
  );
}
