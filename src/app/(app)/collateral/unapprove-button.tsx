"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Kicks an approved artifact back to pending_review so the Review Queue
// picks it up again. Used on Library cards alongside "Assess deployments".
// Optional comment captures why the reviewer pulled it back.
export function UnapproveButton({
  table,
  id,
}: {
  table: string;
  id: string;
}) {
  const [status, setStatus] = useState<"idle" | "firing" | "fired" | "error">(
    "idle",
  );
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function unapprove() {
    setStatus("firing");
    try {
      const resp = await fetch("/api/approvals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          table,
          id,
          action: "unapprove",
          comment: comment.trim() || undefined,
        }),
      });
      if (!resp.ok) {
        setStatus("error");
        return;
      }
      setStatus("fired");
      startTransition(() => router.refresh());
    } catch {
      setStatus("error");
    }
  }

  if (showComment) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Why? (optional)"
          className="rounded-md border border-border bg-card px-2 py-1 text-xs text-text focus:border-text-dim focus:outline-none w-44"
          autoFocus
        />
        <button
          type="button"
          onClick={unapprove}
          disabled={status === "firing"}
          className={cn(
            "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition",
            "border-warn bg-warn-bg text-warn hover:opacity-90",
            status === "firing" && "opacity-60",
          )}
        >
          {status === "firing" ? "Sending…" : "Unapprove"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowComment(false);
            setComment("");
          }}
          className="text-xs text-text-dim hover:text-text"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowComment(true)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition",
        status === "fired"
          ? "border-warn bg-warn-bg text-warn"
          : status === "error"
            ? "border-danger bg-danger-bg text-danger"
            : "border-border bg-card text-text-muted hover:text-text hover:border-text-dim",
      )}
      title="Send this artifact back to the Review Queue"
    >
      {status === "fired" ? "Sent back ✓" : "Unapprove"}
    </button>
  );
}
