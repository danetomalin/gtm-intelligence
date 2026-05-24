import Link from "next/link";
import { PageHeader, SectionDivider } from "../_components/page-header";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID } from "@/lib/demo-context";
import {
  EnablementAssetCard,
  type EnablementAsset,
} from "../agents/[code]/enablement-asset-card";
import { CollateralLibraryFilters } from "./filters";

export const dynamic = "force-dynamic";

export default async function CollateralLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; audience?: string; freshness?: string }>;
}) {
  const { type, audience, freshness } = await searchParams;
  const typeFilter = type ?? "all";
  const audienceFilter = audience ?? "all";
  const freshnessFilter = freshness ?? "all";

  const admin = await createAdminClient();
  const { data } = await admin
    .from("enablement_assets")
    .select(
      "id, asset_type, audience, title, body_markdown, source_refs, last_refreshed_at, freshness_state, version, produced_by, approval_status, risk_tier, created_at",
    )
    .eq("brand_id", DEMO_BRAND_ID)
    .order("created_at", { ascending: false })
    .limit(200);

  const assets = (data ?? []) as EnablementAsset[];

  const counts = {
    all: assets.length,
    objection_handler: assets.filter((a) => a.asset_type === "objection_handler").length,
    qbr_template: assets.filter((a) => a.asset_type === "qbr_template").length,
    customer_health_playbook: assets.filter((a) => a.asset_type === "customer_health_playbook").length,
    win_wire: assets.filter((a) => a.asset_type === "win_wire").length,
    expansion_play: assets.filter((a) => a.asset_type === "expansion_play").length,
    renewal_talk_track: assets.filter((a) => a.asset_type === "renewal_talk_track").length,
    sales: assets.filter((a) => a.audience === "sales").length,
    customer_success: assets.filter((a) => a.audience === "customer_success").length,
    current: assets.filter((a) => a.freshness_state === "current").length,
    stale: assets.filter((a) => a.freshness_state === "stale").length,
  };

  const visible = assets.filter((a) => {
    if (typeFilter !== "all" && a.asset_type !== typeFilter) return false;
    if (audienceFilter !== "all" && a.audience !== audienceFilter && a.audience !== "both")
      return false;
    if (freshnessFilter !== "all" && a.freshness_state !== freshnessFilter) return false;
    return true;
  });

  return (
    <div className="px-8 py-10 max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Enablement · Collateral Library"
        title="Collateral Library"
        subtitle="The internal-facing asset library Sales and Customer Success run on. Every entry is synthesized by a Phase 6B sub-agent (D-OB / D-QB / D-HP / D-WW) and gated by HITL approval. Each refresh writes a new version with the older snapshot retained."
      />

      <CollateralLibraryFilters
        typeFilter={typeFilter}
        audienceFilter={audienceFilter}
        freshnessFilter={freshnessFilter}
        counts={counts}
      />

      <div className="text-xs text-text-dim">
        Showing {visible.length} of {assets.length} assets
        {(typeFilter !== "all" || audienceFilter !== "all" || freshnessFilter !== "all") && (
          <>
            {" · "}
            <Link href="/collateral" className="text-accent hover:underline">
              Clear filters
            </Link>
          </>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-16 text-center">
          <p className="text-sm text-text-muted">
            {assets.length === 0
              ? "No collateral yet. Run D-OB, D-QB, D-HP, or D-WW from their agent pages to start populating the library."
              : "No assets match those filters."}
          </p>
        </div>
      ) : (
        <section>
          <SectionDivider title="Assets" />
          <div className="space-y-2">
            {visible.map((a) => (
              <EnablementAssetCard key={a.id} asset={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
