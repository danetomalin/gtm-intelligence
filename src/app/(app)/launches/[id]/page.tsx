import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PageHeader,
  SectionDivider,
  StatCard,
} from "../../_components/page-header";
import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_BRAND_ID } from "@/lib/demo-context";
import {
  TIER_LABEL,
  TIER_TAGLINE,
  type LaunchTier,
} from "@/lib/launch-tiers";
import { GenerateReadinessPackButton } from "./generate-button";

export const dynamic = "force-dynamic";

type LaunchRow = {
  id: string;
  name: string;
  tier: LaunchTier;
  product_summary: string | null;
  launch_date_target: string | null;
  status: string;
  linked_signal_id: string | null;
  created_at: string;
  shipped_at: string | null;
  post_mortem_at: string | null;
};

type ArtifactRow = {
  id: string;
  launch_id: string;
  artifact_table: string;
  artifact_id: string | null;
  agent_code: string;
  required: boolean;
  produced: boolean;
  status_when_produced: string | null;
  notes: string | null;
  produced_at: string | null;
};

const AGENT_LABEL: Record<string, string> = {
  "S-LP": "Launch plan",
  "D-MG": "Messaging",
  "D-SN": "Sales narrative",
  "S-BC": "Battlecard refresh",
  "S-AR": "Analyst briefing",
  "D-OB": "Objection handlers",
  "D-QB": "QBR template",
  "D-HP": "Health playbook",
  "D-XP": "Expansion play",
  "D-RT": "Renewal talk track",
  "D-WW": "Win wire",
  "X-EM": "Email distribution",
  "X-LI": "LinkedIn distribution",
  "X-OR": "Outreach sequence",
  "X-AP": "Apollo sequence",
};

const AUDIENCE_FROM_CODE: Record<string, string> = {
  "S-LP": "internal",
  "D-MG": "marketing",
  "D-SN": "sales",
  "S-BC": "sales",
  "S-AR": "external",
  "D-OB": "sales",
  "D-QB": "cs",
  "D-HP": "cs",
  "D-XP": "cs",
  "D-RT": "cs",
  "D-WW": "internal",
  "X-EM": "external",
  "X-LI": "external",
  "X-OR": "external",
  "X-AP": "external",
};

export default async function LaunchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await createAdminClient();
  const [launchRes, artifactsRes] = await Promise.all([
    admin
      .from("launches")
      .select(
        "id, name, tier, product_summary, launch_date_target, status, linked_signal_id, created_at, shipped_at, post_mortem_at",
      )
      .eq("brand_id", DEMO_BRAND_ID)
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("launch_artifacts")
      .select(
        "id, launch_id, artifact_table, artifact_id, agent_code, required, produced, status_when_produced, notes, produced_at",
      )
      .eq("brand_id", DEMO_BRAND_ID)
      .eq("launch_id", id)
      .order("required", { ascending: false }),
  ]);

  const launch = launchRes.data as LaunchRow | null;
  if (!launch) notFound();

  const artifacts = (artifactsRes.data ?? []) as ArtifactRow[];
  const required = artifacts.filter((a) => a.required);
  const optional = artifacts.filter((a) => !a.required);
  const producedRequired = required.filter((a) => a.produced).length;
  const remainingRequired = required.length - producedRequired;
  const pct =
    required.length > 0 ? Math.round((producedRequired / required.length) * 100) : 0;

  return (
    <div className="px-8 py-10 max-w-6xl space-y-8">
      <Link
        href="/launches"
        className="text-xs text-accent hover:underline inline-block"
      >
        ← Launches
      </Link>

      <div className="flex items-start justify-between gap-6">
        <PageHeader
          eyebrow={`${TIER_LABEL[launch.tier]} launch`}
          title={launch.name}
          subtitle={
            launch.product_summary ?? TIER_TAGLINE[launch.tier]
          }
        />
        <GenerateReadinessPackButton
          launchId={launch.id}
          remaining={remainingRequired}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Tier" value={TIER_LABEL[launch.tier]} />
        <StatCard
          label="Target"
          value={launch.launch_date_target ?? "—"}
        />
        <StatCard
          label="Status"
          value={launch.status.replace(/_/g, " ")}
        />
        <StatCard
          label="Readiness"
          value={`${pct}%`}
          sublabel={`${producedRequired} / ${required.length} required`}
        />
      </div>

      <section>
        <SectionDivider
          title="Required readiness pack"
          sub={`${producedRequired}/${required.length} produced · all gate Ship button`}
        />
        <div className="space-y-2">
          {required.map((a) => (
            <ArtifactRowCard key={a.id} artifact={a} />
          ))}
        </div>
      </section>

      {optional.length > 0 && (
        <section>
          <SectionDivider
            title="Optional artifacts"
            sub={`${optional.length} suggested for this tier`}
          />
          <div className="space-y-2">
            {optional.map((a) => (
              <ArtifactRowCard key={a.id} artifact={a} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionDivider title="Next steps" />
        <div className="rounded-lg border border-border bg-card px-5 py-4 space-y-3">
          <p className="text-sm text-text-muted leading-relaxed">
            Phase 9A foundation ships the launch object + readiness checklist.
            Phase 9B wires the <strong className="text-text">Generate readiness pack</strong>{" "}
            button to L-OR orchestrator (fires each required workflow with{" "}
            <code className="text-accent text-xs">launch_id</code> in extras).
            Phase 9C wires <strong className="text-text">Ship readiness pack</strong> to
            the X-* distribution adapters. Phase 9D wires the retrospective.
          </p>
          <p className="text-xs text-text-dim leading-relaxed">
            For now: click into individual workflow pages and run them manually.
            When an artifact lands, it'll surface in this readiness checklist once
            launch_id wiring is in.
          </p>
        </div>
      </section>
    </div>
  );
}

function ArtifactRowCard({ artifact: a }: { artifact: ArtifactRow }) {
  const label = AGENT_LABEL[a.agent_code] ?? a.agent_code;
  const audience = AUDIENCE_FROM_CODE[a.agent_code] ?? "—";
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span
          className={`flex-shrink-0 mt-0.5 inline-block w-2 h-2 rounded-full ${a.produced ? "bg-win" : "bg-text-dim"}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 text-[11px] uppercase tracking-wider">
            <span className="rounded-full bg-accent-bg text-accent px-2 py-0.5 font-mono">
              {a.agent_code}
            </span>
            <span className="text-text-dim">{audience}</span>
            {a.notes && <span className="text-text-dim">· {a.notes}</span>}
          </div>
          <h3 className="text-sm font-semibold text-text leading-snug">
            {label}
          </h3>
          {a.produced_at && (
            <p className="text-[11px] text-text-dim mt-1">
              Produced {a.produced_at.slice(0, 10)}
              {a.status_when_produced ? ` · ${a.status_when_produced}` : ""}
            </p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">
        <Link
          href={`/agents/${a.agent_code.toLowerCase()}`}
          className="text-xs text-accent hover:underline"
        >
          Open workflow →
        </Link>
      </div>
    </div>
  );
}
