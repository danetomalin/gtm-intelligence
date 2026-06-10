"use client";
// Shared editor for one workflow's operating instructions — used by
// both Settings (list rows) and the per-workflow Configure panel.
// Same workflow_configs row underneath, whichever surface edits it.

import { useEffect, useState } from "react";

export function InstructionsEditor({
  code,
  defaultInstructions,
  initialInstructions,
  onSaved,
}: {
  code: string;
  defaultInstructions: string;
  // Pass when the caller already fetched the row (Settings list);
  // omit to let the editor fetch on mount (workflow page panel).
  initialInstructions?: string | null;
  onSaved?: (instructions: string) => void;
}) {
  const [text, setText] = useState(initialInstructions ?? "");
  const [loading, setLoading] = useState(initialInstructions === undefined);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (initialInstructions !== undefined) {
      setText(initialInstructions ?? "");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/workflows/${code.toLowerCase()}/config`);
        const body = await res.json();
        if (!cancelled) setText(body.config?.instructions ?? "");
      } catch {
        // leave empty — placeholder shows the default
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, initialInstructions]);

  async function save(value: string) {
    setState("saving");
    try {
      const res = await fetch(`/api/workflows/${code.toLowerCase()}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: value }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setState("saved");
      onSaved?.(value);
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <textarea
        value={text}
        disabled={loading}
        rows={8}
        placeholder={`Default behavior (no custom instructions saved):\n\n${defaultInstructions}`}
        onChange={(e) => {
          setText(e.target.value);
          setState("idle");
        }}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={state === "saving" || loading}
          onClick={() => save(text)}
          className="rounded-md bg-accent-strong px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          {state === "saving" ? "Saving…" : "Save instructions"}
        </button>
        <button
          type="button"
          disabled={state === "saving" || loading || text.trim().length === 0}
          onClick={() => {
            setText("");
            save("");
          }}
          className="rounded-md border border-border px-4 py-2 text-sm text-text-muted hover:text-text disabled:opacity-50"
        >
          Reset to default
        </button>
        {state === "saved" && <span className="text-xs text-win">Saved.</span>}
        {state === "error" && (
          <span className="text-xs text-danger">Save failed — try again.</span>
        )}
      </div>
      <p className="mt-2 text-xs text-text-dim">
        These instructions are the workflow&apos;s operating brief — the system
        prompt the runner uses on every execution. Empty means the workflow
        falls back to its built-in default behavior.
      </p>
    </div>
  );
}
