# Zendesk Connector — Design Note (for review before implementation)

*Branch: `feature/zendesk-connector` (stacked on `feature/hubspot-connector`).
Scope agreed in discussion; this note pins the details for sign-off.*

## 1. Goal

HubSpot built the account spine. Zendesk's job is to make health scores
**earned instead of assumed**: pull support activity, compute the Support
signals from the integration catalog (volume trend, resolution, CSAT,
escalations), and replace the neutral 60/55/60 VAR baselines with numbers
derived from data — with `data_confidence` upgraded to match.

## 2. Data flow and account joining

Zendesk organizations join to `accounts` by **company domain**
(Zendesk `organization.domain_names[0]` ↔ account domain). Gap discovered
while designing: the `accounts` table has **no domain column** — the HubSpot
sync doesn't store it. Migration 0038 adds `accounts.domain text`, and the
HubSpot mapper starts populating it (its API already returns the domain; we
currently drop it). Zendesk orgs that match no account are recorded in the
sync result as `unmatchedOrgs` (a data-hygiene count, mirroring the
prototype's gap finding) — never auto-created as accounts, since the CRM
owns the account spine.

## 3. What we pull (mechanics proven in the prototype + live smoke test)

| Stream | Endpoint | Notes |
|---|---|---|
| Organizations | `GET /api/v2/organizations.json` | small; full refetch each sync |
| Tickets | `GET /api/v2/incremental/tickets/cursor.json` | **cursor-based delta** — the reason for sync-state persistence |
| Ticket metrics | `GET /api/v2/ticket_metrics.json` | real resolution times (the ticket object has no `solved_at` — prototype lesson) |
| CSAT | `GET /api/v2/satisfaction_ratings.json` | often empty on trials; handled gracefully |

Auth: Basic `email/token:api_token` — three credential fields (subdomain
URL, email, token), which is what forces the registry's credential-field
declarations (§6). Rate limits: 429 + Retry-After backoff, as in the
HubSpot client.

Synced tickets are aggregated **in memory per sync** into per-account
rollups; raw tickets are not stored (the app's currency is scores, not
tickets — revisit only if a drill-down UI needs them).

## 4. Signal computation → VAR inputs

Per account, over a 90-day window (all deterministic, unit-testable):

- `volumeRatio` — tickets created last 30d ÷ prior 30d (min denominator 1)
- `avgResolutionHours` — mean full-resolution time (from ticket_metrics), solved in last 30d
- `csatPct` — % good ratings last 30d (null when no ratings)
- `escalationPct` — % of last-30d tickets with priority high/urgent

**Relationship score** (0–100): start at 75, then
`-20` if volumeRatio ≥ 1.8 (volume spike), `-25` if csatPct < 70,
`-15` if avgResolutionHours > 48, `-10` if escalationPct > 25;
`+10` if csatPct ≥ 90 and volumeRatio < 1.3. Clamped 5–95.

**Adoption sub-signal** (Zendesk informs, doesn't own): accounts with zero
tickets in 90d AND no CSAT get `-10` adoption (silent account ≠ healthy
account); otherwise adoption is left to the future Mixpanel connector.

**Write semantics (merge, never clobber):** read the latest `var_metrics`
row per account; write **today's** row keeping the existing `value_score`
(CRM/manual owns Value), applying computed relationship + adoption deltas,
`source: 'connector:zendesk'`, and `data_confidence` = { sourceDiversity: 2,
completeness: 0.5, note: "CRM + Support connected; product analytics and
VoC pending" }. Numbers in this section are v1 heuristics — expected to be
tuned; the point is they're *derived and explainable*, not invented.

## 5. Migration 0038 (staging only until the merge train)

- `accounts.domain text` + backfill via HubSpot sync
- `connector_sync_state (organization_id, source_id, stream, cursor,
  updated_at, PK(org,source,stream))` — RLS like siblings. Generic
  (Dimension 3): stateful sources store cursors per stream; stateless
  sources simply never write here.
- `connector_credentials.status` check constraint gains `'syncing'`
  (the in-flight guard for §7/§8).

## 6. Registry + panel generalization (closes Dimension 2)

- `ConnectorDefinition` gains `credentialFields: {key, label, type,
  placeholder}[]` — HubSpot declares one field (token), Zendesk three
  (base URL, email, token). Encrypted storage already takes arbitrary JSON.
- New `GET /api/connectors` — registry metadata joined with each source's
  connection status. Token values never included.
- `connector-panel.tsx` rewritten to render **one card per registry entry**
  from that endpoint, forms generated from `credentialFields`. The
  hardcoded HubSpot card is deleted. Connector #3+ = zero UI work.

## 7. Sync all sources

`POST /api/connectors/sync-all` — runs each configured connector
**sequentially** (rate-limit friendly), records per-source results,
returns a summary. Guards: skip a source whose status is `'syncing'`
(in-flight) or whose `last_synced_at` is under 5 minutes old (cooldown),
reporting each as `skipped` with the reason. Set status `'syncing'` at
start, restore on finish/error — also self-heals: `'syncing'` older than
10 minutes is treated as crashed and re-runs.

## 8. Dashboard freshness control

Small client component in the Customer Health page header:
**"Data as of {max(last_synced_at)} · Refresh"**. Refresh calls sync-all,
shows "Refreshing…", then reloads data. Under 5-minute cooldown it renders
"Up to date" (disabled). The page always serves current DB data — never
blocks on syncing.

### 8a. CRM-only nudge

When no support source is connected, the freshness bar shows:
*"Health scores are CRM-only — connect a support source for assessed
scores."* Honest UX (neutral baselines must not masquerade as assessed
health) and, for white-glove clients, a natural prompt to connect more
sources.

## 9. Testing plan (same ladder)

- Unit: signal math (volume/CSAT/resolution/escalation edge cases),
  score formula, cursor resume logic, credential-field rendering
- Integration (gated, `CONNECTOR_IT_URL`): full fetch→aggregate against the
  prototype mock — cursor pagination across pages, 429 backoff, second run
  pulls zero new tickets (delta verified)
- Staging: real sync via panel; verify var_metrics rows + dashboard scores
- Preview: same on Vercel; logs show per-stream events
- Live Zendesk trial (14-day) as the real-API pass, seeded by the
  prototype's `seed_zendesk.py`

## 10. Out of scope (parked, with triggers)

Webhooks/real-time (trigger: urgent-signal alerting), scheduled cron syncs
(trigger: first customer who shouldn't need the Refresh button), OAuth
(trigger: Zendesk token deprecation Apr 2027 / first OAuth-only source),
raw ticket storage (trigger: support drill-down UI), background workers
(trigger: sync duration > function budget).
