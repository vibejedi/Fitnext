"use client";

import { useState } from "react";
import { X, Plus, Trash2, Dumbbell, Check } from "lucide-react";
import { useFit, localDay, type Workout, type WorkoutExercise } from "@/lib/store";
import { pushWorkout } from "@/lib/sync";
import { EXERCISE_CATALOG } from "@/lib/history";
import { cn } from "@/lib/utils";

/**
 * Structured workout logging — the lift log (lift → sets → reps → weight)
 * plus how the session felt and an energy read. Saved to `workout_logs` and
 * fed to the coach so it can progress the athlete off real numbers.
 */

interface DraftSet {
  k: string; // stable React key (index keys mis-focus on mid-list delete)
  reps: string;
  weight: string;
}
interface DraftExercise {
  k: string;
  name: string;
  sets: DraftSet[];
}

let keySeq = 0;
const nextKey = () => `k${keySeq++}`;
const blankSet = (): DraftSet => ({ k: nextKey(), reps: "", weight: "" });
const blankExercise = (): DraftExercise => ({ k: nextKey(), name: "", sets: [blankSet()] });

const ENERGY_LABELS = ["Drained", "Low", "Okay", "Strong", "Unstoppable"];

export function LogWorkoutDialog({
  open,
  onClose,
  defaultTitle = "",
}: {
  open: boolean;
  onClose: () => void;
  defaultTitle?: string;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [exercises, setExercises] = useState<DraftExercise[]>([blankExercise()]);
  const [feel, setFeel] = useState("");
  const [energy, setEnergy] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const reset = () => {
    setTitle(defaultTitle);
    setExercises([blankExercise()]);
    setFeel("");
    setEnergy(undefined);
    setSaving(false);
  };
  const dismiss = () => {
    reset();
    onClose();
  };

  /* immutable helpers keyed by index */
  const patchExercise = (ei: number, patch: Partial<DraftExercise>) =>
    setExercises((xs) => xs.map((x, i) => (i === ei ? { ...x, ...patch } : x)));
  const patchSet = (ei: number, si: number, patch: Partial<DraftSet>) =>
    setExercises((xs) =>
      xs.map((x, i) =>
        i === ei
          ? { ...x, sets: x.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) }
          : x
      )
    );
  const addSet = (ei: number) =>
    setExercises((xs) =>
      xs.map((x, i) =>
        i === ei
          ? { ...x, sets: [...x.sets, { ...(x.sets[x.sets.length - 1] ?? blankSet()), k: nextKey() }] }
          : x
      )
    );
  const removeSet = (ei: number, si: number) =>
    setExercises((xs) =>
      xs.map((x, i) =>
        i === ei ? { ...x, sets: x.sets.filter((_, j) => j !== si) } : x
      )
    );
  const addExercise = () => setExercises((xs) => [...xs, blankExercise()]);
  const removeExercise = (ei: number) =>
    setExercises((xs) => (xs.length > 1 ? xs.filter((_, i) => i !== ei) : xs));

  /** Only exercises with a name and at least one set with reps > 0 count. */
  const clean = (): WorkoutExercise[] =>
    exercises
      .map((x) => ({
        name: x.name.trim(),
        sets: x.sets
          .map((s) => ({
            reps: Math.max(0, Math.round(Number(s.reps) || 0)),
            weight: Math.max(0, Number(s.weight) || 0),
          }))
          .filter((s) => s.reps > 0),
      }))
      .filter((x) => x.name.length > 0 && x.sets.length > 0);

  const ready = clean().length > 0;

  const save = () => {
    const cleaned = clean();
    if (cleaned.length === 0 || saving) return;
    setSaving(true);
    const workout: Workout = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      day: localDay(),
      title: title.trim() || "Training Session",
      exercises: cleaned,
      feel: feel.trim(),
      energy,
      ts: Date.now(),
    };
    useFit.getState().addWorkout(workout);
    void pushWorkout(workout);
    dismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(33,29,22,0.4)] backdrop-blur-[2px] sm:items-center">
      <div className="panel max-h-[92dvh] w-full max-w-lg overflow-y-auto">
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line-soft bg-panel px-4 py-3">
          <div>
            <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.18em]">
              Log a Workout
            </h2>
            <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.24em] text-gold">
              Lift · Reps · Weight — inscribed to your lift log
            </p>
          </div>
          <button onClick={dismiss} className="p-1.5 text-sec hover:text-ink" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3.5 px-4 py-4">
          {/* session title */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sec">
              Session
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Push Day, Lower A, Long Run"
              maxLength={60}
              className="rounded-[4px] border border-line bg-panel-alt px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-faint focus:border-line-strong"
            />
          </label>

          {/* exercises */}
          <div className="flex flex-col gap-3">
            {exercises.map((ex, ei) => (
              <div key={ex.k} className="border border-line bg-panel-alt">
                <div className="flex items-center gap-2 border-b border-line-soft px-2.5 py-2">
                  <Dumbbell size={13} className="shrink-0 text-gold" />
                  <input
                    value={ex.name}
                    onChange={(e) => patchExercise(ei, { name: e.target.value })}
                    list="exercise-catalog"
                    placeholder="Exercise name"
                    aria-label={`Exercise ${ei + 1} name`}
                    maxLength={60}
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-faint"
                  />
                  {exercises.length > 1 && (
                    <button
                      onClick={() => removeExercise(ei)}
                      className="p-1 text-faint hover:text-clay"
                      aria-label="Remove exercise"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* sets */}
                <div className="flex flex-col">
                  <div className="grid grid-cols-[28px_1fr_1fr_28px] items-center gap-2 px-2.5 pt-2 text-[8px] uppercase tracking-[0.16em] text-faint">
                    <span>Set</span>
                    <span>Reps</span>
                    <span>Weight (kg)</span>
                    <span />
                  </div>
                  {ex.sets.map((s, si) => (
                    <div
                      key={s.k}
                      className="grid grid-cols-[28px_1fr_1fr_28px] items-center gap-2 px-2.5 py-1.5"
                    >
                      <span className="text-center font-mono text-[11px] text-gold">{si + 1}</span>
                      <input
                        value={s.reps}
                        onChange={(e) => patchSet(ei, si, { reps: e.target.value.replace(/[^0-9]/g, "") })}
                        inputMode="numeric"
                        placeholder="—"
                        aria-label={`Set ${si + 1} reps`}
                        className="w-full rounded-[3px] border border-line bg-panel px-2 py-2 text-center text-[13px] text-ink outline-none placeholder:text-faint focus:border-line-strong"
                      />
                      <input
                        value={s.weight}
                        onChange={(e) => patchSet(ei, si, { weight: e.target.value.replace(/[^0-9.]/g, "") })}
                        inputMode="decimal"
                        placeholder="BW"
                        aria-label={`Set ${si + 1} weight in kilograms`}
                        className="w-full rounded-[3px] border border-line bg-panel px-2 py-2 text-center text-[13px] text-ink outline-none placeholder:text-faint focus:border-line-strong"
                      />
                      {ex.sets.length > 1 ? (
                        <button
                          onClick={() => removeSet(ei, si)}
                          className="flex justify-center text-faint hover:text-clay"
                          aria-label="Remove set"
                        >
                          <X size={13} />
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addSet(ei)}
                    className="flex items-center justify-center gap-1 border-t border-line-soft py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold active:bg-pressed"
                  >
                    <Plus size={11} /> Set
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addExercise}
            className="btn-ghost flex items-center justify-center gap-1.5 py-2.5 text-[11px]"
          >
            <Plus size={13} /> Add exercise
          </button>

          {/* how it felt */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sec">
              How did it feel?
            </span>
            <textarea
              value={feel}
              onChange={(e) => setFeel(e.target.value)}
              rows={2}
              maxLength={400}
              placeholder="Bar speed, aches, PRs, energy — your coach reads this."
              className="resize-none rounded-[4px] border border-line bg-panel-alt px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-faint focus:border-line-strong"
            />
          </label>

          {/* energy */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sec">
              Session energy
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {ENERGY_LABELS.map((label, i) => {
                const val = i + 1;
                const active = energy === val;
                return (
                  <button
                    key={val}
                    onClick={() => setEnergy(active ? undefined : val)}
                    title={label}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-[3px] border px-1 py-1.5 transition-colors",
                      active
                        ? "border-line-strong bg-done-wash text-ink"
                        : "border-line text-faint active:bg-pressed"
                    )}
                  >
                    <span className="font-display text-[13px] font-bold">{val}</span>
                    <span className="text-[7px] uppercase tracking-[0.1em]">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={save}
            disabled={!ready || saving}
            className="btn-primary flex w-full items-center justify-center gap-1.5 py-3 text-xs disabled:opacity-40"
          >
            <Check size={14} /> {saving ? "Inscribing…" : "Inscribe workout"}
          </button>
        </div>

        <datalist id="exercise-catalog">
          {EXERCISE_CATALOG.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
