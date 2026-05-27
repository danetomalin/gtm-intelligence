"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ApprovalButtons } from "./approval-buttons";

export type DeploymentFormat = {
  id: string;
  assessment_id: string | null;
  source_artifact_table: string | null;
  source_artifact_id: string | null;
  format_type: string | null;
  title: string | null;
  body_json: unknown;
  body_markdown: string | null;
  audience: string | null;
  channel: string | null;
  approval_status: string | null;
  risk_tier?: string | null;
  rendered_file_url?: string | null;
  rendered_file_kind?: string | null;
  created_at?: string | null;
};

// Maps format_type to the file extension we'll produce on render. Used
// for the button label only; the actual extension comes from the
// renderer return value on the server.
const FORMAT_EXTENSION: Record<string, string> = {
  one_pager: "docx",
  slide_deck: "pptx",
  linkedin_carousel: "pptx",
  video_script: "docx",
  faq: "docx",
  email_sequence: "md",
  linkedin_post: "md",
  infographic: "md",
};

const FORMAT_LABEL: Record<string, string> = {
  one_pager: "One-pager",
  slide_deck: "Slide deck",
  email_sequence: "Email sequence",
  linkedin_post: "LinkedIn post",
  linkedin_carousel: "LinkedIn carousel",
  video_script: "Video script",
  faq: "FAQ",
  infographic: "Infographic",
};

function safeParse(raw: unknown): unknown {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

export function DeploymentFormatCard({
  fmt,
  showApprovalButtons = false,
}: {
  fmt: DeploymentFormat;
  showApprovalButtons?: boolean;
}) {
  const label = FORMAT_LABEL[fmt.format_type ?? ""] ?? fmt.format_type ?? "—";
  const body = safeParse(fmt.body_json);
  const isPending =
    fmt.approval_status === "pending_review" ||
    fmt.approval_status === "needs_revision";

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 text-[10px] uppercase tracking-wider">
              <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
                {label}
              </span>
              {fmt.source_artifact_table && (
                <span className="text-text-dim font-mono">
                  derived from {fmt.source_artifact_table}
                </span>
              )}
            </div>
            {fmt.title && (
              <h3 className="text-base font-semibold text-text leading-snug">
                {fmt.title}
              </h3>
            )}
            {(fmt.audience || fmt.channel) && (
              <div className="text-[11px] text-text-dim mt-0.5">
                {[fmt.audience, fmt.channel].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
          {fmt.risk_tier && (
            <span
              className={cn(
                "flex-shrink-0 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5",
                fmt.risk_tier === "high"
                  ? "bg-danger-bg text-danger"
                  : fmt.risk_tier === "medium"
                    ? "bg-warn-bg text-warn"
                    : "bg-card text-text-dim",
              )}
            >
              {fmt.risk_tier}
            </span>
          )}
        </div>

        <FormatBody formatType={fmt.format_type} body={body} markdown={fmt.body_markdown} />

        {(isPending || showApprovalButtons) && (
          <div className="border-t border-border pt-3">
            <ApprovalButtons table="deployment_formats" id={fmt.id} />
          </div>
        )}

        <RenderActions fmt={fmt} />
      </div>
    </div>
  );
}

// Render to .docx/.pptx/.md and download. Visible on every card. Once
// rendered, the button switches to a Download link pointing at the
// uploaded file in Supabase Storage. Re-render is one click — generates
// a fresh timestamped object and replaces the URL on the row.
function RenderActions({ fmt }: { fmt: DeploymentFormat }) {
  const [status, setStatus] = useState<"idle" | "firing" | "fired" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const targetExt =
    FORMAT_EXTENSION[fmt.format_type ?? ""] ?? fmt.rendered_file_kind ?? "file";
  const hasRendered =
    fmt.rendered_file_url != null && fmt.rendered_file_url !== "";

  async function render() {
    setStatus("firing");
    setErrorMsg(null);
    try {
      const resp = await fetch(`/api/deployments/${fmt.id}/render`, {
        method: "POST",
      });
      if (!resp.ok) {
        setStatus("error");
        try {
          const j = await resp.json();
          setErrorMsg(j?.error ?? `HTTP ${resp.status}`);
        } catch {
          setErrorMsg(`HTTP ${resp.status}`);
        }
        return;
      }
      setStatus("fired");
      startTransition(() => router.refresh());
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="border-t border-border pt-3 flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={render}
          disabled={status === "firing"}
          className={cn(
            "inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium transition",
            status === "fired"
              ? "border-win bg-win-bg text-win"
              : status === "error"
                ? "border-danger bg-danger-bg text-danger"
                : "border-border bg-card text-text-muted hover:text-text hover:border-text-dim",
            status === "firing" && "opacity-60",
          )}
          title={hasRendered ? `Regenerate .${targetExt}` : `Render to .${targetExt}`}
        >
          {status === "firing"
            ? "Rendering…"
            : status === "fired"
              ? "Rendered ✓"
              : hasRendered
                ? `Re-render .${targetExt}`
                : `Render to .${targetExt}`}
        </button>
        {hasRendered && fmt.rendered_file_url && (
          <a
            href={fmt.rendered_file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md border border-accent bg-accent-bg text-accent px-3 py-1.5 text-xs font-medium hover:opacity-90"
          >
            Download .{fmt.rendered_file_kind ?? targetExt}
          </a>
        )}
      </div>
      {errorMsg && (
        <span className="text-[11px] text-danger font-mono">{errorMsg}</span>
      )}
    </div>
  );
}

// Format-specific body rendering. Each format has its own jsonb shape; falls
// back to the markdown preview when the structure can't be matched.
function FormatBody({
  formatType,
  body,
  markdown,
}: {
  formatType: string | null;
  body: unknown;
  markdown: string | null;
}) {
  if (!body || typeof body !== "object") {
    return markdown ? (
      <pre className="text-xs text-text-muted whitespace-pre-wrap leading-relaxed font-sans">
        {markdown}
      </pre>
    ) : null;
  }

  const b = body as Record<string, unknown>;

  if (formatType === "one_pager" && Array.isArray(b.sections)) {
    return (
      <div className="space-y-2.5">
        {(b.sections as Array<Record<string, unknown>>).map((s, i) => (
          <div key={i}>
            {s.heading && (
              <div className="text-xs uppercase tracking-wider text-accent font-semibold mb-1">
                {String(s.heading)}
              </div>
            )}
            {s.body && (
              <p className="text-sm text-text leading-relaxed">{String(s.body)}</p>
            )}
          </div>
        ))}
        {b.cta && (
          <div className="border-l-2 border-accent pl-3 mt-2">
            <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
              CTA
            </div>
            <p className="text-sm text-text leading-relaxed">{String(b.cta)}</p>
          </div>
        )}
      </div>
    );
  }

  if (formatType === "slide_deck" && Array.isArray(b.slides)) {
    return (
      <div className="space-y-2">
        {(b.slides as Array<Record<string, unknown>>).map((s, i) => (
          <div
            key={i}
            className="rounded-md border border-border bg-surface/40 px-3 py-2.5"
          >
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-mono text-[10px] text-text-dim tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm font-semibold text-text">
                {String(s.title ?? `Slide ${i + 1}`)}
              </span>
            </div>
            {Array.isArray(s.bullets) && (
              <ul className="text-xs text-text-muted leading-relaxed space-y-0.5 ml-6 list-disc">
                {(s.bullets as unknown[]).map((bullet, j) => (
                  <li key={j}>{String(bullet)}</li>
                ))}
              </ul>
            )}
            {s.speaker_notes && (
              <p className="text-[11px] text-text-dim italic mt-1 ml-6 leading-relaxed">
                Notes: {String(s.speaker_notes)}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (formatType === "email_sequence" && Array.isArray(b.emails)) {
    return (
      <div className="space-y-2">
        {(b.emails as Array<Record<string, unknown>>).map((e, i) => (
          <div
            key={i}
            className="rounded-md border border-border bg-surface/40 px-3 py-2.5"
          >
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-sm font-semibold text-text leading-snug">
                {String(e.subject ?? `Email ${i + 1}`)}
              </span>
              {e.send_after_days != null && (
                <span className="text-[10px] text-text-dim font-mono whitespace-nowrap">
                  +{String(e.send_after_days)}d
                </span>
              )}
            </div>
            {e.preview && (
              <p className="text-[11px] text-text-muted italic mb-1">
                {String(e.preview)}
              </p>
            )}
            {e.body && (
              <p className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap">
                {String(e.body)}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (formatType === "linkedin_post") {
    return (
      <div className="space-y-2">
        {b.hook && (
          <p className="text-sm font-semibold text-text leading-snug">
            {String(b.hook)}
          </p>
        )}
        {b.body && (
          <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
            {String(b.body)}
          </p>
        )}
        {b.cta && (
          <p className="text-sm text-text leading-relaxed border-l-2 border-accent pl-3">
            {String(b.cta)}
          </p>
        )}
        {Array.isArray(b.hashtags) && b.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(b.hashtags as unknown[]).map((tag, i) => (
              <span
                key={i}
                className="text-[11px] text-accent rounded-full bg-accent-bg px-2 py-0.5"
              >
                #{String(tag).replace(/^#/, "")}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (formatType === "linkedin_carousel" && Array.isArray(b.slides)) {
    return (
      <div className="space-y-2">
        {(b.slides as Array<Record<string, unknown>>).map((s, i) => (
          <div
            key={i}
            className="rounded-md border border-border bg-surface/40 px-3 py-2.5"
          >
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-mono text-[10px] text-text-dim tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm font-semibold text-text">
                {String(s.title ?? `Slide ${i + 1}`)}
              </span>
            </div>
            {s.body && (
              <p className="text-xs text-text-muted leading-relaxed ml-6">
                {String(s.body)}
              </p>
            )}
          </div>
        ))}
        {b.caption && (
          <p className="text-xs text-text-muted leading-relaxed italic border-t border-border pt-2">
            Caption: {String(b.caption)}
          </p>
        )}
      </div>
    );
  }

  if (formatType === "video_script" && Array.isArray(b.scenes)) {
    return (
      <div className="space-y-2">
        {(b.scenes as Array<Record<string, unknown>>).map((s, i) => (
          <div
            key={i}
            className="rounded-md border border-border bg-surface/40 px-3 py-2.5"
          >
            <div className="text-[10px] uppercase tracking-wider text-text-dim font-mono mb-1">
              Scene {i + 1}
              {s.duration_sec != null && ` · ${String(s.duration_sec)}s`}
            </div>
            {s.visual && (
              <div className="text-[11px] text-text-muted leading-relaxed mb-1">
                <span className="font-semibold text-text">Visual: </span>
                {String(s.visual)}
              </div>
            )}
            {s.voiceover && (
              <div className="text-xs text-text leading-relaxed">
                <span className="font-semibold">VO: </span>
                {String(s.voiceover)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (formatType === "faq" && Array.isArray(b.qa_pairs)) {
    return (
      <div className="space-y-2">
        {(b.qa_pairs as Array<Record<string, unknown>>).map((qa, i) => (
          <div
            key={i}
            className="rounded-md border border-border bg-surface/40 px-3 py-2.5"
          >
            <p className="text-sm font-semibold text-text leading-snug mb-1">
              Q. {String(qa.q ?? "")}
            </p>
            <p className="text-sm text-text-muted leading-relaxed">
              A. {String(qa.a ?? "")}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (formatType === "infographic" && Array.isArray(b.sections)) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {(b.sections as Array<Record<string, unknown>>).map((s, i) => (
          <div
            key={i}
            className="rounded-md border border-border bg-surface/40 px-3 py-2.5"
          >
            {s.kind && (
              <div className="text-[10px] uppercase tracking-wider text-text-dim font-mono mb-1">
                {String(s.kind)}
              </div>
            )}
            {s.datapoint && (
              <div className="text-xl font-semibold text-accent">
                {String(s.datapoint)}
              </div>
            )}
            {s.headline && (
              <div className="text-sm font-semibold text-text leading-snug mt-1">
                {String(s.headline)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Fallback: render markdown if present, otherwise raw json.
  return markdown ? (
    <pre className="text-xs text-text-muted whitespace-pre-wrap leading-relaxed font-sans">
      {markdown}
    </pre>
  ) : (
    <pre className="text-xs text-text-dim font-mono whitespace-pre-wrap leading-relaxed">
      {JSON.stringify(body, null, 2)}
    </pre>
  );
}
