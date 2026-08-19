"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Flame, MessageSquare } from "lucide-react";
import { Panel, useGleam } from "@/components/ui";
import { LiveWorkout } from "@/components/LiveWorkout";
import { useFit, localDay } from "@/lib/store";
import { generateTodayPlan, type TodayPlan } from "@/lib/plan";
import { workoutVolume } from "@/lib/history";
import { fmtKg } from "@/lib/records";
import { askCoach } from "@/lib/coachBus";
import { cn, toRoman } from "@/lib/utils";

/**
 * Today's Labor — the actual session, written out. No more "your coach has
 * inscribed the plan": the plan is on the stone. Go live pre-fills every
 * set; Adjust hands the same plan to the coach chat for changes.
 */

/** The generated plan for today off the current store. */
export function useTodayPlan(): TodayPlan {
  const coach = useFit((s) => s.coach);
  const equipment = useFit((s) => s.equipment);
  const days = useFit((s) => s.days);
  const workouts = useFit((s) => s.workouts);
  return useMemo(
    () => generateTodayPlan(coach, equipment, days, workouts),
    [coach, equipment, days, workouts]
  );
}

/** One-line text version of the plan, for the coach chat and the briefing. */
export function planAsText(plan: TodayPlan): string {
  const parts = plan.exercises.map(
    (e) => `${e.name} ${e.sets}×${e.reps}${e.min ? "min" : ""}${e.suggestKg ? ` @ ${fmtKg(e.suggestKg)}kg` : ""}`
  );
  return `${plan.title} — ${parts.join(", ")}`;
}

export function TodayLaborPanel({ action }: { action?: React.ReactNode }) {
  const router = useRouter();
  const workouts = useFit((s) => s.workouts);
  const plan = useTodayPlan();
  const [live, setLive] = useState(false);
  const [gleam, trigger] = useGleam();
  const today = localDay();
  const doneToday = workouts.filter((w) => w.day === today);
  const anyProgressed = plan.exercises.some((e) => e.progressed);

  const adjust = () => {
    const prompt = `Here's today's planned session — ${planAsText(plan)}. Any adjustments before I start?`;
    if (!askCoach(prompt)) router.push("/coach");
  };

  return (
    <>
      <Panel title="Today's Labor" action={action}>
        {doneToday.length > 0 ? (
          /* the day's work is already inscribed */
          <div className="flex items-center gap-3 px-[14px] py-[13px] lg:px-[18px] lg:py-[15px]">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-strong bg-done-wash"
              style={{ animation: "laurelPop 0.5s ease" }}
            >
              <Check size={16} className="text-gold" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold lg:text-sm">
                {doneToday[doneToday.length - 1].title} — done
              </p>
              <p className="mt-0.5 text-[11px] text-sec lg:text-xs">
                {workoutVolume(doneToday[doneToday.length - 1]).toLocaleString()}kg moved today · next up: {plan.title}
              </p>
            </div>
            <button onClick={() => setLive(true)} className="btn-ghost shrink-0 px-3.5 py-2 text-[10px]">
              Go again
            </button>
          </div>
        ) : (
          <>
            {/* the session, written out */}
            <div className="flex items-baseline justify-between gap-3 px-[14px] pt-[12px] lg:px-[18px]">
              <p className="text-[14px] font-semibold lg:text-[15px]">{plan.title}</p>
              <p className="shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] text-gold">
                Day {toRoman(plan.dayOfCycle)} of {toRoman(plan.cycleLength)}
              </p>
            </div>
            <p className="px-[14px] pb-2.5 pt-0.5 text-[11px] text-sec lg:px-[18px] lg:text-xs">
              {plan.focus}
            </p>
            <div className="border-t border-line-soft">
              {plan.exercises.map((e, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-baseline gap-2 px-[14px] py-[7px] lg:px-[18px]",
                    i < plan.exercises.length - 1 && "border-b border-line-soft"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-xs lg:text-[13px]">{e.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-sec">
                    {e.sets} × {e.reps}{e.min ? " min" : ""}
                  </span>
                  <span className="w-[74px] shrink-0 text-right font-mono text-[11px]">
                    {e.suggestKg ? (
                      <span className="text-gold">
                        {e.progressed ? "↑ " : ""}{fmtKg(e.suggestKg)}kg
                      </span>
                    ) : (
                      <span className="text-faint">{e.min ? "—" : "your call"}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-line-soft px-[14px] py-[11px] lg:px-[18px]">
              <button
                onClick={() => { trigger(); setLive(true); }}
                style={gleam}
                className="btn-primary flex flex-1 items-center justify-center gap-1.5 py-[10px] text-[11px] lg:text-xs"
              >
                <Flame size={13} /> Go live
              </button>
              <button
                onClick={adjust}
                className="btn-ghost flex items-center justify-center gap-1.5 px-4 py-[10px] text-[11px]"
              >
                <MessageSquare size={12} /> Adjust
              </button>
            </div>
            {anyProgressed && (
              <p className="border-t border-line-soft px-[14px] py-[7px] text-[9px] text-faint lg:px-[18px]">
                ↑ weight already includes your progression — you made every rep last time
              </p>
            )}
          </>
        )}
      </Panel>

      <LiveWorkout
        open={live}
        onClose={() => setLive(false)}
        defaultTitle={plan.title}
        defaultLabor={plan.labor}
        plan={plan.exercises}
      />
    </>
  );
}
