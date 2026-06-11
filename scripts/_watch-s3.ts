import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
const env = Object.fromEntries(fs.readFileSync(".env.local","utf8").split("\n").filter(l=>l.includes("=")).map(l=>[l.slice(0,l.indexOf("=")), l.slice(l.indexOf("=")+1).trim()]));
const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
const CODES = ["S-PO","S-BC","R-CF","R-PF","R-EV","S-AR","S-LP"];
(async () => {
  const { data } = await c.from("run_history")
    .select("agent_code, status, started_at, summary, error_message, model, cost_usd, input_tokens, output_tokens")
    .in("agent_code", CODES)
    .eq("brand_id", "55555555-5555-5555-5555-555555555555")
    .order("started_at", { ascending: false })
    .limit(30);
  const seen = new Set<string>();
  for (const r of data ?? []) {
    if (seen.has(r.agent_code!)) continue;
    seen.add(r.agent_code!);
    const cost = r.cost_usd ? `$${Number(r.cost_usd).toFixed(3)}` : "—";
    const detail = r.status === "success" ? `${r.summary ?? ""} [${cost} ${r.model ?? ""}]` : (r.error_message ?? "").slice(0, 110);
    console.log(`${r.agent_code} ${r.status.padEnd(8)} ${detail}`);
  }
  for (const code of CODES) if (!seen.has(code)) console.log(`${code} (no run yet)`);
})();
