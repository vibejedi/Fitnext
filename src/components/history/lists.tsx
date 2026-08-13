"use client";

import { Apple, Award, Check, Dumbbell, Pencil, Plus } from "lucide-react";
import { Expandable, EmptyState, SummaryStrip, labelDay, daysAgo } from "@/components/ui";
import { mealSlot } from "@/components/LogMeal";
import { useFit, localDay, type Workout } from "@/lib/store";
import {
  dailyNutrition, riteDays, exerciseSummary, workoutVolume, topSet,
} from "@/lib/history";
import { inferLabor, laborById, type LaborId } from "@/lib/labors";
import { RITES, NUTRITION_TARGETS } from "@/lib/rites";
import { cn, toRoman } from "@/lib/utils";

/**
 * The shared history lists — per-day nutrition logs, per-session training
 * records (filterable by Labor), and rite completions. Used by the Records
 * page and embedded in the Nutrition / Train module screens.
 */

/** A workout's effective labor: the logged tag, else a guess from its title. */
export const workoutLabor = (w: Workout): LaborId | undefined =>
  w.labor ?? inferLabor(w.title);

/* ---------------- Nutrition: previous per-day logs ---------------- */

export function NutritionDays({ maxDays, includeToday = true }: {
  maxDays?: number;
  /** The Nutrition screen shows today in its own panel — hide it here. */
  includeToday?: boolean;
}) {
  const meals = useFit((s) => s.meals);
  const today = localDay();
  const yesterday = daysAgo(1);
  const T = NUTRITION_TARGETS;

  let days = dailyNutrition(meals);
  if (!includeToday) days = days.filter((d) => d.day !== today);
  if (maxDays) days = days.slice(0, maxDays);

  if (days.length === 0) {
    return (
      <EmptyState
        icon={<Apple size={16} className="text-gold" />}
        title={includeToday ? "No meals inscribed yet" : "No previous days yet"}
        sub="Log a meal — the oracle eyeballs the macros and they'll stack up here day by day."
      />
    );
  }

  // 7-day average calories (only counting days with meals)
  const recent = days.slice(0, 7);
  const avgKcal = Math.round(recent.reduce((a, d) => a + d.kcal, 0) / recent.length);

  return (
    <div className="flex flex-col gap-3">
      <SummaryStrip
        items={[
          [toRoman(days.length), "Days logged"],
          [avgKcal.toLocaleString(), "Avg kcal · 7d"],
          [`${T.kcal.toLocaleString()}`, "Daily target"],
        ]}
      />
      {days.map((d) => {
        const dayMeals = meals.filter((m) => m.day === d.day).sort((a, b) => a.ts - b.ts);
        const over = d.kcal > T.kcal;
        const delta = Math.abs(T.kcal - d.kcal);
        return (
          <Expandable
            key={d.day}
            header={
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{labelDay(d.day, today, yesterday)}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-sec">
                    {d.p}P · {d.c}C · {d.f}F · {toRoman(d.count)} meal{d.count > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-[15px] font-bold">{d.kcal.toLocaleString()}</p>
                  <p className={cn("font-mono text-[9px]", over ? "text-clay" : "text-gold")}>
                    {delta.toLocaleString()} {over ? "over" : "under"}
                  </p>
                </div>
              </div>
            }
          >
            {dayMeals.map((m, i) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-baseline gap-2 px-[14px] py-2.5 lg:px-[18px]",
                  i < dayMeals.length - 1 && "border-b border-line-soft"
                )}
              >
                <span className="min-w-0 flex-1 truncate text-xs font-semibold lg:text-[13px]">
                  {m.name}{" "}
                  <span className="text-[9px] font-normal tracking-[0.08em] text-faint">
                    · {mealSlot(m.ts).toUpperCase()}
                  </span>
                  {m.edited && (
                    <Pencil size={9} className="ml-1 inline-block -translate-y-px text-faint" aria-label="Adjusted by you" />
                  )}
                </span>
                <span className="font-mono text-[10px] text-sec">{m.p}P · {m.c}C · {m.f}F</span>
                <span className="w-16 shrink-0 text-right font-mono text-[10px] text-ink lg:text-[11px]">
                  {m.kcal.toLocaleString()} kcal
                </span>
              </div>
            ))}
          </Expandable>
        );
      })}
      <p className="px-1 pt-1 text-center text-[9px] text-faint">
        Calories &amp; macros are eyeball estimates from your meal photos.
      </p>
    </div>
  );
}

/* ---------------- Training: previous sessions (per Labor) ---------------- */

export function TrainingSessions({ labor, onLog, compact }: {
  /** Only show sessions belonging to this Labor. */
  labor?: LaborId;
  onLog?: () => void;
  /** Hide the summary strip (for embedding inside a Labor sheet). */
  compact?: boolean;
}) {
  const workouts = useFit((s) => s.workouts);
  const today = localDay();
  const yesterday = daysAgo(1);

  const ordered = [...workouts]
    .filter((w) => !labor || workoutLabor(w) === labor)
    .sort((a, b) => b.ts - a.ts);

  const LogButton = onLog ? (
    <button onClick={onLog} className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[11px]">
      <Plus size={13} /> Log a Workout
    </button>
  ) : null;

  if (ordered.length === 0) {
    return (
      <EmptyState
        icon={<Dumbbell size={16} className="text-gold" />}
        title={labor ? `No ${laborById(labor)?.label} sessions yet` : "No sessions logged yet"}
        sub="Inscribe a workout — lift, reps, weight and how it felt — and your coach will progress you off real numbers."
        action={LogButton ? <div className="mt-1">{LogButton}</div> : undefined}
      />
    );
  }

  const totalSets = ordered.reduce(
    (a, w) => a + w.exercises.reduce((b, e) => b + e.sets.length, 0), 0
  );

  return (
    <div className="flex flex-col gap-3">
      {!compact && (
        <>
          <SummaryStrip
            items={[
              [toRoman(ordered.length), "Sessions"],
              [toRoman(totalSets), "Total sets"],
              [labelDay(ordered[0].day, today, yesterday), "Last session"],
            ]}
          />
          {LogButton && <div className="flex justify-end">{LogButton}</div>}
        </>
      )}
      {ordered.map((w) => {
        const wl = laborById(workoutLabor(w));
        return (
          <Expandable
            key={w.id}
            header={
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">
                    {w.title}
                    {wl && !labor && (
                      <span className="ml-1.5 rounded-[2px] border border-line-soft px-1 py-px align-middle text-[8px] font-normal uppercase tracking-[0.16em] text-gold">
                        {wl.label}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-sec">
                    {labelDay(w.day, today, yesterday)} · {toRoman(w.exercises.length)} exercise
                    {w.exercises.length > 1 ? "s" : ""}
                    {w.energy ? ` · energy ${w.energy}/5` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-[13px] font-bold">
                    {workoutVolume(w).toLocaleString()}
                  </p>
                  <p className="font-mono text-[9px] text-gold">kg volume</p>
                </div>
              </div>
            }
          >
            <div className="flex flex-col">
              {w.exercises.map((ex, i) => {
                const best = topSet(ex);
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-baseline gap-2 px-[14px] py-2.5 lg:px-[18px]",
                      i < w.exercises.length - 1 && "border-b border-line-soft"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold lg:text-[13px]">
                      {ex.name}
                    </span>
                    <span className="font-mono text-[10px] text-sec">{exerciseSummary(ex)}</span>
                    {best && best.weight > 0 && (
                      <span className="w-16 shrink-0 text-right font-mono text-[10px] text-ink">
                        top {best.weight}kg
                      </span>
                    )}
                  </div>
                );
              })}
              {w.feel && (
                <p className="border-t border-line-soft bg-panel-alt px-[14px] py-2.5 text-[11px] italic text-sec lg:px-[18px]">
                  &ldquo;{w.feel}&rdquo;
                </p>
              )}
            </div>
          </Expandable>
        );
      })}
    </div>
  );
}

/* ---------------- Rites: per-day completions ---------------- */

export function RiteDaysList() {
  const riteHistory = useFit((s) => s.riteHistory);
  const rites = useFit((s) => s.rites);
  const ritesDate = useFit((s) => s.ritesDate);
  const today = localDay();
  const yesterday = daysAgo(1);
  const todayRites = ritesDate === today ? rites : ({} as typeof rites);
  const days = riteDays(riteHistory, today, todayRites);

  if (days.length === 0) {
    return (
      <EmptyState
        icon={<Check size={16} className="text-gold" />}
        title="No rites recorded yet"
        sub="Complete your Daily Rites on the Today screen and each day's laurels will be chronicled here."
      />
    );
  }

  const perfect = days.filter((d) => d.done.length === RITES.length).length;

  return (
    <div className="flex flex-col gap-3">
      <SummaryStrip
        items={[
          [toRoman(days.length), "Days tracked"],
          [toRoman(perfect), "Perfect days"],
          [`${toRoman(RITES.length)}`, "Rites a day"],
        ]}
      />
      {days.map((d) => {
        const perfectDay = d.done.length === RITES.length;
        return (
          <div key={d.day} className="panel px-[14px] py-3 lg:px-[18px]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-semibold">{labelDay(d.day, today, yesterday)}</p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-mono text-[10px]",
                  perfectDay ? "text-gold" : "text-sec"
                )}
              >
                {perfectDay && <Award size={12} />}
                {toRoman(d.done.length)} / {toRoman(RITES.length)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {RITES.map((r) => {
                const done = d.done.includes(r.id);
                return (
                  <span
                    key={r.id}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-[10px]",
                      done
                        ? "border-line-strong bg-done-wash text-ink"
                        : "border-line text-faint line-through opacity-60"
                    )}
                  >
                    {done && <Check size={10} className="text-gold" />}
                    {r.label}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
