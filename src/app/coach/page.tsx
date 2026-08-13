"use client";

import { AppShell } from "@/components/AppShell";
import { CoachChat } from "@/components/CoachChat";
import { useFitHydrated, useRequireOnboarding } from "@/lib/useHydrate";

/** Coach — the oracle, full screen. Voice-first: tap the mic and talk. */

export default function CoachScreen() {
  const mounted = useFitHydrated();
  const onboarded = useRequireOnboarding(mounted);

  if (!mounted || !onboarded) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-faint">
        <span className="animate-pulse-glow font-display tracking-[0.18em]">The oracle stirs…</span>
      </div>
    );
  }

  return (
    <AppShell maxWidth="max-w-[900px]">
      <div className="h-[calc(100dvh-200px)] min-h-[420px] lg:h-[calc(100dvh-160px)]">
        <CoachChat />
      </div>
    </AppShell>
  );
}
