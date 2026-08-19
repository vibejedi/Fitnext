/**
 * Morning briefing — the coach speaks first. Three plain lines, generated
 * once per local day: what yesterday's records show, what today holds, and
 * one specific nudge. The context is built client-side from the store; the
 * AI route writes the words, and `localBriefing` covers offline / no-key
 * runs with the same shape so the card always renders.
 */

import type { FitState } from "./store";
import { dailyNutrition, workoutVolume, topSet } from "./history";
import { RITES, NUTRITION_TARGETS } from "./rites";
import { fmtKg } from "./records";
import { coachById } from "./coaches";
import type { PersonalityId } from "./personalities";
import type { TodayPlan } from "./plan";

export interface BriefingContext {
  day: string; // athlete's local YYYY-MM-DD
  coach: string;
  personality: PersonalityId | null;
  goal: string | null;
  streak: number;
  shields: number;
  yesterday: {
    sealed: boolean;
    ritesDone: number;
    ritesTotal: number;
    kcal: number | null;
    kcalTarget: number;
    workout: { title: string; volume: number; topLift: string | null } | null;
  };
  today: {
    plan: string; // "Bench Day — Barbell Bench Press 5×5 @ 102.5kg, …"
    focus: string;
    ritesDone: number;
  };
}

const dayBefore = (day: string) => {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA");
};

/** Everything the briefing writer needs, compact. `planText` comes from
 *  planAsText(useTodayPlan()) so briefing and panel show the same session. */
export function buildBriefingContext(
  s: FitState,
  today: string,
  plan: TodayPlan,
  planText: string
): BriefingContext {
  const yday = dayBefore(today);

  const yRites = s.riteHistory[yday];
  const ritesDone = yRites ? RITES.filter((r) => yRites[r.id]).length : 0;

  const yNutrition = dailyNutrition(s.meals).find((d) => d.day === yday) ?? null;

  const yWorkouts = s.workouts.filter((w) => w.day === yday);
  const yw = yWorkouts[yWorkouts.length - 1] ?? null;
  let workout: BriefingContext["yesterday"]["workout"] = null;
  if (yw) {
    const first = yw.exercises[0];
    const top = first ? topSet(first) : null;
    workout = {
      title: yw.title,
      volume: workoutVolume(yw),
      topLift: first && top
        ? `${first.name} ${top.weight > 0 ? `${fmtKg(top.weight)}kg × ` : ""}${top.reps}`
        : null,
    };
  }

  return {
    day: today,
    coach: coachById(s.coach)?.name ?? "Coach",
    personality: s.personality,
    goal: s.goal,
    streak: s.streak,
    shields: s.shields,
    yesterday: {
      sealed: s.sealedDate === yday,
      ritesDone,
      ritesTotal: RITES.length,
      kcal: yNutrition?.kcal ?? null,
      kcalTarget: NUTRITION_TARGETS.kcal,
      workout,
    },
    today: {
      plan: planText,
      focus: plan.focus,
      ritesDone: s.ritesDate === today ? RITES.filter((r) => s.rites[r.id]).length : 0,
    },
  };
}

/** Deterministic fallback in the exact same three-line shape the AI uses.
 *  Plain and specific — no filler. */
export function localBriefing(ctx: BriefingContext): string {
  const y = ctx.yesterday;
  const yParts: string[] = [];
  if (y.workout) {
    yParts.push(`${y.workout.title}, ${y.workout.volume.toLocaleString()}kg moved${y.workout.topLift ? ` (top: ${y.workout.topLift})` : ""}`);
  }
  if (y.kcal !== null) {
    const diff = y.kcal - y.kcalTarget;
    yParts.push(`${y.kcal.toLocaleString()} kcal (${diff > 0 ? `${diff.toLocaleString()} over` : `${Math.abs(diff).toLocaleString()} under`} target)`);
  }
  yParts.push(y.sealed ? `day sealed, ${y.ritesDone}/${y.ritesTotal} rites` : `${y.ritesDone}/${y.ritesTotal} rites, day not sealed`);
  const yesterdayLine = yParts.join(" · ");

  const todayLine = ctx.today.plan;

  let nudge: string;
  if (!y.sealed && ctx.streak > 0) {
    nudge = ctx.shields > 0
      ? `A shield covered yesterday — seal today to keep the ${ctx.streak}-day streak honest.`
      : `Seal today. The streak only counts the days you close.`;
  } else if (y.kcal !== null && y.kcal - y.kcalTarget > 150) {
    nudge = "Yesterday ran hot on calories — keep today's meals on target.";
  } else if (y.workout) {
    nudge = "You showed up yesterday. Do it again — consistency is the whole game.";
  } else {
    nudge = "One session, logged. That's all today asks.";
  }

  return `Yesterday: ${yesterdayLine}\nToday: ${todayLine}\nOne thing: ${nudge}`;
}
