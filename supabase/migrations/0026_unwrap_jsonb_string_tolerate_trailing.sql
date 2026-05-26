-- Migration 0026: make unwrap_jsonb_string() tolerate trailing garbage.
--
-- Gemini occasionally emits a structurally valid JSON value followed by
-- stray characters (extra closing braces, partial text, etc.) — e.g.
-- "[{"name":"Mark T."}, ...]}"  ← note the trailing }.
--
-- The original unwrap function (migration 0025) caught the parse error
-- and returned the original jsonb-string unchanged, which left the UI
-- crashing on .map() / .length again. This version walks back from the
-- end of the raw text until it hits a closing bracket or brace, retries
-- the parse, and returns the first version that succeeds. Falls back to
-- the original value only when nothing parses.

create or replace function unwrap_jsonb_string(val jsonb) returns jsonb as $$
declare
  raw text;
  tail int;
  candidate text;
begin
  if val is null then return null; end if;
  if jsonb_typeof(val) <> 'string' then return val; end if;
  raw := val #>> '{}';
  if raw is null or raw = '' then return val; end if;
  begin
    return raw::jsonb;
  exception when others then
    -- Walk back to the last closing bracket / brace, retry. Bounded so
    -- a pathological value (a long string with no brackets) returns
    -- quickly instead of looping forever.
    tail := length(raw);
    while tail > 1 loop
      candidate := substring(raw for tail);
      if right(candidate, 1) in (']', '}') then
        begin
          return candidate::jsonb;
        exception when others then
          null;
        end;
      end if;
      tail := tail - 1;
    end loop;
    return val;
  end;
end;
$$ language plpgsql immutable;
