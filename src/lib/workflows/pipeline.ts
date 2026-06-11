// ============================================================
// COMMAND CENTER PIPELINE — the fixed, dependency-derived stage
// plan for running the full workflow system on a brand.
//
// Rules (Dane's design decisions, 2026-06-11):
// - Stages advance MANUALLY. A stage must be fully green (every
//   workflow success or explicitly skipped) before Advance unlocks.
// - Within a stage, workflows run SEQUENTIALLY with a pause between
//   runs (rate-limit protection). A failure does NOT stop the stage;
//   the remaining workflows still run, then the stage blocks until
//   each failure is retried or skipped.
// - The CS track runs in parallel to the marketing pipeline — it
//   reads the Halcyon Customer Health portfolio, not stage outputs.
// - Stage groupings are fixed in v1 (correct by construction).
// ============================================================

export type PipelineStage = {
  id: string;
  index: number;
  title: string;
  description: string;
  /** Run order within the stage IS this array order. */
  codes: string[];
  /** Human steps required before/while advancing past this stage. */
  gateNote?: string;
  /** Stage does web research: needs a Tavily key OR all-Gemini credential assignments (native grounding). */
  needsSearchKey: boolean;
};

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "foundation",
    index: 1,
    title: "Foundation",
    description:
      "Brand code ingestion — voice rules, proof points, capabilities, personas. Every downstream workflow reads these four tables.",
    codes: ["R-BR"],
    needsSearchKey: false, // Tavily removed from R-BR for now (context-only)
  },
  {
    id: "research",
    index: 2,
    title: "Research",
    description:
      "Web-grounded market and competitor intelligence: signals, dossiers, pricing, win/loss teardowns, roadmap gaps.",
    codes: ["R-MS", "R-CI", "R-PP", "R-WL", "S-RM"],
    needsSearchKey: true,
  },
  {
    id: "synthesis",
    index: 3,
    title: "Synthesis",
    description:
      "Positioning, battlecards, and voice-of-customer surfaces built from Stage 2 intel. No web research — these read upstream outputs.",
    codes: ["S-PO", "S-BC", "R-CF", "R-PF", "R-EV", "S-AR", "S-LP"],
    gateNote:
      "Customer evidence lands as pending_legal — review it before it feeds delivery drafts.",
    needsSearchKey: false,
  },
  {
    id: "icp",
    index: 4,
    title: "ICP chain",
    description:
      "Cohort → enrichment → voice-of-customer → ICP definition. Strictly sequential with human gates: approve the R-CR cohort (Gate 1) and R-VC extraction (Gate 2) in the Review Queue between runs for clean lineage.",
    codes: ["R-CR", "R-CE", "R-VC", "S-IC"],
    gateNote:
      "Gate 1 (cohort) and Gate 2 (VoC) approvals in the Review Queue. Downstream runs fall back to pending rows but flag it in their evidence.",
    needsSearchKey: true, // R-CE researches the cohort via Tavily
  },
  {
    id: "delivery",
    index: 5,
    title: "Delivery",
    description:
      "Channel-ready drafts: messaging, collateral, counter-narrative, objection handler, win wire. Everything lands in the Review Queue as pending_review.",
    codes: ["D-MG", "D-SN", "D-CN", "D-OB", "D-WW"],
    gateNote:
      "Approve at least one artifact in the Review Queue — Stage 6 distributes only APPROVED artifacts.",
    needsSearchKey: false,
  },
  {
    id: "distribution",
    index: 6,
    title: "Distribution + loop",
    description:
      "Mock channel sends of the latest approved artifact, then the closed loop: campaign performance rollups and the daily brief.",
    codes: ["X-EM", "X-LI", "X-OR", "X-AP", "S-CP", "S-DB"],
    needsSearchKey: false,
  },
];

/** Parallel track — reads the Halcyon CS portfolio, independent of stages. */
export const CS_TRACK: PipelineStage = {
  id: "cs-track",
  index: 0,
  title: "Customer Success track",
  description:
    "CS deliverables generated from the live Customer Health portfolio. Independent of the marketing pipeline — run any time.",
  codes: ["D-QB", "D-RT", "D-HP", "D-XP"],
  needsSearchKey: false,
};

export const ALL_PIPELINE_CODES: string[] = [
  ...PIPELINE_STAGES.flatMap((s) => s.codes),
  ...CS_TRACK.codes,
];

/**
 * A run still marked `running` after this long is dead: the engine's
 * serverless ceiling is 300s, so 6 minutes means the function died
 * without updating its row (504 kill, deploy interrupt, crash).
 */
export const STALE_RUN_MS = 6 * 60 * 1000;

export function isStaleRun(status: string | null | undefined, startedAt: string | null | undefined): boolean {
  if (status !== "running" || !startedAt) return false;
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) return false;
  return Date.now() - started > STALE_RUN_MS;
}
