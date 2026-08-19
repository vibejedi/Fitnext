"use client";

import { useMemo, useState } from "react";
import { Dumbbell } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Labors } from "@/components/Labors";
import { MovementGuides } from "@/components/MovementGuides";
import { LogWorkoutDialog } from "@/components/LogWorkout";
import { RecordsPanel } from "@/components/ExerciseHistory";
import { TodayLaborPanel } from "@/components/TodayPlan";
import { TrendBars } from "@/components/charts";
import { TrainingSessions } from "@/components/history/lists";
import { Panel } from "@/components/ui";
import { GoldDivider } from "@/components/Brand";
import { useFit } from "@/lib/store";
import { weeklyVolume } from "@/lib/records";
import { useFitHydrated, useRequireOnboarding } from "@/lib/useHydrate";
import { coachById } from "@/lib/coaches";

/**
 * Train — today's labor, the six Labors (each with its own record of
 * previous sessions), movement guides, and the full training chronicle.
 */

export default function TrainScreen() {
  const fit = useFit();
  const mounted = useFitHydrated();
  const onboarded = useRequireOnboarding(mounted);
  const [logging, setLogging] = useState(false);
  const weeks = useMemo(() => weeklyVolume(fit.workouts, 8), [fit.workouts]);
  const anyVolume = weeks.some((w) => w.volume > 0);

  if (!mounted || !onboarded) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-faint">
        <span className="animate-pulse-glow font-display tracking-[0.18em]">Chalking up…</span>
      </div>
    );
  }

  const coach = coachById(fit.coach);

  return (
    <AppShell maxWidth="max-w-[900px]">
      <div className="flex flex-col gap-4 lg:gap-[18px]">
        <div className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-gold">The Gymnasium</p>
          <h1 className="mt-1.5 font-display text-[26px] font-bold tracking-[0.04em] lg:text-3xl">Train</h1>
          <GoldDivider className="mt-3" />
        </div>

        {/* today's labor — the actual plan, written out */}
        <TodayLaborPanel
          action={
            <button
              onClick={() => setLogging(true)}
              className="inline-flex items-center gap-1 px-1.5 py-1 font-mono text-[9px] tracking-[0.1em] text-gold active:translate-y-px active:opacity-60 lg:text-[10px]"
            >
              <Dumbbell size={11} /> LOG SESSION
            </button>
          }
        />

        <Labors />

        {/* weekly tonnage — the trend that keeps you honest */}
        {anyVolume && (
          <Panel title="Weekly Volume">
            <div className="px-[14px] py-3.5 lg:px-[18px]">
              <TrendBars
                data={weeks.map((w) => ({
                  label: w.label,
                  value: w.volume,
                  sub: w.sessions > 0 ? `${w.sessions}×` : "",
                }))}
                format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}`)}
              />
              <p className="mt-2 text-[9px] text-faint">
                Total tonnage (reps × weight) per week · sessions marked beneath
              </p>
            </div>
          </Panel>
        )}

        <RecordsPanel />

        <MovementGuides />

        {/* the chronicle — every logged session */}
        <div>
          <p className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.28em] text-gold">
            Previous sessions
          </p>
          <TrainingSessions onLog={() => setLogging(true)} />
        </div>
      </div>

      <LogWorkoutDialog
        open={logging}
        onClose={() => setLogging(false)}
        defaultTitle={coach?.route ? `${coach.route} session` : ""}
      />
    </AppShell>
  );
}
