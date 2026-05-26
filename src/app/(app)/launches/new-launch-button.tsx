"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LAUNCH_TIERS,
  TIER_LABEL,
  TIER_TAGLINE,
  TIER_MATRIX,
  type LaunchTier,
} from "@/lib/launch-tiers";

type Status = "idle" | "submitting" | "error";

export function NewLaunchButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tier, setTier] = useState<LaunchTier>("feature");
  const [productSummary, setProductSummary] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setTier("feature");
    setProductSummary("");
    setTargetDate("");
    setStatus("idle");
    setError(null);
  }

  async function submit() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/launches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tier,
          product_summary: productSummary.trim() || null,
          launch_date_target: targetDate || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server returned ${res.status}`);
      }
      const { id } = await res.json();
      setOpen(false);
      reset();
      router.push(`/launches/${id}`);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const matrixPreview = TIER_MATRIX[tier];
  const requiredCount = matrixPreview.filter((m) => m.required).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-shrink-0 inline-flex items-center gap-2 rounded-md bg-accent-strong px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent"
      >
        + New launch
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => {
            if (status !== "submitting") setOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-border bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-border">
              <h2 className="text-lg font-semibold text-text">New launch</h2>
              <p className="text-xs text-text-dim mt-1">
                Pick a tier; the readiness pack assembles itself from the
                matrix.
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-1">
                  Launch name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wegovy generic compounding · v1"
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-1">
                  Tier
                </label>
                <div className="space-y-2">
                  {LAUNCH_TIERS.map((t) => (
                    <label
                      key={t}
                      className={`flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer transition ${
                        tier === t
                          ? "border-accent bg-accent-bg/30"
                          : "border-border bg-card hover:border-text-dim"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tier"
                        value={t}
                        checked={tier === t}
                        onChange={() => setTier(t)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-text">
                          {TIER_LABEL[t]}
                        </div>
                        <div className="text-xs text-text-dim mt-0.5">
                          {TIER_TAGLINE[t]}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-1">
                  Product summary (optional)
                </label>
                <textarea
                  value={productSummary}
                  onChange={(e) => setProductSummary(e.target.value)}
                  rows={3}
                  placeholder="Paragraph describing what's being released. Used by every downstream workflow as context."
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-text-dim font-semibold mb-1">
                  Target launch date (optional)
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                />
              </div>
              <div className="rounded-md border border-border bg-card/40 px-3 py-2 text-xs text-text-muted">
                The {TIER_LABEL[tier]} tier expects{" "}
                <span className="text-text font-semibold">
                  {requiredCount} required
                </span>{" "}
                + {matrixPreview.length - requiredCount} optional artifacts.
              </div>
              {error && (
                <div className="text-xs text-danger">{error}</div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (status !== "submitting") {
                    setOpen(false);
                    reset();
                  }
                }}
                className="rounded-md border border-border bg-card px-4 py-2 text-sm text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={status === "submitting"}
                className="rounded-md bg-accent-strong px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === "submitting" ? "Creating…" : "Create launch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
