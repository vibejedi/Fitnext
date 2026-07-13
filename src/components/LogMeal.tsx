"use client";

import { useState } from "react";
import { Camera, X, Check, RotateCcw } from "lucide-react";
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
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);

  if (!open) return null;

  const reset = () => {
    setTop(null);
    setClose(null);
    setDesc("");
    setError(null);
    setEstimate(null);
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
      setEstimate(data as MealEstimate);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const inscribe = () => {
    if (!estimate) return;
    const meal: Meal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      day: localDay(),
      name: estimate.name,
      desc: desc.trim(),
      kcal: estimate.kcal,
      p: estimate.protein_g,
      c: estimate.carbs_g,
      f: estimate.fat_g,
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

        {!estimate ? (
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
          /* review the eyeball estimate */
          <div className="flex flex-col gap-3.5 px-4 py-4">
            <div className="text-center">
              <p className="font-display text-lg font-bold">{estimate.name}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-gold">
                Eyeball estimate
              </p>
            </div>
            <div className="grid grid-cols-4 gap-px border border-line bg-line">
              {[
                [`${estimate.kcal.toLocaleString()}`, "kcal"],
                [`${estimate.protein_g}g`, "Protein"],
                [`${estimate.carbs_g}g`, "Carbs"],
                [`${estimate.fat_g}g`, "Fats"],
              ].map(([v, l]) => (
                <div key={l} className="bg-panel px-1 py-3 text-center">
                  <div className="font-display text-[15px] font-bold">{v}</div>
                  <div className="mt-0.5 text-[8px] uppercase tracking-[0.18em] text-gold">{l}</div>
                </div>
              ))}
            </div>
            {estimate.note && (
              <p className="text-center text-[11px] text-sec">{estimate.note}</p>
            )}
            <div className="flex gap-2.5">
              <button
                onClick={() => setEstimate(null)}
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
    <label
      className={cn(
        "relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[4px] border text-center active:translate-y-px",
        shot ? "border-line-strong" : "border-dashed border-line-strong"
      )}
    >
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
  );
}
