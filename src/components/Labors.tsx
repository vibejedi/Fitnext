"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Dumbbell, MessageSquare } from "lucide-react";
import { Panel, Sheet } from "@/components/ui";
import { TrainingSessions, workoutLabor } from "@/components/history/lists";
import { LogWorkoutDialog } from "@/components/LogWorkout";
import { useFit } from "@/lib/store";
import { askCoach } from "@/lib/coachBus";
import { LABORS, type LaborId } from "@/lib/labors";
import { toRoman } from "@/lib/utils";

/**
 * The Labors — six chiseled tiles, one per training bucket. Tapping a tile
 * opens that Labor's chronicle: begin today's version with the coach, log a
 * session, and review every previous session of that Labor.
 */

export function Labors() {
  const router = useRouter();
  const workouts = useFit((s) => s.workouts);
  const [open, setOpen] = useState<LaborId | null>(null);
  const [logging, setLogging] = useState(false);

  const countFor = (id: LaborId) => workouts.filter((w) => workoutLabor(w) === id).length;
  const labor = LABORS.find((l) => l.id === open);

  const begin = (label: string) => {
    setOpen(null);
    if (!askCoach(`Show me a ${label} workout I can do today.`)) router.push("/coach");
  };

  return (
    <Panel title="The Labors">
      <div className="grid grid-cols-3 gap-px bg-line-soft lg:grid-cols-6">
        {LABORS.map((l, i) => {
          const n = countFor(l.id);
          return (
            <button
              key={l.id}
              onClick={() => setOpen(l.id)}
              className="chisel-press bg-panel px-2 py-4 text-center lg:py-5"
            >
              <span className="block font-display text-[13px] font-semibold lg:text-sm">{l.label}</span>
              <span className="mt-0.5 block text-[8px] tracking-[0.2em] text-gold lg:text-[9px]">
                {toRoman(i + 1)}
              </span>
              <span className="mt-1 block font-mono text-[8px] tracking-[0.12em] text-faint">
                {n > 0 ? `${toRoman(n)} LOGGED` : "—"}
              </span>
            </button>
          );
        })}
      </div>

      {labor && (
        <Sheet onDismiss={() => setOpen(null)} wide>
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line-soft bg-panel px-4 py-3">
            <div>
              <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.18em]">
                {labor.label}
              </h2>
              <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.24em] text-gold">
                Labor {toRoman(LABORS.findIndex((l) => l.id === labor.id) + 1)} · {toRoman(countFor(labor.id))} session{countFor(labor.id) === 1 ? "" : "s"} inscribed
              </p>
            </div>
            <button onClick={() => setOpen(null)} className="p-1.5 text-sec hover:text-ink" aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-3.5 px-4 py-4">
            <div className="flex gap-2.5">
              <button
                onClick={() => begin(labor.label)}
                className="btn-primary flex flex-1 items-center justify-center gap-1.5 py-3 text-[11px]"
              >
                <MessageSquare size={13} /> Begin with Coach
              </button>
              <button
                onClick={() => setLogging(true)}
                className="btn-ghost flex flex-1 items-center justify-center gap-1.5 py-3 text-[11px]"
              >
                <Dumbbell size={13} /> Log session
              </button>
            </div>

            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-gold">
              Previous {labor.label} sessions
            </p>
            <TrainingSessions labor={labor.id} compact />
          </div>
        </Sheet>
      )}

      <LogWorkoutDialog
        open={logging}
        onClose={() => setLogging(false)}
        defaultTitle={labor ? `${labor.label} session` : ""}
        defaultLabor={labor?.id}
      />
    </Panel>
  );
}
