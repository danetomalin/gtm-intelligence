"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Editable positioning statement. Shows the override when set, otherwise
// the auto-composed statement. Editing seeds the textarea from whichever
// is currently displayed. Saving writes an override; "Reset to auto"
// clears it so the live-composed version takes back over.
export function PositioningStatementEditor({
  brandId,
  autoComposed,
  override,
}: {
  brandId: string;
  autoComposed: string | null;
  override: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(override ?? autoComposed ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isOverridden = override != null && override.trim().length > 0;
  const displayed = isOverridden ? override : autoComposed;

  async function save(next: string | null) {
    setError(null);
    startTransition(async () => {
      try {
        const resp = await fetch("/api/positioning-statement", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ brandId, statement: next }),
        });
        if (!resp.ok) {
          const b = await resp.json().catch(() => ({}));
          throw new Error(b.error ?? `HTTP ${resp.status}`);
        }
        setEditing(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-border bg-surface border-l-2 border-l-accent px-6 py-5 space-y-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-base text-text leading-relaxed focus:border-text-dim focus:outline-none resize-y"
          autoFocus
        />
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => save(draft)}
            disabled={pending}
            className={cn(
              "rounded-md bg-accent text-white px-4 py-1.5 text-sm font-semibold transition hover:opacity-90",
              pending && "opacity-60",
            )}
          >
            {pending ? "Saving…" : "Save statement"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(autoComposed ?? "");
            }}
            className="text-xs text-text-muted hover:text-text"
            title="Replace the draft with the auto-composed version"
          >
            Reset draft to auto-composed
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDraft(override ?? autoComposed ?? "");
            }}
            className="text-xs text-text-dim hover:text-text"
          >
            Cancel
          </button>
          {error && (
            <span className="text-xs text-danger font-mono">{error}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface border-l-2 border-l-accent px-6 py-6">
      <p className="text-lg text-text leading-relaxed">{displayed}</p>
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <span className="text-[11px] text-text-dim">
          {isOverridden
            ? "Hand-edited override. Auto-composition is paused for this statement."
            : "Auto-composed from the five elements below — stays in sync when S-PO refreshes."}
        </span>
        <button
          type="button"
          onClick={() => {
            setDraft(displayed ?? "");
            setEditing(true);
          }}
          className="text-xs font-medium text-accent hover:underline"
        >
          Edit
        </button>
        {isOverridden && (
          <button
            type="button"
            onClick={() => save(null)}
            disabled={pending}
            className="text-xs text-text-muted hover:text-text"
            title="Discard the override and revert to the auto-composed statement"
          >
            Reset to auto
          </button>
        )}
      </div>
    </div>
  );
}
