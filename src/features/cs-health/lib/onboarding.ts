// ============================================================
// ONBOARDING OPERATING MODEL — data layer + types.
// Ported from the Onboarding Command Center prototype and
// decoupled like generateData: swap the ACCOUNTS array for a
// Supabase/warehouse read without touching the UI.
//
// The onboarding arc runs across four connected stages:
//   Handoff Suite → Implementation → Go-Live & TTV → Post-Launch
// and feeds the main health model at three points:
//   - TTV confirmation         → Value pillar
//   - Post-launch checkpoints   → Value pillar (miss = At Risk / Tier 2)
//   - Implementation risk flags → Tier 2 overrides
// ============================================================

// ---------- Success archetypes + KPI library ----------

export type Archetype =
  | "Revenue Growth"
  | "Cost Reduction"
  | "Operational Efficiency"
  | "Risk / Compliance";

export type KpiCategory = "Adoption" | "Relationship" | "Satisfaction" | "Value";

export interface KpiTargets {
  d30: string;
  d90: string;
  d180: string;
}

export interface Kpi {
  id: string;
  category: KpiCategory;
  kpi: string;
  metric: string;
  recommended: KpiTargets;
  rationale: string;
}

/** A KPI promoted into a customer's success plan with confirm/adjust state. */
export interface SuccessPlanKpi extends Kpi {
  baseline: string | null;
  customerTarget: KpiTargets;
  confirmed: boolean;
  adjusted: boolean;
}

// Prescribed KPI library. Each archetype layers specific KPIs on top
// of the universal set. Targets are recommended starting points — the
// customer confirms or adjusts at kickoff.
export const KPI_LIBRARY: Record<"universal" | Archetype, Kpi[]> = {
  universal: [
    { id: "U01", category: "Adoption", kpi: "User activation rate", metric: "% of licensed users logged in at least once", recommended: { d30: "60%", d90: "85%", d180: "90%" }, rationale: "Below 60% at 30 days is a leading indicator of churn. 85%+ at 90 days indicates embedded adoption." },
    { id: "U02", category: "Adoption", kpi: "Power user identification", metric: "# of users completing advanced workflows", recommended: { d30: "2+", d90: "5+", d180: "10+" }, rationale: "Power users become internal champions and drive organic expansion." },
    { id: "U03", category: "Relationship", kpi: "Executive engagement", metric: "# of exec-to-exec touchpoints", recommended: { d30: "1", d90: "2", d180: "4" }, rationale: "Executive access must be maintained from implementation through renewal." },
    { id: "U04", category: "Satisfaction", kpi: "CSAT score", metric: "Post-interaction satisfaction rating (1-5)", recommended: { d30: "4.0+", d90: "4.2+", d180: "4.3+" }, rationale: "Declining CSAT in the first 90 days is a strong early churn signal." },
  ],
  "Revenue Growth": [
    { id: "R01", category: "Value", kpi: "Pipeline influenced", metric: "$ pipeline attributed to product insights or outputs", recommended: { d30: "$0 (baseline)", d90: "$250K+", d180: "$1M+" }, rationale: "Revenue customers need to see commercial impact by 90 days to justify renewal." },
    { id: "R02", category: "Value", kpi: "Win rate improvement", metric: "% improvement in deal close rate vs. pre-implementation", recommended: { d30: "Baseline set", d90: "5%+", d180: "10%+" }, rationale: "Win rate is the primary ROI metric for revenue growth archetype." },
    { id: "R03", category: "Value", kpi: "Time to first revenue signal", metric: "Days from go-live to first measurable revenue attribution", recommended: { d30: "Signal visible", d90: "Measured", d180: "Sustained" }, rationale: "Revenue customers have the least tolerance for delayed time-to-value." },
    { id: "R04", category: "Adoption", kpi: "Sales team adoption", metric: "% of quota-carrying reps using the platform weekly", recommended: { d30: "40%", d90: "75%", d180: "90%" }, rationale: "Revenue tool adoption follows the path of least resistance — must be driven actively." },
  ],
  "Cost Reduction": [
    { id: "C01", category: "Value", kpi: "Manual process time saved", metric: "Hours/week eliminated from manual tasks (team total)", recommended: { d30: "Baseline captured", d90: "25% reduction", d180: "50%+ reduction" }, rationale: "Cost customers need a measurable before/after by 90 days. Baseline must be captured pre-go-live." },
    { id: "C02", category: "Value", kpi: "Headcount efficiency ratio", metric: "Output per FTE vs. pre-implementation baseline", recommended: { d30: "Baseline set", d90: "10% improvement", d180: "20%+ improvement" }, rationale: "The proxy most CFOs track for automation ROI." },
    { id: "C03", category: "Value", kpi: "Error/rework rate", metric: "% reduction in manual errors or rework cycles", recommended: { d30: "Tracking started", d90: "15% reduction", d180: "30%+ reduction" }, rationale: "Error reduction is often the fastest-visible ROI for operational automation." },
    { id: "C04", category: "Adoption", kpi: "Workflow replacement rate", metric: "% of previously manual workflows now handled in-platform", recommended: { d30: "30%", d90: "65%", d180: "85%" }, rationale: "Cost reduction requires workflow migration, not just tool access." },
  ],
  "Operational Efficiency": [
    { id: "O01", category: "Value", kpi: "Process cycle time reduction", metric: "% reduction in time to complete primary workflow", recommended: { d30: "Baseline captured", d90: "20% reduction", d180: "40%+ reduction" }, rationale: "Efficiency customers measure success by speed of core processes." },
    { id: "O02", category: "Value", kpi: "Reporting automation rate", metric: "% of recurring reports now auto-generated vs. manual", recommended: { d30: "25%", d90: "60%", d180: "85%" }, rationale: "Reporting automation is typically the fastest-visible efficiency win." },
    { id: "O03", category: "Value", kpi: "Data freshness", metric: "Average lag from event to data availability in-platform", recommended: { d30: "Measured", d90: "Under 4hrs", d180: "Near real-time" }, rationale: "Operational teams need fresh data to act. Lag is a leading frustration indicator." },
    { id: "O04", category: "Adoption", kpi: "Daily active usage rate", metric: "% of users engaging with platform on working days", recommended: { d30: "40%", d90: "70%", d180: "85%" }, rationale: "Efficiency tools must become daily habits to deliver sustained value." },
  ],
  "Risk / Compliance": [
    { id: "RC01", category: "Value", kpi: "Compliance coverage rate", metric: "% of required controls tracked and reportable in-platform", recommended: { d30: "50%", d90: "85%", d180: "100%" }, rationale: "Compliance customers need full coverage to satisfy audit requirements." },
    { id: "RC02", category: "Value", kpi: "Audit preparation time", metric: "Hours required to prepare for a standard audit", recommended: { d30: "Baseline set", d90: "30% reduction", d180: "50%+ reduction" }, rationale: "Audit prep time is the most concrete efficiency metric for compliance teams." },
    { id: "RC03", category: "Value", kpi: "Incident detection time", metric: "Average time from risk event to identification", recommended: { d30: "Measured", d90: "25% faster", d180: "50%+ faster" }, rationale: "Earlier detection directly reduces regulatory and financial exposure." },
    { id: "RC04", category: "Adoption", kpi: "Control owner participation", metric: "% of control owners actively logging in and updating", recommended: { d30: "50%", d90: "80%", d180: "95%" }, rationale: "Compliance tools fail when control owners don't engage — adoption here is non-negotiable." },
  ],
};

// ---------- Implementation templates ----------
// Phase accent colors are Touchable-aligned hues (foundation→primary
// blue, build→teal, validate→purple, launch→success green).

export type TemplateId = "ENT_STANDARD" | "ENT_COMPLEX" | "MM_STANDARD";
export type MilestoneOwner = "Vendor" | "Client" | "Joint";

export interface Phase {
  id: string;
  name: string;
  weeks: string;
  color: string;
}

export interface MilestoneTemplate {
  templateId: string;
  phase: string;
  name: string;
  owner: MilestoneOwner;
  clientDeliverable: boolean;
  expectedDay: number;
  clientVisibleDesc: string;
  whatClientNeeds: string;
  warningDays: number;
  criticalDays: number;
}

export interface Template {
  id: TemplateId;
  name: string;
  totalWeeks: number;
  phases: Phase[];
  milestones: MilestoneTemplate[];
}

const PHASE = {
  foundation: "hsl(211 56% 28%)",
  build: "hsl(197 58% 43%)",
  validate: "hsl(270 50% 36%)",
  launch: "hsl(152 59% 25%)",
};

export const TEMPLATES: Record<TemplateId, Template> = {
  ENT_STANDARD: {
    id: "ENT_STANDARD", name: "Enterprise — Standard", totalWeeks: 12,
    phases: [
      { id: "P1", name: "Foundation", weeks: "1-2", color: PHASE.foundation },
      { id: "P2", name: "Build", weeks: "3-6", color: PHASE.build },
      { id: "P3", name: "Validate", weeks: "7-9", color: PHASE.validate },
      { id: "P4", name: "Launch", weeks: "10-12", color: PHASE.launch },
    ],
    milestones: [
      { templateId: "T01", phase: "P1", name: "Kickoff meeting", owner: "Joint", clientDeliverable: false, expectedDay: 3, clientVisibleDesc: "Joint kickoff to align on goals and timeline.", whatClientNeeds: "Executive sponsor and IT lead attendance.", warningDays: 2, criticalDays: 5 },
      { templateId: "T02", phase: "P1", name: "Technical access provided", owner: "Client", clientDeliverable: true, expectedDay: 7, clientVisibleDesc: "Provide system access for configuration.", whatClientNeeds: "API credentials and sandbox environment.", warningDays: 2, criticalDays: 4 },
      { templateId: "T03", phase: "P1", name: "Success plan confirmed", owner: "Joint", clientDeliverable: true, expectedDay: 10, clientVisibleDesc: "Confirm success metrics and 30/90/180-day targets.", whatClientNeeds: "Champion reviews and adjusts recommended KPI targets.", warningDays: 3, criticalDays: 6 },
      { templateId: "T04", phase: "P1", name: "Baseline metrics captured", owner: "Client", clientDeliverable: true, expectedDay: 12, clientVisibleDesc: "Capture current-state baseline before go-live.", whatClientNeeds: "Current performance data for each agreed KPI.", warningDays: 3, criticalDays: 6 },
      { templateId: "T05", phase: "P2", name: "Core configuration complete", owner: "Vendor", clientDeliverable: false, expectedDay: 25, clientVisibleDesc: "Platform configured for your organization.", whatClientNeeds: "Confirm org hierarchy, user roles, and workflow settings.", warningDays: 5, criticalDays: 10 },
      { templateId: "T06", phase: "P2", name: "Integration build and test", owner: "Vendor", clientDeliverable: false, expectedDay: 32, clientVisibleDesc: "Connect your existing systems to the platform.", whatClientNeeds: "IT lead available for integration testing.", warningDays: 5, criticalDays: 10 },
      { templateId: "T07", phase: "P2", name: "Data migration and validation", owner: "Joint", clientDeliverable: true, expectedDay: 38, clientVisibleDesc: "Migrate and validate your historical data.", whatClientNeeds: "Confirm accuracy of migrated records.", warningDays: 4, criticalDays: 8 },
      { templateId: "T08", phase: "P2", name: "Admin training", owner: "Vendor", clientDeliverable: false, expectedDay: 42, clientVisibleDesc: "Train your administrators.", whatClientNeeds: "Admin users available for 2-hour session.", warningDays: 4, criticalDays: 7 },
      { templateId: "T09", phase: "P3", name: "End user training", owner: "Vendor", clientDeliverable: false, expectedDay: 52, clientVisibleDesc: "Train all end users.", whatClientNeeds: "All users available. Training coordinator to schedule.", warningDays: 5, criticalDays: 10 },
      { templateId: "T10", phase: "P3", name: "UAT sign-off", owner: "Client", clientDeliverable: true, expectedDay: 60, clientVisibleDesc: "Test the system and provide written sign-off.", whatClientNeeds: "UAT team (3-5 days). Written sign-off from project owner.", warningDays: 5, criticalDays: 10 },
      { templateId: "T11", phase: "P3", name: "Go-live readiness review", owner: "Joint", clientDeliverable: false, expectedDay: 65, clientVisibleDesc: "Final checklist review before go-live.", whatClientNeeds: "Executive sponsor for 30-min readiness call.", warningDays: 3, criticalDays: 5 },
      { templateId: "T12", phase: "P4", name: "Go-live", owner: "Vendor", clientDeliverable: false, expectedDay: 70, clientVisibleDesc: "System goes live. Hypercare support begins.", whatClientNeeds: "All-hands communication sent to end users.", warningDays: 0, criticalDays: 0 },
    ],
  },
  ENT_COMPLEX: {
    id: "ENT_COMPLEX", name: "Enterprise — Complex Integration", totalWeeks: 16,
    phases: [
      { id: "P1", name: "Foundation", weeks: "1-3", color: PHASE.foundation },
      { id: "P2", name: "Integration", weeks: "4-8", color: PHASE.build },
      { id: "P3", name: "Build & Test", weeks: "9-12", color: PHASE.validate },
      { id: "P4", name: "Launch", weeks: "13-16", color: PHASE.launch },
    ],
    milestones: [
      { templateId: "TC01", phase: "P1", name: "Kickoff meeting", owner: "Joint", clientDeliverable: false, expectedDay: 3, clientVisibleDesc: "Joint kickoff to align on goals and timeline.", whatClientNeeds: "Executive sponsor, IT lead, and project owner attendance.", warningDays: 2, criticalDays: 5 },
      { templateId: "TC02", phase: "P1", name: "Technical discovery session", owner: "Joint", clientDeliverable: true, expectedDay: 10, clientVisibleDesc: "Deep technical scoping for integrations.", whatClientNeeds: "IT lead leads session. Architecture docs required.", warningDays: 3, criticalDays: 6 },
      { templateId: "TC03", phase: "P1", name: "Success plan confirmed", owner: "Joint", clientDeliverable: true, expectedDay: 14, clientVisibleDesc: "Confirm success metrics and 30/90/180-day targets.", whatClientNeeds: "Champion reviews and confirms KPI targets.", warningDays: 3, criticalDays: 6 },
      { templateId: "TC04", phase: "P1", name: "Baseline metrics captured", owner: "Client", clientDeliverable: true, expectedDay: 18, clientVisibleDesc: "Capture current-state baseline before go-live.", whatClientNeeds: "Current performance data for each agreed KPI.", warningDays: 4, criticalDays: 8 },
      { templateId: "TC05", phase: "P1", name: "Integration architecture sign-off", owner: "Client", clientDeliverable: true, expectedDay: 21, clientVisibleDesc: "Confirm integration design before build begins.", whatClientNeeds: "IT lead and project owner sign off.", warningDays: 4, criticalDays: 8 },
      { templateId: "TC06", phase: "P2", name: "Integration build — Phase 1", owner: "Vendor", clientDeliverable: false, expectedDay: 42, clientVisibleDesc: "Build primary integrations.", whatClientNeeds: "IT resource for testing. Sandbox access maintained.", warningDays: 7, criticalDays: 14 },
      { templateId: "TC07", phase: "P2", name: "Integration testing — client review", owner: "Joint", clientDeliverable: true, expectedDay: 52, clientVisibleDesc: "Test integrations with your real data.", whatClientNeeds: "IT lead reviews test results. Issues documented.", warningDays: 5, criticalDays: 10 },
      { templateId: "TC08", phase: "P2", name: "Integration build — Phase 2", owner: "Vendor", clientDeliverable: false, expectedDay: 63, clientVisibleDesc: "Complete remaining integrations.", whatClientNeeds: "IT resource for final testing.", warningDays: 7, criticalDays: 14 },
      { templateId: "TC09", phase: "P3", name: "Core configuration complete", owner: "Vendor", clientDeliverable: false, expectedDay: 73, clientVisibleDesc: "Configure product for your organization.", whatClientNeeds: "Confirm workflow settings and user role structure.", warningDays: 5, criticalDays: 10 },
      { templateId: "TC10", phase: "P3", name: "Data migration and validation", owner: "Joint", clientDeliverable: true, expectedDay: 80, clientVisibleDesc: "Migrate and validate historical data.", whatClientNeeds: "Confirm accuracy of migrated records.", warningDays: 5, criticalDays: 10 },
      { templateId: "TC11", phase: "P3", name: "Admin and end user training", owner: "Vendor", clientDeliverable: false, expectedDay: 90, clientVisibleDesc: "Train all administrators and end users.", whatClientNeeds: "All users available. Coordinator schedules sessions.", warningDays: 5, criticalDays: 10 },
      { templateId: "TC12", phase: "P3", name: "UAT sign-off", owner: "Client", clientDeliverable: true, expectedDay: 98, clientVisibleDesc: "Test and provide written sign-off.", whatClientNeeds: "UAT team (5-7 days). Written sign-off required.", warningDays: 5, criticalDays: 10 },
      { templateId: "TC13", phase: "P4", name: "Go-live readiness review", owner: "Joint", clientDeliverable: false, expectedDay: 105, clientVisibleDesc: "Final checklist review.", whatClientNeeds: "Executive sponsor for 30-min call.", warningDays: 3, criticalDays: 5 },
      { templateId: "TC14", phase: "P4", name: "Go-live", owner: "Vendor", clientDeliverable: false, expectedDay: 112, clientVisibleDesc: "System goes live. Hypercare begins.", whatClientNeeds: "All-hands communication sent.", warningDays: 0, criticalDays: 0 },
    ],
  },
  MM_STANDARD: {
    id: "MM_STANDARD", name: "Mid-Market — Standard", totalWeeks: 8,
    phases: [
      { id: "P1", name: "Setup", weeks: "1-2", color: PHASE.foundation },
      { id: "P2", name: "Configure", weeks: "3-5", color: PHASE.build },
      { id: "P3", name: "Launch", weeks: "6-8", color: PHASE.launch },
    ],
    milestones: [
      { templateId: "TM01", phase: "P1", name: "Kickoff", owner: "Vendor", clientDeliverable: false, expectedDay: 3, clientVisibleDesc: "Kickoff call to align on timeline.", whatClientNeeds: "Project owner and IT contact attendance.", warningDays: 2, criticalDays: 4 },
      { templateId: "TM02", phase: "P1", name: "Success plan confirmed", owner: "Joint", clientDeliverable: true, expectedDay: 7, clientVisibleDesc: "Confirm your 30/90/180-day success targets.", whatClientNeeds: "Champion reviews recommended KPI targets.", warningDays: 2, criticalDays: 5 },
      { templateId: "TM03", phase: "P1", name: "Technical access provided", owner: "Client", clientDeliverable: true, expectedDay: 7, clientVisibleDesc: "Provide system access for configuration.", whatClientNeeds: "API credentials and sandbox access.", warningDays: 2, criticalDays: 4 },
      { templateId: "TM04", phase: "P2", name: "Configuration complete", owner: "Vendor", clientDeliverable: false, expectedDay: 21, clientVisibleDesc: "Platform configured for your team.", whatClientNeeds: "Confirm user list and role settings.", warningDays: 4, criticalDays: 7 },
      { templateId: "TM05", phase: "P2", name: "Integration live", owner: "Vendor", clientDeliverable: false, expectedDay: 28, clientVisibleDesc: "Your systems connected to the platform.", whatClientNeeds: "IT contact available for testing.", warningDays: 4, criticalDays: 7 },
      { templateId: "TM06", phase: "P2", name: "User training", owner: "Vendor", clientDeliverable: false, expectedDay: 35, clientVisibleDesc: "Team trained on the platform.", whatClientNeeds: "All users available for training session.", warningDays: 3, criticalDays: 6 },
      { templateId: "TM07", phase: "P3", name: "UAT sign-off", owner: "Client", clientDeliverable: true, expectedDay: 42, clientVisibleDesc: "Test and approve before go-live.", whatClientNeeds: "Project owner reviews and approves.", warningDays: 3, criticalDays: 6 },
      { templateId: "TM08", phase: "P3", name: "Go-live", owner: "Vendor", clientDeliverable: false, expectedDay: 49, clientVisibleDesc: "System goes live.", whatClientNeeds: "Team notified.", warningDays: 0, criticalDays: 0 },
    ],
  },
};

// ---------- Instantiated account types ----------

export type MilestoneStatus = "not_started" | "in_progress" | "complete" | "at_risk" | "blocked";
export type BlockerType = "client" | "dependency" | "vendor" | "scope";

export interface Milestone extends MilestoneTemplate {
  id: string;
  status: MilestoneStatus;
  actualDay: number | null;
  blockerType: BlockerType | null;
  clientNote: string;
  internalNote: string;
}

export type MilestoneOverride = Partial<Pick<Milestone, "status" | "actualDay" | "blockerType" | "clientNote" | "internalNote">>;

export interface Stakeholder {
  name: string;
  title: string;
  role: string;
  risk: "low" | "medium" | "high";
  note: string;
}

export interface HandoffPackage {
  whyTheyBought: string;
  keyCommitments: string[];
  scopeRisks: string[];
  stakeholders: Stakeholder[];
  redFlags: string[];
}

export type ActionType = "guided" | "agentic";
export type ActionStatus = "pending" | "completed";

export interface ActionItem {
  id: string;
  type: ActionType;
  priority: "P0" | "P1" | "P2" | "P3";
  title: string;
  status: ActionStatus;
  draftReady: boolean;
  draft: string;
}

export interface Checkpoint {
  day: 30 | 90 | 180;
  label: string;
  status: "pending" | "complete";
  adoptionTarget: string;
  adoptionActual: string | null;
  kpiStatus: "not_started" | "on_track" | "at_risk" | "achieved" | "missed";
  note: string;
}

export interface PostLaunch {
  goLiveConfirmed: boolean;
  csmConfirmedValue: boolean;
  customerAcknowledgedValue: boolean;
  checkpoints: Checkpoint[];
}

export type TtvStatus = "on_track" | "at_risk" | "slipped";

export interface OnboardingAccount {
  id: string;
  name: string;
  csm: string;
  ae: string;
  arr: number;
  segment: "ENT" | "MM" | "SMB";
  templateId: TemplateId;
  contractDate: string;
  goLiveTarget: string;
  goLiveActual: string | null;
  daysInImpl: number;
  successArchetype: Archetype;
  primaryKPI: string;
  ttvTarget: number;
  ttvStatus: TtvStatus;
  overallImplScore: number;
  handoffPackage: HandoffPackage;
  milestones: Milestone[];
  actionQueue: ActionItem[];
  postLaunch: PostLaunch;
}

// ---------- Helpers ----------

/** Build a live milestone list from a template, applying per-milestone overrides. */
export function instantiate(templateId: TemplateId, overrides: Record<string, MilestoneOverride> = {}): Milestone[] {
  return TEMPLATES[templateId].milestones.map((m) => ({
    ...m,
    id: m.templateId,
    status: "not_started",
    actualDay: null,
    blockerType: null,
    clientNote: "",
    internalNote: "",
    ...overrides[m.templateId],
  }));
}

/** Universal + archetype KPIs, promoted into confirmable success-plan rows. */
export function getSuccessPlan(archetype: Archetype): SuccessPlanKpi[] {
  const archetypeKPIs = KPI_LIBRARY[archetype] ?? [];
  const universal = KPI_LIBRARY.universal;
  return [...universal, ...archetypeKPIs].map((k) => ({
    ...k,
    baseline: null,
    customerTarget: { d30: k.recommended.d30, d90: k.recommended.d90, d180: k.recommended.d180 },
    confirmed: false,
    adjusted: false,
  }));
}

export function isUniversalKpi(id: string): boolean {
  return KPI_LIBRARY.universal.some((u) => u.id === id);
}

// ---------- Onboarding book of business ----------
// Two accounts in different states of the operating model, drawn
// from the established CPG portfolio: Verdant Provisions (ENT
// Complex, implementation at risk) and Vassal Cosmetics (ENT
// Standard, on track).

export const ONBOARDING_ACCOUNTS: OnboardingAccount[] = [
  {
    id: "E08", name: "Verdant Provisions", csm: "Marcus T.", ae: "Jake Morrison",
    arr: 720000, segment: "ENT", templateId: "ENT_COMPLEX",
    contractDate: "2026-01-15", goLiveTarget: "2026-04-30",
    goLiveActual: null, daysInImpl: 47,
    successArchetype: "Operational Efficiency",
    primaryKPI: "Reduce manual reporting time by 60%",
    ttvTarget: 45, ttvStatus: "at_risk", overallImplScore: 52,
    handoffPackage: {
      whyTheyBought: "Verdant is drowning in manual reconciliation across 12 distribution centers. VP Ops spends 40% of her week on data tasks that should be automated. CFO framed it as a direct headcount cost with a 6-month payback model.",
      keyCommitments: ["Real-time data sync across all 12 distribution centers", "Go-live by April 30 for Q2 planning", "CFO executive dashboard within 30 days of go-live", "Training for 45 end users"],
      scopeRisks: ["Non-standard ERP integration not in SOW — SC verbally committed", "April 30 deadline tight given ERP complexity"],
      stakeholders: [
        { name: "Sarah Chen", title: "VP Operations", role: "Champion", risk: "medium", note: "Primary driver. Stretched thin." },
        { name: "Robert Walsh", title: "CFO", role: "Economic Buyer", risk: "low", note: "ROI-focused. Will withdraw if timeline slips." },
        { name: "IT Lead (TBD)", title: "Director IT", role: "Technical", risk: "high", note: "Not yet identified. Critical for ERP." },
      ],
      redFlags: ["IT lead not yet identified", "SOW missing ERP integration commitment"],
    },
    milestones: instantiate("ENT_COMPLEX", {
      TC01: { status: "complete", actualDay: 3 },
      TC02: { status: "complete", actualDay: 11 },
      TC03: { status: "at_risk", blockerType: "client", internalNote: "IT lead still not identified. 12 days overdue.", clientNote: "Awaiting IT lead identification. This is on the critical path." },
      TC04: { status: "not_started" },
      TC05: { status: "at_risk", blockerType: "dependency", internalNote: "Blocked on TC02." },
    }),
    actionQueue: [
      { id: "a1", type: "guided", priority: "P0", title: "IT Lead escalation to Sarah Chen", status: "pending", draftReady: true,
        draft: "Subject: Action Required: IT Resource for ERP Integration\n\nSarah,\n\nI need your help resolving a critical blocker this week. The ERP integration requires a senior IT resource and we have not been able to connect with your IT Director. We are now 12 days past our scoping milestone, and this is directly threatening your April 30 go-live.\n\nCould you facilitate an introduction to your IT lead before end of week?\n\nMarcus" },
      { id: "a2", type: "agentic", priority: "P1", title: "CRM task: ERP scoping overdue — flagged", status: "completed", draftReady: false, draft: "" },
      { id: "a3", type: "guided", priority: "P2", title: "AE alignment: SOW gap on ERP commitment", status: "pending", draftReady: true,
        draft: "Subject: SOW Gap — ERP Integration at Verdant\n\nJake,\n\nQuick flag: the SC demo included a verbal commitment to ERP integration that is not in the SOW. Options: (1) contract amendment, (2) descope with client conversation, (3) absorb — not recommended.\n\nCan we align this week?\n\nMarcus" },
    ],
    postLaunch: {
      goLiveConfirmed: false, csmConfirmedValue: false, customerAcknowledgedValue: false,
      checkpoints: [
        { day: 30, label: "30-Day", status: "pending", adoptionTarget: "60%", adoptionActual: null, kpiStatus: "not_started", note: "" },
        { day: 90, label: "90-Day", status: "pending", adoptionTarget: "85%", adoptionActual: null, kpiStatus: "not_started", note: "" },
        { day: 180, label: "180-Day", status: "pending", adoptionTarget: "90%", adoptionActual: null, kpiStatus: "not_started", note: "" },
      ],
    },
  },
  {
    id: "E05", name: "Vassal Cosmetics", csm: "David R.", ae: "Priya Nair",
    arr: 310000, segment: "ENT", templateId: "ENT_STANDARD",
    contractDate: "2026-02-17", goLiveTarget: "2026-06-09",
    goLiveActual: null, daysInImpl: 26,
    successArchetype: "Operational Efficiency",
    primaryKPI: "Reduce coordinator admin time from 3hrs to under 90min/day",
    ttvTarget: 60, ttvStatus: "on_track", overallImplScore: 74,
    handoffPackage: {
      whyTheyBought: "14 field merchandising coordinators spending 3+ hours/day on manual retail scheduling. COO's KPI is coordinator retention — two left last year citing admin overload.",
      keyCommitments: ["Go-live before June 9 (hard deadline)", "ERP integration (NetSuite)", "Training for 14 coordinators"],
      scopeRisks: ["June 9 is a hard deadline — Q3 retail reset locks June 13."],
      stakeholders: [
        { name: "Patricia Okafor", title: "COO", role: "Champion", risk: "low", note: "Highly engaged. Personal KPI tied to coordinator retention." },
        { name: "Tom Reardon", title: "IT Director", role: "Technical", risk: "low", note: "Proactive. Already provided ERP API docs." },
        { name: "14 Coordinators", title: "Field Coordinators", role: "End User", risk: "medium", note: "Varied tech comfort. Training plan critical." },
      ],
      redFlags: ["Hard retail-reset deadline — zero slip tolerance after June 9"],
    },
    milestones: instantiate("ENT_STANDARD", {
      T01: { status: "complete", actualDay: 4 },
      T02: { status: "complete", actualDay: 7, clientNote: "Technical access provided ahead of schedule." },
      T03: { status: "complete", actualDay: 10, internalNote: "KPIs confirmed at kickoff. Targets agreed." },
      T04: { status: "complete", actualDay: 12, internalNote: "Baseline: 3hrs/day admin time per coordinator." },
      T05: { status: "in_progress", internalNote: "On track. Est. complete Day 28." },
    }),
    actionQueue: [
      { id: "a1", type: "agentic", priority: "P2", title: "CRM: milestone 5 in progress — Day 28 est. logged", status: "completed", draftReady: false, draft: "" },
      { id: "a2", type: "guided", priority: "P3", title: "30-day check-in with Patricia Okafor", status: "pending", draftReady: true,
        draft: "Subject: Vassal Cosmetics — 30-Day Implementation Update\n\nHi Patricia,\n\nWe are 26 days in and everything is on track for June 9. Kickoff, ERP scoping, success plan, and baseline metrics are all complete. Core configuration is underway.\n\nTo confirm training scheduling — can you help me lock in dates for the 14 coordinator sessions in the week of May 26?\n\nDavid" },
    ],
    postLaunch: {
      goLiveConfirmed: false, csmConfirmedValue: false, customerAcknowledgedValue: false,
      checkpoints: [
        { day: 30, label: "30-Day", status: "pending", adoptionTarget: "60%", adoptionActual: null, kpiStatus: "not_started", note: "" },
        { day: 90, label: "90-Day", status: "pending", adoptionTarget: "85%", adoptionActual: null, kpiStatus: "not_started", note: "" },
        { day: 180, label: "180-Day", status: "pending", adoptionTarget: "90%", adoptionActual: null, kpiStatus: "not_started", note: "" },
      ],
    },
  },
];
