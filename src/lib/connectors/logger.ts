// ============================================================
// CONNECTOR LOGGER — structured one-line JSON events.
//
// Vercel captures console output per request into its Logs
// dashboard, so JSON lines give searchable production logs with
// zero infrastructure. Example:
//   {"ts":"...","scope":"connector","source":"hubspot",
//    "level":"info","event":"sync.complete","companies":4,"ms":2100}
//
// RULES (enforced by convention, checked in review):
//   - NEVER log credential values, decrypted payloads, or headers.
//     Log presence ("tokenConfigured: true"), not contents.
//   - NEVER log full API response bodies — client CRM/support data
//     does not belong in logs. Counts, ids, durations, and
//     truncated error messages only.
// ============================================================

type Level = "info" | "warn" | "error";

function emit(level: Level, source: string, event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    scope: "connector",
    source,
    level,
    event,
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const connectorLog = {
  info: (source: string, event: string, fields?: Record<string, unknown>) =>
    emit("info", source, event, fields),
  warn: (source: string, event: string, fields?: Record<string, unknown>) =>
    emit("warn", source, event, fields),
  error: (source: string, event: string, fields?: Record<string, unknown>) =>
    emit("error", source, event, fields),
};
