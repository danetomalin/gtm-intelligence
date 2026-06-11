import { z } from "zod";

/**
 * Array-tolerant prose field. Models persistently return list-y prose
 * ("3-4 pillars", "pain points") as JSON arrays no matter what the
 * output instruction says — two live runs (R-BR personas, S-LP
 * messaging_pillars) proved it. Accept string OR string[] and join
 * arrays with "; " before validating length bounds.
 */
export const flexText = (min = 0, max?: number) =>
  z.preprocess(
    (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").join("; ") : v),
    max ? z.string().min(min).max(max) : z.string().min(min),
  );
