// ============================================================
// Run-error classification — turns a raw run_history.error_message
// into a category, a plain-language diagnosis, and the place to go
// fix it. Pure and unit-tested; used by the Observability error
// panel (and anything else that wants to explain a failed run).
// ============================================================

export type RunErrorCategory =
  | "credentials"
  | "rate_limit"
  | "timeout"
  | "n8n"
  | "model"
  | "data"
  | "canceled"
  | "unknown";

export interface RunErrorDiagnosis {
  category: RunErrorCategory;
  label: string; // short chip text
  hint: string; // what to do about it
}

const DIAGNOSES: Record<RunErrorCategory, Omit<RunErrorDiagnosis, "category">> = {
  credentials: {
    label: "Credentials",
    hint: "The provider rejected the API key this workflow ran on. Test the assigned profile in the API credentials section above, or assign a different one on the workflow's row.",
  },
  rate_limit: {
    label: "Rate limit",
    hint: "The provider throttled the request. Wait a minute and retry, move this workflow to a different provider tier in API credentials, or use the sequential populate script — it backs off automatically.",
  },
  timeout: {
    label: "Timeout",
    hint: "The run exceeded its time budget. Retry — if it keeps happening, assign a faster model or trim the workflow's instructions.",
  },
  n8n: {
    label: "n8n",
    hint: "This workflow still runs on the legacy n8n chain and the webhook failed to start or complete. Check n8n executions, or prioritize porting this workflow to the native runner.",
  },
  model: {
    label: "Model",
    hint: "The provider rejected the model id or the request shape. Check the model on the assigned credential profile in the API credentials section above.",
  },
  data: {
    label: "Data",
    hint: "A database read or write failed during the run. Check that the upstream tables this workflow reads have rows for the active brand.",
  },
  canceled: {
    label: "Canceled",
    hint: "The run was canceled (usually stale-run cleanup). Retry if you still need the output.",
  },
  unknown: {
    label: "Unknown",
    hint: "Unrecognized failure. Read the full message below; retry once before digging deeper.",
  },
};

const RULES: { pattern: RegExp; category: RunErrorCategory }[] = [
  { pattern: /invalid x-api-key|invalid api key|unauthorized|authentication|401|API key not valid|no api key/i, category: "credentials" },
  { pattern: /429|rate.?limit|quota|resource_exhausted|overloaded|too many requests/i, category: "rate_limit" },
  { pattern: /timed? ?out|did not complete|deadline|maxduration|aborted/i, category: "timeout" },
  { pattern: /n8n|webhook/i, category: "n8n" },
  { pattern: /model.*(not.?found|does not exist|invalid)|not.?found.*model|max_tokens|unsupported model|empty response/i, category: "model" },
  { pattern: /supabase|relation .* does not exist|violates|constraint|column|failed to (write|create|insert)|snapshot build failed/i, category: "data" },
  { pattern: /stale run canceled|canceled/i, category: "canceled" },
];

export function classifyRunError(message: string | null | undefined): RunErrorDiagnosis {
  const msg = (message ?? "").trim();
  if (msg) {
    for (const { pattern, category } of RULES) {
      if (pattern.test(msg)) {
        return { category, ...DIAGNOSES[category] };
      }
    }
  }
  return { category: "unknown", ...DIAGNOSES.unknown };
}
