"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronDown, Dumbbell, Apple, Check, Plus, Award, Pencil,
} from "lucide-react";
import { Wordmark, MeanderBand, GoldDivider } from "@/components/Brand";
import { AuthButton } from "@/components/AuthButton";
import { LogWorkoutDialog } from "@/components/LogWorkout";
import { mealSlot } from "@/components/LogMeal";
import { useFit, localDay } from "@/lib/store";
import { pullMealsRange, pullWorkouts, pullRitesRange, pullRites } from "@/lib/sync";
import {
  dailyNutrition, riteDays, exerciseSummary, workoutVolume, topSet,
} from "@/lib/history";
import { RITES, EMPTY_RITES, NUTRITION_TARGETS } from "@/lib/rites";
import { cn, toRoman } from "@/lib/utils";

type Tab = "nutrition" | "training" | "rites";

/** Local date string N days before today. */
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("en-CA");
};

/** "Today" / "Yesterday" / "Mon, Jul 28" for a YYYY-MM-DD local day. */
function labelDay(day: string, today: string, yesterday: string): string {
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  const d = new Date(`${day}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function HistoryPage() {
  const router = useRouter();
  const fit = useFit();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("nutrition");
  const [logging, setLogging] = useState(false);

  useEffect(() => setMounted(true), []);

  // hydrate the last ~45 days of history from the cloud into the store
  useEffect(() => {
    if (!mounted) return;
    useFit.getState().beginDay();
    const today = localDay();
    // today's rites come from the cloud too, so a rite ticked on another
    // device shows on today's row here (past days arrive via the range pull)
    void pullRites(today).then((r) => {
      if (!r) return;
      const s = useFit.getState();
      s.set("rites", { ...EMPTY_RITES, ...r });
      s.set("ritesDate", today);
    });
    const since = daysAgo(45);
    void Promise.all([
      pullMealsRange(since),
      pullWorkouts(80),
      pullRitesRange(since),
    ]).then(([meals, workouts, riteHistory]) => {
      useFit.getState().absorbHistory({
        meals: meals ?? undefined,
        workouts: workouts ?? undefined,
        riteHistory: riteHistory ?? undefined,
      });
    });
  }, [mounted]);

  useEffect(() => {
    if (mounted && !fit.onboarded) router.replace("/onboarding");
  }, [mounted, fit.onboarded, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-faint">
        <span className="animate-pulse-glow font-display tracking-[0.18em]">Unrolling the scroll…</span>
      </div>
    );
  }

  const today = localDay();
  const yesterday = daysAgo(1);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* header */}
      <header className="sticky top-0 z-20 border-b border-line bg-[rgba(247,244,236,0.92)] backdrop-blur">
        <div className="mx-auto flex h-[54px] w-full max-w-[900px] items-center justify-between px-[18px] lg:h-[60px] lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-[3px] border border-line-strong bg-panel-alt px-2.5 py-[5px] text-[9px] font-semibold uppercase tracking-[0.16em] text-gold active:translate-y-px active:bg-pressed lg:text-[10px]"
            >
              <ArrowLeft size={12} /> Dashboard
            </Link>
            <Wordmark className="hidden text-base sm:block lg:text-[19px]" />
          </div>
          <div className="hidden lg:block">
            <AuthButton />
          </div>
        </div>
        <MeanderBand />
      </header>

      <main className="mx-auto w-full max-w-[900px] flex-1 px-[18px] py-6 lg:px-8">
        {/* title */}
        <div className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-gold">The Chronicle</p>
          <h1 className="mt-1.5 font-display text-[26px] font-bold tracking-[0.04em] lg:text-3xl">
            Your Records
          </h1>
          <p className="mx-auto mt-1.5 max-w-md text-[11px] text-sec lg:text-xs">
            Every logged meal, session, and rite — the record your coach reads to move you forward.
          </p>
          <GoldDivider className="mt-3" />
        </div>

        {/* tabs */}
        <div className="mt-5 flex justify-center gap-7 border-b border-line">
          <TabButton active={tab === "nutrition"} onClick={() => setTab("nutrition")} label="Nutrition" />
          <TabButton active={tab === "training"} onClick={() => setTab("training")} label="Training" />
          <TabButton active={tab === "rites"} onClick={() => setTab("rites")} label="Rites" />
        </div>

        <div className="mt-5">
          {tab === "nutrition" && <NutritionHistory today={today} yesterday={yesterday} />}
          {tab === "training" && (
            <TrainingHistory today={today} yesterday={yesterday} onLog={() => setLogging(true)} />
          )}
          {tab === "rites" && <RitesHistory today={today} yesterday={yesterday} />}
        </div>
      </main>

      <LogWorkoutDialog open={logging} onClose={() => setLogging(false)} />
    </div>
  );
}

/* ================= tabs ================= */

function TabButton({ active, onClick, label }: {
  active: boolean; onClick: () => void; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "-mb-px pb-2.5 pt-1 text-[11px] uppercase tracking-[0.2em] transition-colors",
        active
          ? "border-b-2 border-gold font-semibold text-ink"
          : "border-b-2 border-transparent text-faint hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}

/** A collapsible day/session row with a chiseled summary header. */
function Expandable({ header, defaultOpen, children }: {
  header: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section className="panel">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full select-none items-center gap-3 px-[14px] py-3 text-left active:bg-pressed lg:px-[18px]"
      >
        <div className="min-w-0 flex-1">{header}</div>
        <ChevronDown
          size={15}
          className={cn("shrink-0 text-gold transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && <div className="border-t border-line-soft">{children}</div>}
    </section>
  );
}

function EmptyState({ icon, title, sub, action }: {
  icon: React.ReactNode; title: string; sub: string; action?: React.ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-panel-alt">
        {icon}
      </span>
      <p className="font-display text-sm font-bold uppercase tracking-[0.14em]">{title}</p>
      <p className="max-w-xs text-[11px] text-sec">{sub}</p>
      {action}
    </div>
  );
}

/* ---------------- Nutrition ---------------- */

function NutritionHistory({ today, yesterday }: { today: string; yesterday: string }) {
  const meals = useFit((s) => s.meals);
  const days = dailyNutrition(meals);
  const T = NUTRITION_TARGETS;

  if (days.length === 0) {
    return (
      <EmptyState
        icon={<Apple size={16} className="text-gold" />}
        title="No meals inscribed yet"
        sub="Log a meal from the dashboard — the oracle eyeballs the macros and they'll stack up here day by day."
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

/* ---------------- Training ---------------- */

function TrainingHistory({ today, yesterday, onLog }: {
  today: string; yesterday: string; onLog: () => void;
}) {
  const workouts = useFit((s) => s.workouts);
  const ordered = [...workouts].sort((a, b) => b.ts - a.ts);

  const LogButton = (
    <button onClick={onLog} className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[11px]">
      <Plus size={13} /> Log a Workout
    </button>
  );

  if (ordered.length === 0) {
    return (
      <EmptyState
        icon={<Dumbbell size={16} className="text-gold" />}
        title="No sessions logged yet"
        sub="Inscribe a workout — lift, reps, weight and how it felt — and your coach will progress you off real numbers."
        action={<div className="mt-1">{LogButton}</div>}
      />
    );
  }

  const totalSets = ordered.reduce(
    (a, w) => a + w.exercises.reduce((b, e) => b + e.sets.length, 0), 0
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <SummaryStrip
          className="flex-1"
          items={[
            [toRoman(ordered.length), "Sessions"],
            [toRoman(totalSets), "Total sets"],
            [labelDay(ordered[0].day, today, yesterday), "Last session"],
          ]}
        />
      </div>
      <div className="flex justify-end">{LogButton}</div>
      {ordered.map((w) => (
        <Expandable
          key={w.id}
          header={
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{w.title}</p>
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
                “{w.feel}”
              </p>
            )}
          </div>
        </Expandable>
      ))}
    </div>
  );
}

/* ---------------- Rites ---------------- */

function RitesHistory({ today, yesterday }: { today: string; yesterday: string }) {
  const riteHistory = useFit((s) => s.riteHistory);
  const rites = useFit((s) => s.rites);
  const ritesDate = useFit((s) => s.ritesDate);
  const todayRites = ritesDate === today ? rites : ({} as typeof rites);
  const days = riteDays(riteHistory, today, todayRites);

  if (days.length === 0) {
    return (
      <EmptyState
        icon={<Check size={16} className="text-gold" />}
        title="No rites recorded yet"
        sub="Complete your Daily Rites on the dashboard and each day's laurels will be chronicled here."
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

/* ---------------- shared ---------------- */

function SummaryStrip({ items, className }: {
  items: [string, string][]; className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-px border border-line bg-line", className)}>
      {items.map(([value, label], i) => (
        <div key={i} className="bg-panel px-2 py-3 text-center">
          <div className="truncate font-display text-[17px] font-bold text-ink lg:text-[19px]">{value}</div>
          <div className="mt-0.5 text-[8px] uppercase tracking-[0.2em] text-gold">{label}</div>
        </div>
      ))}
    </div>
  );
}
