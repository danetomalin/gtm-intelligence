// Per-agent configuration: which agents are live (Supabase-native + on-demand),
// and which n8n webhook path each maps to. As we migrate more agents, add them
// here.

export const AGENT_WEBHOOK_PATHS: Record<string, string> = {
  A1: "/webhook/competitive-intel-supabase",
  A2: "/webhook/market-signals-supabase",
  A3: "/webhook/roadmap-steering-supabase",
};

export const LIVE_AGENTS = new Set(Object.keys(AGENT_WEBHOOK_PATHS));

export function isLiveAgent(code: string): boolean {
  return LIVE_AGENTS.has(code.toUpperCase());
}

export function webhookPathFor(code: string): string | null {
  return AGENT_WEBHOOK_PATHS[code.toUpperCase()] ?? null;
}
