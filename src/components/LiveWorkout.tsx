"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Dumbbell, Minus, Plus, Timer, Trash2, Trophy, X } from "lucide-react";
import { useFit, localDay, type Workout, type WorkoutExercise } from "@/lib/store";
import { pushWorkout } from "@/lib/sync";
import { EXERCISE_CATALOG, workoutVolume } from "@/lib/history";
import { LABORS, inferLabor, type LaborId } from "@/lib/labors";
import {
  recordsByExercise, detectPRs, lastSessionSets, fmtKg,
  PR_LABELS, type PRKind, type ExerciseRecords,
} from "@/lib/records";
import type { PlanExercise } from "@/lib/plan";
import { Ring } from "@/components/charts";
import { cn } from "@/lib/utils";

/**
 * Live Session — "The Arena". Set-by-set logging while training, the loop
 * every top lifting logger is built around: previous-session ghost values
 * pre-fill each set ("beat this"), a rest timer auto-starts on every
 * completed set, and beating an all-time record fires a laurel celebration
 * the moment it happens. Finishing inscribes a normal workout to the log.
 */

interface LiveSet {
  k: string;
  reps: string;
  weight: string;
  done: boolean;
  prs: PRKind[];
}
interface LiveExercise {
  k: string;
  name: string;
  sets: LiveSet[];
}

let keySeq = 0;
const nextKey = () => `lv${keySeq++}`;
const blankSet = (): LiveSet => ({ k: nextKey(), reps: "", weight: "", done: false, prs: [] });
const blankExercise = (): LiveExercise => ({ k: nextKey(), name: "", sets: [blankSet()] });

const ENERGY_LABELS = ["Drained", "Low", "Okay", "Strong", "Unstoppable"];
const DEFAULT_REST_S = 120;

const mmss = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
};

/** Pre-fill live rows from the day's plan — reps and suggested weight are
 *  already typed in, so a plan-following set is a single tap on the check. */
const planToLive = (plan: PlanExercise[]): LiveExercise[] =>
  plan.map((p) => ({
    k: nextKey(),
    name: p.name,
    sets: Array.from({ length: p.sets }, (): LiveSet => ({
      k: nextKey(),
      reps: String(p.reps),
      weight: p.suggestKg ? String(p.suggestKg) : "",
      done: false,
      prs: [],
    })),
  }));

export function LiveWorkout({ open, onClose, defaultTitle = "", defaultLabor, plan }: {
  open: boolean;
  onClose: () => void;
  defaultTitle?: string;
  defaultLabor?: LaborId;
  /** Today's planned session — pre-fills the exercise and set rows. */
  plan?: PlanExercise[];
}) {
  if (!open) return null;
  return <LiveWorkoutInner onClose={onClose} defaultTitle={defaultTitle} defaultLabor={defaultLabor} plan={plan} />;
}

/** Mounted fresh per session so timers and records reset naturally. */
function LiveWorkoutInner({ onClose, defaultTitle, defaultLabor, plan }: {
  onClose: () => void;
  defaultTitle: string;
  defaultLabor?: LaborId;
  plan?: PlanExercise[];
}) {
  const workouts = useFit((s) => s.workouts);
  const [title, setTitle] = useState(defaultTitle);
  const [labor, setLabor] = useState<LaborId | undefined>(defaultLabor ?? inferLabor(defaultTitle));
  const [laborTouched, setLaborTouched] = useState(false);
  const [exercises, setExercises] = useState<LiveExercise[]>(() =>
    plan && plan.length > 0 ? planToLive(plan) : [blankExercise()]
  );
  const [stage, setStage] = useState<"lifting" | "summary">("lifting");
  const [feel, setFeel] = useState("");
  const [energy, setEnergy] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  // All-time records at session start; beaten records are updated live so a
  // later set must beat the NEW mark, not the stale one.
  const recordsRef = useRef<Map<string, ExerciseRecords> | null>(null);
  if (recordsRef.current === null) recordsRef.current = recordsByExercise(workouts);

  /* -------- session clock -------- */
  const startTs = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsedS = Math.floor((now - startTs.current) / 1000);

  /* -------- rest timer (auto-starts on set completion) -------- */
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(DEFAULT_REST_S);
  const restLeft = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;
  useEffect(() => {
    if (restEnd && now >= restEnd) {
      setRestEnd(null);
      if (typeof navigator !== "undefined") navigator.vibrate?.([180, 90, 180]);
    }
  }, [now, restEnd]);
  const startRest = () => {
    setRestTotal(DEFAULT_REST_S);
    setRestEnd(Date.now() + DEFAULT_REST_S * 1000);
  };
  const nudgeRest = (deltaS: number) => {
    setRestEnd((e) => (e ? Math.max(Date.now() + 1000, e + deltaS * 1000) : e));
    setRestTotal((t) => Math.max(15, t + deltaS));
  };

  /* -------- PR toast -------- */
  const [toast, setToast] = useState<{ name: string; prs: PRKind[]; set: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  /* -------- draft helpers -------- */
  const patchExercise = (ei: number, patch: Partial<LiveExercise>) =>
    setExercises((xs) => xs.map((x, i) => (i === ei ? { ...x, ...patch } : x)));
  const patchSet = (ei: number, si: number, patch: Partial<LiveSet>) =>
    setExercises((xs) =>
      xs.map((x, i) =>
        i === ei ? { ...x, sets: x.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : x
      )
    );
  const addSet = (ei: number) =>
    setExercises((xs) =>
      xs.map((x, i) => (i === ei ? { ...x, sets: [...x.sets, blankSet()] } : x))
    );
  const removeSet = (ei: number, si: number) =>
    setExercises((xs) =>
      xs.map((x, i) => (i === ei ? { ...x, sets: x.sets.filter((_, j) => j !== si) } : x))
    );
  const addExercise = () => setExercises((xs) => [...xs, blankExercise()]);
  const removeExercise = (ei: number) =>
    setExercises((xs) => (xs.length > 1 ? xs.filter((_, i) => i !== ei) : xs));

  /** Ghost sets (previous session) per exercise name. */
  const ghosts = useMemo(() => {
    const m = new Map<string, ReturnType<typeof lastSessionSets>>();
    for (const ex of exercises) {
      const key = ex.name.trim().toLowerCase();
      if (key && !m.has(key)) m.set(key, lastSessionSets(workouts, ex.name));
    }
    return m;
  }, [exercises, workouts]);

  /** Complete a set: empty inputs adopt the ghost values ("beat this" tap-through). */
  const completeSet = (ei: number, si: number) => {
    const ex = exercises[ei];
    const s = ex.sets[si];
    if (s.done) {
      patchSet(ei, si, { done: false, prs: [] });
      return;
    }
    const ghost = ghosts.get(ex.name.trim().toLowerCase())?.[si];
    const reps = Math.max(0, Math.round(Number(s.reps) || 0)) || ghost?.reps || 0;
    const weight = Math.max(0, Number(s.weight) || 0) || (s.weight === "" ? ghost?.weight ?? 0 : 0);
    if (reps <= 0) return;

    const records = recordsRef.current!;
    const prs = detectPRs(records, ex.name, { reps, weight });
    if (prs.length > 0) {
      // raise the bar for the rest of the session
      const key = ex.name.trim().toLowerCase();
      const r = records.get(key)!;
      const day = localDay();
      if (prs.includes("weight")) r.weight = { weight, reps, day };
      if (prs.includes("e1rm")) r.e1rm = { value: weight * (1 + reps / 30), weight, reps, day };
      if (prs.includes("volume")) r.volume = { value: reps * weight, weight, reps, day };
      setToast({ name: ex.name.trim(), prs, set: `${weight > 0 ? `${fmtKg(weight)}kg × ` : ""}${reps}` });
      if (typeof navigator !== "undefined") navigator.vibrate?.(120);
    }
    patchSet(ei, si, { reps: String(reps), weight: weight > 0 ? String(weight) : "", done: true, prs });
    startRest();
  };

  /* -------- finish & save -------- */
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

  const doneSets = exercises.reduce((a, x) => a + x.sets.filter((s) => s.done).length, 0);
  const sessionPRs = exercises.flatMap((x) =>
    x.sets.filter((s) => s.prs.length > 0).map((s) => ({
      name: x.name.trim(),
      prs: s.prs,
      set: `${Number(s.weight) > 0 ? `${fmtKg(Number(s.weight))}kg × ` : ""}${s.reps}`,
    }))
  );
  const ready = clean().length > 0;

  const save = () => {
    const cleaned = clean();
    if (cleaned.length === 0 || saving) return;
    setSaving(true);
    const workout: Workout = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      day: localDay(),
      title: title.trim() || "Live Session",
      labor,
      exercises: cleaned,
      feel: feel.trim(),
      energy,
      ts: Date.now(),
    };
    useFit.getState().addWorkout(workout);
    void pushWorkout(workout);
    onClose();
  };

  const quit = () => {
    if (doneSets > 0 && !window.confirm("Leave the arena? This session won't be inscribed.")) return;
    onClose();
  };

  const totalVolume = workoutVolume({
    id: "", day: "", title: "", exercises: clean(), feel: "", ts: 0,
  });

  /* ================= render ================= */

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#f7f4ec,#efe9db)]">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-line bg-panel px-4 py-3 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!laborTouched) setLabor(inferLabor(e.target.value) ?? defaultLabor);
            }}
            placeholder="Live Session"
            maxLength={60}
            className="w-full bg-transparent font-display text-[15px] font-bold tracking-[0.04em] text-ink outline-none placeholder:text-faint"
          />
          <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.24em] text-gold">
            The Arena · live session
          </p>
        </div>
        <span className="font-mono text-[13px] tabular-nums text-sec" aria-label="Session time">
          {mmss(elapsedS)}
        </span>
        <button onClick={quit} className="p-1.5 text-sec hover:text-ink" aria-label="Leave session">
          <X size={18} />
        </button>
      </div>

      {/* PR celebration */}
      {toast && (
        <div
          className="pointer-events-none absolute inset-x-0 top-[76px] z-10 flex justify-center px-4"
          style={{ animation: "laurelPop 0.5s ease" }}
        >
          <div className="flex items-center gap-2.5 border border-line-strong bg-done-wash px-4 py-2.5 shadow-[0_10px_24px_-12px_rgba(70,58,30,0.4)]">
            <Trophy size={16} className="text-gold" />
            <div>
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
                New record
              </p>
              <p className="text-[11px] text-ink">
                {toast.name} — {toast.set} · {toast.prs.map((p) => PR_LABELS[p]).join(" + ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {stage === "lifting" ? (
        <>
          {/* exercises */}
          <div className="flex-1 overflow-y-auto px-3 py-3 pb-[140px]">
            <div className="mx-auto flex max-w-lg flex-col gap-3">
              {/* labor chips */}
              <div className="flex flex-wrap gap-1.5">
                {LABORS.map((l) => {
                  const active = labor === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => { setLaborTouched(true); setLabor(active ? undefined : l.id); }}
                      className={cn(
                        "rounded-[3px] border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                        active ? "border-line-strong bg-done-wash text-gold" : "border-line text-faint active:bg-pressed"
                      )}
                    >
                      {l.label}
                    </button>
                  );
                })}
              </div>

              {exercises.map((ex, ei) => {
                const ghost = ghosts.get(ex.name.trim().toLowerCase()) ?? [];
                return (
                  <div key={ex.k} className="panel">
                    <div className="flex items-center gap-2 border-b border-line-soft px-2.5 py-2">
                      <Dumbbell size={13} className="shrink-0 text-gold" />
                      <input
                        value={ex.name}
                        onChange={(e) => patchExercise(ei, { name: e.target.value })}
                        list="live-exercise-catalog"
                        placeholder="Exercise name"
                        aria-label={`Exercise ${ei + 1} name`}
                        maxLength={60}
                        className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-faint"
                      />
                      {exercises.length > 1 && (
                        <button onClick={() => removeExercise(ei)} className="p-1 text-faint hover:text-clay" aria-label="Remove exercise">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-[24px_1fr_64px_64px_40px_24px] items-center gap-1.5 px-2.5 pt-2 text-[8px] uppercase tracking-[0.14em] text-faint">
                      <span>Set</span>
                      <span>Previous</span>
                      <span className="text-center">Reps</span>
                      <span className="text-center">Kg</span>
                      <span />
                      <span />
                    </div>
                    {ex.sets.map((s, si) => {
                      const g = ghost[si];
                      return (
                        <div
                          key={s.k}
                          className={cn(
                            "grid grid-cols-[24px_1fr_64px_64px_40px_24px] items-center gap-1.5 px-2.5 py-1.5",
                            s.done && "bg-done-wash"
                          )}
                        >
                          <span className="text-center font-mono text-[11px] text-gold">{si + 1}</span>
                          <span className="truncate font-mono text-[10px] text-faint">
                            {g ? `${g.weight > 0 ? `${fmtKg(g.weight)}kg × ` : ""}${g.reps}` : "—"}
                          </span>
                          <input
                            value={s.reps}
                            onChange={(e) => patchSet(ei, si, { reps: e.target.value.replace(/[^0-9]/g, ""), done: false, prs: [] })}
                            inputMode="numeric"
                            placeholder={g ? String(g.reps) : "—"}
                            aria-label={`Set ${si + 1} reps`}
                            className="w-full rounded-[3px] border border-line bg-panel px-1 py-2 text-center text-[13px] text-ink outline-none placeholder:text-faint focus:border-line-strong"
                          />
                          <input
                            value={s.weight}
                            onChange={(e) => patchSet(ei, si, { weight: e.target.value.replace(/[^0-9.]/g, ""), done: false, prs: [] })}
                            inputMode="decimal"
                            placeholder={g && g.weight > 0 ? fmtKg(g.weight) : "BW"}
                            aria-label={`Set ${si + 1} weight in kilograms`}
                            className="w-full rounded-[3px] border border-line bg-panel px-1 py-2 text-center text-[13px] text-ink outline-none placeholder:text-faint focus:border-line-strong"
                          />
                          <button
                            onClick={() => completeSet(ei, si)}
                            aria-label={s.done ? "Un-complete set" : "Complete set"}
                            className={cn(
                              "flex h-8 items-center justify-center rounded-[3px] border transition-colors",
                              s.done
                                ? "border-line-strong bg-gold text-ivory"
                                : "border-line text-faint active:bg-pressed"
                            )}
                          >
                            {s.prs.length > 0 ? <Trophy size={13} /> : <Check size={14} />}
                          </button>
                          {ex.sets.length > 1 ? (
                            <button onClick={() => removeSet(ei, si)} className="flex justify-center text-faint hover:text-clay" aria-label="Remove set">
                              <X size={13} />
                            </button>
                          ) : (
                            <span />
                          )}
                        </div>
                      );
                    })}
                    <button
                      onClick={() => addSet(ei)}
                      className="flex w-full items-center justify-center gap-1 border-t border-line-soft py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold active:bg-pressed"
                    >
                      <Plus size={11} /> Set
                    </button>
                  </div>
                );
              })}

              <button onClick={addExercise} className="btn-ghost flex items-center justify-center gap-1.5 py-2.5 text-[11px]">
                <Plus size={13} /> Add exercise
              </button>
            </div>
          </div>

          {/* bottom dock: rest timer + finish */}
          <div className="absolute inset-x-0 bottom-0 border-t border-line bg-panel px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto flex max-w-lg items-center gap-3">
              {restEnd ? (
                <div className="flex flex-1 items-center gap-2.5">
                  <Ring pct={restTotal > 0 ? restLeft / restTotal : 0} size={44} stroke={4}>
                    <Timer size={14} className="text-gold" />
                  </Ring>
                  <div className="min-w-0">
                    <p className="font-mono text-[17px] font-bold tabular-nums text-ink">{mmss(restLeft)}</p>
                    <p className="text-[8px] uppercase tracking-[0.2em] text-gold">Rest</p>
                  </div>
                  <button onClick={() => nudgeRest(-15)} className="btn-ghost p-1.5" aria-label="Shorten rest 15 seconds">
                    <Minus size={13} />
                  </button>
                  <button onClick={() => nudgeRest(15)} className="btn-ghost p-1.5" aria-label="Extend rest 15 seconds">
                    <Plus size={13} />
                  </button>
                  <button
                    onClick={() => setRestEnd(null)}
                    className="px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-sec active:opacity-60"
                  >
                    Skip
                  </button>
                </div>
              ) : (
                <p className="flex-1 text-[10px] text-sec">
                  {doneSets > 0
                    ? `${doneSets} set${doneSets > 1 ? "s" : ""} done · rest starts when you check a set`
                    : "Check a set when you rack the bar — empty inputs take last session's numbers"}
                </p>
              )}
              <button
                onClick={() => setStage("summary")}
                disabled={!ready}
                className="btn-primary px-5 py-2.5 text-[11px] disabled:opacity-40"
              >
                Finish
              </button>
            </div>
          </div>
        </>
      ) : (
        /* -------- summary stage -------- */
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto flex max-w-lg flex-col gap-4">
            <div className="text-center">
              <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-gold">The labor is done</p>
              <h2 className="mt-1 font-display text-[22px] font-bold tracking-[0.04em]">
                {title.trim() || "Live Session"}
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-px border border-line bg-line">
              <SumCell value={mmss(elapsedS)} label="Duration" />
              <SumCell value={doneSets > 0 ? String(doneSets) : String(clean().reduce((a, x) => a + x.sets.length, 0))} label="Sets" />
              <SumCell value={`${totalVolume.toLocaleString()}kg`} label="Volume" />
            </div>

            {sessionPRs.length > 0 && (
              <div className="panel">
                <div className="border-b border-line-soft px-[14px] py-2.5">
                  <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-gold">
                    Records claimed
                  </p>
                </div>
                {sessionPRs.map((p, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2.5 px-[14px] py-2.5",
                      i < sessionPRs.length - 1 && "border-b border-line-soft"
                    )}
                    style={{ animation: "laurelPop 0.45s ease" }}
                  >
                    <Trophy size={14} className="shrink-0 text-gold" />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">{p.name}</span>
                    <span className="font-mono text-[10px] text-sec">{p.set}</span>
                    <span className="text-[9px] uppercase tracking-[0.1em] text-gold">
                      {p.prs.map((k) => PR_LABELS[k]).join(" + ")}
                    </span>
                  </div>
                ))}
              </div>
            )}

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
                        active ? "border-line-strong bg-done-wash text-ink" : "border-line text-faint active:bg-pressed"
                      )}
                    >
                      <span className="font-display text-[13px] font-bold">{val}</span>
                      <span className="text-[7px] uppercase tracking-[0.1em]">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStage("lifting")} className="btn-ghost flex-1 py-3 text-[11px]">
                Back to the bar
              </button>
              <button
                onClick={save}
                disabled={!ready || saving}
                className="btn-primary flex flex-[2] items-center justify-center gap-1.5 py-3 text-xs disabled:opacity-40"
              >
                <Check size={14} /> {saving ? "Inscribing…" : "Inscribe workout"}
              </button>
            </div>
          </div>
        </div>
      )}

      <datalist id="live-exercise-catalog">
        {EXERCISE_CATALOG.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}

function SumCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-panel px-2 py-3.5 text-center">
      <div className="font-display text-[17px] font-bold text-ink">{value}</div>
      <div className="mt-0.5 text-[8px] uppercase tracking-[0.22em] text-gold">{label}</div>
    </div>
  );
}
