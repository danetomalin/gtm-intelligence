import Link from "next/link";
import { PageHeader, SectionDivider } from "../_components/page-header";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID } from "@/lib/demo-context";
import {
  ContentCard,
  type ContentOutput,
} from "../agents/[code]/content-card";
import {
  CollateralCard,
  type SalesCollateral,
} from "../agents/[code]/collateral-card";
import {
  CounterNarrativeCard,
  type CounterNarrative,
} from "../agents/[code]/counter-narrative-card";
import { ReviewQueueFilters } from "./filters";

export const dynamic = "force-dynamic";

const PENDING_STATUSES = ["pending_review", "needs_revision"] as const;

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ artifact?: string; tier?: string }>;
}) {
  const { artifact, tier } = await searchParams;
  const artifactFilter = artifact ?? "all";
  const tierFilter = tier ?? "all";

  const admin = await createAdminClient();

  const messagingQuery = admin
    .from("content_outputs")
    .select(
      "id, channel, topic, target_persona, content, messaging_refs, proof_pending, approval_status, risk_tier, created_at",
    )
    .eq("brand_id", DEMO_BRAND_ID)
    .in("approval_status", PENDING_STATUSES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(50);

  const collateralQuery = admin
    .from("sales_collateral")
    .select(
      "id, collateral_type, target_account, target_segment, competitors, content, positioning_refs, messaging_refs, source_data_date, stale_flag, approval_status, risk_tier, created_at",
    )
    .eq("brand_id", DEMO_BRAND_ID)
    .in("approval_status", PENDING_STATUSES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(50);

  const counterNarrativeQuery = admin
    .from("counter_narrative_memos")
    .select(
      "id, triggering_signal_id, triggering_signal_summary, competitor_named, category, rep_talking_points, suggested_linkedin_post, email_reply_template, positioning_anchor, sources, approval_status, risk_tier, created_at",
    )
    .eq("brand_id", DEMO_BRAND_ID)
    .in("approval_status", PENDING_STATUSES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(50);

  const [messagingRes, collateralRes, memosRes] = await Promise.all([
    messagingQuery,
    collateralQuery,
    counterNarrativeQuery,
  ]);

  const messaging = (messagingRes.data ?? []) as (ContentOutput & {
    risk_tier?: string | null;
  })[];
  const collateral = (collateralRes.data ?? []) as (SalesCollateral & {
    risk_tier?: string | null;
  })[];
  const memos = (memosRes.data ?? []) as CounterNarrative[];

  const tierMatches = (rowTier: string | null | undefined) =>
    tierFilter === "all" ? true : rowTier === tierFilter;

  const visibleMessaging =
    artifactFilter === "all" || artifactFilter === "messaging"
      ? messaging.filter((m) => tierMatches(m.risk_tier))
      : [];
  const visibleCollateral =
    artifactFilter === "all" || artifactFilter === "collateral"
      ? collateral.filter((c) => tierMatches(c.risk_tier))
      : [];
  const visibleMemos =
    artifactFilter === "all" || artifactFilter === "counter_narrative"
      ? memos.filter((m) => tierMatches(m.risk_tier))
      : [];

  const totalVisible =
    visibleMessaging.length + visibleCollateral.length + visibleMemos.length;
  const totalPending = messaging.length + collateral.length + memos.length;

  const counts = {
    all: totalPending,
    messaging: messaging.length,
    collateral: collateral.length,
    counter_narrative: memos.length,
    high: [...messaging, ...collateral, ...memos].filter(
      (r) => r.risk_tier === "high",
    ).length,
    medium: [...messaging, ...collateral, ...memos].filter(
      (r) => r.risk_tier === "medium",
    ).length,
    low: [...messaging, ...collateral, ...memos].filter(
      (r) => r.risk_tier === "low",
    ).length,
  };

  return (
    <div className="px-8 py-10 max-w-6xl space-y-8">
      <PageHeader
        eyebrow="HITL · Review Queue"
        title="Review Queue"
        subtitle="Every D-* (delivery) artifact that an agent produced and hasn't been approved yet. Click into each card to approve or reject inline. High-tier items (external email, public LinkedIn, named-customer quotes, pricing claims) carry a 48h SLA before escalation."
      />

      <ReviewQueueFilters
        artifactFilter={artifactFilter}
        tierFilter={tierFilter}
        counts={counts}
      />

      <div className="text-xs text-text-dim">
        Showing {totalVisible} of {totalPending} pending items
        {(artifactFilter !== "all" || tierFilter !== "all") && (
          <>
            {" · "}
            <Link href="/review-queue" className="text-accent hover:underline">
              Clear filters
            </Link>
          </>
        )}
      </div>

      {totalVisible === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-16 text-center">
          <p className="text-sm text-text-muted">
            {totalPending === 0
              ? "Nothing in the queue. New artifacts default to pending_review when delivery agents run."
              : "No items match those filters."}
          </p>
        </div>
      ) : (
        <>
          {visibleMessaging.length > 0 && (
            <section>
              <SectionDivider
                title="Messaging (D-MG)"
                sub={`${visibleMessaging.length} pending`}
              />
              <div className="space-y-2">
                {visibleMessaging.map((c) => (
                  <ContentCard key={c.id} content={c} />
                ))}
              </div>
            </section>
          )}

          {visibleCollateral.length > 0 && (
            <section>
              <SectionDivider
                title="Sales collateral (D-SN)"
                sub={`${visibleCollateral.length} pending`}
              />
              <div className="space-y-2">
                {visibleCollateral.map((piece) => (
                  <CollateralCard key={piece.id} piece={piece} />
                ))}
              </div>
            </section>
          )}

          {visibleMemos.length > 0 && (
            <section>
              <SectionDivider
                title="Counter-narrative memos (D-CN)"
                sub={`${visibleMemos.length} pending`}
              />
              <div className="space-y-2">
                {visibleMemos.map((memo) => (
                  <CounterNarrativeCard key={memo.id} memo={memo} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
