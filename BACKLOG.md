# Throughline Backlog

Owner: Dane · Updated: 2026-06-12
Gate: items 1-4 start **after the first end-to-end pipeline run** completes (Stages 5-6 remaining).

---

## 1 · Output → Input feedback loop
**Status: Queued (next up) · Why first: every later feature inherits the steering**

A Feedback button on every output card (dossiers first): verdict (keep / not relevant / needs change) + free-text comment → `workflow_feedback` table. Feedback applies through three layers, strongest first:

- **Structured actions** when feedback maps to data — "drop Homebase as a competitor" deactivates the `brand_competitors` row directly from the dossier card. Never becomes prompt text.
- **Instruction synthesis** — Haiku/Flash merges open comments into a "User steering notes" section appended to `workflow_configs.instructions` (the system prompt every run already uses), so future runs obey automatically. Reviewable in the tile's Manage panel; Reset to default stays the escape hatch.
- **Immediate injection** — until applied, open feedback rides the next run's context as "USER FEEDBACK (must respect)".

- **Brand-code layer** — feedback that's really about the brand, not the workflow, updates the brand repository itself: "we'd never say it like this" edits/adds a `brand_voice_rules` row, "that claim is wrong" corrects or retires a `brand_proof_points` row, "that's not our buyer" amends `buyer_personas`. Because every workflow reads the brand code on each run, one piece of feedback propagates to ALL future outputs, not just the workflow it was left on. The feedback form routes this: "apply to this workflow" vs "apply to the brand."

Manage panel gains a Feedback tab (history + what's been applied). Feedback never touches schemas.

## 2 · Signal → Action Recommender (CS × PMM bridge)
**Status: Queued (after #1)**

Customer Health detects problems; the PMM workflows already built the remedies — this connects them.

- **Trigger layer (deterministic, free):** rules over the live portfolio — health drop >N in 30d, band falls to Critical, renewal <90d with weak health, churn event, competitor named in a churn reason.
- **Matching layer (one cheap LLM call):** picks the remedy from the existing arsenal — deploy the D-HP playbook, generate a D-RT talk track for that account, send the Homebase battlecard, fire D-CN — with a one-line rationale.
- **Storage:** `recommended_actions` (account, trigger, recommended artifact or workflow, rationale, urgency, open/done/dismissed, HITL columns).
- **Surface:** "Recommended actions" panel on /dashboard and /customer-health with one-click run/deploy; S-DB folds them into the Daily Brief.

Demo money moment: usage declines at an account → the system recommends the renewal talk track it already knows how to write.

## 3 · Per-workflow external data connections
**Status: Backlog**

Each Command Center tile's Manage panel gains a **Data connections** section: assign external sources (from the Settings Data Sources catalog — CRM, Gong, Zendesk, NPS, analytics) to that workflow, plus a per-connection pull instruction ("what to fetch and how to use it" — e.g. R-WL ← Salesforce: "closed-lost opps last quarter with competitor fields").

- `workflow_data_sources` table (workflow_code, source_id, pull_instructions, enabled).
- Engine `buildContext` consults assignments: live connector fetch once wired, clearly-labeled mock until then.
- Replaces the synthetic-composite behavior currently hardcoded in R-WL / R-CF / R-PF / R-EV with user-controlled sourcing.

## 4 · Real distribution automation
**Status: Backlog**

Evolve the mock X-* adapters into actual delivery of messaging, narratives, and collateral:

- **Channels in order of effort:** Resend email (adapter contract already designed for the swap) → LinkedIn queue/share → Outreach/Apollo sequences.
- Per-channel credential slots (existing BYOK pattern); audience selection mapped from personas/segments.
- **Delivery rules:** artifact types auto-queue to channels (e.g. approved D-CN → LinkedIn draft + email template).
- **Non-negotiable:** HITL approval remains mandatory before any external send.
- Real engagement events replace synthetic `campaign_metrics`, so S-CP analyzes actual performance — the loop closes for real.

## 5 · Performance-informed messaging (metrics close the creative loop)
**Status: Backlog · Depends on #4 for real metrics; works on synthetic ones sooner**

Campaign performance becomes an INPUT to messaging generation, so deliverables improve run over run:

- **Attribution:** campaign_sends already links every send to its artifact (`artifact_table`/`artifact_id`), and S-CP rolls metrics up per send — extend the rollup to score the underlying artifact and its `messaging_refs` (which positioning element/message it traced to).
- **Performance memory:** a `message_performance` view per messaging angle: opens/clicks/replies by positioning anchor, channel, persona. "Compliance-angle emails reply 3x better than price-angle" becomes data.
- **Feed-forward:** D-MG/D-SN/S-PO contexts gain a "What performed" block — top and bottom performing angles with their metrics — and instructions to lean into winners, rework or retire losers. S-PO's last_change_reason can cite performance ("compliance value prop promoted: 3x reply rate").
- **HITL stays:** performance steers drafts; humans still approve them.

This plus the feedback loop (#1) gives the system both judgment signals: human feedback (what we want) and market feedback (what works).

---

## Smaller items
- **R-BR web grounding:** re-add `buildSearchQueries` so brand-code proof points ground in live research (removed 2026-06-11 to unblock Stage 1; currently context-only with "unverified" attributions).
- **Manual stale-run sweep is in place; consider auto-sweep** on Command Center load when stale runs are detected.
- **n8n decommission:** archive workflows + cancel subscription once the E2E run is done; optionally strip the dead webhook fallback from the run route.
- **Phase D freeze:** tag cs-health-app v1.0 (standalone app retires in favor of the merged product).

## Done (this week, for context)
- n8n → native migration: 33/33 workflows, generic engine + declarative specs.
- Command Center: staged tiles, manual advance, per-tile Manage (credentials/model/instructions/errors), stale-run handling, error classification.
- LLM cost tracking: exact billed tokens, frozen pricing, tile/stage/pipeline costs + full ledger.
- Gemini native Google Search grounding for the research tier (no Tavily dependency).
- First E2E run in progress: Stages 1-4 green (~$0.50 total LLM spend so far).
