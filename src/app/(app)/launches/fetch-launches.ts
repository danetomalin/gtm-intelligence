// Shared helper for surfacing launches across workspaces + observability.
// Server-side only — depends on the Supabase admin client.

import type { LaunchSummary } from "./launch-summary-card";
import type { LaunchTier } from "@/lib/launch-tiers";

type AdminClient = {
  from: (table: string) => unknown;
};

export async function fetchActiveLaunches(
  admin: AdminClient,
  brandId: string,
  opts: { limit?: number; activeOnly?: boolean } = {},
): Promise<LaunchSummary[]> {
  const { limit = 5, activeOnly = true } = opts;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = (admin as any)
    .from("launches")
    .select("id, name, tier, product_summary, launch_date_target, status, created_at")
    .eq("brand_id", brandId);
  if (activeOnly) {
    q = q.not("status", "in", "(shipped,post_mortem)");
  }
  q = q
    .order("launch_date_target", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  const { data: launches } = await q;

  const rows = (launches ?? []) as {
    id: string;
    name: string;
    tier: LaunchTier;
    product_summary: string | null;
    launch_date_target: string | null;
    status: string;
  }[];
  if (rows.length === 0) return [];

  const ids = rows.map((l) => l.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: artifactRows } = await (admin as any)
    .from("launch_artifacts")
    .select("launch_id, required, produced")
    .eq("brand_id", brandId)
    .in("launch_id", ids);

  const readiness = new Map<string, { produced: number; required: number }>();
  for (const r of (artifactRows ?? []) as {
    launch_id: string;
    required: boolean;
    produced: boolean;
  }[]) {
    if (!readiness.has(r.launch_id)) {
      readiness.set(r.launch_id, { produced: 0, required: 0 });
    }
    const rec = readiness.get(r.launch_id)!;
    if (r.required) {
      rec.required++;
      if (r.produced) rec.produced++;
    }
  }

  return rows.map((l) => {
    const r = readiness.get(l.id) ?? { produced: 0, required: 0 };
    return {
      id: l.id,
      name: l.name,
      tier: l.tier,
      product_summary: l.product_summary,
      launch_date_target: l.launch_date_target,
      status: l.status,
      readiness_produced: r.produced,
      readiness_required: r.required,
    };
  });
}
