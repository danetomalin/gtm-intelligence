# HubSpot Connector — Plain-English Walkthrough

*Branch: `feature/hubspot-connector`. Everything here is additive — no existing
behavior changes until credentials are saved and a sync is run.*

## What was built, file by file

**`supabase/migrations/0036_connector_credentials.sql`** — one new table
(`connector_credentials`) holding, per organization and per source, an
encrypted credential blob plus sync bookkeeping (status, last sync time,
last result counts, last error). Also creates the "Integration Test"
organization (`6666...`) — live syncs write **only** there, so the Halcyon
demo portfolio (`3333...`) can never be affected.

**`src/lib/connectors/crypto.ts`** — encrypts credentials with AES-256-GCM
*before* they reach the database. The key lives in the
`CONNECTOR_ENCRYPTION_KEY` environment variable (generate once with
`openssl rand -base64 32`). If someone steals the database, they get
ciphertext; if someone steals the env var, they still need the database.

**`src/features/cs-health/connectors/hubspot.ts`** — the TypeScript port of
the Python prototype adapter we smoke-tested against a live portal. Three
parts: *fetch* (companies + deals, following HubSpot's pagination, retrying
politely on rate limits), *map* (a pure function turning HubSpot shapes into
`accounts` rows: ARR decides segment ENT/MM/SMB, renewal-deal proximity
decides stage), and *sync* (upserts accounts, then inserts a clearly-labeled
neutral `var_metrics` baseline — only for accounts with no metrics at all,
so manual or CSV data is never overwritten; `data_confidence` honestly says
"CRM-only").

**`src/app/api/connectors/hubspot/credentials/route.ts`** — GET returns
connection metadata (never the token). PUT validates the token with a live
HubSpot call *before* saving — the "test call before save" rule from the
prototype smoke tests.

**`src/app/api/connectors/hubspot/sync/route.ts`** — POST runs a sync and
records the outcome on the credential row (`connected` or `error` + message).

**`src/app/(app)/command-center/connector-panel.tsx`** — a "Live
connectors" card on the Command Center:
credential form, status chip, Sync now button, last-sync summary. Clearly
badged as writing to the Integration Test org only.

**Small edits to existing files (the only ones):**
- `command-center/page.tsx` — two lines: import + render the panel.
- `demo-context.ts` — adds the `INTEGRATION_TEST_ORG_ID` constant.
- `loadPortfolio.ts` — the dashboard's org id can now be overridden with the
  `CS_HEALTH_ORG_ID` env var (defaults to Halcyon exactly as before), so a
  preview deployment can display the test org.

## How to test locally

```bash
# 1. env (.env.local): staging Supabase URL + keys, plus
CONNECTOR_ENCRYPTION_KEY=<output of: openssl rand -base64 32>

# 2. apply migrations to the staging project (see TESTING section below)

# 3. run the suite
npm test

# 4. run the app
npm run dev
# Command Center -> Live connectors -> add your pat- token -> Validate & save -> Sync now

# 5. see synced accounts on the dashboard
CS_HEALTH_ORG_ID=66666666-6666-6666-6666-666666666666 npm run dev
# -> Customer Health page now shows your real HubSpot companies
```

To test without a real HubSpot account: run the prototype mock
(`python -m uvicorn mocks.server:app --port 8900` in gtm-ingest-prototype),
set the panel's Base URL to `http://127.0.0.1:8900/hubspot` and token to
`mock-hs-token`.

## Review follow-ups (second commit)

- **Connector registry + dynamic routes** — routes are now
  `/api/connectors/[source]/credentials|sync`, dispatching through
  `connectors/registry.ts`. Adding Zendesk later = one registry entry
  (id, name, defaultBaseUrl, validate, sync) + a sync function. Per-source
  platform defaults (like HubSpot's API host) live in the registry entry,
  overridable per-org via the stored `base_url`.
- **Structured logging** — `src/lib/connectors/logger.ts` emits one-line
  JSON events (sync.start/complete/failed, rate-limit warnings, credential
  validation outcomes) that Vercel's Logs dashboard captures and makes
  searchable. Hard rules: never log credential values or API response
  bodies — counts, ids, durations, truncated errors only.
- **Gated integration test** — `hubspot.integration.test.ts` runs the real
  fetch→map path against the prototype mock server. Skipped unless
  `CONNECTOR_IT_URL` is set, so CI needs no infrastructure:
  `CONNECTOR_IT_URL=http://127.0.0.1:8900/hubspot npm test`

## Design decisions worth knowing

- **Why a neutral 60/55/60 baseline?** The dashboard only renders accounts
  that have VAR metrics. CRM data alone can't honestly score Adoption or
  Relationship, so the baseline is deliberately mid-range with a low
  data-confidence note, and it never overwrites real metrics. When the
  Zendesk/Mixpanel connectors land, they replace these numbers with earned ones.
- **Why validate-before-save?** A saved-but-broken token is the worst state:
  everything looks configured and nothing works. Failing at save time with
  HubSpot's actual error message costs one API call and saves an afternoon.
- **Rollback:** flip the panel's credential row out (or truncate
  `connector_credentials`), delete the Integration Test org's rows. Nothing
  else in the app knows the connector exists.
