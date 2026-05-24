# Throughline — Strategic Build Plan

Working plan for the next ~6–8 weeks of build. Treats the 8 agents we just shipped (A1–A8) as foundation, renames them under a layer-prefixed convention, and layers six product capabilities on top:

1. **Persona Lens** — make the same data render four different ways for Product / CS / Marketing / Sales
2. **Brand Code Ingestion** — let each customer feed their own brand inputs in instead of relying on hardcoded brand context
3. **Remaining Agents + Layer-Prefixed Rename** — the 9 new agents (WL, EV, CP, PF, PP, AR, LP, SE, CN) plus a rename of every agent into the four-layer model (Research / Synthesis / Delivery / Distribution)
4. **Distribution + Feedback Loop** — actually send the generated content to external audiences, capture real-world performance, feed it back into the model
5. **Enablement Collateral Automation** — produce, refresh, and route the internal assets a Sales and CS org runs on (battlecards, one-pagers, talk tracks, QBR templates, playbooks, runbooks)
6. **Human-in-the-Loop Review & Approval** — the cross-cutting governance layer that gates every Delivery and Distribution agent behind structured review, captures human edits as training signal, and lets safe items auto-publish

Each capability is independent enough to ship in isolation, but the order below is the one that gives the product the strongest standalone story at each stage.

---

## Capability 1 — Persona Lens

**Problem we're solving.** Right now `/dashboard` is a single neutral view of everything. A Sales rep, a PM, a CS lead, and a Marketing leader all care about radically different cuts of the same agent output. Showing them the same dashboard makes the product feel generic.

**What it looks like.**

Same underlying Supabase data, four curated landing pages keyed off the user's `role`:

- `/workspace/marketing` — *default for marketing leaders* — positioning (A5) front and center, messaging library (A6), campaign performance (CP, future), market signals (A2) above the fold.
- `/workspace/sales` — battlecards (A7), competitive landmines from A1, win/loss highlights (WL, future), sales enablement assets (SE, future). The top section is "what to say in the next 3 calls."
- `/workspace/product` — roadmap items by UVFV (A3), feedback themes (A4), product feedback (PF, future), competitive product signals filtered from A1 and A2.
- `/workspace/cs` — customer evidence (EV, future), feedback themes (A4), positioning (A5) for value articulation, recent escalations from PF.

The existing `/agents/[code]` pages stay — they're the deep-dive view for anyone who wants the full agent output. The persona workspaces are the "I just logged in, what do I need to know" view.

**Implementation shape.**

- Extend the `profiles.role` enum (`product` | `customer_success` | `marketing` | `sales` | `admin`).
- Onboarding flow asks for **job title** (free-text), then maps it via a `title_role_lookup` table (e.g., "VP Product Marketing" → marketing, "Sr Customer Success Manager" → customer_success). User can confirm or override the auto-detected role. Route to the matching `/workspace/<role>` by default. *(Decision #1, 2026-05-22)*
- Each workspace is a Server Component that runs 3–5 focused Supabase queries and renders a hand-tuned layout. Reuses the existing card components (`SignalCard`, `DossierCard`, `RoadmapCard`, etc.).
- Add a workspace switcher in the top bar (so a Marketing leader can peek at Sales view without changing their role).
- **Half-populated at Build Phase 2 milestone.** Cards for the 8 existing agents (R-CI, R-MS, R-CF, S-RM, S-PO, S-BC, D-MG, D-SN) render live data. Cards for Phase 3 agents (R-PP, R-WL, R-EV, R-PF, S-AR, S-LP) render placeholder "Coming soon" states until their underlying agents ship. Each card flips live the moment its agent lands. Phase 2 is complete when the shell ships and all existing-agent cards are populated; it is not blocked on Phase 3.

**Effort.** ~2–3 hours focused work (see Recommended Phasing). The hard work is in the *content selection* per persona (what 5 things does a Sales rep see first?), not in the wiring.

**Strategic value.** Very high. Single biggest perceptual lift. The product reads as built for an org, not for a solo PMM, the moment a user lands in a role-shaped view.

---

## Capability 2 — Brand Code Ingestion

**Problem we're solving.** Every agent currently uses hardcoded Throughline context in its prompt. For a real customer, we need them to feed their own materials in — style guide, product docs, customer interviews, sales call recordings — and have all downstream agents reflect that brand specificity.

**What it looks like.**

MVP onboarding is a **conversational questionnaire** rather than a doc-upload form. The user goes through a chat-style intake (~10–15 questions) that captures the same structured brand inputs without making them dig through their Drive. Example questions:

- "Who are your top 3–5 competitors? Paste their domains."
- "What's your value proposition in one sentence? What changes if you swap a competitor's brand into your statement and nothing else feels different?"
- "Drop in a customer quote you wish every prospect saw on your homepage."
- "What's one number your team is proudest of?"
- "What are 3 words you'd never let marketing say? What are 3 you wish they said more?"
- "Describe your buyer in one paragraph. Pick the worst meeting you've had with them and tell me what they said."

Document upload (PDF/DOCX brand guides, transcripts, call recordings) becomes a **power-user path** layered on later for customers who want richer ingestion. Conversational onboarding is the default first-run experience because it lowers time-to-first-value from hours (compile docs) to minutes (chat with the agent). *(Decision #5, 2026-05-22)*

A new agent — **R-BR: Brand Repository (Brand Code Ingester)** — parses the questionnaire responses (and any uploaded documents in the power-user path) and writes structured records to three new tables:

- `brand_voice_rules` — tone, banned phrases, preferred terminology, formatting rules (extracted from style guide)
- `brand_proof_points` — quantified claims, customer quotes, ROI metrics (extracted from interviews, case studies)
- `product_capabilities` — feature → benefit mappings, gap analyses (extracted from product docs)

Every other agent's `Build Context` node then reads these tables and includes them in the prompt. Output quality jumps because the agent sees actual customer language, actual proof points, actual product capabilities — instead of training-knowledge approximations.

**Implementation shape.**

- Supabase Storage bucket for raw files (`brand-assets/<tenant_id>/...`).
- PDF/DOCX extraction via `pdf-parse` and `mammoth` in a Next.js API route, OR an n8n workflow that handles the parsing.
- R-BR agent uses **Claude Sonnet** for extraction (decided 2026-05-22; cheaper than GPT-4 with comparable quality on structured-extraction tasks). Strong document and conversation comprehension; Flash is too brittle for this. *(Decision #2)*
- Re-ingestion: when a user uploads new materials, BC re-runs and overwrites the structured tables.
- All A1–A8 + new agents' `Build Context` nodes updated to read these three tables and include them in the prompt context.

**Effort.** ~1–2 weeks. The extraction prompt engineering is the time sink — getting Claude/GPT to reliably output structured JSON from unstructured brand docs takes iteration.

**Strategic value.** Very high. This is what turns Throughline from a single-brand showcase into a real multi-tenant platform. Drop in any customer's materials, run all 8 agents, and the output reflects their actual voice, proof points, and product capabilities.

**Dependency.** Independent of everything else. Can run in parallel with the persona lens work.

---

## Capability 3 — Remaining Agent Pipeline + Layer-Prefixed Rename

### 3a. Naming convention

Every agent gets a layer-prefixed code: `L-XX`. The letter signals the layer in the platform; the two-letter suffix signals function. This replaces the A1–A8 numbering and makes the system topology readable at a glance.

Four layers:

- **R — Research:** gather facts, signals, and inputs (external or from raw customer materials)
- **S — Synthesis:** combine research into structured frameworks, scores, and recommendations
- **D — Delivery:** produce finished work artifacts (messaging, battlecards, briefs, collateral)
- **X — Distribution:** push delivered artifacts to channels and capture performance

Codes display uppercase in tables, docs, and the UI sidebar. URLs use lowercase (`/agents/r-ci`, `/agents/s-po`) per web convention.

### 3b. Full agent map (existing + new)

| Layer | Code | Prior label | Agent name |
|---|---|---|---|
| R | R-CI | A1 | Competitive Intelligence |
| R | R-MS | A2 | Market Signals |
| R | R-CF | A4 | Customer Feedback |
| R | R-BR | (new) | Brand Repository (Brand Code Ingester, see Cap 2) |
| R | R-PP | (new) | Pricing & Packaging Intelligence |
| R | R-WL | (new) | Win/Loss Analyst |
| R | R-EV | (new) | Customer Evidence Curator |
| R | R-PF | (new) | Product Feedback Synthesizer |
| S | S-RM | A3 | Roadmap Steering |
| S | S-PO | A5 | Positioning Engine |
| S | S-BC | A7 | Battlecards |
| S | S-AR | (new) | Analyst Relations Prep |
| S | S-LP | (new) | Launch Planning |
| S | S-CP | (new) | Campaign Performance Analyst |
| D | D-MG | A6 | Messaging Generator |
| D | D-SN | A8 | Sales Narrative |
| D | D-SE | (new) | Sales Enablement Studio |
| D | D-CN | (new) | Counter-Narrative Responder |
| D | D-OB | (Cap 5) | Objection Handler |
| D | D-QB | (Cap 5) | QBR Template Generator |
| D | D-HP | (Cap 5) | Customer Health Playbook |
| D | D-WW | (Cap 5) | Win Wire |
| D | D-XP | (Cap 5) | Expansion Play |
| D | D-RT | (Cap 5) | Renewal Talk Track |
| X | X-EM | (Cap 4) | Email Distributor (Resend) |
| X | X-LI | (Cap 4) | LinkedIn Queue |
| X | X-SL | (Cap 4) | Slack Distributor |
| X | X-HS | (Cap 4 v2) | Highspot / Seismic Pusher |

### 3c. New agents — source / target mapping

| Code | Reads | Writes |
|---|---|---|
| R-PP | R-CI dossiers, R-MS signals | `pricing_intelligence` |
| R-WL | dummy CRM data + R-CI dossiers | `win_loss_analyses` |
| R-EV | dummy review/NPS data | `customer_evidence` |
| R-PF | dummy support data + S-RM roadmap | `product_feedback` |
| S-AR | S-PO + R-CI + S-RM + R-EV | `analyst_briefings` |
| S-CP | content_outputs + campaign_metrics (Cap 4) | `campaign_performance` |
| S-LP | S-PO + buyer_personas (placeholder seed in Build Phase 3, R-BR overwrites in Build Phase 4) + content_outputs | `launch_plans` |
| D-SE | S-PO + S-BC + buyer_personas | `sales_enablement_assets` |
| D-CN | R-MS (compound trigger, see 3f) + S-BC | `counter_narrative_memos` |

### 3d. Rename migration

Mechanical, half-day pass:

- Update `src/lib/agent-config.ts` to map new codes to existing webhook paths. Webhook URLs in n8n stay stable (internal plumbing); only the UI-facing code changes.
- Add a Postgres migration to backfill `run_history.agent_code` (`A1`→`R-CI`, `A2`→`R-MS`, `A3`→`S-RM`, `A4`→`R-CF`, `A5`→`S-PO`, `A6`→`D-MG`, `A7`→`S-BC`, `A8`→`D-SN`).
- Sidebar labels, navigation routing, agent landing pages.
- PLAN.md, CLAUDE.md, MEMORY.md sweep.

### 3e. Build order for the new agents

- **Phase 1 — Independent** (parallel-buildable): R-PP, R-WL, R-EV, R-PF
- **Phase 2 — Synthesizers** (need Phase 1 + existing outputs): S-AR, S-LP. *S-LP needs a `buyer_personas` row to exist; if R-BR hasn't shipped yet, seed a placeholder row from existing Throughline brand context. R-BR upserts it on first run.*
- **Phase 3 — Distribution-dependent**: S-CP. *Reads `campaign_metrics`, which doesn't exist until Cap 4 ships. Lands in Build Phase 6 alongside the distribution layer and the closed-loop wiring.*
- **Phase 4 — Event-triggered**: D-CN (see 3f)

**Effort.** ~90 min per agent at our current pace × 9 = ~13 hours focused. Subagent-parallelizable to ~4–5 hours wall time.

**Strategic value.** Medium-high per agent. R-PP (Pricing & Packaging) is the single highest-impact new agent because pricing is what every PMM gets asked about and never has time for. D-CN is the second highest because it is the first agent that fires autonomously on a trigger rather than on user request.

**Dependency.** Phase 1 is independent. Phase 2 reads Phase 1's tables. D-CN can be built any time but only fires meaningfully once R-MS has signals.

### 3f. D-CN trigger rule

D-CN is the only agent in the platform that fires autonomously without a user clicking "Run now." Every other agent runs on-demand. D-CN watches the R-MS market-signals stream and writes a counter-narrative memo (one-page defensive response: short rep-ready talking points + suggested LinkedIn post + email reply template) when a signal meets the trigger rule.

**Trigger rule (Decision #4, 2026-05-22):**

```
fire D-CN if:
  impact_score >= 8
  OR (impact_score >= 7
      AND sentiment = 'bearish'
      AND category IN ('competitive_positioning', 'regulatory_watch'))
```

In plain English: fire on any high-impact signal regardless of sentiment, plus moderate-impact bearish signals that land in strategically sensitive categories (competitive positioning shifts or regulatory rulings). The compound clause catches the "moderate-but-real bad news" case (e.g., an impact-7 regulatory ruling that affects every customer in CTV targeting) that a pure impact-8 threshold would miss.

**Worked examples:**

| Signal | impact | sentiment | category | Fires? |
|---|---|---|---|---|
| Competitor announces 50% price cut | 9 | bearish | competitive_positioning | Yes (impact ≥ 8) |
| FCC restricts CTV targeting | 7 | bearish | regulatory_watch | Yes (compound rule) |
| IAB publishes positive growth report | 8 | bullish | ad_spend_velocity | Yes (impact ≥ 8) |
| Small competitor wins minor partnership | 6 | bearish | competitive_positioning | No (impact too low) |
| Industry analyst publishes neutral CTV explainer | 7 | neutral | ad_spend_velocity | No (sentiment + category miss) |

**Configurability:**

Default rule lives in the D-CN agent's trigger node config. Per-tenant overrides land in v2 via the same `artifact_type_review_rules` table that Cap 6 uses for tier overrides, so a regulated-industry customer can promote everything to "fire on any bearish impact-6+" while a fast-moving startup can tighten to "impact-9 only."

**Output goes through Cap 6:** D-CN memos are Medium tier by default (internal Slack post for the PMM team), so they queue for single-reviewer approval before being shared. Goes High tier if the memo is being prepared for external publication (LinkedIn post, public statement).

**Autonomous firing is currently paused.** Decision 2026-05-23: every Throughline n8n workflow runs on-demand only. No Schedule Trigger nodes, no cron, no autonomous polling, to keep API credit consumption deliberate. D-CN's manual `Run now` button still applies the compound rule against the latest signals. When credits are unblocked, re-enable D-CN's 30-min Schedule Trigger (the original two-trigger shape is in commit `995feb0` for reference).

---

## Capability 4 — Distribution + Feedback Loop

**Problem we're solving.** Right now Throughline *generates* content but doesn't *ship* it. The work product gets written to Supabase and read by the user — that's it. For Throughline to be a real GTM operations platform, the generated content needs to:

1. Get distributed to actual channels (email, LinkedIn, social, internal Slack, etc.)
2. Capture performance data on what landed
3. Feed that performance data back into the model so next iteration's output is sharper

This is the **closed loop** — what makes Throughline a system, not a generator.

**The pieces.**

### 4a. Distribution layer

Per-channel adapters that take a content_outputs row from A6 (or a sales_collateral row from A8) and ship it to the channel. v1 candidates:

| Channel | Distribution path | Effort | Notes |
|---|---|---|---|
| Email (marketing) | Resend or Postmark API → tracked delivery | Low | Open/click webhooks → metrics table |
| Email (sales sequences) | Outreach.io or Apollo API → tracked sequences | Medium | Per-rep auth complexity |
| LinkedIn (personal) | Queue + manual paste (LinkedIn API is restrictive) | Low | User marks "posted" with the URL |
| LinkedIn (company page) | LinkedIn API direct | Medium | OAuth + rate limits |
| Twitter/X | Twitter API v2 | Medium | API access tier matters |
| Slack (internal) | Slack webhook | Low | "Here's what marketing is shipping this week" |
| Calendar/Webinar | Defer to v2 | — | — |

**v1 cut (Decision #3, 2026-05-22):** Resend email + LinkedIn queue + Outreach + Apollo. The four channels that cover marketing email, organic social, and sales-led outbound sequences. Slack remains as an **internal-only** channel for Cap 5 enablement digests and Cap 6 reviewer notifications; it is not part of the primary external distribution path.

**Mock-first default for Outreach, Apollo, and LinkedIn (see §4d).** Real adapters require external account access that may not be available at Phase 6 build time. Mock adapters ship by default for those three channels and produce realistic synthetic engagement metrics, so the closed loop in §4c is demonstrable end-to-end before real credentials arrive. Resend and Slack are easy enough to integrate live from day one.

### 4b. Performance capture

New tables:

- `campaign_sends` — what content went out, to whom, when, via which channel
- `campaign_metrics` — opens, clicks, replies, conversions, attributed pipeline (per send)

Per-channel webhooks ingest metrics:
- Resend webhook → `email.delivered`, `email.opened`, `email.clicked` → write to campaign_metrics
- LinkedIn manual: user pastes the post URL after publishing; a daily job scrapes engagement (or the user manually updates engagement stats)
- Slack: thread reply count, reactions

### 4c. Feedback into the model

S-CP (Campaign Performance Analyst, Capability 3 Phase 2) reads `campaign_metrics` and produces `campaign_performance` rows: *"messaging variant 'A' outperformed variant 'B' by 40% on click-through. Theme of 'workflow modernization' is winning over 'AI native' on this segment."*

S-PO (Positioning Engine) and D-MG (Messaging Generator) then include the latest `campaign_performance` rows in their Build Context. Next refresh:
- S-PO sharpens positioning based on what messaging is actually landing
- D-MG generates new messaging variants weighted toward the themes that won

This is the closed loop. The system gets smarter every cycle because real performance flows back in. Works against either real or mock metrics (see §4d), so the loop is demonstrable end-to-end before real credentials arrive.

### 4d. Mock-first adapter pattern

Every distribution channel ships with **two adapters behind the same interface**: a real adapter that calls the external API, and a mock adapter that simulates the same behavior locally. Tenants run on mock by default; real adapters swap in when credentials arrive. This pattern exists because Outreach and Apollo specifically require sales-team account access we don't currently have, and we don't want Cap 4, Cap 5, or the closed loop in §4c blocked on external account provisioning.

**The interface:**

```ts
interface DistributionAdapter {
  send(content: ContentOutput, audience: Audience): Promise<{ send_id: string }>;
  fetchMetrics(send_id: string): Promise<CampaignMetricsSnapshot>;
}
```

**The implementations:**

| Channel | Real adapter | Mock adapter | Mock ships by default? |
|---|---|---|---|
| X-EM (Resend email) | `ResendEmailAdapter` | `ResendEmailMockAdapter` | No (Resend is easy to integrate) |
| X-LI (LinkedIn queue) | `LinkedInQueueAdapter` | `LinkedInQueueMockAdapter` | Yes (LinkedIn API access is restrictive) |
| X-OR (Outreach) | `OutreachAdapter` | `OutreachMockAdapter` | **Yes** (no credentials yet) |
| X-AP (Apollo) | `ApolloAdapter` | `ApolloMockAdapter` | **Yes** (no credentials yet) |
| X-SL (Slack, internal) | `SlackWebhookAdapter` | `SlackWebhookMockAdapter` | No (Slack webhooks are trivial) |

**Tenant-level config in `distribution_channels` table:**

```
distribution_channels:
  - id
  - tenant_id (organization_id)
  - channel_type: 'resend' | 'linkedin' | 'outreach' | 'apollo' | 'slack'
  - mode: 'live' | 'mock'
  - credentials_encrypted (null when mode='mock')
  - configured_at
  - last_used_at
```

**Mock adapter behavior:**

1. `send()` writes a row to `campaign_sends` with `status = 'sent_mock'`, generates a synthetic `send_id`, returns immediately
2. A background job fires synthetic metrics events on a believable schedule and writes them to `campaign_metrics`:
   - 10–25% open rate within 0–4 hours (jittered)
   - 1.5–4% click-through within 0–24 hours
   - 0.3–1% reply rate within 0–48 hours
   - Bounce, unsubscribe, and spam rates per realistic distributions
3. Every UI surface displays a **"Simulated"** badge on sends that went through a mock adapter, so reviewers can never confuse mock data for real performance
4. `S-CP` reads from `campaign_metrics` regardless of source. Mock data is clearly tagged with `source = 'mock'` so analysis can include or exclude it

**Swap-in workflow when real credentials arrive:**

1. Admin pastes API key into the channel settings UI
2. Backend encrypts and stores in `distribution_channels.credentials_encrypted`
3. `distribution_channels.mode` flips to `'live'`
4. Real adapter takes over for subsequent sends
5. Historical mock data stays in place, clearly labeled, for trend context. New live sends accumulate alongside. S-CP analysis defaults to live-only after 14 days of live data is available.

**Why this matters strategically.** The closed-loop story (§4c) is the highest-value piece of the platform. Mock-first means we can demonstrate that loop end-to-end immediately, without waiting on sales-team account provisioning, and without the embarrassment of "this part is mocked" being a known gap. It's an honest part of the architecture, not a workaround.

**Effort.** Mock adapters are ~30 minutes each (4 channels × 30 min = 2 hours). Real adapters are 1–2 hours each plus external-account overhead. Swap-in flow is ~30 minutes (UI to paste API key + encrypt + flag flip). Total for mock-first Phase 6: ~4–5 hours; real adapter swap-in happens as credentials arrive.

**Strategic value.** Highest of all six capabilities. The closed loop is the story that makes Throughline a system rather than a content generator. Without this, the product is a smart writer. With this, it compounds with every cycle of campaign data. Mock-first ensures the strategic value lands on Day 1 of Phase 6, not Day N when external credentials happen to clear.

**Dependency.** Needs S-CP (Capability 3 Phase 2). Realistically built after Capability 3 Phase 2 ships.

---

## Capability 5 — Enablement Collateral Automation

**Problem we're solving.** Sales and Customer Success teams run on a long tail of internal collateral: battlecards, one-pagers, talk tracks, objection handlers, demo scripts, QBR templates, customer health playbooks, escalation runbooks, win wires, expansion plays, renewal talk tracks, onboarding kits, new hire ramp docs. Today these live in scattered Drive folders and Highspot libraries, get written by hand by an over-extended PMM or enablement lead, and go stale the moment a competitor changes pricing, a positioning shift lands, or a new feature ships. Throughline should produce them automatically, keep them fresh against the upstream agent data, and route them to the teams that use them.

This sits adjacent to Capability 4, but the audience is internal (reps, CSMs, AEs, AMs) rather than external (prospects, customers), and the artifact is a structured deliverable rather than a channel-specific message.

**What it looks like.**

A "Collateral Library" workspace section, browseable by team, role, and use case. Three buckets:

- **Sales-facing:** battlecards (already A7), one-pagers, demo scripts, objection handlers, discovery question banks, ROI calculators, mutual action plans, win wires, competitive deep-dives
- **CS-facing:** onboarding kits, QBR templates, customer health playbooks, escalation runbooks, expansion play guides, renewal talk tracks, success milestone checklists, case study briefs
- **Cross-functional:** new hire ramp docs, deal desk references, partner enablement kits

Every asset carries a freshness state (`current` / `stale` / `regenerating`) and a "what changed since last refresh" diff so reps can see what's new without re-reading the whole thing.

**The three engines that power this:**

### 5a. Production

Synthesizer agents (extending the A7 and SE patterns) read the same source tables and write a structured asset. Mapping of asset type to source data and producing agent:

| Asset | Source data | Producing agent |
|---|---|---|
| Battlecard | A1 + A2 + A5 + WL | A7 (extend) |
| One-pager | A5 + EV + PP | SE (extend) |
| Demo script | A5 + A6 + product_capabilities | SE (new mode) |
| Objection handler | WL + A6 + battlecards | new sub-agent OB |
| QBR template | EV + customer_evidence + product_feedback | new sub-agent QB |
| Customer health playbook | PF + EV + product_feedback | new sub-agent HP |
| Onboarding kit | A5 + product_capabilities + buyer_personas | SE (extend) |
| Win wire | WL + closed-won CRM events | new sub-agent WW |
| Expansion play | EV + product_capabilities + buyer_personas | new sub-agent XP |
| Renewal talk track | EV + PF + CP performance | new sub-agent RT |

Most of these are template and prompt variants on SE (Sales Enablement Studio). The shape of work is the same: read source tables, write a structured deliverable to a new versioned row.

### 5b. Updating

Each asset has a `staleness_trigger` config: which upstream tables it depends on, and what kind of change forces regeneration.

- Battlecards regenerate when their competitor's `competitive_dossiers` row updates or an impact-8 `market_signals` event lands
- One-pagers regenerate on positioning shifts (A5 publishes new framework)
- QBR templates refresh quarterly or when a customer's feedback theme materially shifts
- Demo scripts regenerate when a new `product_capabilities` row appears (BC re-ingests product docs)
- Renewal talk tracks regenerate when CP campaign_performance shows a messaging theme starting to win or lose

A scheduled job runs nightly:
1. Scans source tables for changes since each asset's `last_refreshed_at`
2. Flags affected assets as `stale` and queues high-priority ones for regeneration
3. Notifies the asset owner (PMM or enablement lead) of pending regenerations
4. On approval (auto-approve for low-risk asset types), regenerates and version-bumps

Version history is preserved. Assets are append-only with a `current_version_id` pointer. Reps see the latest by default but can audit prior versions and view a side-by-side diff.

### 5c. Distribution (internal)

Surfaces for getting collateral to the people who need it:

| Surface | Use | Effort |
|---|---|---|
| In-app library | Source of truth, browseable by team/role/use case | Built-in via the workspace UI |
| Slack | Daily or weekly digest of new and refreshed assets posted to #enablement | Low |
| Highspot / Seismic | Push assets via API to existing enablement platforms | Medium (per-platform OAuth) |
| Google Drive / Notion | Sync to org's existing doc tooling for legacy workflows | Medium |
| Email digest | Weekly "what's new in the collateral library" to all reps and CSMs | Low |
| Inline in CRM | Asset suggestions in Salesforce/HubSpot record sidebar based on deal stage | High (defer to v2) |

Realistic v1: in-app library + Slack digest + email digest. Highspot/Seismic is a Phase 2 ask driven by customer.

**Implementation shape.**

- New table `enablement_assets`: `asset_type`, `audience` (sales/cs/both), `title`, `body_markdown` (or `body_jsonb` for structured), `source_refs[]`, `staleness_trigger_jsonb`, `last_refreshed_at`, `freshness_state`, `version`, `current_version_id`, `owner_profile_id`.
- New table `enablement_asset_versions` for full version history.
- New table `enablement_distribution_log` for tracking what got pushed where, when, and with what engagement.
- **SE splits into dedicated sub-agents** (D-OB, D-QB, D-HP, D-WW, D-XP, D-RT) per Decision #7 (2026-05-22). The granularity is worth the maintenance surface. Each sub-agent has focused prompts, dedicated source tables, its own reviewer-role mapping in Cap 6, and an independent refresh cadence.
- Staleness scanner is a nightly Vercel cron or n8n schedule trigger.
- Slack and email digest is a weekly cron that aggregates the week's refreshes.

**Effort.**

- Core library table + UI + SE expansion for the first four asset types (battlecard, one-pager, demo script, objection handler): ~1 week
- Staleness scanner + version history + freshness UI: ~3–4 days
- Slack and email digest: ~2 days
- Remaining asset types (QBR, health playbook, onboarding kit, win wire, expansion play, renewal talk track): ~half-day each, ~1 week total
- Highspot/Seismic integration: ~1 week (Phase 2)

Total v1 (in-app + Slack + email + four asset types): ~2 weeks.
Total complete pass (all asset types + Highspot): ~4 weeks.

**Strategic value.** Very high for the CS and Sales personas. Every enablement leader has a "collateral graveyard" problem. A library that stays current automatically, tells you what's stale, and pushes a weekly Slack digest is one of the most tangible "this saves a real headcount" outcomes the product can deliver.

**Dependency.** Needs Capability 1 (Persona Lens, so the sales and CS workspaces have a natural home for this) and Capability 3 Phase 2 (the producing agents). Realistic build window: Phase D or E.

---

## Capability 6 — Human-in-the-Loop Review & Approval

**Problem we're solving.** Delivery agents (D-*) and Distribution agents (X-*) produce externally-facing artifacts: customer emails, LinkedIn posts, battlecards reps will read on live calls, analyst briefing materials, content sequences sent to net-new prospects. Auto-publishing any of this without human review is a brand risk, an accuracy risk, and in some cases a compliance risk. At the same time, putting every internal Slack digest and minor battlecard refresh through a manual approval gate would slow the platform down and waste the reviewer's attention. We need a structured approval lifecycle that catches issues, captures human edits as training signal for the producing agents, and lets the system move fast on low-risk items while gating high-risk ones.

### 6a. The lifecycle

Every artifact produced by a D-* or X-* agent moves through a defined state machine:

```
draft → pending_review → approved → published
              ↘ rejected (with comment) → regenerated
              ↘ needs_revision (with edit suggestions) → reviewer revises → approved
```

- **draft:** agent has produced the artifact but is still finishing the row (transient state)
- **pending_review:** ready for a human, reviewer notified
- **needs_revision:** reviewer wants edits but hasn't fully rejected; can be edited in-place or sent back to the agent with a comment
- **approved:** reviewer has signed off; eligible for distribution
- **published:** distribution layer has pushed it (with timestamp and channel)
- **rejected:** reviewer killed it; reason captured; agent can re-run with the feedback

### 6b. Risk tiers and approval rules

**Default posture (Decision #6, 2026-05-22): every artifact type requires human approval.** No auto-publish in MVP. Two active tiers; Low exists only as a tenant-level opt-in (Decision #11).

| Tier | Examples | Default behavior |
|---|---|---|
| **Medium** *(default for most artifacts)* | S-BC refreshes, internal collateral library items (D-OB, D-QB, D-HP, D-WW, D-XP, D-RT), internal Slack digests, D-CN to internal Slack, refreshes of previously-approved external artifacts with small diffs | Single reviewer approval required before publish |
| **High** *(default for customer-facing or compliance-sensitive)* | X-EM external email, X-LI public LinkedIn posts, Outreach and Apollo sequences, S-AR analyst briefing materials, D-SN customer-facing narratives, any artifact quoting a named customer, anything making a pricing or commitment claim | Reviewer approval required + 48h escalation policy + optional second reviewer for sensitive content |
| **Low** *(opt-in only)* | Auto-publish allowed when the producing agent's self-confidence score exceeds the tenant-configured threshold | Tenant opts in per artifact type via admin settings (Decision #11) |

Each artifact type has a default tier configured in `artifact_type_review_rules`, overrideable per tenant.

### 6c. Reviewer assignment

Each artifact type maps to a default reviewer role:

| Artifact type | Default reviewer role | Why |
|---|---|---|
| D-MG (messaging) | Marketing | Voice and positioning ownership |
| D-SN (sales narrative) | Marketing or Sales lead | Story owned by GTM leadership |
| S-BC (battlecards) | Sales (PMM fallback) | Reps use this live; Sales lead vouches |
| D-SE, D-OB (sales enablement, objection handlers) | Sales or PMM | Sales-facing tools |
| D-QB, D-HP, D-RT (CS-facing collateral) | CS lead | CS owns customer-facing playbooks |
| D-WW, D-XP (win wires, expansion plays) | Sales or RevOps | Deal context owners |
| S-AR (analyst relations prep) | PMM lead or comms | Analyst-facing is high-stakes |
| D-CN (counter-narrative) | PMM (auto-publish to internal Slack if Low tier) | Time-sensitive but internal |
| X-EM (external email) | Marketing + channel owner | Brand and deliverability ownership |
| X-LI (LinkedIn posts) | Whoever owns the account | Per-account voice |

**Auto-assignment by default (Decision #8, 2026-05-22).** Reviewer assignment is inferred from the artifact-type → reviewer-role mapping; no per-asset manual ownership setup required in MVP. Tenants override the mapping in admin settings if they want a specific person on a specific artifact type (e.g., "Jenny reviews all D-MG outputs"). Fallback to org admin if no role-specific reviewer is configured.

### 6d. Edit-as-feedback loop (the secret weapon)

When a reviewer edits an artifact in-place before approving, the diff (original vs. edited) gets logged to a `reviewer_edits` table with the artifact id, agent code, reviewer id, and timestamp. The producing agent reads recent edits during its next run and adjusts its prompt or output style accordingly.

**v1 scope (Decision #10, 2026-05-22): start simple.** Two pattern types extracted from the edits:

1. **Banned-phrase detection.** Recurring words or phrases that get stripped (e.g., "industry-leading" deleted in 5+ edits → auto-appended to D-MG's system prompt as a banned phrase for this tenant).
2. **Structural pattern extraction.** Consistent reordering (objection handlers always reordered to pricing-first → D-OB learns the preferred section order), consistent length adjustments (paragraphs shortened by ~30% → D-SN learns the target length), section preferences.

Both extractions run on a nightly job over the past 30 days of `reviewer_edits` rows per tenant per agent. Results write to a `learned_prompt_overrides` JSONB column on the agent config and get injected into Build Context prompts.

More sophisticated diff-to-prompt-update pipelines (e.g., LLM-driven analysis of what changed and why, or fine-tuning) are a **v2 ask**. Ship simple first; iterate based on what reviewers actually edit.

Over time this trains each agent toward the voice the human actually ships, without needing a separate fine-tuning pipeline. Tenant-specific because each customer's voice is different.

### 6e. Review Queue UI

A new top-level workspace section: `/review-queue` (also surfaced as a badge count in every persona workspace sidebar). The queue shows:

- All items in `pending_review` or `needs_revision`, filterable by artifact type, agent code, tier, age
- Each row: artifact title, target audience, agent that produced it, tier badge, age, assigned reviewer
- Click → side-by-side diff (current vs prior version for refreshes; full content for net-new) + edit-in-place markdown editor
- Action buttons: Approve / Approve with edits / Request revision (with comment) / Reject (with comment)
- Bulk-approve for trusted Low-tier batches (e.g., "approve all 12 Slack digest items")

A reviewer dashboard tracks turnaround times: average approval latency by reviewer, items aging past tier SLA, edits per artifact (signal of agent quality drift).

### 6f. Notifications

- **In-app badge** count on the workspace sidebar ("Review Queue (4)")
- **Daily email digest** of pending items per reviewer (via X-EM)
- **Slack DM** for High-tier items or items aging past SLA (via X-SL)
- **Escalation** to org admin if a High-tier item is unreviewed at 48h

### 6g. Implementation shape

- New enum `approval_status` added to every D-* and X-* output table: `draft | pending_review | needs_revision | approved | published | rejected`
- New columns on every D-* and X-* row: `risk_tier`, `assigned_reviewer_id`, `reviewer_comment`, `approved_at`, `approved_by`, `published_at`
- New table `approval_queue_items` (materialized view or table) aggregating pending items across all delivery tables for the Review Queue UI
- New table `reviewer_edits` capturing pre/post-edit diffs as the training signal
- New table `approval_audit_log` recording every state transition (compliance and analytics)
- New table `artifact_type_review_rules` storing per-tenant config (default reviewer role per artifact type, tier overrides, auto-publish thresholds)
- Reviewer role config extends the `profiles.role` enum used by Capability 1 (persona lens)
- Producing agents read recent `reviewer_edits` rows during their Build Context phase and inject patterns into prompts
- Distribution agents (X-*) refuse to ship any artifact with `approval_status != 'approved'` for Medium and High tier; Low tier auto-promotes through the lifecycle on creation

### 6h. Effort

- Schema + approval columns on existing D-* tables: ~3–4 days
- Review Queue UI with diff viewer and edit-in-place editor: ~1 week
- Notification system (in-app badge, Slack DMs, email digest): ~3 days
- Reviewer-edit feedback loop wired into agent prompt builders: ~3–4 days
- Per-tenant rules config UI: ~2–3 days

Total: ~2–3 weeks of focused build. Schema lands early so D-* and X-* tables are designed for it from day one; UI and feedback loop layer on after.

### 6i. Strategic value

Foundational. Without HITL, Capabilities 4 and 5 ship as "auto-publish or don't publish at all," which is unsafe for any real customer. With it, the platform reads as enterprise-grade and ships responsibly to regulated industries. The edit-as-feedback loop is also the cheapest agent-improvement path the product will ever have, because humans are already editing and capturing those edits is essentially free.

### 6j. Dependency

Touches every D-* and X-* agent. Doesn't need to fully ship before Capabilities 4 and 5, but the **schema must land first** so those tables are designed with approval columns from day one rather than retrofitted later. Recommended landing point: schema in Phase C, UI and feedback loop in Phase D alongside Distribution.

---

## Recommended phasing

Ordered for **stability first, ease of implementation second** (Decision 2026-05-22). Estimates are realistic focused-work hours at our actual pace, not traditional developer-week estimates. Total: ~28–36 hours of focused work, plus external-account overhead for Phase 6 wildcards.

| Phase | Content | Effort |
|---|---|---|
| **0** | Testing foundation: Vitest harness for the Next.js app, smoke tests that hit all 8 current agents end-to-end, schema-migration regression tests | ~2 hours |
| **1** | Layer-prefix rename across `agent-config.ts`, `run_history.agent_code` backfill, sidebar labels + HITL schema columns added to every existing D-* table (additive, non-breaking) + minimal HITL approve UI (two buttons + state transition) | ~2 hours |
| **2** | Persona Lens (Capability 1): four `/workspace/<role>` pages reusing existing card components + title→role lookup + sidebar workspace switcher. **Workspaces ship half-populated**: cards for existing agents (R-CI, R-MS, R-CF, S-RM, S-PO, S-BC, D-MG, D-SN) render live; cards for Phase 3 agents render placeholder states ("Coming in Phase 3") and flip live as each agent lands. | ~2–3 hours |
| **3** | Cap 3 new agents — 6 of them (R-PP, R-WL, R-EV, R-PF, then S-AR, S-LP). Still using hardcoded Throughline context per tenant. Sub-agent split for D-SE deferred to Phase 6. **S-LP reads `buyer_personas`; seed a placeholder row from existing Throughline brand context so S-LP runs today; R-BR overwrites the row in Phase 4.** S-CP moved to Phase 6 (it depends on `campaign_metrics` which doesn't exist until then). | ~4–6 hours focused, subagent-parallelizable to ~2–3 hours wall time |
| **4** | R-BR (Brand Code) Sonnet extraction + conversational questionnaire onboarding UI + backfill Phase 3 agents to read from R-BR tables (R-BR upserts the placeholder `buyer_personas` row seeded in Phase 3) | ~3–4 hours, may extend 1–2 hours if extraction prompt needs more iteration |
| **5** | HITL full Review Queue UI (diff viewer + edit-in-place markdown editor + bulk approve) + notifications (in-app badge, daily email digest, Slack DM) + D-CN autonomous trigger with the compound rule from §3f | ~4–5 hours |
| **6** | Cap 4 Distribution (X-EM via Resend, X-LI queue, **X-OR and X-AP as mock adapters by default, real-credential swap-in** — see §4d) + **S-CP** agent reading from `campaign_metrics` (real or mock) + closed-loop wiring into S-PO/D-MG Build Context prompts + Cap 5 v1 collateral library (4 asset types: D-OB, D-QB, D-HP, D-WW, with library UI and nightly staleness scanner) | ~6–9 hours focused work; external-account overhead variable |
| **7** | Reviewer-edit feedback loop v1 (banned-phrase detection + structural pattern extraction over last 30 days of `reviewer_edits`) + observability dashboards (reviewer turnaround, agent edit-rate trends, run-history health) + remaining Cap 5 asset types (D-XP, D-RT) | ~4–5 hours |
| **8** | Optional polish driven by real customer pull: Highspot/Seismic push, per-tenant HITL rules config UI, R-BR power-user doc-upload path, real Outreach/Apollo swap-in once credentials are secured | As demand pulls it |

### Wildcards that could extend the timeline

- **R-BR extraction quality.** Sonnet extraction may need 3–5 prompt iterations to reach ship quality. Could be 2 hours, could be 5. Budget for the higher end.
- **Outreach and Apollo real-credential integration.** Requires sales-team account access and API tokens that aren't currently available. Phase 6 ships mock adapters by default so the rest of the platform isn't blocked. Real swap-in is a separate task that runs whenever credentials arrive. See §4d.
- **n8n integration bugs.** We've hit two so far (item multiplication on Read Competitors, Tools Agent V3 returning undefined.parts with Gemini Flash). Budget time for one more hard-to-diagnose bug across the remaining phases.

### What gets cut if time is tight

Drop order, easiest cuts first: Cap 5 remaining asset types beyond the first 4 (Phase 7), reviewer-edit feedback loop sophistication beyond banned-phrase detection (Phase 7), observability dashboards (Phase 7), Outreach/Apollo real-credential integration (defer indefinitely; mocks stay), Cap 5 sub-agent split (revert to extending D-SE with production modes). Cap 6 HITL UI does **not** cut; it's load-bearing for every external publish.

---

## What we'd add to the schema

Tracking the table sprawl so we know what we're committing to. Existing Supabase tables: organizations, profiles, brands, run_history, executive_reports, brand_competitors, competitive_dossiers, market_signals, roadmap_items, positioning_elements, battlecards, feedback_themes, content_outputs, sales_collateral. (14 tables.)

New tables this plan adds:

**Capability 2 (Brand Code):** brand_assets, brand_voice_rules, brand_proof_points, product_capabilities, buyer_personas. (5 tables.)

**Capability 3 (Agents):** pricing_intelligence, win_loss_analyses, customer_evidence, product_feedback, analyst_briefings, campaign_performance, launch_plans, sales_enablement_assets, counter_narrative_memos. (9 tables.)

**Capability 4 (Distribution):** campaign_sends, campaign_metrics, distribution_channels (per-tenant channel config + `mode: 'live' | 'mock'` flag + encrypted credentials). (3 tables.) `campaign_sends.source` and `campaign_metrics.source` columns flag mock vs live data so reviewers and S-CP can distinguish.

**Capability 5 (Enablement Collateral):** enablement_assets, enablement_asset_versions, enablement_distribution_log. (3 tables.)

**Capability 6 (HITL):** approval_queue_items, reviewer_edits, approval_audit_log, artifact_type_review_rules. (4 tables.) Plus six new columns (`approval_status`, `risk_tier`, `assigned_reviewer_id`, `reviewer_comment`, `approved_at`, `approved_by`, `published_at`) added to every existing D-* and X-* output table.

End state: ~38 Supabase tables. All multi-tenant via organization_id + RLS.

---

## Decisions log (resolved 2026-05-22)

1. **Persona detection — TITLE-BASED.** Onboarding asks for job title (free-text) and maps it via a title-to-role lookup table (e.g., "VP Product Marketing" → marketing, "Sr Customer Success Manager" → customer_success). User can override the mapping. Affects Capability 1 onboarding flow.

2. **Brand Code ingestion model — CLAUDE SONNET.** Affects Capability 2; R-BR uses Claude Sonnet for document and questionnaire extraction. Cheaper than GPT-4 with comparable quality for structured extraction tasks.

3. **Distribution v1 scope — EMAIL + LINKEDIN + OUTREACH + APOLLO.** Affects Capability 4. Primary external distribution channels for v1 are Resend (marketing email), LinkedIn (post queue), Outreach (sales sequences), and Apollo (sales sequences). Slack remains as an internal-only channel for Cap 5 enablement digests and Cap 6 reviewer notifications, but is not a primary external distribution path.

4. **D-CN trigger threshold — COMPOUND RULE.** Affects Capability 3 (D-CN). D-CN fires when `impact_score >= 8` OR (`impact_score >= 7` AND `sentiment = bearish` AND `category in [competitive_positioning, regulatory_watch]`). Catches high-impact signals of any sentiment plus moderate-impact bearish signals in strategically sensitive categories. Per-tenant configurable threshold is a v2 ask layered on later through admin settings. Default rule lives in the D-CN agent's trigger node config; can be overridden per tenant via the same `artifact_type_review_rules` table that Capability 6 uses for tier overrides.

5. **Customer onboarding — CONVERSATIONAL QUESTIONNAIRE MVP.** Affects Capability 2. The MVP onboarding for Brand Code is a conversational questionnaire (chat-style: "Who are your top 3 competitors?", "What's your value proposition in one sentence?", "Drop in a customer quote you wish every prospect saw"), not a doc-upload form. Document upload becomes a power-user path layered on later. Lowers the time-to-first-value bar dramatically.

6. **Collateral approval — HUMAN APPROVAL ON ALL ASSET TYPES.** Affects Capability 6. No auto-publish for any artifact type by default. Every D-* and X-* output goes through `pending_review`. The Low tier defined in Capability 6b is removed from default behavior. (Low can still exist as a tenant-level opt-in via Decision 11.)

7. **SE structure — SPLIT INTO SUB-AGENTS.** Affects Capability 3 and 5. The Sales Enablement Studio splits into dedicated sub-agents (D-OB Objection Handler, D-QB QBR Template, D-HP Health Playbook, D-WW Win Wire, D-XP Expansion Play, D-RT Renewal Talk Track). The granularity each sub-agent provides justifies the added maintenance surface, because each asset type evolves independently (prompts, source tables, reviewer roles, refresh cadence).

8. **Asset ownership — INFERRED FROM ASSET TYPE.** Affects Capability 6. Reviewer auto-assignment happens via the artifact-type → reviewer-role mapping table from Capability 6c. No per-asset manual ownership configuration required in MVP. Tenants can override the default mapping in admin settings.

10. **Reviewer-edit feedback loop — START SIMPLE.** Affects Capability 6. v1 implements banned-phrase detection (recurring stripped words/phrases) and structural pattern extraction (consistent reordering, section preferences, length targets). More sophisticated diff-to-prompt-update pipeline is a v2 ask.

11. **Auto-publish on high confidence — TENANT-LEVEL OPT-IN.** Affects Capability 6. Default is everything requires human approval (Decision 6). Tenants can opt-in via admin settings to allow auto-publish of specific artifact types when the agent self-confidence score is above a tenant-set threshold (e.g., 8/10). This gives compliance-strict customers a defaults-off posture while letting fast-moving teams accelerate review.

## Open questions still to resolve

9. **HITL Medium vs High tier defaults per artifact type** — proposed split in chat 2026-05-22:
   - **Medium** (single reviewer, no escalation): all internal-only artifacts (S-BC refreshes, D-CN to internal Slack, all D-OB/D-QB/D-HP/D-WW/D-XP/D-RT collateral library items, internal Slack digests), refreshes of previously-approved external artifacts where diff is small
   - **High** (reviewer + 48h escalation + optional second reviewer): X-EM external email, X-LI public LinkedIn, Outreach/Apollo sequences, S-AR analyst briefings, D-SN customer-facing narratives, anything with a named customer quote, anything making a pricing or commitment claim

   Pending confirmation before Phase C lands the schema.
