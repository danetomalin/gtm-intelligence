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
import {
  SuperUserCohortCard,
  type SuperUserCohort,
} from "../agents/[code]/super-user-cohort-card";
import {
  VoCExtractionCard,
  type VoCExtraction,
} from "../agents/[code]/voc-extraction-card";
import {
  ICPDefinitionCard,
  type ICPDefinition,
} from "../agents/[code]/icp-definition-card";
import {
  DeploymentAssessmentCard,
  type DeploymentAssessment,
} from "../agents/[code]/deployment-assessment-card";
import {
  DeploymentFormatCard,
  type DeploymentFormat,
} from "../agents/[code]/deployment-format-card";
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

  const cohortQuery = admin
    .from("super_user_cohorts")
    .select(
      "id, version, is_active, cohort_name, methodology, filter_criteria, cohort_accounts, excluded_accounts, legacy_concentration_pct, segment_dominance_pct, sources, approval_status, risk_tier, created_at",
    )
    .eq("brand_id", DEMO_BRAND_ID)
    .in("approval_status", PENDING_STATUSES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(50);

  const vocQuery = admin
    .from("voc_extractions")
    .select(
      "id, super_user_cohort_id, top_pains, pain_vocabulary, compelling_events, buying_committee, source_transcript_count, single_customer_pct, cohort_coverage_pct, sources, approval_status, risk_tier, created_at",
    )
    .eq("brand_id", DEMO_BRAND_ID)
    .in("approval_status", PENDING_STATUSES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(50);

  const icpQuery = admin
    .from("icp_definitions")
    .select(
      "id, version, is_active, super_user_cohort_id, customer_enrichment_id, voc_extraction_id, segment_name, one_line_definition, firmographics, technographics, trigger_signals, primary_pains, buying_committee, typical_sales_cycle, anti_icp, evidence_basis, sources, approval_status, risk_tier, spo_refreshed_at, created_at",
    )
    .eq("brand_id", DEMO_BRAND_ID)
    .in("approval_status", PENDING_STATUSES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(50);

  const deploymentAssessmentQuery = admin
    .from("deployment_assessments")
    .select(
      "id, source_artifact_table, source_artifact_id, recommended_formats, skipped_formats, headline, rationale, approval_status, risk_tier, created_at",
    )
    .eq("brand_id", DEMO_BRAND_ID)
    .in("approval_status", PENDING_STATUSES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(50);

  const deploymentFormatQuery = admin
    .from("deployment_formats")
    .select(
      "id, assessment_id, source_artifact_table, source_artifact_id, format_type, title, body_json, body_markdown, audience, channel, approval_status, risk_tier, created_at",
    )
    .eq("brand_id", DEMO_BRAND_ID)
    .in("approval_status", PENDING_STATUSES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(50);

  const [
    messagingRes,
    collateralRes,
    memosRes,
    cohortRes,
    vocRes,
    icpRes,
    deploymentAssessmentRes,
    deploymentFormatRes,
  ] = await Promise.all([
    messagingQuery,
    collateralQuery,
    counterNarrativeQuery,
    cohortQuery,
    vocQuery,
    icpQuery,
    deploymentAssessmentQuery,
    deploymentFormatQuery,
  ]);

  const messaging = (messagingRes.data ?? []) as (ContentOutput & {
    risk_tier?: string | null;
  })[];
  const collateral = (collateralRes.data ?? []) as (SalesCollateral & {
    risk_tier?: string | null;
  })[];
  const memos = (memosRes.data ?? []) as CounterNarrative[];
  const cohortsList = (cohortRes.data ?? []) as SuperUserCohort[];
  const vocList = (vocRes.data ?? []) as VoCExtraction[];
  const icpList = (icpRes.data ?? []) as ICPDefinition[];
  const deploymentAssessments = (deploymentAssessmentRes.data ??
    []) as DeploymentAssessment[];
  const deploymentFormats = (deploymentFormatRes.data ??
    []) as DeploymentFormat[];

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
  const visibleCohorts =
    artifactFilter === "all" || artifactFilter === "icp_cohort"
      ? cohortsList.filter((c) => tierMatches(c.risk_tier))
      : [];
  const visibleVoc =
    artifactFilter === "all" || artifactFilter === "voc"
      ? vocList.filter((v) => tierMatches(v.risk_tier))
      : [];
  const visibleIcp =
    artifactFilter === "all" || artifactFilter === "icp"
      ? icpList.filter((i) => tierMatches(i.risk_tier))
      : [];
  const visibleDeploymentAssessments =
    artifactFilter === "all" || artifactFilter === "deployment_assessment"
      ? deploymentAssessments.filter((d) => tierMatches(d.risk_tier))
      : [];
  const visibleDeploymentFormats =
    artifactFilter === "all" || artifactFilter === "deployment_format"
      ? deploymentFormats.filter((d) => tierMatches(d.risk_tier))
      : [];

  const totalVisible =
    visibleMessaging.length +
    visibleCollateral.length +
    visibleMemos.length +
    visibleCohorts.length +
    visibleVoc.length +
    visibleIcp.length +
    visibleDeploymentAssessments.length +
    visibleDeploymentFormats.length;
  const totalPending =
    messaging.length +
    collateral.length +
    memos.length +
    cohortsList.length +
    vocList.length +
    icpList.length +
    deploymentAssessments.length +
    deploymentFormats.length;

  const tierBucket = (rt: string) =>
    [
      ...messaging,
      ...collateral,
      ...memos,
      ...cohortsList,
      ...vocList,
      ...icpList,
      ...deploymentAssessments,
      ...deploymentFormats,
    ].filter((r) => r.risk_tier === rt).length;

  const counts = {
    all: totalPending,
    messaging: messaging.length,
    collateral: collateral.length,
    counter_narrative: memos.length,
    icp_cohort: cohortsList.length,
    voc: vocList.length,
    icp: icpList.length,
    deployment_assessment: deploymentAssessments.length,
    deployment_format: deploymentFormats.length,
    high: tierBucket("high"),
    medium: tierBucket("medium"),
    low: tierBucket("low"),
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

          {visibleCohorts.length > 0 && (
            <section>
              <SectionDivider
                title="ICP super-user cohorts (R-CR · Gate 1)"
                sub={`${visibleCohorts.length} pending`}
              />
              <div className="space-y-3">
                {visibleCohorts.map((c) => (
                  <SuperUserCohortCard key={c.id} cohort={c} />
                ))}
              </div>
            </section>
          )}

          {visibleVoc.length > 0 && (
            <section>
              <SectionDivider
                title="Voice of Customer extractions (R-VC · Gate 2)"
                sub={`${visibleVoc.length} pending`}
              />
              <div className="space-y-3">
                {visibleVoc.map((v) => (
                  <VoCExtractionCard key={v.id} extraction={v} />
                ))}
              </div>
            </section>
          )}

          {visibleIcp.length > 0 && (
            <section>
              <SectionDivider
                title="ICP playbook (S-IC · final)"
                sub={`${visibleIcp.length} pending · approval refreshes S-PO`}
              />
              <div className="space-y-3">
                {visibleIcp.map((i) => (
                  <ICPDefinitionCard key={i.id} icp={i} />
                ))}
              </div>
            </section>
          )}

          {visibleDeploymentAssessments.length > 0 && (
            <section>
              <SectionDivider
                title="Deployment assessments (D-DA)"
                sub={`${visibleDeploymentAssessments.length} pending · approve and click Produce per format`}
              />
              <div className="space-y-3">
                {visibleDeploymentAssessments.map((a) => (
                  <DeploymentAssessmentCard key={a.id} assessment={a} />
                ))}
              </div>
            </section>
          )}

          {visibleDeploymentFormats.length > 0 && (
            <section>
              <SectionDivider
                title="Deployment formats (D-DP)"
                sub={`${visibleDeploymentFormats.length} pending · approval ships to the Library`}
              />
              <div className="space-y-3">
                {visibleDeploymentFormats.map((f) => (
                  <DeploymentFormatCard key={f.id} fmt={f} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
