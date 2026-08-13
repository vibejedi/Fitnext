"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GoldDivider } from "@/components/Brand";
import { LogWorkoutDialog } from "@/components/LogWorkout";
import { NutritionDays, TrainingSessions, RiteDaysList } from "@/components/history/lists";
import { useFitHydrated, useRequireOnboarding } from "@/lib/useHydrate";
import { cn } from "@/lib/utils";

/** Records — the full chronicle: nutrition, training, and rites, in tabs.
 *  Deep-linkable: /history?tab=training opens straight onto the lift log. */

type Tab = "nutrition" | "training" | "rites";

export default function HistoryPage() {
  const mounted = useFitHydrated();
  const onboarded = useRequireOnboarding(mounted);
  const [tab, setTab] = useState<Tab>("nutrition");
  const [logging, setLogging] = useState(false);

  // honor ?tab= deep links (read post-mount; keeps the page static-friendly)
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "training" || t === "rites" || t === "nutrition") setTab(t);
  }, []);

  if (!mounted || !onboarded) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-faint">
        <span className="animate-pulse-glow font-display tracking-[0.18em]">Unrolling the scroll…</span>
      </div>
    );
  }

  return (
    <AppShell maxWidth="max-w-[900px]">
      {/* title */}
      <div className="text-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-gold">The Chronicle</p>
        <h1 className="mt-1.5 font-display text-[26px] font-bold tracking-[0.04em] lg:text-3xl">
          Your Records
        </h1>
        <p className="mx-auto mt-1.5 max-w-md text-[11px] text-sec lg:text-xs">
          Every logged meal, session, and rite — the record your coach reads to move you forward.
        </p>
        <GoldDivider className="mt-3" />
      </div>

      {/* tabs */}
      <div className="mt-5 flex justify-center gap-7 border-b border-line">
        <TabButton active={tab === "nutrition"} onClick={() => setTab("nutrition")} label="Nutrition" />
        <TabButton active={tab === "training"} onClick={() => setTab("training")} label="Training" />
        <TabButton active={tab === "rites"} onClick={() => setTab("rites")} label="Rites" />
      </div>

      <div className="mt-5">
        {tab === "nutrition" && <NutritionDays />}
        {tab === "training" && <TrainingSessions onLog={() => setLogging(true)} />}
        {tab === "rites" && <RiteDaysList />}
      </div>

      <LogWorkoutDialog open={logging} onClose={() => setLogging(false)} />
    </AppShell>
  );
}

function TabButton({ active, onClick, label }: {
  active: boolean; onClick: () => void; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "-mb-px pb-2.5 pt-1 text-[11px] uppercase tracking-[0.2em] transition-colors",
        active
          ? "border-b-2 border-gold font-semibold text-ink"
          : "border-b-2 border-transparent text-faint hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}
