import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(__dirname, "../supabase/migrations");

type Migration = {
  number: number;
  filename: string;
  sql: string;
};

function loadMigrations(): Migration[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files.map((filename) => {
    const match = filename.match(/^(\d{4})_/);
    if (!match) {
      throw new Error(
        `Migration ${filename} does not follow NNNN_name.sql naming`,
      );
    }
    return {
      number: parseInt(match[1]!, 10),
      filename,
      sql: readFileSync(path.join(MIGRATIONS_DIR, filename), "utf8"),
    };
  });
}

// Strip line and block comments so regex-based assertions don't false-positive
// on commented-out DDL.
function stripComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "")
    .toLowerCase();
}

describe("supabase/migrations", () => {
  let migrations: Migration[];

  beforeAll(() => {
    migrations = loadMigrations();
  });

  it("has at least the 17 expected migrations", () => {
    expect(migrations.length).toBeGreaterThanOrEqual(17);
  });

  it("0009 backfills run_history.agent_code from A1-A8 to layer-prefixed codes", () => {
    const m9 = migrations.find((m) => m.number === 9);
    expect(m9, "migration 0009 missing").toBeDefined();
    const sql = stripComments(m9!.sql);
    const expectedPairs: [string, string][] = [
      ["a1", "r-ci"],
      ["a2", "r-ms"],
      ["a3", "s-rm"],
      ["a4", "r-cf"],
      ["a5", "s-po"],
      ["a6", "d-mg"],
      ["a7", "s-bc"],
      ["a8", "d-sn"],
    ];
    for (const [legacy, newCode] of expectedPairs) {
      const pattern = new RegExp(
        `update\\s+run_history[\\s\\S]*?'${newCode}'[\\s\\S]*?'${legacy}'`,
      );
      expect(sql, `${legacy} → ${newCode} rename missing`).toMatch(pattern);
    }
  });

  it("0009 adds the HITL approval columns to content_outputs and sales_collateral", () => {
    const m9 = migrations.find((m) => m.number === 9);
    expect(m9).toBeDefined();
    const sql = stripComments(m9!.sql);
    const requiredColumns = [
      "approval_status",
      "risk_tier",
      "assigned_reviewer_id",
      "reviewer_comment",
      "approved_at",
      "approved_by",
      "published_at",
    ];
    for (const table of ["content_outputs", "sales_collateral"]) {
      for (const col of requiredColumns) {
        const pattern = new RegExp(
          `alter\\s+table\\s+${table}[\\s\\S]*?${col}`,
        );
        expect(sql, `${table}.${col} not added in 0009`).toMatch(pattern);
      }
    }
  });

  it("migration numbers are sequential and contiguous (no gaps, no duplicates)", () => {
    const numbers = migrations.map((m) => m.number);
    const expected = Array.from(
      { length: numbers.length },
      (_, i) => i + numbers[0]!,
    );
    expect(numbers).toEqual(expected);
  });

  it("every migration file is non-empty and contains at least one statement", () => {
    for (const m of migrations) {
      const stripped = stripComments(m.sql).trim();
      expect(stripped.length, m.filename).toBeGreaterThan(0);
      expect(stripped, m.filename).toMatch(/;/);
    }
  });

  it("no migration drops a table without an IF EXISTS guard", () => {
    // Catches accidentally-destructive migrations. A `drop table foo` would
    // wipe data; `drop table if exists foo` is safer and intentional.
    const dropPattern = /\bdrop\s+table\s+(?!if\s+exists)/i;
    for (const m of migrations) {
      const stripped = stripComments(m.sql);
      expect(stripped, m.filename).not.toMatch(dropPattern);
    }
  });

  it("every create policy is paired with an alter table ... enable row level security on the same table", () => {
    for (const m of migrations) {
      const stripped = stripComments(m.sql);
      const policyTables = new Set<string>();
      for (const match of stripped.matchAll(
        /create\s+policy\s+\w+\s+on\s+([\w.]+)/g,
      )) {
        policyTables.add(match[1]!);
      }
      const rlsTables = new Set<string>();
      for (const match of stripped.matchAll(
        /alter\s+table\s+([\w.]+)\s+enable\s+row\s+level\s+security/g,
      )) {
        rlsTables.add(match[1]!);
      }
      // Some migrations (like the demo seed) may create policies on tables
      // whose RLS was already enabled in an earlier migration. We assert
      // RLS-on-policy parity only within the same file as a conservative
      // smoke check — every policy-creating migration we have so far also
      // enables RLS in the same file.
      if (policyTables.size > 0) {
        for (const t of policyTables) {
          expect(rlsTables.has(t), `${m.filename}: policy on ${t} but no RLS`).toBe(
            true,
          );
        }
      }
    }
  });

  it("the 14 known tables from the existing 8 migrations all appear in CREATE TABLE statements", () => {
    const allSql = migrations.map((m) => stripComments(m.sql)).join("\n");
    const expectedTables = [
      "organizations",
      "profiles",
      "brands",
      "run_history",
      "executive_reports",
      "brand_competitors",
      "competitive_dossiers",
      "market_signals",
      "roadmap_items",
      "positioning_elements",
      "battlecards",
      "feedback_themes",
      "content_outputs",
      "sales_collateral",
      // Phase 3 additions.
      "pricing_intelligence",
      "buyer_personas",
      "win_loss_analyses",
      "customer_evidence",
      "product_feedback",
      "analyst_briefings",
      "launch_plans",
      // Phase 4: Brand Repository.
      "brand_voice_rules",
      "brand_proof_points",
      "product_capabilities",
      "brand_assets",
      // Phase 5: Counter-narrative.
      "counter_narrative_memos",
      // Phase 6A: Distribution + S-CP.
      "distribution_channels",
      "campaign_sends",
      "campaign_metrics",
      "campaign_performance",
      // Phase 6B: Enablement library.
      "enablement_assets",
      "enablement_asset_versions",
      "enablement_distribution_log",
      // Phase 7: Reviewer-edit feedback loop schema.
      "reviewer_edits",
      // Phase 9A: Launch readiness.
      "launches",
      "launch_artifacts",
    ];
    for (const table of expectedTables) {
      const pattern = new RegExp(`create\\s+table(?:\\s+if\\s+not\\s+exists)?\\s+${table}\\b`);
      expect(allSql, `missing CREATE TABLE for ${table}`).toMatch(pattern);
    }
  });
});
