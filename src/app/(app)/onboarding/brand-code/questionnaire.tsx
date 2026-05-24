"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Twelve-question intake per PLAN §3b Decision #5 (conversational MVP).
// Order matters: each question is sequential. The user can skip with empty
// answer; R-BR's Build Context handles missing fields gracefully.
const QUESTIONS: { key: string; prompt: string; placeholder: string; long?: boolean }[] = [
  {
    key: "competitors",
    prompt: "Who are your top 3–5 competitors? Paste their names and domains.",
    placeholder: "Crayon (crayon.co), Klue (klue.com), …",
    long: true,
  },
  {
    key: "value_prop_sentence",
    prompt: "What's your value proposition in one sentence?",
    placeholder: "Throughline runs the GTM-intelligence work product for org-scale PMM teams.",
  },
  {
    key: "swap_test",
    prompt:
      "What changes if you swap a competitor's brand into your statement and nothing else feels different?",
    placeholder: "Honest answer welcome. If nothing changes, that's the gap.",
    long: true,
  },
  {
    key: "homepage_quote",
    prompt: "Drop in a customer quote you wish every prospect saw on your homepage.",
    placeholder: "“Throughline gave our PMM team continuity through two leadership changes…”",
    long: true,
  },
  {
    key: "proudest_number",
    prompt: "What's one number your team is proudest of?",
    placeholder: "Cut competitive intel cycle from 6 hrs/week to 45 min/week per PMM.",
  },
  {
    key: "never_say",
    prompt: "What are 3 words or phrases you'd never let marketing say?",
    placeholder: "industry-leading, best-in-class, world-class",
  },
  {
    key: "say_more",
    prompt: "What are 3 words or phrases you wish marketing said more?",
    placeholder: "operational, auditable, methodology-anchored",
  },
  {
    key: "buyer_paragraph",
    prompt: "Describe your buyer in one paragraph. Title, segment, what their week looks like.",
    placeholder: "Senior PMM at a growth-stage SaaS (Series B–D)…",
    long: true,
  },
  {
    key: "worst_meeting",
    prompt:
      "Pick the worst meeting you've had with that buyer and tell us what they said.",
    placeholder: "Verbatim if you can. The quotes that haunt you are the gold.",
    long: true,
  },
  {
    key: "underexplained_features",
    prompt: "What 3 features do you wish prospects understood better?",
    placeholder: "Multi-tenant RLS, methodology-anchored output, reviewer-edit feedback loop",
    long: true,
  },
  {
    key: "money_proof",
    prompt: "What's the proof point that lands when nothing else does?",
    placeholder: "“Replaces 4–6 hours/week of competitive-intel grunt work.”",
    long: true,
  },
  {
    key: "category_myth",
    prompt: "What's your category's biggest myth — and what's the truth?",
    placeholder: "Myth: AI replaces PMM. Truth: AI operationalizes the work product so PMM compounds.",
    long: true,
  },
];

type Status = "idle" | "submitting" | "running" | "success" | "error";

export function BrandCodeQuestionnaire() {
  const router = useRouter();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const total = QUESTIONS.length;
  const current = QUESTIONS[cursor];
  const isLast = cursor === total - 1;

  function next() {
    setCursor((c) => Math.min(c + 1, total - 1));
  }
  function back() {
    setCursor((c) => Math.max(c - 1, 0));
  }
  function setAnswer(value: string) {
    setResponses((r) => ({ ...r, [current.key]: value }));
  }

  async function submit() {
    setStatus("submitting");
    setError(null);
    try {
      const transcript = QUESTIONS.map((q) => ({
        key: q.key,
        prompt: q.prompt,
        answer: (responses[q.key] ?? "").trim(),
      }));
      const res = await fetch("/api/agents/r-br/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server returned ${res.status}`);
      }
      setStatus("running");
      // R-BR is asynchronous; the agent processes in the background. Route to
      // the agent page where the user can watch rows land.
      setTimeout(() => router.push("/agents/r-br"), 600);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const answeredCount = QUESTIONS.filter(
    (q) => (responses[q.key] ?? "").trim().length > 0,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-card overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${((cursor + 1) / total) * 100}%` }}
          />
        </div>
        <div className="text-xs text-text-dim tabular-nums">
          {cursor + 1} / {total}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card px-6 py-6">
        <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-2">
          Question {cursor + 1}
        </div>
        <h2 className="text-lg font-semibold text-text leading-relaxed mb-4">
          {current.prompt}
        </h2>
        {current.long ? (
          <textarea
            value={responses[current.key] ?? ""}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={current.placeholder}
            rows={4}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text leading-relaxed placeholder:text-text-dim focus:outline-none focus:border-accent"
          />
        ) : (
          <input
            type="text"
            value={responses[current.key] ?? ""}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={current.placeholder}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-accent"
          />
        )}
        <div className="text-xs text-text-dim mt-2">
          Skip with a blank answer — R-BR handles missing fields. You can always
          edit later from the agent page.
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={cursor === 0 || status !== "idle"}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm text-text-muted transition hover:text-text disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Back
        </button>
        <div className="text-xs text-text-dim">
          {answeredCount} of {total} answered
        </div>
        {isLast ? (
          <button
            type="button"
            onClick={submit}
            disabled={status !== "idle" && status !== "error"}
            className="rounded-md bg-accent-strong px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === "submitting"
              ? "Submitting…"
              : status === "running"
                ? "Run started"
                : "Submit to R-BR"}
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            disabled={status !== "idle"}
            className="rounded-md bg-accent-strong px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger-bg/40 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      {status === "running" && (
        <div className="rounded-md border border-accent/40 bg-accent-bg/30 px-4 py-3 text-sm text-text-muted">
          R-BR is processing your brand code. Sonnet extraction typically takes
          30–90 seconds. Taking you to the agent page…
        </div>
      )}
    </div>
  );
}
