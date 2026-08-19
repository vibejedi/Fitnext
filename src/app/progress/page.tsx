"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProgressPhotos } from "@/components/ProgressPhotos";
import { HallOfHonor } from "@/components/HallOfHonor";
import { BodyweightPanel } from "@/components/Bodyweight";
import { RiteDaysList } from "@/components/history/lists";
import { ConsistencyGrid } from "@/components/charts";
import { Panel, SummaryStrip } from "@/components/ui";
import { GoldDivider } from "@/components/Brand";
import { useFit, localDay } from "@/lib/store";
import { RITES } from "@/lib/rites";
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

  // rite completion fraction per day (today's live rites included) + a full
  // mark for any day a workout was inscribed even if rites lagged
  const consistency = useMemo(() => {
    const today = localDay();
    const out: Record<string, number> = {};
    for (const [day, r] of Object.entries(fit.riteHistory)) {
      out[day] = RITES.filter((rite) => r[rite.id]).length / RITES.length;
    }
    if (fit.ritesDate === today) {
      out[today] = RITES.filter((rite) => fit.rites[rite.id]).length / RITES.length;
    }
    for (const w of fit.workouts) {
      out[w.day] = Math.max(out[w.day] ?? 0, 0.5);
    }
    return out;
  }, [fit.riteHistory, fit.rites, fit.ritesDate, fit.workouts]);

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

        {/* the mosaic — every day laid as a tile */}
        <Panel title="The Mosaic">
          <div className="overflow-x-auto px-[14px] py-3.5 lg:px-[18px]">
            <ConsistencyGrid days={consistency} weeks={16} />
            <p className="mt-2.5 text-center text-[9px] text-faint">
              Sixteen weeks of days — deeper gold, more rites done · training days count too
            </p>
          </div>
        </Panel>

        <BodyweightPanel />

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
