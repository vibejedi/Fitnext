"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Apple } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { NutritionPanel } from "@/components/NutritionPanel";
import { NutritionDays } from "@/components/history/lists";
import { TrendBars } from "@/components/charts";
import { Panel } from "@/components/ui";
import { GoldDivider } from "@/components/Brand";
import { useFit } from "@/lib/store";
import { dailyNutrition } from "@/lib/history";
import { NUTRITION_TARGETS } from "@/lib/rites";
import { askCoach } from "@/lib/coachBus";
import { useFitHydrated, useRequireOnboarding } from "@/lib/useHydrate";

/**
 * Fuel — today's meals and macro bars up top, then the previous days'
 * logs, day by day, each expandable down to the individual meals.
 */

export default function NutritionScreen() {
  const router = useRouter();
  const wantNutrition = useFit((s) => s.wantNutrition);
  const meals = useFit((s) => s.meals);
  const mounted = useFitHydrated();
  const onboarded = useRequireOnboarding(mounted);

  // last 14 days of calories vs target — over-target days turn clay
  const kcalTrend = useMemo(() => {
    const byDay = new Map(dailyNutrition(meals).map((d) => [d.day, d.kcal]));
    const out: { label: string; value: number; tone?: "clay" }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const day = d.toLocaleDateString("en-CA");
      const kcal = byDay.get(day) ?? 0;
      out.push({
        label: d.toLocaleDateString(undefined, { day: "numeric" }),
        value: kcal,
        ...(kcal > NUTRITION_TARGETS.kcal ? { tone: "clay" as const } : {}),
      });
    }
    return out;
  }, [meals]);
  const trendDays = kcalTrend.filter((d) => d.value > 0).length;

  if (!mounted || !onboarded) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-faint">
        <span className="animate-pulse-glow font-display tracking-[0.18em]">Setting the table…</span>
      </div>
    );
  }

  const askNutritionist = () => {
    if (!askCoach("Give me a simple meal-prep plan for today that hits my macros.", "nutrition")) {
      router.push("/coach");
    }
  };

  return (
    <AppShell maxWidth="max-w-[900px]">
      <div className="flex flex-col gap-4 lg:gap-[18px]">
        <div className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-gold">Ambrosia</p>
          <h1 className="mt-1.5 font-display text-[26px] font-bold tracking-[0.04em] lg:text-3xl">Fuel</h1>
          <GoldDivider className="mt-3" />
        </div>

        <NutritionPanel />

        {/* the fortnight — calories vs target, day by day */}
        {trendDays >= 2 && (
          <Panel title="The Fortnight">
            <div className="px-[14px] py-3.5 lg:px-[18px]">
              <TrendBars
                data={kcalTrend}
                target={NUTRITION_TARGETS.kcal}
                format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)}
              />
              <p className="mt-2 text-[9px] text-faint">
                Calories per day · dashed line is your {NUTRITION_TARGETS.kcal.toLocaleString()} kcal target · clay = over
              </p>
            </div>
          </Panel>
        )}

        {wantNutrition && (
          <button
            onClick={askNutritionist}
            className="panel chisel-press flex items-center gap-3.5 px-[18px] py-[14px] text-left"
          >
            <Apple size={18} strokeWidth={1.8} className="text-gold" />
            <span className="flex-1">
              <span className="block font-display text-[13px] font-bold lg:text-sm">Ask the Nutritionist</span>
              <span className="mt-0.5 block text-[10px] text-sec lg:text-[11px]">
                Meal-prep plans, swaps, and macro counsel from your coach
              </span>
            </span>
          </button>
        )}

        {/* the previous days' logs */}
        <div>
          <p className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.28em] text-gold">
            Previous days
          </p>
          <NutritionDays includeToday={false} />
        </div>
      </div>
    </AppShell>
  );
}
