/** The five Daily Rites. Calories/macros targets come from the nutrition
 *  coach's recommendation; the rest are per-user custom targets (editable
 *  in settings later). Sleep is NOT a rite — it's logged at end of day. */

export type RiteId = "calories" | "macros" | "steps" | "relax" | "mobility";

export interface Rite {
  id: RiteId;
  label: string;
  target: string;
  source: "coach" | "custom";
}

export const RITES: Rite[] = [
  { id: "calories", label: "Calories", target: "2,450 kcal", source: "coach" },
  { id: "macros", label: "Macros", target: "180g P · 250g C · 70g F", source: "coach" },
  { id: "steps", label: "Steps", target: "10,000 steps", source: "custom" },
  { id: "relax", label: "Relax", target: "15 min · no screens, music, or contact", source: "custom" },
  { id: "mobility", label: "Mobility", target: "10 min · yesterday's muscles", source: "custom" },
];

export const EMPTY_RITES: Record<RiteId, boolean> = {
  calories: false,
  macros: false,
  steps: false,
  relax: false,
  mobility: false,
};

/** Laurels awarded by Seal the Day — they accrue toward the Hall of Honor. */
export const SEAL_LAURELS = 50;
