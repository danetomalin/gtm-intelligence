"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "firing" | "fired" | "error";

export function ShipReadinessPackButton({
  launchId,
  launchStatus,
  remainingDelivery,
}: {
  launchId: string;
  launchStatus: string;
  remainingDelivery: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  // Gate: only enabled when launch is in_progress or ready AND every required
  // delivery (non-X-*) slot is produced.
  const eligible =
    (launchStatus === "in_progress" || launchStatus === "ready" || launchStatus === "draft") &&
    remainingDelivery === 0;

  async function ship() {
    setStatus("firing");
    setError(null);
    try {
      const res = await fetch(`/api/launches/${launchId}/ship`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server returned ${res.status}`);
      }
      const body: { fired: number; errors: number; shipped: boolean } = await res.json();
      setStatus("fired");
      setSummary(
        body.shipped
          ? `Shipped via ${body.fired} channel(s)${body.errors ? `, ${body.errors} error(s)` : ""}.`
          : `No channels fired${body.errors ? ` (${body.errors} error(s))` : ""}.`,
      );
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  let label = "Ship readiness pack";
  if (launchStatus === "shipped" || launchStatus === "post_mortem") {
    label = "Already shipped";
  } else if (remainingDelivery > 0) {
    label = `Ship (${remainingDelivery} delivery slots remaining)`;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={ship}
        disabled={!eligible || status === "firing"}
        className="inline-flex items-center gap-2 rounded-md bg-win px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === "firing" && (
          <span className="inline-block h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        )}
        {status === "firing" ? "Shipping…" : label}
      </button>
      {summary && <p className="text-xs text-text-muted">{summary}</p>}
      {error && (
        <p className="text-xs text-danger max-w-xs text-right">{error}</p>
      )}
    </div>
  );
}

export function RetrospectiveButton({
  launchId,
  launchStatus,
}: {
  launchId: string;
  launchStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const eligible = launchStatus === "shipped" || launchStatus === "post_mortem";

  async function run() {
    setStatus("firing");
    setError(null);
    try {
      const res = await fetch(`/api/launches/${launchId}/retrospective`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server returned ${res.status}`);
      }
      const body: { fired: number; errors: number } = await res.json();
      setStatus("fired");
      setSummary(`Retrospective: ${body.fired} workflow(s) fired${body.errors ? `, ${body.errors} error(s)` : ""}.`);
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
        onClick={run}
        disabled={!eligible || status === "firing"}
        className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent-bg px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === "firing" && (
          <span className="inline-block h-3 w-3 rounded-full border-2 border-accent/40 border-t-accent animate-spin" />
        )}
        {status === "firing" ? "Running…" : "Run retrospective"}
      </button>
      {summary && <p className="text-xs text-text-muted">{summary}</p>}
      {error && (
        <p className="text-xs text-danger max-w-xs text-right">{error}</p>
      )}
    </div>
  );
}
