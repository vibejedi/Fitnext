"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { Panel } from "@/components/ui";
import { LogMealDialog, mealSlot } from "@/components/LogMeal";
import { useFit, localDay } from "@/lib/store";
import { NUTRITION_TARGETS } from "@/lib/rites";
import { cn } from "@/lib/utils";

/** Today's nutrition — photo-logged meals + macro bars vs the coach's targets. */

const TARGETS = NUTRITION_TARGETS;

export function NutritionPanel() {
  const fit = useFit();
  const [logging, setLogging] = useState(false);
  const today = localDay();
  const meals = fit.meals.filter((m) => m.day === today);
  const num = (v: number) => (Number.isFinite(v) ? v : 0);
  const sum = meals.reduce(
    (a, m) => ({ kcal: a.kcal + num(m.kcal), p: a.p + num(m.p), c: a.c + num(m.c), f: a.f + num(m.f) }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );
  return (
    <Panel
      title="Nutrition"
      action={
        <button
          onClick={() => setLogging(true)}
          className="px-1.5 py-1 font-mono text-[9px] tracking-[0.1em] text-gold active:translate-y-px active:opacity-60 lg:text-[10px]"
        >
          + LOG A MEAL
        </button>
      }
    >
      <div className="lg:grid lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col lg:border-r lg:border-line-soft">
          {meals.length === 0 ? (
            <button
              onClick={() => setLogging(true)}
              className="flex flex-col items-center justify-center gap-1.5 px-[14px] py-7 text-center active:bg-pressed lg:h-full"
            >
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-line-strong bg-panel-alt">
                <Camera size={13} className="text-gold" />
              </span>
              <span className="font-display text-xs font-bold uppercase tracking-[0.14em]">
                Nothing inscribed today
              </span>
              <span className="text-[10px] text-sec lg:text-[11px]">
                Shoot your meal — top view + close-up — and the oracle eyeballs the macros
              </span>
            </button>
          ) : (
            meals.map((m, i) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-baseline gap-2 px-[14px] py-2.5 lg:px-[18px]",
                  i < meals.length - 1 && "border-b border-line-soft"
                )}
              >
                <span className="min-w-0 flex-1 truncate text-xs font-semibold lg:text-[13px]">
                  {m.name}{" "}
                  <span className="text-[9px] font-normal tracking-[0.08em] text-faint">
                    · {mealSlot(m.ts).toUpperCase()}
                  </span>
                </span>
                <span className="font-mono text-[10px] text-sec">{m.p}P · {m.c}C · {m.f}F</span>
                <span className="w-16 shrink-0 text-right font-mono text-[10px] text-ink lg:text-[11px]">
                  {m.kcal.toLocaleString()} kcal
                </span>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-col gap-[9px] bg-panel-alt px-[14px] py-3 lg:gap-2.5 lg:px-[18px] lg:py-[14px]">
          <MacroBar label="Calories" cur={sum.kcal} max={TARGETS.kcal}
            text={`${sum.kcal.toLocaleString()} / ${TARGETS.kcal.toLocaleString()}`} unit="" />
          <MacroBar label="Protein" cur={sum.p} max={TARGETS.p} text={`${sum.p}g / ${TARGETS.p}g`} unit="g" />
          <MacroBar label="Carbs" cur={sum.c} max={TARGETS.c} text={`${sum.c}g / ${TARGETS.c}g`} unit="g" />
          <MacroBar label="Fats" cur={sum.f} max={TARGETS.f} text={`${sum.f}g / ${TARGETS.f}g`} unit="g" />
          <p className="mt-0.5 text-[9px] text-faint">
            Targets set by your Nutrition Coach · macros &amp; calories are eyeball estimates from your meal photos
          </p>
        </div>
      </div>
      <LogMealDialog open={logging} onClose={() => setLogging(false)} />
    </Panel>
  );
}

function MacroBar({ label, cur: rawCur, max, text, unit }: {
  label: string; cur: number; max: number; text: string; unit: string;
}) {
  // guard against malformed synced rows (missing macros → NaN)
  const cur = Number.isFinite(rawCur) ? rawCur : 0;
  const over = cur > max;
  const delta = Math.abs(max - cur);
  const note = label === "Calories"
    ? `· ${delta.toLocaleString()} ${over ? "OVER" : "UNDER"}`
    : `· ${delta}${unit ? "" : ""} ${over ? "OVER" : "TO GO"}`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sec">{label}</span>
        <span className="font-mono text-[10px] text-ink">
          {text} <span className={over ? "text-clay" : "text-gold"}>{note}</span>
        </span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-[2px] bg-line-soft">
        <div
          className={cn("h-full", over ? "bg-clay" : "bg-gold")}
          style={{ width: `${Math.min(100, (cur / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}
