# Throughline Backlog

Owner: Dane · Updated: 2026-06-12 (resequenced against the product vision)

**The vision in one line:** Throughline turns a company's go-to-market knowledge work into a governed AI pipeline that researches its market, maintains its positioning, produces its messaging in its own voice, and keeps humans in command of everything that ships.

**Sequencing logic:** first make the system learn (feedback), then prove it generalizes (second brand), then make it act on its knowledge (recommender), then make it live (staleness + lineage), then connect it to the world (data in, channels out). Governance, cost, and quality items land as small increments throughout.

---

## Now: close the first E2E chapter
- Approve Stage 5 artifacts → run Stage 6 (mock sends → S-CP → S-DB). Done when the Daily Brief reflects the full loop.
- **n8n decommission:** DONE 2026-06-12 — workflows deleted, codebase excised (commit 9cb55f6).
- ~~Phase D freeze~~ — dropped: cs-health-app is a separate active project (Dane + collaborator). Throughline never touches it.

---

## 1 · Output → Input feedback loop
**Status: Queued (next build) · Why first: every later feature inherits the steering**

A Feedback button on every output card (dossiers first): verdict (keep / not relevant / needs change) + free-text comment → `workflow_feedback` table. Feedback applies through four layers, strongest first:

- **Structured actions** when feedback maps to data: "drop Homebase as a competitor" deactivates the `brand_competitors` row directly from the dossier card. Never becomes prompt text.
- **Brand-code layer:** feedback that's really about the brand updates the brand repository itself ("we'd never say it like this" → `brand_voice_rules`; "that claim is wrong" → `brand_proof_points`; "that's not our buyer" → `buyer_personas`). One correction propagates to ALL future outputs. The form routes: "apply to this workflow" vs "apply to the brand."
- **Instruction synthesis:** Haiku/Flash merges open comments into a "User steering notes" section appended to `workflow_configs.instructions` (the system prompt every run already uses). Reviewable in the tile's Manage panel; Reset to default stays the escape hatch.
- **Immediate injection:** until applied, open feedback rides the next run's context as "USER FEEDBACK (must respect)".

Manage panel gains a Feedback tab (history + what's been applied). Feedback never touches schemas.

## 2 · Second brand, end to end (NEW)
**Status: Queued (after #1) · The product proof**

The largest gap between vision and code: everything hardcodes the Deputy demo brand. Take a brand we know nothing about through A0 → R-BR → all six stages with zero code changes.

- Flush out Deputy-shaped assumptions hidden in specs (e.g. R-MS hardcodes workforce-management search queries; D-CN audience phrasing; CS-track coupling).
- Brand switcher becomes real (the pill already says "pre-multi-brand"); Command Center, approvals, costs, and outputs all scope to the selected brand.
- Exit criterion: a stranger brand gets a complete GTM brain for ~$1.50 without touching the repo. This is also the sales demo: onboard a prospect's actual brand live.

## 3 · Signal → Action Recommender (CS × PMM bridge)
**Status: Queued (after #2)**

Customer Health detects problems; the PMM workflows already built the remedies. This connects them.

- **Trigger layer (deterministic, free):** rules over the live portfolio: health drop >N in 30d, band falls to Critical, renewal <90d with weak health, churn event, competitor named in a churn reason.
- **Matching layer (one cheap LLM call):** picks the remedy from the existing arsenal (D-HP playbook, D-RT talk track for that account, battlecard, D-CN) with a one-line rationale.
- **Storage:** `recommended_actions` (account, trigger, recommended artifact or workflow, rationale, urgency, open/done/dismissed, HITL columns).
- **Surface:** "Recommended actions" panel on /dashboard and /customer-health with one-click run/deploy; S-DB folds them into the Daily Brief.

Demo money moment: usage declines at an account → the system recommends the renewal talk track it already knows how to write.

## 4 · Staleness + lineage (NEW — the "living throughline")
**Status: Queued (after #3) · One effort, two faces**

The pipeline ran once; with no scheduled runs, the operating question is "what needs refreshing?"

- **Lineage first:** stamp `run_id` on every artifact; generalize the "built from" links the ICP chain and campaign_sends already have. Render lineage in the review modal. This is the enterprise trust story ("show me where this claim came from") and the data structure staleness needs.
- **Staleness model:** every artifact knows the age of its inputs (`source_data_date`/`stale_flag` already exist on collateral; dossiers already track messaging drift). Command Center gains a "stale" view.
- **Impact-aware refresh:** a new R-CI run flags only its downstream dependents (S-BC, S-PO…) as stale; one click re-runs just that chain. Cost story: refresh what changed for cents instead of rerunning everything for a dollar.

## 5 · Live data connections (placeholder + SIMULATED tiers SHIPPED 2026-06-12)
**Status: real connector layer remains**

Simulated tier shipped: per-source "Simulate" toggle in the Manage panel. Simulated sources actually FETCH at run time — a model plays the source's API, generating a compact realistic result set matched to the pull instructions, seeded with real demo-world facts (brand, competitors, personas) so simulations stay coherent. Blocks are labeled SIMULATED end to end, fetches bill to the run's cost ledger, max 4 per run. The engine contract is identical for real connectors — flipping a source to 'connected' later swaps data sources without touching workflows.

Shipped: `workflow_data_sources` (migration 0033), per-tile "Data connections" in the Manage panel (assign sources + pull instructions, enable/disable/remove), engine disclosure of assignments on every run.

Remaining:
- **Connector interface:** `fetchSource(sourceId, pullInstructions, ids) → { block, provenance }`, one module per source family (CRM, call recordings, support, NPS, analytics). Engine swaps the disclosure block for the fetched block when `connection_status = 'connected'`.
- **Fetch model:** on-demand at run time v1 (no sync jobs, consistent with no-scheduled-runs). Later: `source_snapshots` cache with TTL.
- **Credentials:** per-source keys/OAuth in Settings → Data Sources (server-held; connectors run server-side).
- **Shaping:** raw responses summarized to bounded context blocks; never dump payloads into prompts.
- **Failure policy:** a failed connected source degrades gracefully (run proceeds, block notes the gap); hard-fail only if it was the workflow's ONLY source.

## 6 · Real distribution — email only (NARROWED)
**Status: Backlog · One real channel proves the loop; four multiplies integration surface**

- **Resend email only** (the adapter contract was designed for this swap). LinkedIn/Outreach/Apollo stay mocked until email proves the loop end to end.
- Per-channel credential slot; audience selection mapped from personas/segments; delivery rules (approved D-CN → email template).
- **Non-negotiable:** HITL approval remains mandatory before any external send, regardless of future auto-approval policies.
- Real engagement events replace synthetic `campaign_metrics` for the email channel → S-CP analyzes actual performance.

## 7 · Performance-informed messaging
**Status: Backlog · Works on synthetic metrics sooner; real value after #6**

- **Attribution:** extend S-CP rollups to score the underlying artifact and its `messaging_refs` (campaign_sends already links every send to its artifact).
- **Performance memory:** `message_performance` per messaging angle: opens/clicks/replies by positioning anchor, channel, persona.
- **Feed-forward:** D-MG/D-SN/S-PO contexts gain a "What performed" block; instructions lean into winners and rework losers. S-PO's last_change_reason can cite performance.
- With #1, the system gets both judgment signals: human feedback (what we want) and market feedback (what works).

---

## Continuous increments (small, drop in alongside the above)
- **Risk-tiered auto-approval policies** (after #1 exists): low-risk artifact types may auto-approve after N consecutive human approvals; configurable, revocable; external sends ALWAYS human. HITL scales by exception instead of by reviewing every item forever.
- **Per-brand monthly cost budget** with a soft warning in the Command Center control strip. Trivial on top of the ledger; strong enterprise signal.
- **Quality observability:** schema-pass rate and retry rate per workflow in the ledger, so a degrading prompt shows as a trend instead of a surprise failure.
- **R-BR web grounding:** re-add `buildSearchQueries` so brand-code proof points ground in live research (currently context-only with "unverified" attributions).
- **Auto-sweep stale runs** on Command Center load.

## Deprioritized (deliberately)
- Outreach/Apollo/LinkedIn live adapters (until email proves the loop).
- Editable stage groupings (fixed groupings are correct by construction).
- Deployment forking (D-DA/D-DP) — removed from the UI 2026-06-12; if format-forking returns, it folds into #6's delivery rules.
- Deepening S-AR / S-LP — breadth for the demo, not the spine.

## Parallel business track (not product, but gating)
- **Business-account migration:** all infra (GitHub/Vercel/Supabase/Anthropic) sits on personal accounts. The moment #2 points at real prospects, this gates commercial demos. Schedule it; don't let it block reactively.

---

## Done (this week, for context)
- n8n → native migration: 33/33 workflows, generic engine + declarative specs.
- Command Center: staged tiles, manual advance, Manage panels (credentials/model/instructions/errors/data connections), inline approvals with full review modal, stale-run handling, error classification.
- LLM cost tracking: exact billed tokens, frozen pricing, tile/stage/pipeline costs + full ledger.
- Gemini native Google Search grounding for the research tier.
- First E2E run: Stages 1–5 green (~$1.33 total), Stage 6 parked at the approval gate by design.
