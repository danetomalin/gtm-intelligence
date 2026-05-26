import Link from "next/link";
import { PageHeader, SectionDivider } from "../_components/page-header";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID } from "@/lib/demo-context";
import {
  TIER_LABEL,
  type LaunchTier,
  totalCountForTier,
} from "@/lib/launch-tiers";
import { NewLaunchButton } from "./new-launch-button";

export const dynamic = "force-dynamic";

type LaunchRow = {
  id: string;
  name: string;
  tier: LaunchTier;
  product_summary: string | null;
  launch_date_target: string | null;
  status: string;
  created_at: string;
};

const STATUS_TONE: Record<string, string> = {
  draft: "bg-card text-text-dim",
  in_progress: "bg-warn-bg text-warn",
  ready: "bg-accent-bg text-accent",
  shipped: "bg-win-bg text-win",
  post_mortem: "bg-accent-bg text-accent",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_progress: "In progress",
  ready: "Ready to ship",
  shipped: "Shipped",
  post_mortem: "Post-mortem",
};

export default async function LaunchesIndexPage() {
  const admin = await createAdminClient();
  const [launchesRes, artifactsRes] = await Promise.all([
    admin
      .from("launches")
      .select("id, name, tier, product_summary, launch_date_target, status, created_at")
      .eq("brand_id", DEMO_BRAND_ID)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("launch_artifacts")
      .select("launch_id, required, produced")
      .eq("brand_id", DEMO_BRAND_ID),
  ]);

  const launches = (launchesRes.data ?? []) as LaunchRow[];
  const artifactRows = (artifactsRes.data ?? []) as {
    launch_id: string;
    required: boolean;
    produced: boolean;
  }[];

  // Readiness % per launch = produced required artifacts / total required.
  const readinessByLaunch = new Map<string, { produced: number; required: number }>();
  for (const r of artifactRows) {
    if (!readinessByLaunch.has(r.launch_id)) {
      readinessByLaunch.set(r.launch_id, { produced: 0, required: 0 });
    }
    const rec = readinessByLaunch.get(r.launch_id)!;
    if (r.required) {
      rec.required++;
      if (r.produced) rec.produced++;
    }
  }

  return (
    <div className="px-8 py-10 max-w-6xl space-y-8">
      <div className="flex items-start justify-between gap-6">
        <PageHeader
          eyebrow="Operations · Launches"
          title="Launches"
          subtitle="Every product release the team is coordinating. Each launch is tier-typed (Flagship / Feature / Bug Fix / Revenue Growth / Revenue Retention) and assembles a readiness pack across messaging, sales, CS, and distribution workflows. Tier picks the required artifact matrix; HITL approval gates each one; one click ships."
        />
        <NewLaunchButton />
      </div>

      <section>
        <SectionDivider
          title="Active launches"
          sub={`${launches.length} total`}
        />
        {launches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/40 px-8 py-16 text-center">
            <p className="text-sm text-text-muted mb-4">
              No launches yet. Click <strong className="text-text">+ New launch</strong> to
              create the first one. Pick a tier and the readiness checklist
              assembles itself.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {launches.map((l) => {
              const r = readinessByLaunch.get(l.id) ?? { produced: 0, required: 0 };
              const total = totalCountForTier(l.tier);
              const pct =
                r.required > 0 ? Math.round((r.produced / r.required) * 100) : 0;
              const statusKey = l.status ?? "draft";
              return (
                <Link
                  key={l.id}
                  href={`/launches/${l.id}`}
                  className="block rounded-lg border border-border bg-card px-5 py-4 hover:border-text-dim transition"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
                        <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5">
                          {TIER_LABEL[l.tier]}
                        </span>
                        {l.launch_date_target && (
                          <span className="text-text-dim">
                            Target {l.launch_date_target}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-text leading-snug">
                        {l.name}
                      </h3>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-full text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${STATUS_TONE[statusKey] ?? "bg-card text-text-dim"}`}
                    >
                      {STATUS_LABEL[statusKey] ?? statusKey}
                    </span>
                  </div>
                  {l.product_summary && (
                    <p className="text-sm text-text-muted leading-relaxed line-clamp-2 mb-3">
                      {l.product_summary}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted tabular-nums">
                      {r.produced} / {r.required} required ({pct}%)
                    </span>
                    <span className="text-[10px] text-text-dim tabular-nums">
                      · {total} total slots
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
