import { ApprovalButtons, type ApprovalStatus } from "./approval-buttons";
import { InlineMd } from "@/lib/inline-md";

export type ContentOutput = {
  id: string;
  channel: string | null;
  topic: string | null;
  target_persona: string | null;
  content: string | null;
  messaging_refs: string | null;
  proof_pending: boolean | null;
  approval_status?: ApprovalStatus | null;
  created_at?: string | null;
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  webinar: "Webinar",
  analyst_relations: "Analyst Relations",
  sales_enablement: "Sales Enablement",
  thought_leadership: "Thought Leadership",
  digital_ad: "Digital Ad",
  social: "Social",
};

export function ContentCard({
  content,
  compact = false,
}: {
  content: ContentOutput;
  compact?: boolean;
}) {
  const channelLabel = content.channel
    ? CHANNEL_LABEL[content.channel] ?? content.channel
    : "—";
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
              {channelLabel}
            </span>
            {content.target_persona && (
              <span className="text-text-dim">{content.target_persona}</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {content.topic}
          </h3>
        </div>
        {content.proof_pending && (
          <span className="flex-shrink-0 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-warn-bg text-warn">
            Proof pending
          </span>
        )}
      </div>
      {content.content && (
        <p className={`text-sm text-text-muted leading-relaxed ${compact ? "line-clamp-3" : ""}`}>
          <InlineMd>{content.content}</InlineMd>
        </p>
      )}
      {!compact && content.messaging_refs && (
        <div className="border-l-2 border-accent pl-3 mt-3">
          <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
            Anchored to
          </div>
          <p className="text-sm text-text leading-relaxed">
            <InlineMd>{content.messaging_refs}</InlineMd>
          </p>
        </div>
      )}
      {!compact && (
        <ApprovalButtons
          artifactId={content.id}
          tableName="content_outputs"
          status={content.approval_status ?? null}
        />
      )}
    </div>
  );
}
