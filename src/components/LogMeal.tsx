"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, Check, RotateCcw, Minus, Plus, ImageUp } from "lucide-react";
import { useFit, localDay, type Meal } from "@/lib/store";
import { pushMeal } from "@/lib/sync";
import { cn } from "@/lib/utils";
import type { MealEstimate } from "@/app/api/meal-estimate/route";

/**
 * Photo-first meal logging. Users MUST shoot the meal — top view and
 * close-up — plus a short description; the oracle then eyeballs calories
 * and macros from the photos. Estimates, never measurements.
 */

interface Shot {
  data: string; // base64 jpeg (downscaled)
  preview: string; // data URL for the thumbnail
}

/** The athlete-adjustable copy of the estimate (macros + name). */
interface Review {
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
}

const clampPortion = (n: number) => Math.min(10, Math.max(0.25, Math.round(n * 100) / 100));
/** Portion label: whole numbers plain, else 2dp trimmed. e.g. 1, 0.5, 1.25 */
const fmtPortion = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)));

async function fileToShot(file: File, max = 1024): Promise<Shot> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("unreadable image"));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL("image/jpeg", 0.82);
    return { data: preview.split(",")[1], preview };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Meal slot from the hour it was logged. */
export const mealSlot = (ts: number) => {
  const h = new Date(ts).getHours();
  if (h < 11) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h < 18) return "Snack";
  return "Dinner";
};

export function LogMealDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [top, setTop] = useState<Shot | null>(null);
  const [close, setClose] = useState<Shot | null>(null);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `estimate` is the oracle's untouched baseline; `review` holds the values
  // the athlete may adjust (macros + portion) before inscribing.
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [portion, setPortion] = useState(1);

  if (!open) return null;

  const reset = () => {
    setTop(null);
    setClose(null);
    setDesc("");
    setError(null);
    setEstimate(null);
    setReview(null);
    setPortion(1);
    setBusy(false);
  };
  const dismiss = () => {
    reset();
    onClose();
  };

  const ready = top && close && desc.trim().length >= 3;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/meal-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc.trim(),
          images: [
            { mediaType: "image/jpeg", data: top!.data },
            { mediaType: "image/jpeg", data: close!.data },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The oracle couldn't read that meal — try again.");
        return;
      }
      const est = data as MealEstimate;
      setEstimate(est);
      setReview({
        name: est.name,
        kcal: est.kcal,
        p: est.protein_g,
        c: est.carbs_g,
        f: est.fat_g,
      });
      setPortion(1);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  /** Scale every macro from the oracle's baseline by a new portion factor. */
  const setPortionTo = (next: number) => {
    if (!estimate) return;
    const p = clampPortion(next);
    setPortion(p);
    setReview({
      name: review?.name ?? estimate.name,
      kcal: Math.round(estimate.kcal * p),
      p: Math.round(estimate.protein_g * p),
      c: Math.round(estimate.carbs_g * p),
      f: Math.round(estimate.fat_g * p),
    });
  };

  const patchReview = (patch: Partial<Review>) =>
    setReview((r) => (r ? { ...r, ...patch } : r));

  /** True once the athlete moved off the oracle's original numbers. */
  const isEdited =
    !!estimate &&
    !!review &&
    (portion !== 1 ||
      review.name !== estimate.name ||
      review.kcal !== estimate.kcal ||
      review.p !== estimate.protein_g ||
      review.c !== estimate.carbs_g ||
      review.f !== estimate.fat_g);

  const retake = () => {
    setEstimate(null);
    setReview(null);
    setPortion(1);
  };

  const inscribe = () => {
    if (!estimate || !review) return;
    const meal: Meal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      day: localDay(),
      name: review.name.trim() || estimate.name,
      desc: desc.trim(),
      kcal: review.kcal,
      p: review.p,
      c: review.c,
      f: review.f,
      edited: isEdited,
      ts: Date.now(),
    };
    useFit.getState().addMeal(meal);
    void pushMeal(meal);
    dismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(33,29,22,0.4)] backdrop-blur-[2px] sm:items-center">
      <div className="panel max-h-[92dvh] w-full max-w-md overflow-y-auto">
        {/* header */}
        <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
          <div>
            <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.18em]">Log a Meal</h2>
            <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.24em] text-gold">
              Photos required · The oracle eyeballs the rest
            </p>
          </div>
          <button onClick={dismiss} className="p-1.5 text-sec hover:text-ink" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {!estimate || !review ? (
          <div className="flex flex-col gap-3.5 px-4 py-4">
            {/* the two required shots */}
            <div className="grid grid-cols-2 gap-2.5">
              <PhotoSlot label="Top view" hint="Shoot straight down" shot={top} onShot={setTop} onError={setError} />
              <PhotoSlot label="Close-up" hint="Get in near the food" shot={close} onShot={setClose} onError={setError} />
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sec">
                What is it? <span className="text-gold">required</span>
              </span>
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="e.g. Chicken souvlaki bowl, cup of rice, tzatziki"
                maxLength={200}
                className="rounded-[4px] border border-line bg-panel-alt px-3 py-3 text-[13px] text-ink outline-none placeholder:text-faint focus:border-line-strong"
              />
            </label>

            <p className="text-[10px] leading-relaxed text-faint">
              The oracle <span className="font-semibold text-sec">eyeballs</span> your calories and
              macros from the photos and description. It&apos;s an estimate — good enough to steer
              the day, not a lab measurement.
            </p>

            {error && <p className="text-[11px] text-clay">{error}</p>}

            <button
              onClick={submit}
              disabled={!ready || busy}
              className="btn-primary w-full py-3 text-xs disabled:opacity-40"
            >
              {busy ? "The oracle is measuring…" : "Estimate this meal"}
            </button>
          </div>
        ) : (
          /* review + adjust the eyeball estimate */
          <div className="flex flex-col gap-3.5 px-4 py-4">
            <div className="flex flex-col items-center gap-1">
              <input
                value={review.name}
                onChange={(e) => patchReview({ name: e.target.value })}
                maxLength={60}
                aria-label="Meal name"
                className="w-full rounded-[4px] border border-transparent bg-transparent px-2 py-1 text-center font-display text-lg font-bold text-ink outline-none hover:border-line focus:border-line-strong focus:bg-panel-alt"
              />
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-gold">
                {isEdited ? "Adjusted by you" : "Eyeball estimate · tap to edit"}
              </p>
            </div>

            {/* portion scaler — rescales all macros from the oracle's baseline */}
            <div className="flex items-center justify-between gap-2 border border-line bg-panel-alt px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sec">
                Portion
              </span>
              <div className="flex items-center gap-2">
                {[0.5, 1, 1.5, 2].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPortionTo(p)}
                    className={cn(
                      "rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold",
                      portion === p
                        ? "border-line-strong bg-done-wash text-ink"
                        : "border-line text-faint active:bg-pressed"
                    )}
                  >
                    ×{fmtPortion(p)}
                  </button>
                ))}
                <div className="flex items-center gap-1">
                  <StepBtn onClick={() => setPortionTo(portion - 0.25)} label="Smaller portion">
                    <Minus size={12} />
                  </StepBtn>
                  <span className="w-10 text-center font-mono text-[12px] text-ink">
                    ×{fmtPortion(portion)}
                  </span>
                  <StepBtn onClick={() => setPortionTo(portion + 0.25)} label="Larger portion">
                    <Plus size={12} />
                  </StepBtn>
                </div>
              </div>
            </div>

            {/* editable macros */}
            <div className="grid grid-cols-4 gap-px border border-line bg-line">
              <MacroInput label="kcal" value={review.kcal} onChange={(v) => patchReview({ kcal: v })} />
              <MacroInput label="Protein" unit="g" value={review.p} onChange={(v) => patchReview({ p: v })} />
              <MacroInput label="Carbs" unit="g" value={review.c} onChange={(v) => patchReview({ c: v })} />
              <MacroInput label="Fats" unit="g" value={review.f} onChange={(v) => patchReview({ f: v })} />
            </div>

            {estimate.note && (
              <p className="text-center text-[11px] text-sec">{estimate.note}</p>
            )}
            <p className="text-center text-[9px] text-faint">
              Numbers are eyeballed from your photos — nudge the portion or tap any figure to match what you actually ate.
            </p>

            <div className="flex gap-2.5">
              <button
                onClick={retake}
                className="btn-ghost flex flex-1 items-center justify-center gap-1.5 py-3 text-[11px]"
              >
                <RotateCcw size={12} /> Retake
              </button>
              <button
                onClick={inscribe}
                className="btn-primary flex flex-1 items-center justify-center gap-1.5 py-3 text-[11px]"
              >
                <Check size={13} /> Inscribe meal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Small round stepper button for the portion control. */
function StepBtn({ onClick, label, children }: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded-full border border-line-strong bg-panel text-gold active:translate-y-px active:bg-pressed"
    >
      {children}
    </button>
  );
}

/** One editable macro cell in the review grid. Holds a string buffer so the
 *  field can be emptied mid-edit, and re-syncs when the value is rescaled by
 *  the portion control (an external change the athlete didn't type). */
function MacroInput({ label, unit, value, onChange }: {
  label: string;
  unit?: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [buf, setBuf] = useState(String(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setBuf(String(value));
    }
  }, [value]);
  return (
    <div className="bg-panel px-1 py-2.5 text-center">
      <input
        value={buf}
        onChange={(e) => {
          const clean = e.target.value.replace(/[^0-9]/g, "");
          const n = clean === "" ? 0 : Math.min(99999, parseInt(clean, 10));
          setBuf(clean === "" ? "" : String(n)); // keep empty, else strip leading zeros
          last.current = n; // our own change shouldn't trigger a resync
          onChange(n);
        }}
        inputMode="numeric"
        aria-label={unit ? `${label} in ${unit}` : label}
        className="w-full bg-transparent text-center font-display text-[15px] font-bold text-ink outline-none focus:text-gold"
      />
      <div className="mt-0.5 text-[8px] uppercase tracking-[0.18em] text-gold">
        {unit ? `${label} (${unit})` : label}
      </div>
    </div>
  );
}

function PhotoSlot({ label, hint, shot, onShot, onError }: {
  label: string;
  hint: string;
  shot: Shot | null;
  onShot: (s: Shot) => void;
  onError: (e: string | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoading(true);
    onError(null);
    try {
      onShot(await fileToShot(file));
    } catch {
      onError("Couldn't read that photo — try taking it again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-[4px] border text-center",
        shot ? "border-line-strong" : "border-dashed border-line-strong"
      )}
    >
      {/* main tap — open the camera */}
      <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1.5 active:translate-y-px">
        {shot ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.preview} alt={label} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-[2px] bg-[rgba(30,17,8,0.7)] px-1.5 py-px text-[8px] uppercase tracking-[0.18em] text-[#f6e7c9]">
              {label} ✓ retake
            </span>
          </>
        ) : (
          <>
            <Camera size={18} className="text-gold" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
              {loading ? "Reading…" : label}
            </span>
            <span className="px-2 text-[9px] text-faint">{hint}</span>
          </>
        )}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      </label>
      {/* corner chip — pick from the phone's photo library instead */}
      <label
        title="Upload from your photos"
        className="absolute right-1 top-1 flex cursor-pointer items-center gap-1 rounded-[3px] border border-line-strong bg-[rgba(251,248,241,0.92)] px-1.5 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-gold active:translate-y-px"
      >
        <ImageUp size={11} />
        <input type="file" accept="image/*" className="hidden" onChange={onFile} />
      </label>
    </div>
  );
}
