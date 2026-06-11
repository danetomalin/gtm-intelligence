-- Migration 0032: LLM token usage + frozen cost per run.
-- Captured from each provider's response (exact billed tokens) and
-- priced at write time via src/lib/llm/pricing.ts, so later price
-- changes never rewrite history. Null on pre-tracking runs, n8n-era
-- rows, and the deterministic distribution adapters.

alter table run_history
  add column if not exists provider      text,
  add column if not exists model         text,
  add column if not exists input_tokens  integer check (input_tokens  is null or input_tokens  >= 0),
  add column if not exists output_tokens integer check (output_tokens is null or output_tokens >= 0),
  add column if not exists cost_usd      numeric(12, 6) check (cost_usd is null or cost_usd >= 0);

create index if not exists run_history_model_idx on run_history (model) where model is not null;
