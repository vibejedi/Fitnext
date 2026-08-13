/** The six Labors — the training buckets every session belongs to. A logged
 *  workout carries a labor tag so each Labor tile can show its own record. */

export type LaborId = "push" | "pull" | "legs" | "conditioning" | "core" | "mobility";

export interface Labor {
  id: LaborId;
  label: string;
}

export const LABORS: Labor[] = [
  { id: "push", label: "Push" },
  { id: "pull", label: "Pull" },
  { id: "legs", label: "Legs" },
  { id: "conditioning", label: "Conditioning" },
  { id: "core", label: "Core" },
  { id: "mobility", label: "Mobility" },
];

export const laborById = (id: string | undefined | null): Labor | undefined =>
  LABORS.find((l) => l.id === id);

/** Keyword map for guessing a labor from a session title (pre-tag sessions
 *  and sensible defaults in the logger — the athlete can always override). */
const HINTS: [LaborId, RegExp][] = [
  ["push", /\b(push|bench|press|chest|shoulder|tricep)\b/i],
  ["pull", /\b(pull|row|back|lat|bicep|curl|chin)\b/i],
  ["legs", /\b(leg|squat|deadlift|lower|glute|hinge|lunge)\b/i],
  ["conditioning", /\b(run|conditioning|cardio|bike|erg|sprint|metcon|wod|hiit)\b/i],
  ["core", /\b(core|ab|abs|plank)\b/i],
  ["mobility", /\b(mobility|stretch|yoga|recovery)\b/i],
];

/** Best-effort labor guess from a session title; undefined when unclear. */
export function inferLabor(title: string): LaborId | undefined {
  for (const [id, re] of HINTS) if (re.test(title)) return id;
  return undefined;
}
