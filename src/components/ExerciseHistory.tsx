"use client";

import { useMemo, useState } from "react";
import { Trophy, X, ChevronRight } from "lucide-react";
import { Panel, Sheet, labelDay, daysAgo } from "@/components/ui";
import { TrendLine } from "@/components/charts";
import { useFit, localDay } from "@/lib/store";
import {
  bestLifts, exerciseTrend, recordsByExercise, fmtKg,
  type ExerciseRecords,
} from "@/lib/records";
import { cn } from "@/lib/utils";

/**
 * The Trophy Wall — strongest lifts ranked by estimated 1RM, each opening a
 * per-exercise sheet: the progression line (the one that should go up),
 * all-time records, and every past session of that lift. The Strong/Hevy
 * "exercise history one tap away" pattern, in marble.
 */

export function RecordsPanel({ className }: { className?: string }) {
  const workouts = useFit((s) => s.workouts);
  const [selected, setSelected] = useState<string | null>(null);
  const lifts = useMemo(() => bestLifts(workouts, 6), [workouts]);

  if (lifts.length === 0) return null;

  return (
    <>
      <Panel title="Records" className={className}>
        <div className="flex flex-col">
          {lifts.map((r, i) => (
            <button
              key={r.name}
              onClick={() => setSelected(r.name)}
              className={cn(
                "flex items-center gap-2.5 px-[14px] py-2.5 text-left active:bg-pressed lg:px-[18px]",
                i < lifts.length - 1 && "border-b border-line-soft"
              )}
            >
              <Trophy size={13} className="shrink-0 text-gold" />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold lg:text-[13px]">
                {r.name}
              </span>
              <span className="font-mono text-[10px] text-sec">
                {r.weight
                  ? `${fmtKg(r.weight.weight)}kg × ${r.weight.reps}`
                  : r.volume
                    ? `${r.volume.reps} reps`
                    : "—"}
              </span>
              {r.e1rm && (
                <span className="w-20 shrink-0 text-right font-mono text-[10px] text-gold">
                  ~{fmtKg(r.e1rm.value)}kg 1RM
                </span>
              )}
              <ChevronRight size={13} className="shrink-0 text-faint" />
            </button>
          ))}
        </div>
      </Panel>
      {selected && (
        <ExerciseHistorySheet name={selected} onDismiss={() => setSelected(null)} />
      )}
    </>
  );
}

/** Bottom sheet: one exercise's records, progression chart, and sessions. */
export function ExerciseHistorySheet({ name, onDismiss }: {
  name: string;
  onDismiss: () => void;
}) {
  const workouts = useFit((s) => s.workouts);
  const today = localDay();
  const yesterday = daysAgo(1);

  const { records, points, sessions } = useMemo(() => {
    const rec = recordsByExercise(workouts).get(name.trim().toLowerCase()) ?? null;
    const pts = exerciseTrend(workouts, name);
    const best = Math.max(...pts.map((p) => p.e1rm), 0);
    return {
      records: rec,
      points: pts.map((p) => ({
        y: p.e1rm || p.weight || p.reps,
        pr: p.e1rm > 0 && p.e1rm === best,
      })),
      sessions: [...pts].reverse(),
    };
  }, [workouts, name]);

  return (
    <Sheet onDismiss={onDismiss}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line-soft bg-panel px-4 py-3">
        <div>
          <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.14em]">{name}</h2>
          <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.24em] text-gold">
            {sessions.length} session{sessions.length === 1 ? "" : "s"} inscribed
          </p>
        </div>
        <button onClick={onDismiss} className="p-1.5 text-sec hover:text-ink" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {/* progression — best set per session */}
        {points.length >= 2 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sec">
              Progression · est. 1RM
            </p>
            <TrendLine points={points} height={80} />
          </div>
        )}

        {/* all-time records */}
        {records && (
          <div className="grid grid-cols-3 gap-px border border-line bg-line">
            <RecordCell
              label="Heaviest"
              value={records.weight ? `${fmtKg(records.weight.weight)}kg` : "—"}
              sub={records.weight ? `× ${records.weight.reps}` : ""}
            />
            <RecordCell
              label="Est. 1RM"
              value={records.e1rm ? `${fmtKg(records.e1rm.value)}kg` : "—"}
              sub={records.e1rm ? `${fmtKg(records.e1rm.weight)} × ${records.e1rm.reps}` : ""}
            />
            <RecordCell
              label="Biggest set"
              value={records.volume ? `${fmtKg(records.volume.value)}kg` : "—"}
              sub={records.volume ? `${fmtKg(records.volume.weight)} × ${records.volume.reps}` : ""}
            />
          </div>
        )}

        {/* session log */}
        <div className="flex flex-col">
          {sessions.map((p, i) => (
            <div
              key={`${p.day}-${i}`}
              className={cn(
                "flex items-baseline justify-between py-2",
                i < sessions.length - 1 && "border-b border-line-soft"
              )}
            >
              <span className="text-[11px] text-sec">{labelDay(p.day, today, yesterday)}</span>
              <span className="font-mono text-[11px] text-ink">
                {p.weight > 0 ? `${fmtKg(p.weight)}kg × ${p.reps}` : `${p.reps} reps`}
                {p.e1rm > 0 && <span className="text-faint"> · ~{fmtKg(p.e1rm)}kg</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function RecordCell({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-panel px-2 py-3 text-center">
      <div className="font-display text-[15px] font-bold text-ink">{value}</div>
      <div className="mt-0.5 font-mono text-[9px] text-sec">{sub}</div>
      <div className="mt-1 text-[8px] uppercase tracking-[0.18em] text-gold">{label}</div>
    </div>
  );
}
