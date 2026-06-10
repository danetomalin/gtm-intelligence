// ============================================================
// Tavily web search — server-side helper for research workflows
// (Dane's choice over provider-native search, 2026-06-10). The key
// arrives per-request from the browser credential store and is
// never logged or persisted.
// ============================================================

export interface SearchResult {
  title: string;
  url: string;
  content: string; // snippet
}

export async function searchTavily(
  apiKey: string,
  query: string,
  maxResults = 5,
): Promise<{ ok: true; results: SearchResult[] } | { ok: false; error: string; status?: number }> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: Math.min(maxResults, 8),
        search_depth: "basic",
        include_answer: false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: (data as { detail?: { error?: string } })?.detail?.error ?? `Tavily error (HTTP ${res.status})`,
        status: res.status,
      };
    }
    const results = ((data as { results?: { title?: string; url?: string; content?: string }[] }).results ?? [])
      .map((r) => ({ title: r.title ?? "", url: r.url ?? "", content: r.content ?? "" }));
    return { ok: true, results };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Search request failed.", status: 502 };
  }
}
