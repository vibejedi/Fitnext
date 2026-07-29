/**
 * Shared history helpers — pure, no client runtime — used by the History
 * view, the coach chat context builder, and the coach API route (types
 * only). Turns the raw local store (meals, workouts, rite completions) into
 * per-day summaries and the compact payloads the AI coach reads so it can
 * work through every submission: the workout, how it felt, and the
 * calories/macros tracked.
 */

import { RITES, type RiteId } from "./rites";
import type { Meal, RiteDay, Workout, WorkoutExercise, WorkoutSet } from "./store";

/* ---------------- Nutrition ---------------- */

export interface DayNutrition {
  day: string; // YYYY-MM-DD
  kcal: number;
  p: number;
  c: number;
  f: number;
  count: number; // meals logged that day
}

/** Group meals into per-day totals, newest day first. */
export function dailyNutrition(meals: Meal[]): DayNutrition[] {
  const by = new Map<string, DayNutrition>();
  for (const m of meals) {
    const d =
      by.get(m.day) ?? { day: m.day, kcal: 0, p: 0, c: 0, f: 0, count: 0 };
    d.kcal += m.kcal;
    d.p += m.p;
    d.c += m.c;
    d.f += m.f;
    d.count += 1;
    by.set(m.day, d);
  }
  return [...by.values()].sort((a, b) => (a.day < b.day ? 1 : -1));
}

/* ---------------- Workouts ---------------- */

/** The heaviest working set of an exercise (ties broken by reps). Null when
 *  the exercise has no sets. */
export function topSet(ex: WorkoutExercise): WorkoutSet | null {
  let best: WorkoutSet | null = null;
  for (const s of ex.sets) {
    if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
      best = s;
    }
  }
  return best;
}

/** Total tonnage of a session (Σ reps × weight); useful as a one-glance trend. */
export function workoutVolume(w: Workout): number {
  let total = 0;
  for (const ex of w.exercises) {
    for (const s of ex.sets) total += s.reps * s.weight;
  }
  return Math.round(total);
}

/** "3 × 5 @ 100kg" style summary for one exercise. */
export function exerciseSummary(ex: WorkoutExercise): string {
  if (ex.sets.length === 0) return ex.name;
  const uniform = ex.sets.every(
    (s) => s.reps === ex.sets[0].reps && s.weight === ex.sets[0].weight
  );
  if (uniform) {
    const s = ex.sets[0];
    return `${ex.sets.length} × ${s.reps}${s.weight ? ` @ ${s.weight}kg` : ""}`;
  }
  return ex.sets.map((s) => `${s.reps}${s.weight ? `×${s.weight}kg` : ""}`).join(", ");
}

/* ---------------- Rite completions ---------------- */

export interface RiteDaySummary {
  day: string;
  done: RiteId[];
  total: number;
}

/** Rite completions per day, newest first. `todayRites` (the live copy for
 *  the current local day) overrides whatever the history map holds. */
export function riteDays(
  history: Record<string, RiteDay>,
  today: string,
  todayRites: Record<RiteId, boolean>
): RiteDaySummary[] {
  const merged: Record<string, RiteDay> = { ...history, [today]: todayRites };
  return Object.entries(merged)
    .map(([day, r]) => ({
      day,
      done: RITES.filter((rite) => r[rite.id]).map((rite) => rite.id),
      total: RITES.length,
    }))
    .filter((d) => d.done.length > 0 || d.day === today)
    .sort((a, b) => (a.day < b.day ? 1 : -1));
}

/* ---------------- Coach context payloads ---------------- */
// Compact, capped shapes sent to /api/coach so the model has real history
// without blowing up the request. Formatted into the system prompt server-side.

export interface NutritionHistoryEntry {
  day: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  meals: number;
}

export interface WorkoutHistoryEntry {
  day: string;
  title: string;
  feel: string;
  energy?: number;
  exercises: { name: string; sets: WorkoutSet[] }[];
}

export interface RitesHistoryEntry {
  day: string;
  done: string[];
  total: number;
}

export interface CoachHistory {
  nutritionHistory: NutritionHistoryEntry[];
  workoutHistory: WorkoutHistoryEntry[];
  ritesHistory: RitesHistoryEntry[];
}

const NUTRITION_DAYS = 21;
const WORKOUT_COUNT = 14;
const RITE_DAYS = 21;

/** Build the capped history payload for the coach from the local store. The
 *  current day is excluded from nutrition history (it's sent separately as
 *  TODAY'S FOOD LOG) but kept for rites so streak context stays intact. */
export function buildCoachHistory(
  meals: Meal[],
  workouts: Workout[],
  riteHistory: Record<string, RiteDay>,
  today: string,
  todayRites: Record<RiteId, boolean>
): CoachHistory {
  const nutritionHistory = dailyNutrition(meals)
    .filter((d) => d.day !== today)
    .slice(0, NUTRITION_DAYS)
    .map(({ day, kcal, p, c, f, count }) => ({ day, kcal, p, c, f, meals: count }));

  const workoutHistory = [...workouts]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, WORKOUT_COUNT)
    .map((w) => ({
      day: w.day,
      title: w.title,
      feel: w.feel,
      energy: w.energy,
      exercises: w.exercises.map((e) => ({ name: e.name, sets: e.sets })),
    }));

  const ritesHistory = riteDays(riteHistory, today, todayRites)
    .slice(0, RITE_DAYS)
    .map((d) => ({ day: d.day, done: d.done, total: d.total }));

  return { nutritionHistory, workoutHistory, ritesHistory };
}

/* ---------------- Exercise catalog (autocomplete) ---------------- */

/** Common lifts for the workout logger's name autocomplete. Mirrors the
 *  coach's EXERCISE LIBRARY; the field stays free-text so anything goes. */
export const EXERCISE_CATALOG: string[] = [
  // Lower — quad
  "Barbell Back Squat", "Front Squat", "Safety Bar Squat", "Hack Squat",
  "Leg Press", "Bulgarian Split Squat", "Walking Lunge", "Goblet Squat",
  "Leg Extension",
  // Lower — posterior
  "Conventional Deadlift", "Sumo Deadlift", "Romanian Deadlift", "Hip Thrust",
  "Glute Bridge", "Lying Leg Curl", "Seated Leg Curl", "Good Morning",
  // Push — horizontal
  "Barbell Bench Press", "Dumbbell Bench Press", "Incline Barbell Press",
  "Incline Dumbbell Press", "Machine Chest Press", "Cable Fly", "Push-Up",
  // Push — vertical
  "Barbell Overhead Press", "Dumbbell Overhead Press", "Arnold Press",
  "Lateral Raise", "Rear Delt Fly", "Face Pull",
  // Pull — horizontal
  "Barbell Bent Over Row", "Dumbbell Row", "Seated Cable Row",
  "Chest Supported Row", "Pendlay Row",
  // Pull — vertical
  "Pull-Up", "Weighted Pull-Up", "Chin-Up", "Lat Pulldown",
  // Arms
  "Barbell Curl", "Dumbbell Curl", "Hammer Curl", "Cable Curl",
  "Close Grip Bench Press", "Tricep Pushdown", "Overhead Tricep Extension",
  "Skull Crushers", "Dips",
  // Core / calves
  "Plank", "Cable Crunch", "Hanging Leg Raise", "Ab Wheel", "Pallof Press",
  "Standing Calf Raise", "Seated Calf Raise",
  // Conditioning / running
  "Run", "Row (erg)", "Assault Bike", "Burpees", "Kettlebell Swing",
];
