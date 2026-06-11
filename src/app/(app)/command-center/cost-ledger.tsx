"use client";
// Command Center → Cost ledger. Run-by-run LLM spend with a by-model
// rollup. Tokens are exact billed counts from each provider's
// response; cost is frozen at write time (pricing.ts), so this table
// is an audit trail, not an estimate. Pre-tracking and n8n-era runs
// show "—". Gemini grounded runs additionally incur a per-request
// Google Search fee that is NOT in token counts (noted below).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatCost, formatTokens } from "@/lib/llm/pricing";

type LedgerRun = {
  id: string;
  agent_code: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
  provider: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
};

const RANGES = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "All", days: 0 },
];

export function CostLedger({ names }: { names: Record<string, string> }) {
  const [days, setDays] = useState(7);
  const [runs, setRuns] = useState<LedgerRun[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async (d: number) => {
    try {
      const res = await fetch(`/api/runs/ledger${d > 0 ? `?days=${d}` : ""}`);
      const body = await res.json();
      if (Array.isArray(body.runs)) setRuns(body.runs);
    } catch {
      // keep whatever we have
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh(days);
    const t = setInterval(() => void refresh(days), 30_000);
    return () => clearInterval(t);
  }, [days, refresh]);

  // ── by-model rollup ───────────────────────────────────────────
  const byModel = new Map<string, { runs: number; inT: number; outT: number; cost: number; priced: boolean }>();
  let total = 0;
  let unpriced = 0;
  for (const r of runs) {
    if (r.input_tokens === null && r.output_tokens === null) continue;
    const key = r.model || "(unknown model)";
    const row = byModel.get(key) ?? { runs: 0, inT: 0, outT: 0, cost: 0, priced: false };
    row.runs += 1;
    row.inT += r.input_tokens ?? 0;
    row.outT += r.output_tokens ?? 0;
    if (r.cost_usd !== null) {
      row.cost += Number(r.cost_usd);
      row.priced = true;
      total += Number(r.cost_usd);
    } else {
      unpriced += 1;
    }
    byModel.set(key, row);
  }
  const models = [...byModel.entries()].sort((a, b) => b[1].cost - a[1].cost);

  function rel(iso: string): string {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  }

  const th = "px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-dim";
  const td = "px-3 py-1.5 text-xs text-text-muted";

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-base font-semibold text-text">Cost ledger</h2>
        <span className="text-sm text-text">
          {formatCost(total)} <span className="text-xs text-text-muted">total LLM spend ({RANGES.find((r) => r.days === days)?.label})</span>
        </span>
        <span className="ml-auto flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setDays(r.days)}
              className={`rounded px-2 py-0.5 text-xs border transition ${
                days === r.days
                  ? "border-accent/50 text-accent bg-accent-bg/30"
                  : "border-border text-text-muted hover:text-text"
              }`}
            >
              {r.label}
            </button>
          ))}
        </span>
      </header>

      {/* By-model rollup */}
      <div className="rounded-lg border border-border bg-card/40 overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className={th}>Model</th>
              <th className={th}>Runs</th>
              <th className={th}>Tokens in</th>
              <th className={th}>Tokens out</th>
              <th className={th}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {models.length === 0 && (
              <tr>
                <td className={`${td} italic`} colSpan={5}>
                  {loaded ? "No tracked runs in this window yet — costs accrue from each run after cost tracking shipped." : "Loading…"}
                </td>
              </tr>
            )}
            {models.map(([model, m]) => (
              <tr key={model} className="border-b border-border/50 last:border-0">
                <td className={`${td} font-mono`}>{model}</td>
                <td className={td}>{m.runs}</td>
                <td className={td}>{formatTokens(m.inT)}</td>
                <td className={td}>{formatTokens(m.outT)}</td>
                <td className={`${td} text-text font-medium`}>{m.priced ? formatCost(m.cost) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Run-by-run ledger */}
      <div className="rounded-lg border border-border bg-card/40 overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full">
          <thead className="border-b border-border sticky top-0 bg-surface">
            <tr>
              <th className={th}>When</th>
              <th className={th}>Workflow</th>
              <th className={th}>Status</th>
              <th className={th}>Model</th>
              <th className={th}>In / out</th>
              <th className={th}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr>
                <td className={`${td} italic`} colSpan={6}>
                  {loaded ? "No runs in this window." : "Loading…"}
                </td>
              </tr>
            )}
            {runs.map((r) => (
              <tr key={r.id} className="border-b border-border/50 last:border-0">
                <td className={td} title={r.started_at}>{rel(r.started_at)}</td>
                <td className={td}>
                  {r.agent_code ? (
                    <Link href={`/agents/${r.agent_code.toLowerCase()}`} className="hover:underline">
                      <span className="font-mono text-[11px]">{r.agent_code}</span>{" "}
                      {names[r.agent_code] ?? ""}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={td}>
                  <span className={r.status === "success" ? "text-success" : r.status === "error" ? "text-danger" : ""}>
                    {r.status}
                  </span>
                </td>
                <td className={`${td} font-mono text-[11px]`}>{r.model ?? "—"}</td>
                <td className={td}>
                  {r.input_tokens === null && r.output_tokens === null
                    ? "—"
                    : `${formatTokens(r.input_tokens)} / ${formatTokens(r.output_tokens)}`}
                </td>
                <td className={`${td} text-text font-medium`}>{formatCost(r.cost_usd === null ? null : Number(r.cost_usd))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-text-dim">
        Tokens are exact billed counts from each provider; cost is frozen at run time, so price-table edits never
        rewrite history. Failed runs that consumed tokens are charged (retries aren&apos;t free).
        {unpriced > 0 && ` ${unpriced} run(s) used an unpriced model — tokens shown, dollars omitted.`}{" "}
        Gemini grounded research adds a per-request Google Search fee not included in token costs.
      </p>
    </section>
  );
}
