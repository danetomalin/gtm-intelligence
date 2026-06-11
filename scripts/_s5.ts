import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
const env = Object.fromEntries(fs.readFileSync(".env.local","utf8").split("\n").filter(l=>l.includes("=")).map(l=>[l.slice(0,l.indexOf("=")), l.slice(l.indexOf("=")+1).trim()]));
const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
(async () => {
  const { data } = await c.from("run_history")
    .select("agent_code, status, started_at, finished_at, summary, error_message, model, cost_usd")
    .in("agent_code",["D-MG","D-SN","D-CN","D-OB","D-WW"])
    .eq("brand_id","55555555-5555-5555-5555-555555555555")
    .order("started_at",{ascending:false}).limit(10);
  const seen = new Set<string>();
  for (const r of data ?? []) {
    if (seen.has(r.agent_code!)) continue;
    seen.add(r.agent_code!);
    const age = Math.round((Date.now() - new Date(r.started_at).getTime())/1000);
    const cost = r.cost_usd ? `$${Number(r.cost_usd).toFixed(3)}` : "—";
    console.log(`${r.agent_code} ${r.status.padEnd(8)} age:${age}s ${(r.summary ?? r.error_message ?? "").slice(0,80)} [${cost} ${r.model ?? ""}]`);
  }
})();
