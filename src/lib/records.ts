/**
 * Records & trends — pure helpers over the structured lift log. Powers the
 * Live Session's ghost values + PR detection (Strong/Hevy-style), the
 * per-exercise progression sheets, and the weekly-volume chart on Train.
 */

import type { Workout, WorkoutExercise, WorkoutSet } from "./store";

/* ---------------- Estimated 1RM ---------------- */

/** Epley estimated one-rep max. Bodyweight sets (weight 0) have no e1RM. */
export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/* ---------------- All-time records per exercise ---------------- */

export type PRKind = "weight" | "e1rm" | "volume";

export const PR_LABELS: Record<PRKind, string> = {
  weight: "Heaviest lift",
  e1rm: "Best est. 1RM",
  volume: "Biggest set",
};

export interface ExerciseRecords {
  name: string; // display name (first casing seen)
  /** Heaviest weight moved for ≥1 rep. */
  weight: { weight: number; reps: number; day: string } | null;
  /** Best Epley estimated 1RM. */
  e1rm: { value: number; weight: number; reps: number; day: string } | null;
  /** Biggest single set by tonnage (reps × weight). */
  volume: { value: number; weight: number; reps: number; day: string } | null;
  sessions: number;
}

const norm = (name: string) => name.trim().toLowerCase();

/** Fold every logged set into per-exercise all-time records. */
export function recordsByExercise(workouts: Workout[]): Map<string, ExerciseRecords> {
  const by = new Map<string, ExerciseRecords>();
  for (const w of workouts) {
    for (const ex of w.exercises) {
      const key = norm(ex.name);
      if (!key) continue;
      let r = by.get(key);
      if (!r) {
        r = { name: ex.name.trim(), weight: null, e1rm: null, volume: null, sessions: 0 };
        by.set(key, r);
      }
      r.sessions += 1;
      for (const s of ex.sets) {
        if (s.reps <= 0) continue;
        if (s.weight > 0 && (!r.weight || s.weight > r.weight.weight)) {
          r.weight = { weight: s.weight, reps: s.reps, day: w.day };
        }
        const e1 = epley1RM(s.weight, s.reps);
        if (e1 > 0 && (!r.e1rm || e1 > r.e1rm.value)) {
          r.e1rm = { value: e1, weight: s.weight, reps: s.reps, day: w.day };
        }
        const vol = s.reps * s.weight;
        if (vol > 0 && (!r.volume || vol > r.volume.value)) {
          r.volume = { value: vol, weight: s.weight, reps: s.reps, day: w.day };
        }
      }
    }
  }
  return by;
}

/** Which all-time records a just-committed set beats. Empty array = no PR.
 *  An exercise's very first logged set is not a "record" — you need history
 *  to beat (mirrors Strong: trophies appear from the second session on). */
export function detectPRs(
  records: Map<string, ExerciseRecords>,
  exerciseName: string,
  set: WorkoutSet
): PRKind[] {
  const r = records.get(norm(exerciseName));
  if (!r || set.reps <= 0) return [];
  const prs: PRKind[] = [];
  if (r.weight && set.weight > r.weight.weight) prs.push("weight");
  const e1 = epley1RM(set.weight, set.reps);
  if (r.e1rm && e1 > r.e1rm.value) prs.push("e1rm");
  const vol = set.reps * set.weight;
  if (r.volume && vol > r.volume.value) prs.push("volume");
  return prs;
}

/* ---------------- Ghost values (previous session) ---------------- */

/** The sets from the most recent session that included this exercise —
 *  pre-loaded as gray placeholders in the live logger ("beat this"). */
export function lastSessionSets(workouts: Workout[], exerciseName: string): WorkoutSet[] {
  const key = norm(exerciseName);
  if (!key) return [];
  for (let i = workouts.length - 1; i >= 0; i--) {
    const ex = workouts[i].exercises.find((e) => norm(e.name) === key);
    if (ex && ex.sets.length > 0) return ex.sets;
  }
  return [];
}

/* ---------------- Weekly volume ---------------- */

export interface WeekVolume {
  /** Monday of the week, YYYY-MM-DD local. */
  start: string;
  /** "Aug 11" style label of the Monday. */
  label: string;
  volume: number; // Σ reps × weight over the week
  sessions: number;
}

const dayString = (d: Date) => d.toLocaleDateString("en-CA");

/** Monday (local) of the week containing the given date. */
function mondayOf(d: Date): Date {
  const out = new Date(d);
  const dow = (out.getDay() + 6) % 7; // Mon=0 … Sun=6
  out.setDate(out.getDate() - dow);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Session tonnage + count bucketed into the last `weeks` calendar weeks
 *  (oldest first, current week last — always exactly `weeks` entries). */
export function weeklyVolume(workouts: Workout[], weeks = 8): WeekVolume[] {
  const thisMonday = mondayOf(new Date());
  const buckets: WeekVolume[] = [];
  const index = new Map<string, WeekVolume>();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday);
    d.setDate(d.getDate() - i * 7);
    const start = dayString(d);
    const b: WeekVolume = {
      start,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      volume: 0,
      sessions: 0,
    };
    buckets.push(b);
    index.set(start, b);
  }
  for (const w of workouts) {
    const start = dayString(mondayOf(new Date(`${w.day}T00:00:00`)));
    const b = index.get(start);
    if (!b) continue;
    b.sessions += 1;
    for (const ex of w.exercises) {
      for (const s of ex.sets) b.volume += s.reps * s.weight;
    }
  }
  for (const b of buckets) b.volume = Math.round(b.volume);
  return buckets;
}

/* ---------------- Per-exercise progression ---------------- */

export interface ExercisePoint {
  day: string;
  /** Best set that session: heaviest weight (ties → more reps). */
  weight: number;
  reps: number;
  e1rm: number;
}

/** One point per session for an exercise, oldest first — the line that
 *  should go up. */
export function exerciseTrend(workouts: Workout[], exerciseName: string): ExercisePoint[] {
  const key = norm(exerciseName);
  const points: ExercisePoint[] = [];
  for (const w of [...workouts].sort((a, b) => a.ts - b.ts)) {
    const ex = w.exercises.find((e) => norm(e.name) === key);
    if (!ex) continue;
    let best: WorkoutSet | null = null;
    for (const s of ex.sets) {
      if (s.reps <= 0) continue;
      if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
        best = s;
      }
    }
    if (best) {
      points.push({ day: w.day, weight: best.weight, reps: best.reps, e1rm: epley1RM(best.weight, best.reps) });
    }
  }
  return points;
}

/** The athlete's strongest lifts — exercises ranked by best e1RM, for the
 *  Records panel. Bodyweight-only movements rank by biggest set volume. */
export function bestLifts(workouts: Workout[], limit = 6): ExerciseRecords[] {
  return [...recordsByExercise(workouts).values()]
    .filter((r) => r.e1rm || r.volume)
    .sort((a, b) => (b.e1rm?.value ?? 0) - (a.e1rm?.value ?? 0) || (b.volume?.value ?? 0) - (a.volume?.value ?? 0))
    .slice(0, limit);
}

/* ---------------- Days & streak helpers ---------------- */

/** YYYY-MM-DD local, n days before the given local day string. */
export function dayBefore(day: string, n = 1): string {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() - n);
  return dayString(d);
}

/** kg formatted without trailing .0 ("102.5" / "100"). */
export const fmtKg = (kg: number) =>
  (Math.round(kg * 10) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });
