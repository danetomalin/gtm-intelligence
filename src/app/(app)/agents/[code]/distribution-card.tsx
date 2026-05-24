export type CampaignSend = {
  id: string;
  channel_type: string | null;
  source: string | null;
  artifact_table: string | null;
  artifact_id: string | null;
  audience_descriptor: string | null;
  audience_size: number | null;
  external_send_id: string | null;
  status: string | null;
  sent_at: string | null;
  error_message: string | null;
};

const CHANNEL_LABEL: Record<string, string> = {
  resend: "Email · Resend",
  linkedin: "LinkedIn",
  outreach: "Outreach.io",
  apollo: "Apollo.io",
  slack: "Slack (internal)",
};

export function DistributionCard({
  send,
  compact = false,
}: {
  send: CampaignSend;
  compact?: boolean;
}) {
  const channelLabel = send.channel_type
    ? CHANNEL_LABEL[send.channel_type] ?? send.channel_type
    : "—";
  const isMock = send.source === "mock";
  const sentDate = send.sent_at
    ? new Date(send.sent_at).toLocaleString()
    : "—";

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
              {channelLabel}
            </span>
            {isMock && (
              <span className="rounded-full bg-warn-bg text-warn px-2 py-0.5">
                Simulated
              </span>
            )}
            <span className="text-text-dim">· {sentDate}</span>
          </div>
          <h3 className="text-base font-semibold text-text leading-snug">
            {send.audience_descriptor ?? "Unlabeled audience"}
          </h3>
        </div>
        <span className="flex-shrink-0 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-card text-text-dim">
          {send.status ?? "sent"}
        </span>
      </div>
      <div className="text-xs text-text-muted">
        Audience size: <span className="text-text tabular-nums">{send.audience_size ?? "—"}</span>
        {" · "}
        Artifact: <span className="text-text">{send.artifact_table} / {send.artifact_id?.slice(0, 8)}…</span>
      </div>
      {!compact && send.external_send_id && (
        <div className="text-[11px] text-text-dim font-mono mt-2">
          send_id: {send.external_send_id}
        </div>
      )}
      {send.error_message && (
        <div className="text-xs text-danger mt-2">Error: {send.error_message}</div>
      )}
    </div>
  );
}
