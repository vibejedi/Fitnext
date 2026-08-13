"use client";

import Link from "next/link";
import { ScrollText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProgressPhotos } from "@/components/ProgressPhotos";
import { HallOfHonor } from "@/components/HallOfHonor";
import { RiteDaysList } from "@/components/history/lists";
import { SummaryStrip } from "@/components/ui";
import { GoldDivider } from "@/components/Brand";
import { useFit } from "@/lib/store";
import { useFitHydrated, useRequireOnboarding } from "@/lib/useHydrate";
import { toRoman } from "@/lib/utils";

/**
 * Progress — the athlete's monument: streak & laurels, private progress
 * photos, the rite chronicle, and the Hall of Honor.
 */

export default function ProgressScreen() {
  const fit = useFit();
  const mounted = useFitHydrated();
  const onboarded = useRequireOnboarding(mounted);

  if (!mounted || !onboarded) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-faint">
        <span className="animate-pulse-glow font-display tracking-[0.18em]">Polishing the marble…</span>
      </div>
    );
  }

  const sessions = fit.workouts.length;

  return (
    <AppShell maxWidth="max-w-[900px]">
      <div className="flex flex-col gap-4 lg:gap-[18px]">
        <div className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-gold">The Monument</p>
          <h1 className="mt-1.5 font-display text-[26px] font-bold tracking-[0.04em] lg:text-3xl">Progress</h1>
          <GoldDivider className="mt-3" />
        </div>

        <SummaryStrip
          items={[
            [toRoman(fit.streak), "Day streak"],
            [fit.laurels.toLocaleString(), "Laurels"],
            [toRoman(sessions), "Sessions"],
          ]}
        />

        <ProgressPhotos />

        <HallOfHonor />

        {/* rite chronicle */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-gold">
              Rite chronicle
            </p>
            <Link
              href="/history"
              className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-gold active:opacity-60"
            >
              <ScrollText size={11} /> Full records
            </Link>
          </div>
          <RiteDaysList />
        </div>
      </div>
    </AppShell>
  );
}
