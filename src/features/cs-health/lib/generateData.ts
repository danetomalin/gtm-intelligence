// ============================================================
// DATA LAYER — mock data generator.
// Completely decoupled from the UI and the scoring engine.
// Swap this module for Supabase/Snowflake reads without
// touching anything downstream.
// ============================================================

import type { Account } from "./types";

export interface TrendMetric {
  label: string;
  unit: string;
  weeks: number[];
  signal: "spike" | "warning" | "watch" | "stable";
  note: string;
}

export interface Milestone {
  name: string;
  status: "complete" | "in_progress" | "at_risk" | "not_started";
  pct: number;
  owner: string;
  note: string;
}

export interface ImplAccount {
  id: string;
  name: string;
  segment: string;
  stage: "Implementation" | "Launch";
  csm: string;
  arr: number;
  contractStart: string;
  expectedGoLive: string;
  projectedGoLive: string;
  daysAtRisk: number;
  overallMilestonePct: number;
  expectedMilestonePct: number;
  relationshipHealth: string;
  csmSentiment: number;
  milestones: Milestone[];
}

export interface ChurnEvent {
  id: string;
  name: string;
  segment: string;
  arr: number;
  date: string;
  primaryReason: string;
  secondaryReason: string | null;
  healthScore90d: number;
  healthScore60d: number;
  healthScore30d: number;
  csmNotes: string;
  missedSignals: string[];
  learnings: string;
}

export function generateData() {
  const seed = (n: number) => { const x = Math.sin(n) * 10000; return x - Math.floor(x); };
  const r = (min: number, max: number, n: number) => Math.round(min + seed(n) * (max - min));

  const enterprise: Account[] = [
    { id: "E01", name: "Meridian Retail Group", csm: "Sarah K.", arr: 480000, segment: "ENT", stage: "Steady State",
      valueScore: 82, adoptionScore: 71, relationshipScore: 88, scoreTrend: [78, 79, 80, 82, 83, 82], flags: {}, sentimentTrend: "stable",
      ttv: { daysToFirstValue: 31, valueTrajectory: "accelerating", trajectoryScore: 84 },
      expansion: { capacityUtil: 87, featureCeiling: 72, useCaseSignals: 80, execEngagement: 85, championAdvocacy: 75, budgetCycleAlignment: 70, contractMonthsLeft: 8 },
      dataConfidence: { score: 88, completeness: 90, recency: 88, sourceDiversity: 85, note: "" },
      sentiment: { csmRating: 4, emailResponseTrend: "stable", meetingTone: "positive", verbatimTheme: "ROI positive, requesting expansion" },
      adoptionSignals: { userPenetration: 87, featureBreadth: 72, trajectoryNote: "Stable, expanding to 2nd team" } },
    { id: "E02", name: "Cascade Health Systems", csm: "Marcus T.", arr: 720000, segment: "ENT", stage: "Renewal Window",
      valueScore: 61, adoptionScore: 58, relationshipScore: 55, scoreTrend: [74, 71, 68, 64, 60, 58], flags: { adoptionNegative60d: true, missedQBR: true }, sentimentTrend: "declining",
      ttv: { daysToFirstValue: 67, valueTrajectory: "regressing", trajectoryScore: 41 },
      expansion: { capacityUtil: 52, featureCeiling: 41, useCaseSignals: 20, execEngagement: 30, championAdvocacy: 15, budgetCycleAlignment: 30, contractMonthsLeft: 3 },
      dataConfidence: { score: 71, completeness: 68, recency: 72, sourceDiversity: 75, note: "CSM sentiment driving significant share of score" },
      renewal: { renewalDate: "2026-08-20", isFirstRenewal: true },
      sentiment: { csmRating: 3, emailResponseTrend: "slowing", meetingTone: "transactional", verbatimTheme: "Frustrated with implementation delays" },
      adoptionSignals: { userPenetration: 52, featureBreadth: 41, trajectoryNote: "Declining — champion team reorganized" } },
    { id: "E03", name: "Vantage Capital Partners", csm: "Priya N.", arr: 390000, segment: "ENT", stage: "Steady State",
      valueScore: 88, adoptionScore: 84, relationshipScore: 91, scoreTrend: [83, 85, 86, 87, 88, 89], flags: {}, sentimentTrend: "positive",
      ttv: { daysToFirstValue: 24, valueTrajectory: "accelerating", trajectoryScore: 91 },
      expansion: { capacityUtil: 94, featureCeiling: 83, useCaseSignals: 90, execEngagement: 92, championAdvocacy: 90, budgetCycleAlignment: 80, contractMonthsLeft: 7 },
      dataConfidence: { score: 95, completeness: 96, recency: 94, sourceDiversity: 95, note: "" },
      sentiment: { csmRating: 5, emailResponseTrend: "fast", meetingTone: "strategic", verbatimTheme: "Strong ROI, considering expansion" },
      adoptionSignals: { userPenetration: 94, featureBreadth: 83, trajectoryNote: "Power users driving organic expansion" } },
    { id: "E04", name: "Altum Manufacturing", csm: "David R.", arr: 550000, segment: "ENT", stage: "Steady State",
      valueScore: 44, adoptionScore: 38, relationshipScore: 51, scoreTrend: [62, 57, 52, 48, 44, 41], flags: { championDeparture: true, adoptionNegative60d: true }, sentimentTrend: "declining",
      ttv: { daysToFirstValue: 44, valueTrajectory: "regressing", trajectoryScore: 28 },
      expansion: { capacityUtil: 31, featureCeiling: 28, useCaseSignals: 10, execEngagement: 20, championAdvocacy: 5, budgetCycleAlignment: 20, contractMonthsLeft: 11 },
      dataConfidence: { score: 52, completeness: 45, recency: 55, sourceDiversity: 60, note: "Champion departed — primary data source lost. Scores partially estimated." },
      sentiment: { csmRating: 2, emailResponseTrend: "very slow", meetingTone: "disengaged", verbatimTheme: "Champion left — new contact unresponsive" },
      adoptionSignals: { userPenetration: 31, featureBreadth: 28, trajectoryNote: "Sharp decline since champion departure" } },
    { id: "E05", name: "Brightfield Media", csm: "Sarah K.", arr: 310000, segment: "ENT", stage: "Launch",
      valueScore: 58, adoptionScore: 72, relationshipScore: 76, scoreTrend: [51, 55, 60, 65, 68, 70], flags: {}, sentimentTrend: "stable",
      ttv: { daysToFirstValue: 38, valueTrajectory: "improving", trajectoryScore: 62 },
      expansion: { capacityUtil: 68, featureCeiling: 55, useCaseSignals: 45, execEngagement: 70, championAdvocacy: 55, budgetCycleAlignment: 50, contractMonthsLeft: 21 },
      dataConfidence: { score: 78, completeness: 80, recency: 76, sourceDiversity: 78, note: "" },
      sentiment: { csmRating: 4, emailResponseTrend: "stable", meetingTone: "engaged", verbatimTheme: "Early wins, team still ramping" },
      adoptionSignals: { userPenetration: 68, featureBreadth: 55, trajectoryNote: "On track for stage — ramp continuing" } },
    { id: "E06", name: "Nexus Logistics", csm: "Marcus T.", arr: 620000, segment: "ENT", stage: "Renewal Window",
      valueScore: 79, adoptionScore: 74, relationshipScore: 82, scoreTrend: [77, 78, 78, 79, 80, 80], flags: {}, sentimentTrend: "positive",
      ttv: { daysToFirstValue: 29, valueTrajectory: "stable", trajectoryScore: 78 },
      expansion: { capacityUtil: 81, featureCeiling: 70, useCaseSignals: 75, execEngagement: 82, championAdvocacy: 70, budgetCycleAlignment: 75, contractMonthsLeft: 3 },
      dataConfidence: { score: 91, completeness: 92, recency: 90, sourceDiversity: 92, note: "" },
      renewal: { renewalDate: "2026-09-05", isFirstRenewal: false },
      sentiment: { csmRating: 4, emailResponseTrend: "stable", meetingTone: "positive", verbatimTheme: "Satisfied, open to expansion conversation" },
      adoptionSignals: { userPenetration: 81, featureBreadth: 70, trajectoryNote: "Stable, approaching feature ceiling" } },
    { id: "E07", name: "Orion Financial Services", csm: "Priya N.", arr: 410000, segment: "ENT", stage: "Steady State",
      valueScore: 55, adoptionScore: 61, relationshipScore: 49, scoreTrend: [68, 65, 62, 59, 57, 54], flags: { noContactLate: true, ticketSpike: true }, sentimentTrend: "declining",
      ttv: { daysToFirstValue: 52, valueTrajectory: "plateaued", trajectoryScore: 49 },
      expansion: { capacityUtil: 61, featureCeiling: 48, useCaseSignals: 25, execEngagement: 35, championAdvocacy: 25, budgetCycleAlignment: 40, contractMonthsLeft: 10 },
      dataConfidence: { score: 63, completeness: 60, recency: 58, sourceDiversity: 72, note: "No CSM contact in 14d — recency penalty applied" },
      sentiment: { csmRating: 3, emailResponseTrend: "slowing", meetingTone: "neutral", verbatimTheme: "Recurring support issues, patience thinning" },
      adoptionSignals: { userPenetration: 61, featureBreadth: 48, trajectoryNote: "Stalled — support issues blocking adoption" } },
    { id: "E08", name: "Summit Education Group", csm: "David R.", arr: 280000, segment: "ENT", stage: "Implementation",
      valueScore: 30, adoptionScore: 55, relationshipScore: 72, scoreTrend: [48, 50, 52, 54, 54, 55], flags: {}, sentimentTrend: "stable",
      ttv: { daysToFirstValue: null, valueTrajectory: "pre-launch", trajectoryScore: null },
      expansion: { capacityUtil: 45, featureCeiling: 38, useCaseSignals: 30, execEngagement: 65, championAdvocacy: 50, budgetCycleAlignment: 55, contractMonthsLeft: 30 },
      dataConfidence: { score: 74, completeness: 72, recency: 78, sourceDiversity: 70, note: "Implementation stage — product data not yet available" },
      sentiment: { csmRating: 4, emailResponseTrend: "fast", meetingTone: "engaged", verbatimTheme: "On track, excited for go-live" },
      adoptionSignals: { userPenetration: 45, featureBreadth: 38, trajectoryNote: "Normal for stage — configuration in progress" } },
    { id: "E09", name: "Tara Consumer Brands", csm: "Sarah K.", arr: 340000, segment: "ENT", stage: "Steady State",
      valueScore: 72, adoptionScore: 68, relationshipScore: 70, scoreTrend: [69, 70, 70, 71, 71, 72], flags: {}, sentimentTrend: "stable",
      ttv: { daysToFirstValue: 36, valueTrajectory: "stable", trajectoryScore: 70 },
      expansion: { capacityUtil: 74, featureCeiling: 63, useCaseSignals: 55, execEngagement: 65, championAdvocacy: 55, budgetCycleAlignment: 45, contractMonthsLeft: 9 },
      dataConfidence: { score: 82, completeness: 84, recency: 80, sourceDiversity: 82, note: "" },
      sentiment: { csmRating: 4, emailResponseTrend: "stable", meetingTone: "positive", verbatimTheme: "Consistent value, low urgency on expansion" },
      adoptionSignals: { userPenetration: 74, featureBreadth: 63, trajectoryNote: "Steady state — no major signals" } },
    { id: "E10", name: "Quorum Analytics Co.", csm: "Marcus T.", arr: 195000, segment: "ENT", stage: "Steady State",
      valueScore: 35, adoptionScore: 29, relationshipScore: 41, scoreTrend: [55, 50, 44, 40, 36, 32], flags: { supportCSATLow: true, npsDetractor: true, adoptionNegative60d: true }, sentimentTrend: "declining",
      ttv: { daysToFirstValue: 78, valueTrajectory: "regressing", trajectoryScore: 18 },
      expansion: { capacityUtil: 22, featureCeiling: 18, useCaseSignals: 5, execEngagement: 10, championAdvocacy: 5, budgetCycleAlignment: 10, contractMonthsLeft: 5 },
      dataConfidence: { score: 80, completeness: 85, recency: 78, sourceDiversity: 78, note: "High confidence — poor signals are real, not missing data" },
      sentiment: { csmRating: 2, emailResponseTrend: "very slow", meetingTone: "hostile", verbatimTheme: "'We are actively evaluating alternatives' — NPS verbatim" },
      adoptionSignals: { userPenetration: 22, featureBreadth: 18, trajectoryNote: "Critical — near-zero engagement" } },
  ];

  const mmNames = ["Pinnacle Solutions", "Atlas Dynamics", "Crestview Tech", "Harbor Digital", "Ironwood Systems",
    "Lakeshore Analytics", "Maplewood Co", "Northgate Inc", "Oakridge Partners", "Pacific Data",
    "Quinton Services", "Ridgeline Corp", "Silverstone Group", "Thornfield Media", "Upward Mobility",
    "Vertex Platforms", "Westbrook SaaS", "Xenith Technologies", "Yarrow Consulting", "Zenith Brands",
    "Abacus Retail", "Beacon Health", "Citadel Finance", "Dover Logistics", "Ember Education",
    "Falcon CPG", "Grove Manufacturing", "Haven Insurance", "Iris Analytics", "Junction Media"];
  const mmStages = ["Implementation", "Launch", "Steady State", "Steady State", "Steady State", "Renewal Window"] as const;
  const renewalDates = ["2026-07-10", "2026-08-02", "2026-08-28", "2026-09-04", "2026-06-30"];
  const midmarket: Account[] = mmNames.map((name, i) => {
    const vs = r(35, 90, i * 7 + 1), as = r(30, 88, i * 7 + 2), rs = r(35, 85, i * 7 + 3);
    const stage = mmStages[i % mmStages.length];
    const hasTier2 = seed(i * 13) > 0.7;
    const arrVal = r(80000, 280000, i * 5 + 9);
    const flagKey = (["ticketSpike", "missedQBR", "adoptionNegative60d", "noContactLate"] as const)[i % 4];
    const isRenewal = stage === "Renewal Window";
    return {
      id: `M${String(i + 1).padStart(2, "0")}`, name,
      csm: ["Sarah K.", "Marcus T.", "Priya N.", "David R.", "Pooled"][i % 5],
      arr: arrVal, segment: "MM" as const, stage,
      valueScore: vs, adoptionScore: as, relationshipScore: rs,
      scoreTrend: [r(40, 85, i + 1), r(40, 85, i + 2), r(40, 85, i + 3), r(40, 85, i + 4), r(40, 85, i + 5), r(40, 85, i + 6)],
      flags: hasTier2 ? { [flagKey]: true } : {},
      sentimentTrend: (["stable", "stable", "positive", "declining"] as const)[i % 4],
      sentiment: { csmRating: r(2, 5, i * 3), emailResponseTrend: "stable", meetingTone: "neutral", verbatimTheme: "" },
      adoptionSignals: { userPenetration: r(25, 92, i * 4), featureBreadth: r(20, 85, i * 4 + 1), trajectoryNote: "" },
      expansion: {
        capacityUtil: r(20, 95, i * 3 + 1), featureCeiling: r(15, 90, i * 3 + 2),
        useCaseSignals: r(10, 80, i * 3 + 3), execEngagement: r(15, 85, i * 3 + 4),
        championAdvocacy: r(10, 85, i * 3 + 6), budgetCycleAlignment: r(15, 90, i * 3 + 7),
        contractMonthsLeft: isRenewal ? r(2, 4, i * 3 + 8) : r(5, 14, i * 3 + 8),
      },
      dataConfidence: { score: r(45, 95, i * 4 + 7), completeness: r(40, 95, i * 4 + 8), recency: r(40, 95, i * 4 + 9), sourceDiversity: r(50, 90, i * 4 + 10), note: "" },
      renewal: isRenewal ? { renewalDate: renewalDates[Math.floor(i / 6) % renewalDates.length], isFirstRenewal: i % 2 === 1 } : undefined,
      ttv: { daysToFirstValue: r(18, 70, i * 5 + 11), valueTrajectory: ["stable", "improving", "accelerating", "plateaued", "regressing"][i % 5], trajectoryScore: r(25, 90, i * 5 + 12) },
    };
  });

  const smbCohort = {
    total: 100, healthy: 61, atRisk: 27, critical: 12, avgScore: 64,
    totalARR: 4200000, arrAtRisk: 1260000, trend: "stable",
    topFlags: ["Ticket volume spike in 14 accounts", "CSAT completion rate declining", "18 accounts no response 30d+"],
    adoptionNote: "Avg user penetration 58%. 22 accounts below 30% penetration threshold.",
  };

  const aggregateTrends: Record<string, Record<string, TrendMetric>> = {
    ENT: {
      supportTicketVolume: { label: "Support Ticket Volume", unit: "avg/acct", weeks: [3.1, 3.4, 4.2, 5.1], signal: "spike", note: "Up 65% over 4 weeks — concentrated in 3 accounts. Investigate core feature issues." },
      supportCSAT: { label: "Support CSAT", unit: "avg score", weeks: [4.2, 4.1, 3.9, 3.6], signal: "warning", note: "Declining 4 consecutive weeks. Correlates with ticket volume increase." },
      timeToFirstValue: { label: "Time to First Value", unit: "days", weeks: [38, 39, 41, 43], signal: "warning", note: "Slipping. New accounts averaging 43 days vs. 35-day target." },
      userPenetration: { label: "User Penetration", unit: "avg %", weeks: [68, 69, 67, 66], signal: "watch", note: "Slight erosion. Two accounts below 35% pulling average down." },
      adoptionTrajectory: { label: "Adoption Trajectory", unit: "net +/-", weeks: [3, 1, -2, -4], signal: "warning", note: "Flipped negative this week. Driven by Altum Manufacturing and Cascade Health." },
      qbrCompletionRate: { label: "QBR Completion Rate", unit: "%", weeks: [90, 85, 80, 75], signal: "warning", note: "Down 15pts over 4 weeks. Two accounts missed back-to-back cycles." },
      repeatTicketRate: { label: "Repeat Ticket Rate", unit: "%", weeks: [12, 13, 14, 18], signal: "spike", note: "Up 50% — systemic issue, not one-off. Requires product/support review." },
      csmSentimentAvg: { label: "CSM Sentiment (avg)", unit: "1-5", weeks: [3.8, 3.7, 3.6, 3.4], signal: "watch", note: "Gradual decline. No single driver — diffuse risk across book." },
    },
    MM: {
      supportTicketVolume: { label: "Support Ticket Volume", unit: "avg/acct", weeks: [2.2, 2.3, 2.2, 2.4], signal: "stable", note: "Flat with slight uptick. Within normal range." },
      supportCSAT: { label: "Support CSAT", unit: "avg score", weeks: [4.0, 4.1, 4.0, 3.8], signal: "watch", note: "Small dip this week. Monitor next 2 weeks before escalating." },
      timeToFirstValue: { label: "Time to First Value", unit: "days", weeks: [29, 31, 34, 38], signal: "spike", note: "Up 9 days in 4 weeks. New onboarding cohort showing delays." },
      userPenetration: { label: "User Penetration", unit: "avg %", weeks: [55, 56, 55, 54], signal: "stable", note: "Stable. Consistent with prior quarter." },
      adoptionTrajectory: { label: "Adoption Trajectory", unit: "net +/-", weeks: [5, 4, 3, 2], signal: "stable", note: "Still positive but decelerating. Worth watching." },
      outreachResponseRate: { label: "Outreach Response Rate", unit: "%", weeks: [62, 60, 57, 52], signal: "warning", note: "Down 10pts in 4 weeks. Engagement softening across segment." },
      repeatTicketRate: { label: "Repeat Ticket Rate", unit: "%", weeks: [9, 10, 10, 11], signal: "stable", note: "Creeping up slightly. No action yet." },
      csatCompletionRate: { label: "CSAT Completion Rate", unit: "%", weeks: [48, 46, 44, 41], signal: "warning", note: "Declining response rate reduces signal quality." },
    },
    SMB: {
      supportTicketVolume: { label: "Support Ticket Volume", unit: "avg/acct", weeks: [1.4, 1.5, 1.6, 1.9], signal: "watch", note: "Trending up. 14 accounts above 2x threshold this week." },
      supportCSAT: { label: "Support CSAT", unit: "avg score", weeks: [3.9, 3.9, 3.8, 3.7], signal: "stable", note: "Minor dip. Within acceptable range for segment." },
      timeToFirstValue: { label: "Time to First Value", unit: "days", weeks: [22, 22, 24, 26], signal: "watch", note: "Slipping slightly. Self-serve onboarding may need optimization." },
      csatCompletionRate: { label: "CSAT Completion Rate", unit: "%", weeks: [38, 36, 34, 31], signal: "warning", note: "Dropped below 35% floor. Losing visibility into cohort health." },
      selfServeHelpVolume: { label: "Self-Serve Help Volume", unit: "avg/acct", weeks: [4.1, 4.8, 5.6, 6.9], signal: "spike", note: "Sharp increase. Likely onboarding confusion — review top articles." },
      automatedResponseRate: { label: "Automated Outreach Response", unit: "%", weeks: [24, 23, 21, 18], signal: "warning", note: "Down 6pts. Engagement eroding." },
      repeatTicketRate: { label: "Repeat Ticket Rate", unit: "%", weeks: [15, 16, 17, 21], signal: "spike", note: "Jumped this week. Possible product regression." },
      communityParticipation: { label: "Community Participation", unit: "events/mo", weeks: [1.2, 1.1, 1.0, 0.9], signal: "watch", note: "Slowly declining. Tracks long-term engagement erosion." },
    },
  };

  const implLaunchAccounts: ImplAccount[] = [
    { id: "E08", name: "Summit Education Group", segment: "ENT", stage: "Implementation", csm: "David R.", arr: 280000,
      contractStart: "2026-02-17", expectedGoLive: "2026-06-09", projectedGoLive: "2026-06-23", daysAtRisk: 14,
      overallMilestonePct: 62, expectedMilestonePct: 72, relationshipHealth: "stable", csmSentiment: 4,
      milestones: [
        { name: "Kickoff & stakeholder alignment", status: "complete", pct: 100, owner: "CSM", note: "" },
        { name: "Technical environment setup", status: "complete", pct: 100, owner: "Impl", note: "" },
        { name: "Data integration / API connection", status: "complete", pct: 100, owner: "Impl", note: "" },
        { name: "Core configuration complete", status: "at_risk", pct: 65, owner: "Impl", note: "IT bandwidth constraint — delayed 1 week" },
        { name: "Admin & power user training", status: "at_risk", pct: 40, owner: "CSM", note: "Blocked on configuration milestone above" },
        { name: "UAT sign-off", status: "not_started", pct: 0, owner: "Client", note: "Dependent on training completion" },
        { name: "Go-live readiness review", status: "not_started", pct: 0, owner: "CSM", note: "" },
        { name: "Go-live", status: "not_started", pct: 0, owner: "CSM", note: "At risk of 2-week slip" },
      ] },
    { id: "E05", name: "Brightfield Media", segment: "ENT", stage: "Launch", csm: "Sarah K.", arr: 310000,
      contractStart: "2026-01-06", expectedGoLive: "2026-04-07", projectedGoLive: "2026-04-07", daysAtRisk: 0,
      overallMilestonePct: 81, expectedMilestonePct: 78, relationshipHealth: "stable", csmSentiment: 4,
      milestones: [
        { name: "Go-live achieved", status: "complete", pct: 100, owner: "CSM", note: "On schedule" },
        { name: "First 25% user activation", status: "complete", pct: 100, owner: "CSM", note: "" },
        { name: "Core use case live", status: "complete", pct: 100, owner: "CSM", note: "" },
        { name: "First value milestone", status: "complete", pct: 100, owner: "CSM", note: "ROAS improvement confirmed" },
        { name: "50% user activation", status: "at_risk", pct: 68, owner: "Client", note: "Two teams still pending onboarding" },
        { name: "Second use case activated", status: "in_progress", pct: 45, owner: "CSM", note: "On track for next week" },
        { name: "30-day success review", status: "complete", pct: 100, owner: "CSM", note: "Positive — expansion conversation initiated" },
        { name: "Full user activation target", status: "not_started", pct: 0, owner: "Client", note: "Tracking to target" },
      ] },
    { id: "M03", name: "Crestview Tech", segment: "MM", stage: "Implementation", csm: "Pooled", arr: 145000,
      contractStart: "2026-03-02", expectedGoLive: "2026-05-25", projectedGoLive: "2026-06-08", daysAtRisk: 14,
      overallMilestonePct: 44, expectedMilestonePct: 68, relationshipHealth: "declining", csmSentiment: 2,
      milestones: [
        { name: "Kickoff completed", status: "complete", pct: 100, owner: "CSM", note: "" },
        { name: "Technical setup", status: "complete", pct: 100, owner: "Impl", note: "" },
        { name: "Data integration", status: "at_risk", pct: 50, owner: "Client", note: "Client IT unresponsive for 10 days" },
        { name: "Configuration", status: "not_started", pct: 0, owner: "Impl", note: "Blocked on integration" },
        { name: "Training", status: "not_started", pct: 0, owner: "CSM", note: "" },
        { name: "UAT", status: "not_started", pct: 0, owner: "Client", note: "" },
        { name: "Go-live", status: "not_started", pct: 0, owner: "CSM", note: "2-week slip expected — escalation needed" },
      ] },
    { id: "M07", name: "Ironwood Systems", segment: "MM", stage: "Launch", csm: "Marcus T.", arr: 112000,
      contractStart: "2026-02-02", expectedGoLive: "2026-03-30", projectedGoLive: "2026-03-30", daysAtRisk: 0,
      overallMilestonePct: 90, expectedMilestonePct: 85, relationshipHealth: "positive", csmSentiment: 4,
      milestones: [
        { name: "Go-live achieved", status: "complete", pct: 100, owner: "CSM", note: "" },
        { name: "First value milestone", status: "complete", pct: 100, owner: "CSM", note: "Fill rate improvement confirmed" },
        { name: "User activation 50%", status: "complete", pct: 100, owner: "Client", note: "" },
        { name: "Second use case", status: "complete", pct: 100, owner: "CSM", note: "" },
        { name: "User activation 75%", status: "in_progress", pct: 80, owner: "Client", note: "On track" },
        { name: "30-day success review", status: "complete", pct: 100, owner: "CSM", note: "Expansion discussion opened" },
        { name: "Handoff to steady state", status: "in_progress", pct: 60, owner: "CSM", note: "Tracking to plan" },
      ] },
  ];

  const churnEvents: ChurnEvent[] = [
    { id: "CH01", name: "Delphi Financial", segment: "ENT", arr: 340000, date: "2025-09-30", primaryReason: "CR-03", secondaryReason: "CR-01", healthScore90d: 71, healthScore60d: 58, healthScore30d: 41,
      csmNotes: "CFO and VP Ops both departed Q2. New leadership brought in own vendor relationships. Value was being delivered but relationship never rebuilt with new stakeholders.",
      missedSignals: ["Executive departure detected but escalation delayed 3 weeks", "No exec touchpoint established with new CFO in 60-day window"],
      learnings: "Tier 1 override for exec departure requires 48hr response — this account took 22 days. Exec re-engagement play needs to be automated." },
    { id: "CH02", name: "Horizon Staffing", segment: "ENT", arr: 210000, date: "2025-11-30", primaryReason: "CR-02", secondaryReason: null, healthScore90d: 64, healthScore60d: 60, healthScore30d: 55,
      csmNotes: "Customer needed real-time data sync capability we could not deliver. Evaluated 3 competitors, selected one with native integration.",
      missedSignals: ["Feature gap documented in QBR 6 months prior with no escalation to Product", "Competitor evaluation began 4 months before churn — no signal captured"],
      learnings: "Feature gap escalation path to Product needs SLA. Competitive evaluation signals need to be captured in CRM as a flag." },
    { id: "CH03", name: "Clearwater Logistics", segment: "MM", arr: 92000, date: "2025-10-31", primaryReason: "CR-06", secondaryReason: "CR-01", healthScore90d: 52, healthScore60d: 44, healthScore30d: 38,
      csmNotes: "Implementation ran 11 weeks over schedule. Go-live was achieved but user adoption never ramped. Customer lost internal momentum.",
      missedSignals: ["Implementation delay visible at week 4 but no escalation", "Adoption at 90d post go-live was 22% — well below 50% threshold"],
      learnings: "Go-live is not success. 90-day post-launch adoption review should be a hard checkpoint with defined criteria for intervention." },
    { id: "CH04", name: "Maple Grove Media", segment: "MM", arr: 78000, date: "2025-12-31", primaryReason: "CR-05", secondaryReason: null, healthScore90d: 74, healthScore60d: 72, healthScore30d: 69,
      csmNotes: "Parent company acquisition triggered cost consolidation. Decision made at corporate level to standardize on acquirer's existing vendor.",
      missedSignals: ["Acquisition news was public 2 months before renewal — not flagged in account record"],
      learnings: "M&A monitoring for customer accounts should be automated. News triggers should feed into override system as Tier 2 flag." },
    { id: "CH05", name: "Beacon Retail Partners", segment: "MM", arr: 115000, date: "2026-01-31", primaryReason: "CR-01", secondaryReason: "CR-02", healthScore90d: 58, healthScore60d: 52, healthScore30d: 44,
      csmNotes: "Customer never clearly articulated their primary KPI at contract. Value conversation at renewal was abstract. Neither side could quantify ROI.",
      missedSignals: ["Success criteria undefined at contract — should have been a blocker", "No documented value milestone achievement in 14 months"],
      learnings: "Success criteria definition is a required pre-condition for go-live. Value milestone tracking needs to be enforced in CS platform." },
    { id: "CH06", name: "Summit Data Co", segment: "SMB", arr: 24000, date: "2025-10-31", primaryReason: "CR-04", secondaryReason: null, healthScore90d: 48, healthScore60d: 42, healthScore30d: 35,
      csmNotes: "Self-serve. Competitor offered lower price with comparable features at renewal. No CSM relationship to lean on.",
      missedSignals: ["CSAT completion rate dropped to 0 in final 60 days — no action taken"],
      learnings: "SMB CSAT non-response should trigger automated re-engagement sequence, not just a metric flag." },
    { id: "CH07", name: "Ironbridge Analytics", segment: "SMB", arr: 18000, date: "2025-12-31", primaryReason: "CR-05", secondaryReason: null, healthScore90d: 62, healthScore60d: 58, healthScore30d: 51,
      csmNotes: "Startup ran out of runway. No product or CS failure.",
      missedSignals: [],
      learnings: "SMB financial health monitoring (funding rounds, layoff news) could provide earlier signal for budget-driven churn." },
    { id: "CH08", name: "Terranova Brands", segment: "ENT", arr: 285000, date: "2026-02-28", primaryReason: "CR-01", secondaryReason: "CR-03", healthScore90d: 66, healthScore60d: 55, healthScore30d: 43,
      csmNotes: "Value realization was real but never quantified or socialized internally. Champion left. New stakeholder had no relationship and no evidence of ROI.",
      missedSignals: ["Value not documented in any shared artifact — ROI lived in champion's head", "Champion departure flagged but no executive relationship existed as backup"],
      learnings: "Value documentation must be a shared artifact in the QBR deck and success plan. Relationship breadth beyond single champion is a risk metric." },
  ];

  // Counts and ARR reflect PRIMARY churn reason only, so totals tie exactly
  // to the churnEvents list above (8 events, $1.162M ARR lost).
  const churnReasonSummary = [
    { code: "CR-01", label: "Value Not Realized", count: 2, arrLost: 400000, color: "#dc2626" },
    { code: "CR-02", label: "Product Gap", count: 1, arrLost: 210000, color: "#f59e0b" },
    { code: "CR-03", label: "Champion Loss", count: 1, arrLost: 340000, color: "#7c3aed" },
    { code: "CR-04", label: "Competitive", count: 1, arrLost: 24000, color: "#2563eb" },
    { code: "CR-05", label: "Budget/Economic", count: 2, arrLost: 96000, color: "#6b7280" },
    { code: "CR-06", label: "Impl Failure", count: 1, arrLost: 92000, color: "#ea580c" },
    { code: "CR-07", label: "Strategic Change", count: 0, arrLost: 0, color: "#9ca3af" },
  ];

  return { enterprise, midmarket, smbCohort, aggregateTrends, implLaunchAccounts, churnEvents, churnReasonSummary };
}

export const DATA = generateData();

export type PortfolioData = ReturnType<typeof generateData>;
