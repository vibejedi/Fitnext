/**
 * Today's plan — a deterministic session generator so "Today's Labor" shows
 * the actual workout, not a promise. Each coach route carries a split; the
 * athlete's cadence picks how much of it cycles; equipment picks the
 * exercise variant; and the lift log drives weight suggestions using the
 * protocol's progression rule (+2.5kg upper / +5kg lower once all target
 * reps are made). The AI coach can still adjust it in chat — this is the
 * default the athlete sees without asking.
 */

import type { CoachId } from "./coaches";
import type { LaborId } from "./labors";
import type { Workout } from "./store";
import { lastSessionSets } from "./records";

export type EquipmentTier = "gym" | "db" | "bw";

/** Map the onboarding equipment answer onto a tier. */
export function equipmentTier(equipment: string | null): EquipmentTier {
  const e = (equipment ?? "").toLowerCase();
  if (e.includes("gym")) return "gym";
  if (e.includes("dumbbell") || e.includes("db")) return "db";
  return "bw";
}

/** One movement slot: the exercise per equipment tier (missing tiers fall
 *  back rightward gym → db → bw). `min` marks time-based work (runs, holds). */
interface Slot {
  gym: string;
  db?: string;
  bw?: string;
  sets: number;
  reps: number;
  min?: boolean;
  /** Lower-body progression (+5kg) instead of upper (+2.5kg). */
  lower?: boolean;
}

interface SessionTemplate {
  title: string;
  labor: LaborId;
  focus: string; // one plain line under the title
  slots: Slot[];
}

const s = (
  gym: string, sets: number, reps: number,
  opts: Partial<Pick<Slot, "db" | "bw" | "min" | "lower">> = {}
): Slot => ({ gym, sets, reps, ...opts });

/** Each route's split, in order — a cadence of N days cycles the first N. */
const SPLITS: Record<CoachId, SessionTemplate[]> = {
  kratos: [
    { title: "Squat Day", labor: "legs", focus: "Heavy squats — drive the floor away", slots: [
      s("Barbell Back Squat", 5, 5, { db: "Goblet Squat", bw: "Bulgarian Split Squat", lower: true }),
      s("Romanian Deadlift", 3, 8, { db: "Romanian Deadlift", bw: "Glute Bridge", lower: true }),
      s("Leg Press", 3, 10, { db: "Walking Lunge", bw: "Walking Lunge", lower: true }),
      s("Cable Crunch", 3, 12, { db: "Hanging Leg Raise", bw: "Plank" }),
    ]},
    { title: "Bench Day", labor: "push", focus: "Heavy bench — tight arch, controlled descent", slots: [
      s("Barbell Bench Press", 5, 5, { db: "Dumbbell Bench Press", bw: "Push-Up" }),
      s("Barbell Overhead Press", 3, 8, { db: "Dumbbell Overhead Press", bw: "Push-Up" }),
      s("Dips", 3, 8, { db: "Dips", bw: "Dips" }),
      s("Tricep Pushdown", 3, 12, { db: "Overhead Tricep Extension", bw: "Close-Grip Push-Up" }),
    ]},
    { title: "Deadlift Day", labor: "pull", focus: "Pull heavy — brace, wedge, stand", slots: [
      s("Conventional Deadlift", 5, 3, { db: "Romanian Deadlift", bw: "Glute Bridge", lower: true }),
      s("Barbell Bent Over Row", 4, 8, { db: "Dumbbell Row", bw: "Pull-Up" }),
      s("Lat Pulldown", 3, 10, { db: "Pull-Up", bw: "Pull-Up" }),
      s("Barbell Curl", 3, 10, { db: "Dumbbell Curl", bw: "Chin-Up" }),
    ]},
    { title: "Press & Back Day", labor: "push", focus: "Strict overhead work + upper back", slots: [
      s("Barbell Overhead Press", 5, 5, { db: "Dumbbell Overhead Press", bw: "Push-Up" }),
      s("Incline Dumbbell Press", 3, 8, { bw: "Push-Up" }),
      s("Chest Supported Row", 4, 10, { db: "Dumbbell Row", bw: "Pull-Up" }),
      s("Face Pull", 3, 15, { db: "Rear Delt Fly", bw: "Plank" }),
    ]},
    { title: "Squat Volume Day", labor: "legs", focus: "Lighter, faster squats — volume builds the base", slots: [
      s("Front Squat", 4, 6, { db: "Goblet Squat", bw: "Bulgarian Split Squat", lower: true }),
      s("Hip Thrust", 3, 10, { db: "Hip Thrust", bw: "Glute Bridge", lower: true }),
      s("Lying Leg Curl", 3, 12, { db: "Romanian Deadlift", bw: "Glute Bridge" }),
      s("Ab Wheel", 3, 10, { db: "Plank", bw: "Plank" }),
    ]},
  ],
  adonis: [
    { title: "Push Day", labor: "push", focus: "Chest, shoulders, triceps — chase the pump", slots: [
      s("Barbell Bench Press", 4, 8, { db: "Dumbbell Bench Press", bw: "Push-Up" }),
      s("Incline Dumbbell Press", 3, 10, { bw: "Push-Up" }),
      s("Lateral Raise", 4, 12, { bw: "Push-Up" }),
      s("Tricep Pushdown", 3, 12, { db: "Overhead Tricep Extension", bw: "Close-Grip Push-Up" }),
    ]},
    { title: "Pull Day", labor: "pull", focus: "Width and thickness — control every rep", slots: [
      s("Lat Pulldown", 4, 10, { db: "Pull-Up", bw: "Pull-Up" }),
      s("Barbell Bent Over Row", 4, 10, { db: "Dumbbell Row", bw: "Pull-Up" }),
      s("Rear Delt Fly", 3, 15, { bw: "Plank" }),
      s("Dumbbell Curl", 3, 12, { bw: "Chin-Up" }),
    ]},
    { title: "Leg Day", labor: "legs", focus: "Quads, hams, glutes — leave nothing", slots: [
      s("Barbell Back Squat", 4, 8, { db: "Goblet Squat", bw: "Bulgarian Split Squat", lower: true }),
      s("Romanian Deadlift", 3, 10, { db: "Romanian Deadlift", bw: "Glute Bridge", lower: true }),
      s("Leg Extension", 3, 12, { db: "Walking Lunge", bw: "Walking Lunge" }),
      s("Standing Calf Raise", 4, 15, { db: "Standing Calf Raise", bw: "Standing Calf Raise" }),
    ]},
    { title: "Upper Day", labor: "push", focus: "Everything above the waist, heavier", slots: [
      s("Incline Barbell Press", 4, 8, { db: "Incline Dumbbell Press", bw: "Push-Up" }),
      s("Seated Cable Row", 4, 10, { db: "Dumbbell Row", bw: "Pull-Up" }),
      s("Dumbbell Overhead Press", 3, 10, { bw: "Push-Up" }),
      s("Hammer Curl", 3, 12, { bw: "Chin-Up" }),
    ]},
    { title: "Lower & Core Day", labor: "legs", focus: "Posterior chain + a hard core finish", slots: [
      s("Hip Thrust", 4, 10, { db: "Hip Thrust", bw: "Glute Bridge", lower: true }),
      s("Bulgarian Split Squat", 3, 10, { db: "Bulgarian Split Squat", bw: "Bulgarian Split Squat", lower: true }),
      s("Seated Leg Curl", 3, 12, { db: "Romanian Deadlift", bw: "Glute Bridge" }),
      s("Hanging Leg Raise", 3, 12, { bw: "Plank" }),
    ]},
  ],
  prometheus: [
    { title: "Full-Body Strength", labor: "legs", focus: "Big lifts first, engine later this week", slots: [
      s("Barbell Back Squat", 4, 6, { db: "Goblet Squat", bw: "Bulgarian Split Squat", lower: true }),
      s("Barbell Bench Press", 4, 6, { db: "Dumbbell Bench Press", bw: "Push-Up" }),
      s("Barbell Bent Over Row", 3, 8, { db: "Dumbbell Row", bw: "Pull-Up" }),
      s("Plank", 3, 1, { min: true }),
    ]},
    { title: "Conditioning Intervals", labor: "conditioning", focus: "Hard intervals — earn the rest between", slots: [
      s("Assault Bike", 6, 2, { db: "Burpees", bw: "Burpees", min: true }),
      s("Kettlebell Swing", 4, 15, { db: "Kettlebell Swing", bw: "Burpees" }),
      s("Run", 1, 10, { min: true }),
    ]},
    { title: "Full-Body Volume", labor: "push", focus: "Same lifts, more reps — capacity day", slots: [
      s("Conventional Deadlift", 3, 5, { db: "Romanian Deadlift", bw: "Glute Bridge", lower: true }),
      s("Dumbbell Overhead Press", 3, 10, { bw: "Push-Up" }),
      s("Pull-Up", 3, 8, { bw: "Pull-Up" }),
      s("Walking Lunge", 3, 12, { lower: true }),
    ]},
    { title: "Tempo Run & Core", labor: "conditioning", focus: "Comfortably hard pace, then the trunk", slots: [
      s("Run", 1, 20, { min: true }),
      s("Plank", 3, 1, { min: true }),
      s("Hanging Leg Raise", 3, 10, { bw: "Plank" }),
    ]},
    { title: "Power Day", labor: "legs", focus: "Move fast — speed is the point, not weight", slots: [
      s("Front Squat", 5, 3, { db: "Goblet Squat", bw: "Bulgarian Split Squat", lower: true }),
      s("Push-Up", 4, 10),
      s("Kettlebell Swing", 4, 12, { bw: "Burpees" }),
    ]},
  ],
  nike: [
    { title: "Power & Metcon", labor: "conditioning", focus: "Heavy then breathless — the CrossFit sandwich", slots: [
      s("Front Squat", 5, 3, { db: "Goblet Squat", bw: "Bulgarian Split Squat", lower: true }),
      s("Burpees", 4, 15),
      s("Kettlebell Swing", 4, 15, { bw: "Burpees" }),
    ]},
    { title: "Engine Day", labor: "conditioning", focus: "Long intervals — build the motor", slots: [
      s("Row (erg)", 5, 3, { db: "Run", bw: "Run", min: true }),
      s("Assault Bike", 4, 2, { db: "Burpees", bw: "Burpees", min: true }),
      s("Plank", 3, 1, { min: true }),
    ]},
    { title: "Gymnastics & Core", labor: "core", focus: "Bodyweight skill under fatigue", slots: [
      s("Pull-Up", 5, 8),
      s("Push-Up", 5, 15),
      s("Hanging Leg Raise", 4, 10, { bw: "Plank" }),
    ]},
    { title: "Barbell Conditioning", labor: "legs", focus: "Light barbell, big sets, short rest", slots: [
      s("Conventional Deadlift", 4, 8, { db: "Romanian Deadlift", bw: "Glute Bridge", lower: true }),
      s("Barbell Overhead Press", 4, 8, { db: "Dumbbell Overhead Press", bw: "Push-Up" }),
      s("Walking Lunge", 3, 12, { lower: true }),
    ]},
    { title: "Long Chipper", labor: "conditioning", focus: "One long grind — pace it or pay", slots: [
      s("Run", 1, 15, { min: true }),
      s("Burpees", 3, 20),
      s("Kettlebell Swing", 3, 20, { bw: "Burpees" }),
      s("Ab Wheel", 3, 10, { db: "Plank", bw: "Plank" }),
    ]},
  ],
  atalanta: [
    { title: "Push Skills", labor: "push", focus: "Pressing strength — clean reps, full range", slots: [
      s("Push-Up", 5, 12),
      s("Dips", 4, 8),
      s("Dumbbell Overhead Press", 3, 10, { bw: "Push-Up" }),
      s("Plank", 3, 1, { min: true }),
    ]},
    { title: "Pull Skills", labor: "pull", focus: "Own the bar — dead hang to chin over", slots: [
      s("Pull-Up", 5, 6),
      s("Chin-Up", 3, 8),
      s("Dumbbell Row", 3, 10, { bw: "Pull-Up" }),
      s("Hanging Leg Raise", 3, 10),
    ]},
    { title: "Legs & Balance", labor: "legs", focus: "Single-leg control — slow and honest", slots: [
      s("Bulgarian Split Squat", 4, 10, { lower: true }),
      s("Walking Lunge", 3, 12, { lower: true }),
      s("Glute Bridge", 3, 15, { lower: true }),
      s("Standing Calf Raise", 4, 15),
    ]},
    { title: "Core & Mobility", labor: "mobility", focus: "Trunk strength, then open the hips and shoulders", slots: [
      s("Plank", 4, 1, { min: true }),
      s("Pallof Press", 3, 12, { bw: "Plank" }),
      s("Ab Wheel", 3, 8, { db: "Plank", bw: "Plank" }),
    ]},
    { title: "Skill Circuit", labor: "core", focus: "Everything together — quality beats count", slots: [
      s("Pull-Up", 4, 6),
      s("Push-Up", 4, 12),
      s("Bulgarian Split Squat", 3, 10, { lower: true }),
      s("Hanging Leg Raise", 3, 10),
    ]},
  ],
  hermes: [
    { title: "Easy Run", labor: "conditioning", focus: "Conversational pace — this builds the base", slots: [
      s("Run", 1, 30, { min: true }),
    ]},
    { title: "Interval Day", labor: "conditioning", focus: "Hard repeats, full recovery between", slots: [
      s("Run", 6, 2, { min: true }),
      s("Plank", 3, 1, { min: true }),
    ]},
    { title: "Tempo Run", labor: "conditioning", focus: "Comfortably hard — hold the line", slots: [
      s("Run", 1, 20, { min: true }),
    ]},
    { title: "Strength for Runners", labor: "legs", focus: "Legs and trunk that survive the miles", slots: [
      s("Bulgarian Split Squat", 3, 10, { lower: true }),
      s("Romanian Deadlift", 3, 10, { db: "Romanian Deadlift", bw: "Glute Bridge", lower: true }),
      s("Standing Calf Raise", 4, 15),
      s("Plank", 3, 1, { min: true }),
    ]},
    { title: "Long Run", labor: "conditioning", focus: "Slow. Long. The week's cornerstone.", slots: [
      s("Run", 1, 45, { min: true }),
    ]},
  ],
};

/* ---------------- generation ---------------- */

export interface PlanExercise {
  name: string;
  sets: number;
  reps: number;
  /** Time-based (reps are minutes). */
  min?: boolean;
  /** Suggested working weight from the lift log (kg). */
  suggestKg?: number;
  /** True when the suggestion already includes the protocol's increment. */
  progressed?: boolean;
}

export interface TodayPlan {
  title: string;
  labor: LaborId;
  focus: string;
  /** "Day II of V" position in the split cycle. */
  dayOfCycle: number;
  cycleLength: number;
  exercises: PlanExercise[];
}

const pick = (slot: Slot, tier: EquipmentTier): string =>
  tier === "gym" ? slot.gym : tier === "db" ? slot.db ?? slot.bw ?? slot.gym : slot.bw ?? slot.db ?? slot.gym;

/** Weight suggestion off the last session of this exercise: repeat the top
 *  working weight, or add the protocol increment once every set hit the
 *  target reps (+2.5kg upper / +5kg lower). */
function suggest(workouts: Workout[], name: string, slot: Slot): Pick<PlanExercise, "suggestKg" | "progressed"> {
  const last = lastSessionSets(workouts, name);
  if (last.length === 0) return {};
  const top = Math.max(...last.map((x) => x.weight));
  if (top <= 0) return {};
  const madeAllReps = last.length >= slot.sets && last.every((x) => x.reps >= slot.reps);
  if (madeAllReps) return { suggestKg: top + (slot.lower ? 5 : 2.5), progressed: true };
  return { suggestKg: top };
}

/** Today's session: the next template in the cycle after the last logged
 *  session that matches one (falling back to the cycle start), with
 *  equipment-fit exercises and lift-log-driven weight suggestions. */
export function generateTodayPlan(
  coach: CoachId | null,
  equipment: string | null,
  days: number | null,
  workouts: Workout[]
): TodayPlan {
  const split = SPLITS[coach ?? "prometheus"] ?? SPLITS.prometheus;
  const cycleLength = Math.max(2, Math.min(split.length, days ?? split.length));
  const cycle = split.slice(0, cycleLength);
  const tier = equipmentTier(equipment);

  // Resume the cycle after the most recent plan-titled session.
  let idx = 0;
  for (let i = workouts.length - 1; i >= 0; i--) {
    const match = cycle.findIndex((t) => t.title === workouts[i].title);
    if (match !== -1) { idx = (match + 1) % cycleLength; break; }
  }

  const t = cycle[idx];
  return {
    title: t.title,
    labor: t.labor,
    focus: t.focus,
    dayOfCycle: idx + 1,
    cycleLength,
    exercises: t.slots.map((slot) => {
      const name = pick(slot, tier);
      return {
        name,
        sets: slot.sets,
        reps: slot.reps,
        ...(slot.min ? { min: true } : {}),
        ...(slot.min ? {} : suggest(workouts, name, slot)),
      };
    }),
  };
}
