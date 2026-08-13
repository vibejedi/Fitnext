"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFit, localDay } from "./store";
import { EMPTY_RITES } from "./rites";
import {
  pullProfile, pullRites, pullMeals, pullMealsRange, pullWorkouts, pullRitesRange,
} from "./sync";

/** Don't re-pull the cloud on every tab switch — once per minute is plenty
 *  for hopping between module screens; a hard reload always re-pulls. */
let lastPull = 0;
const PULL_TTL_MS = 60_000;

/** Mount gate + cloud hydration shared by every module screen: rolls the
 *  local day over, then folds profile, today's rites/meals and ~45 days of
 *  history into the store. Returns `mounted` for the hydration-safe render. */
export function useFitHydrated(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    useFit.getState().beginDay();
    if (Date.now() - lastPull < PULL_TTL_MS) return;
    lastPull = Date.now();

    const today = localDay();
    void pullProfile().then((p) => {
      if (!p) return;
      (Object.entries(p) as [keyof typeof p, unknown][]).forEach(([k, v]) =>
        useFit.getState().set(k as never, v as never)
      );
    });
    void pullRites(today).then((r) => {
      if (!r) return;
      const s = useFit.getState();
      s.set("rites", { ...EMPTY_RITES, ...r });
      s.set("ritesDate", today);
    });
    // cloud copy of today's meals wins over the local one when signed in
    void pullMeals(today).then((ms) => {
      if (!ms || ms.length === 0) return;
      const s = useFit.getState();
      s.set("meals", [...s.meals.filter((m) => m.day !== today), ...ms]);
    });
    // fold the last ~45 days of meals, workouts and rites into the store so
    // the history views and the coach both have the full record to work from
    const since = new Date();
    since.setDate(since.getDate() - 45);
    const sinceDay = since.toLocaleDateString("en-CA");
    void Promise.all([
      pullMealsRange(sinceDay),
      pullWorkouts(80),
      pullRitesRange(sinceDay),
    ]).then(([meals, workouts, riteHistory]) => {
      useFit.getState().absorbHistory({
        meals: meals ?? undefined,
        workouts: workouts ?? undefined,
        riteHistory: riteHistory ?? undefined,
      });
    });
  }, [mounted]);

  return mounted;
}

/** Redirect to onboarding until the calibration is complete. */
export function useRequireOnboarding(mounted: boolean) {
  const router = useRouter();
  const onboarded = useFit((s) => s.onboarded);
  useEffect(() => {
    if (mounted && !onboarded) router.replace("/onboarding");
  }, [mounted, onboarded, router]);
  return onboarded;
}
