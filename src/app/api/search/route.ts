// POST /api/search — Tavily proxy for the Settings "Test" button and
// any client-side search needs. The key arrives in the x-search-key
// header (browser credential store) and is never logged or persisted.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchTavily } from "@/lib/search/tavily";

const bodySchema = z.object({
  query: z.string().min(1).max(400),
  maxResults: z.number().int().min(1).max(8).optional(),
});

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-search-key") ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "No Tavily API key provided. Add one in Settings → API credentials." },
      { status: 401 },
    );
  }
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid body" },
      { status: 400 },
    );
  }
  const result = await searchTavily(apiKey, body.query, body.maxResults ?? 5);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 502 });
  }
  return NextResponse.json({ results: result.results });
}
