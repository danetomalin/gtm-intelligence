"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Fires D-DA against an approved source artifact and refreshes the page so
// the new pending assessment shows up in the Review Queue badge. Used
// inline on every approved Library card.
export function AssessDeploymentsButton({
  sourceArtifactTable,
  sourceArtifactId,
}: {
  sourceArtifactTable: string;
  sourceArtifactId: string;
}) {
  const [status, setStatus] = useState<"idle" | "firing" | "fired" | "error">(
    "idle",
  );
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function run() {
    setStatus("firing");
    try {
      const resp = await fetch("/api/agents/d-da/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceArtifactTable,
          sourceArtifactId,
        }),
      });
      if (!resp.ok) {
        setStatus("error");
        return;
      }
      setStatus("fired");
      // Refresh server data so any badge counts update.
      startTransition(() => router.refresh());
      // Reset the visual after a few seconds.
      setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setStatus("error");
    }
  }

  const label =
    status === "firing"
      ? "Assessing…"
      : status === "fired"
        ? "Sent to Review Queue ✓"
        : status === "error"
          ? "Failed — retry"
          : "Assess deployments";

  return (
    <button
      type="button"
      onClick={run}
      disabled={status === "firing"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition",
        status === "fired"
          ? "border-win bg-win-bg text-win"
          : status === "error"
            ? "border-danger bg-danger-bg text-danger"
            : "border-border bg-card text-text-muted hover:text-text hover:border-text-dim",
        status === "firing" && "opacity-60",
      )}
      title="Fire D-DA to assess which deployment formats fit this artifact"
    >
      {label}
    </button>
  );
}
