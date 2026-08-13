"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Labors } from "@/components/Labors";
import { MovementGuides } from "@/components/MovementGuides";
import { LogWorkoutDialog } from "@/components/LogWorkout";
import { TrainingSessions } from "@/components/history/lists";
import { Panel, useGleam } from "@/components/ui";
import { GoldDivider } from "@/components/Brand";
import { useFit } from "@/lib/store";
import { askCoach } from "@/lib/coachBus";
import { useFitHydrated, useRequireOnboarding } from "@/lib/useHydrate";
import { coachById } from "@/lib/coaches";

/**
 * Train — today's labor, the six Labors (each with its own record of
 * previous sessions), movement guides, and the full training chronicle.
 */

export default function TrainScreen() {
  const router = useRouter();
  const fit = useFit();
  const mounted = useFitHydrated();
  const onboarded = useRequireOnboarding(mounted);
  const [logging, setLogging] = useState(false);

  if (!mounted || !onboarded) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-faint">
        <span className="animate-pulse-glow font-display tracking-[0.18em]">Chalking up…</span>
      </div>
    );
  }

  const coach = coachById(fit.coach);

  const begin = () => {
    if (!askCoach("What's my workout for today? Give me the exact sets and reps.")) {
      router.push("/coach");
    }
  };

  return (
    <AppShell maxWidth="max-w-[900px]">
      <div className="flex flex-col gap-4 lg:gap-[18px]">
        <div className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-gold">The Gymnasium</p>
          <h1 className="mt-1.5 font-display text-[26px] font-bold tracking-[0.04em] lg:text-3xl">Train</h1>
          <GoldDivider className="mt-3" />
        </div>

        {/* today's labor */}
        <Panel
          title="Today's Labor"
          action={
            <button
              onClick={() => setLogging(true)}
              className="inline-flex items-center gap-1 px-1.5 py-1 font-mono text-[9px] tracking-[0.1em] text-gold active:translate-y-px active:opacity-60 lg:text-[10px]"
            >
              <Dumbbell size={11} /> LOG SESSION
            </button>
          }
        >
          <div className="flex items-center justify-between gap-3 px-[14px] py-[13px] lg:px-[18px] lg:py-[15px]">
            <div>
              <p className="text-[13px] font-semibold lg:text-sm">{coach?.route} session</p>
              <p className="mt-0.5 text-[11px] text-sec lg:text-xs">Your coach has inscribed the plan.</p>
            </div>
            <BeginButton onClick={begin} />
          </div>
        </Panel>

        <Labors />

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

function BeginButton({ onClick }: { onClick: () => void }) {
  const [anim, trigger] = useGleam();
  return (
    <button
      onClick={() => { trigger(); onClick(); }}
      style={anim}
      className="btn-primary px-[18px] py-[9px] text-[11px] lg:px-6 lg:py-[11px] lg:text-xs"
    >
      Begin
    </button>
  );
}
