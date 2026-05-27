import Link from "next/link";
import { PageHeader, SectionDivider } from "../_components/page-header";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID } from "@/lib/demo-context";
import {
  EnablementAssetCard,
  type EnablementAsset,
} from "../agents/[code]/enablement-asset-card";
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
  DeploymentFormatCard,
  type DeploymentFormat,
} from "../agents/[code]/deployment-format-card";
import { CollateralLibraryFilters } from "./filters";
import { AssessDeploymentsButton } from "./assess-deployments-button";
import { UnapproveButton } from "./unapprove-button";

export const dynamic = "force-dynamic";

// The unified library shows every D-* delivery artifact that's cleared HITL
// (approval_status in 'approved' / 'published'). Each table contributes one
// section; filters span the union so a single "messaging" or "objection
// handler" view works without bouncing between agent pages.
const APPROVED_STATUSES = ["approved", "published"] as const;

export default async function CollateralLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; audience?: string; freshness?: string }>;
}) {
  const { source, audience, freshness } = await searchParams;
  const sourceFilter = source ?? "all";
  const audienceFilter = audience ?? "all";
  const freshnessFilter = freshness ?? "all";

  const admin = await createAdminClient();

  const [enablementRes, messagingRes, collateralRes, memosRes, deploymentRes] =
    await Promise.all([
      admin
        .from("enablement_assets")
        .select(
          "id, asset_type, audience, title, body_markdown, source_refs, last_refreshed_at, freshness_state, version, produced_by, approval_status, risk_tier, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .in("approval_status", APPROVED_STATUSES as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(200),
      admin
        .from("content_outputs")
        .select(
          "id, channel, topic, target_persona, content, messaging_refs, proof_pending, approval_status, risk_tier, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .in("approval_status", APPROVED_STATUSES as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(200),
      admin
        .from("sales_collateral")
        .select(
          "id, collateral_type, target_account, target_segment, competitors, content, positioning_refs, messaging_refs, source_data_date, stale_flag, approval_status, risk_tier, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .in("approval_status", APPROVED_STATUSES as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(200),
      admin
        .from("counter_narrative_memos")
        .select(
          "id, triggering_signal_id, triggering_signal_summary, competitor_named, category, rep_talking_points, suggested_linkedin_post, email_reply_template, positioning_anchor, sources, approval_status, risk_tier, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .in("approval_status", APPROVED_STATUSES as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(200),
      admin
        .from("deployment_formats")
        .select(
          "id, assessment_id, source_artifact_table, source_artifact_id, format_type, title, body_json, body_markdown, audience, channel, approval_status, risk_tier, created_at",
        )
        .eq("brand_id", DEMO_BRAND_ID)
        .in("approval_status", APPROVED_STATUSES as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  const enablement = (enablementRes.data ?? []) as EnablementAsset[];
  const messaging = (messagingRes.data ?? []) as ContentOutput[];
  const salesCollateral = (collateralRes.data ?? []) as SalesCollateral[];
  const memos = (memosRes.data ?? []) as CounterNarrative[];
  const deploymentForks = (deploymentRes.data ?? []) as DeploymentFormat[];

  const totalAll =
    enablement.length +
    messaging.length +
    salesCollateral.length +
    memos.length +
    deploymentForks.length;

  const counts = {
    all: totalAll,
    // Top-level source filter
    enablement: enablement.length,
    messaging: messaging.length,
    sales_collateral: salesCollateral.length,
    counter_narrative: memos.length,
    deployment_fork: deploymentForks.length,
    // Enablement sub-types
    objection_handler: enablement.filter((a) => a.asset_type === "objection_handler")
      .length,
    qbr_template: enablement.filter((a) => a.asset_type === "qbr_template").length,
    customer_health_playbook: enablement.filter(
      (a) => a.asset_type === "customer_health_playbook",
    ).length,
    win_wire: enablement.filter((a) => a.asset_type === "win_wire").length,
    expansion_play: enablement.filter((a) => a.asset_type === "expansion_play").length,
    renewal_talk_track: enablement.filter(
      (a) => a.asset_type === "renewal_talk_track",
    ).length,
    // Enablement audience
    sales: enablement.filter((a) => a.audience === "sales").length,
    customer_success: enablement.filter((a) => a.audience === "customer_success")
      .length,
    // Enablement freshness
    current: enablement.filter((a) => a.freshness_state === "current").length,
    stale: enablement.filter((a) => a.freshness_state === "stale").length,
  };

  // Filter visibility per source. The "source" filter picks which section(s)
  // render; the audience + freshness filters only meaningfully apply to
  // enablement_assets (other tables don't have those columns).
  const showEnablement = sourceFilter === "all" || sourceFilter === "enablement";
  const showMessaging = sourceFilter === "all" || sourceFilter === "messaging";
  const showSalesCollateral =
    sourceFilter === "all" || sourceFilter === "sales_collateral";
  const showCounterNarrative =
    sourceFilter === "all" || sourceFilter === "counter_narrative";

  // Match enablement sub-type filter — also expressed via the source filter
  // for now (objection_handler / qbr_template etc. become source values that
  // imply enablement + sub-type).
  const enablementSubType = [
    "objection_handler",
    "qbr_template",
    "customer_health_playbook",
    "win_wire",
    "expansion_play",
    "renewal_talk_track",
  ].includes(sourceFilter)
    ? sourceFilter
    : null;

  const visibleEnablement = enablement
    .filter((a) =>
      showEnablement || enablementSubType ? true : false,
    )
    .filter((a) => (enablementSubType ? a.asset_type === enablementSubType : true))
    .filter((a) =>
      audienceFilter === "all"
        ? true
        : a.audience === audienceFilter || a.audience === "both",
    )
    .filter((a) =>
      freshnessFilter === "all" ? true : a.freshness_state === freshnessFilter,
    );

  const visibleMessaging = showMessaging ? messaging : [];
  const visibleSalesCollateral = showSalesCollateral ? salesCollateral : [];
  const visibleCounterNarrative = showCounterNarrative ? memos : [];
  const showDeploymentForks =
    sourceFilter === "all" || sourceFilter === "deployment_fork";
  const visibleDeploymentForks = showDeploymentForks ? deploymentForks : [];

  const totalVisible =
    visibleEnablement.length +
    visibleMessaging.length +
    visibleSalesCollateral.length +
    visibleCounterNarrative.length +
    visibleDeploymentForks.length;

  return (
    <div className="px-8 py-10 max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Library · Approved artifacts"
        title="Collateral Library"
        subtitle="Every approved delivery artifact across messaging, sales narrative, counter-narrative, and enablement — the team's single source of truth for what's ready to ship. Items appear once HITL approval clears. Each refresh writes a new version; older snapshots are retained."
      />

      <CollateralLibraryFilters
        sourceFilter={sourceFilter}
        audienceFilter={audienceFilter}
        freshnessFilter={freshnessFilter}
        counts={counts}
      />

      <div className="text-xs text-text-dim">
        Showing {totalVisible} of {totalAll} approved artifacts
        {(sourceFilter !== "all" ||
          audienceFilter !== "all" ||
          freshnessFilter !== "all") && (
          <>
            {" · "}
            <Link href="/collateral" className="text-accent hover:underline">
              Clear filters
            </Link>
          </>
        )}
      </div>

      {totalVisible === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-16 text-center">
          <p className="text-sm text-text-muted">
            {totalAll === 0
              ? "No approved artifacts yet. Run delivery agents (D-MG, D-SN, D-OB, etc.) and approve their output in the Review Queue to populate the library."
              : "No artifacts match those filters."}
          </p>
        </div>
      ) : (
        <>
          {visibleMessaging.length > 0 && (
            <section>
              <SectionDivider
                title="Messaging (D-MG)"
                sub={`${visibleMessaging.length} approved`}
              />
              <div className="space-y-2">
                {visibleMessaging.map((m) => (
                  <LibraryEntry
                    key={m.id}
                    sourceArtifactTable="content_outputs"
                    sourceArtifactId={m.id}
                  >
                    <ContentCard content={m} />
                  </LibraryEntry>
                ))}
              </div>
            </section>
          )}

          {visibleSalesCollateral.length > 0 && (
            <section>
              <SectionDivider
                title="Sales collateral (D-SN)"
                sub={`${visibleSalesCollateral.length} approved`}
              />
              <div className="space-y-2">
                {visibleSalesCollateral.map((c) => (
                  <LibraryEntry
                    key={c.id}
                    sourceArtifactTable="sales_collateral"
                    sourceArtifactId={c.id}
                  >
                    <CollateralCard piece={c} />
                  </LibraryEntry>
                ))}
              </div>
            </section>
          )}

          {visibleCounterNarrative.length > 0 && (
            <section>
              <SectionDivider
                title="Counter-narrative (D-CN)"
                sub={`${visibleCounterNarrative.length} approved`}
              />
              <div className="space-y-2">
                {visibleCounterNarrative.map((m) => (
                  <LibraryEntry
                    key={m.id}
                    sourceArtifactTable="counter_narrative_memos"
                    sourceArtifactId={m.id}
                  >
                    <CounterNarrativeCard memo={m} />
                  </LibraryEntry>
                ))}
              </div>
            </section>
          )}

          {visibleEnablement.length > 0 && (
            <section>
              <SectionDivider
                title="Enablement assets (D-OB / D-QB / D-HP / D-WW / D-XP / D-RT)"
                sub={`${visibleEnablement.length} approved`}
              />
              <div className="space-y-2">
                {visibleEnablement.map((a) => (
                  <LibraryEntry
                    key={a.id}
                    sourceArtifactTable="enablement_assets"
                    sourceArtifactId={a.id}
                  >
                    <EnablementAssetCard asset={a} />
                  </LibraryEntry>
                ))}
              </div>
            </section>
          )}

          {visibleDeploymentForks.length > 0 && (
            <section>
              <SectionDivider
                title="Deployment forks (D-DP)"
                sub={`${visibleDeploymentForks.length} approved · derived from approved source artifacts`}
              />
              <div className="space-y-2">
                {visibleDeploymentForks.map((f) => (
                  <div key={f.id} className="space-y-1.5">
                    <DeploymentFormatCard fmt={f} />
                    <div className="flex justify-end pr-1">
                      <UnapproveButton table="deployment_formats" id={f.id} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// Wraps a source-artifact card with an "Assess deployments" action. Lives
// on every row in the Library so the user can fork an approved artifact
// into multiple deployment formats with a single click. Pure server
// component shell — the button itself is client-side.
function LibraryEntry({
  sourceArtifactTable,
  sourceArtifactId,
  children,
}: {
  sourceArtifactTable: string;
  sourceArtifactId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {children}
      <div className="flex justify-end items-center gap-2 pr-1">
        <UnapproveButton table={sourceArtifactTable} id={sourceArtifactId} />
        <AssessDeploymentsButton
          sourceArtifactTable={sourceArtifactTable}
          sourceArtifactId={sourceArtifactId}
        />
      </div>
    </div>
  );
}
