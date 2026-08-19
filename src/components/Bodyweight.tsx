"use client";

import { useMemo, useState } from "react";
import { Check, Scale } from "lucide-react";
import { Panel } from "@/components/ui";
import { TrendLine } from "@/components/charts";
import { useFit, localDay } from "@/lib/store";
import { pushProfile } from "@/lib/sync";
import { fmtKg } from "@/lib/records";

/**
 * The Scales — body-weight log with a trend line. One tap to log today,
 * the line shows the last 90 days, and the 30-day delta says whether the
 * plan is working. Also keeps profile.weightKg current for the coach.
 */

export function BodyweightPanel() {
  const weighIns = useFit((s) => s.weighIns);
  const profileKg = useFit((s) => s.profile.weightKg);
  const addWeighIn = useFit((s) => s.addWeighIn);
  const [draft, setDraft] = useState("");
  const [justLogged, setJustLogged] = useState(false);
  const today = localDay();

  const { points, latest, delta30 } = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const since = cutoff.toLocaleDateString("en-CA");
    const recent = weighIns.filter((w) => w.day >= since);
    const latest = weighIns[weighIns.length - 1] ?? null;
    const cutoff30 = new Date();
    cutoff30.setDate(cutoff30.getDate() - 30);
    const since30 = cutoff30.toLocaleDateString("en-CA");
    const base30 = weighIns.find((w) => w.day >= since30) ?? null;
    return {
      points: recent.map((w) => ({ y: w.kg })),
      latest,
      delta30: latest && base30 && base30.day !== latest.day ? latest.kg - base30.kg : null,
    };
  }, [weighIns]);

  const loggedToday = latest?.day === today;
  const current = latest?.kg ?? profileKg;

  const log = () => {
    const kg = Number(draft);
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) return;
    addWeighIn(Math.round(kg * 10) / 10);
    void pushProfile(useFit.getState());
    setDraft("");
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 2000);
  };

  return (
    <Panel
      title="The Scales"
      action={
        current !== undefined ? (
          <span className="font-mono text-[10px] text-sec">
            {fmtKg(current)} kg
            {delta30 !== null && (
              <span className={delta30 > 0 ? "text-clay" : "text-gold"}>
                {" "}· {delta30 > 0 ? "+" : ""}{fmtKg(delta30)} / 30d
              </span>
            )}
          </span>
        ) : undefined
      }
    >
      <div className="px-[14px] py-3.5 lg:px-[18px]">
        {points.length >= 2 ? (
          <TrendLine points={points} height={64} />
        ) : (
          <p className="py-2 text-center text-[10px] text-faint">
            Log your weight a few mornings and the trend line appears here — the line matters, not the day
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <Scale size={14} className="shrink-0 text-gold" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9.]/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter") log(); }}
            inputMode="decimal"
            placeholder={loggedToday ? `Today: ${fmtKg(latest!.kg)} kg — re-log to correct` : "Today's weight (kg)"}
            aria-label="Today's body weight in kilograms"
            className="min-w-0 flex-1 rounded-[3px] border border-line bg-panel-alt px-3 py-2 text-[13px] text-ink outline-none placeholder:text-faint focus:border-line-strong"
          />
          <button
            onClick={log}
            disabled={!draft}
            className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[11px] disabled:opacity-40"
          >
            {justLogged ? <Check size={13} /> : null}
            {justLogged ? "Logged" : "Log"}
          </button>
        </div>
        <p className="mt-2 text-[9px] text-faint">
          Weigh in mornings, after the bathroom, before food — same conditions, honest line
        </p>
      </div>
    </Panel>
  );
}
