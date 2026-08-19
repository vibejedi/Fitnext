"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Apple, Award, Camera, Dumbbell, HeartPulse, Shield, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CoachChat } from "@/components/CoachChat";
import { CoachHero } from "@/components/CoachHero";
import { DailyRites } from "@/components/DailyRites";
import { LogWorkoutDialog } from "@/components/LogWorkout";
import { MorningBriefing } from "@/components/MorningBriefing";
import { TodayLaborPanel } from "@/components/TodayPlan";
import { Stat, useGleam } from "@/components/ui";
import { Ring } from "@/components/charts";
import { useFit, localDay, MAX_SHIELDS, SHIELD_EVERY, type ChatMode } from "@/lib/store";
import { pushProfile } from "@/lib/sync";
import { askCoach } from "@/lib/coachBus";
import { useFitHydrated, useRequireOnboarding } from "@/lib/useHydrate";
import { coachById } from "@/lib/coaches";
import { RITES, EMPTY_RITES, SEAL_LAURELS } from "@/lib/rites";
import { cn, toRoman } from "@/lib/utils";

/**
 * Today — the daily altar: your coach, the day's labor, the rites, and the
 * seal. Deeper modules (Train, Fuel, Coach, Progress) live on their own
 * screens via the tab bar.
 */

/** Short focus word for the stats triptych. */
const FOCUS: Record<string, string> = {
  fatloss: "Fat Loss", muscle: "Muscle", strength: "Strength",
  endurance: "Endurance", performance: "Performance", health: "Health",
};

export default function TodayScreen() {
  const router = useRouter();
  const fit = useFit();
  const mounted = useFitHydrated();
  const onboarded = useRequireOnboarding(mounted);
  const [loggingWorkout, setLoggingWorkout] = useState(false);

  if (!mounted || !onboarded) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-faint">
        <span className="animate-pulse-glow font-display tracking-[0.18em]">Summoning your coach…</span>
      </div>
    );
  }

  const coach = coachById(fit.coach);
  const today = localDay();
  const rites = fit.ritesDate === today ? fit.rites : EMPTY_RITES;
  const doneCount = RITES.filter((r) => rites[r.id]).length;
  const allDone = doneCount === RITES.length;
  const sealedToday = fit.sealedDate === today;

  /** Push a prompt into a mounted chat, or carry it to the Coach screen. */
  const goAsk = (prompt: string, mode: ChatMode = "coach") => {
    if (askCoach(prompt, mode)) {
      document.getElementById("coach-chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      router.push("/coach");
    }
  };

  const seal = () => {
    if (!allDone || sealedToday) return;
    fit.sealDay();
    void pushProfile(useFit.getState());
  };

  return (
    <AppShell>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        {/* LEFT: the day */}
        <div className="flex flex-col gap-4 lg:gap-[18px]">
          <CoachHero />

          {/* the coach speaks first */}
          <MorningBriefing />

          {/* stats triptych */}
          <div className="grid grid-cols-3 gap-px border border-line bg-line">
            <Stat value={toRoman(fit.streak)} label="Day streak" />
            <Stat value={FOCUS[fit.goal ?? ""] ?? "—"} label="Focus" />
            <Stat value={`${toRoman(fit.days)} / VII`} label="Cadence" />
          </div>

          {/* today's labor — the actual plan, written out */}
          <TodayLaborPanel
            action={
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setLoggingWorkout(true)}
                  className="inline-flex items-center gap-1 px-1.5 py-1 font-mono text-[9px] tracking-[0.1em] text-gold active:translate-y-px active:opacity-60 lg:text-[10px]"
                >
                  <Dumbbell size={11} /> LOG SESSION
                </button>
                <span className="text-line-strong">·</span>
                <button
                  onClick={downloadICS}
                  className="px-1.5 py-1 font-mono text-[9px] tracking-[0.1em] text-gold active:translate-y-px active:opacity-60 lg:text-[10px]"
                >
                  + CALENDAR
                </button>
              </div>
            }
          />

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-[18px]">
            <DailyRites />

            {/* quick actions — Ambrosia & Healing */}
            <div className="order-4 grid grid-cols-2 gap-3 lg:order-2 lg:grid-cols-1 lg:grid-rows-2 lg:gap-[18px]">
              <QuickAction
                icon={<Apple size={18} strokeWidth={1.8} className="text-gold lg:h-5 lg:w-5" />}
                title="Ambrosia"
                sub="Meal prep with your coach"
                disabled={!fit.wantNutrition}
                onClick={() => goAsk("Give me a simple meal-prep plan for today that hits my macros.", "nutrition")}
              />
              <QuickAction
                icon={<HeartPulse size={18} strokeWidth={1.8} className="text-gold lg:h-5 lg:w-5" />}
                title="Healing"
                sub={fit.wantInjury ? "Therapy with your coach" : "Enable in settings"}
                disabled={!fit.wantInjury}
                onClick={() => goAsk("I'm dealing with some soreness/injury. Give me safe mobility and rehab work.")}
              />
            </div>

            {/* seal the day — the ring the day closes */}
            <div className="panel order-2 px-[14px] py-4 lg:order-3 lg:col-span-2 lg:px-[18px] lg:py-[18px]">
              {!sealedToday ? (
                <div className="flex items-center justify-center gap-4 lg:gap-[18px]">
                  <Ring pct={doneCount / RITES.length} size={58} stroke={5}>
                    <span className="font-display text-[13px] font-bold text-ink">
                      {toRoman(doneCount)}<span className="text-faint">/{toRoman(RITES.length)}</span>
                    </span>
                  </Ring>
                  <div className="flex flex-col items-start gap-1.5">
                    <SealButton allDone={allDone} onClick={seal} />
                    <p className="text-left text-[10px] text-sec lg:text-[11px]">
                      {allDone
                        ? `The ring is closed — earn ${SEAL_LAURELS} laurels toward the Hall of Honor`
                        : `${RITES.length - doneCount} rite${RITES.length - doneCount > 1 ? "s" : ""} remain to close the ring`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4 text-left lg:gap-[18px]">
                  <span style={{ animation: "laurelPop 0.5s ease" }}>
                    <Ring pct={1} size={58} stroke={5}>
                      <Award size={20} className="text-gold" />
                    </Ring>
                  </span>
                  <div>
                    <p className="font-display text-[15px] font-bold tracking-[0.08em]">Day Sealed</p>
                    <p className="mt-0.5 text-[10px] text-sec lg:text-[11px]">
                      +{SEAL_LAURELS} laurels · Coach {coach?.name}&apos;s message plays on the shrine — new video each week
                    </p>
                  </div>
                </div>
              )}
              {/* Hermes' Pardon — streak shields */}
              <div className="mt-3 flex items-center justify-center gap-1.5 border-t border-line-soft pt-2.5">
                {Array.from({ length: MAX_SHIELDS }, (_, i) => (
                  <Shield
                    key={i}
                    size={12}
                    className={i < fit.shields ? "text-gold" : "text-line-strong"}
                    fill={i < fit.shields ? "currentColor" : "none"}
                  />
                ))}
                <p className="text-[9px] text-faint">
                  {fit.shields > 0
                    ? `Hermes' Pardon held — a missed day won't break your streak (${fit.shields}/${MAX_SHIELDS})`
                    : `Seal ${toRoman(SHIELD_EVERY)} days straight to earn Hermes' Pardon — it protects your streak`}
                </p>
              </div>
            </div>
          </div>

          {/* doorways into the deeper halls (mobile discovers via tab bar too) */}
          <div className="grid grid-cols-3 gap-3">
            <Doorway href="/train" icon={<Dumbbell size={16} className="text-gold" />} title="Train" sub="Labors & guides" />
            <Doorway href="/nutrition" icon={<Camera size={16} className="text-gold" />} title="Fuel" sub="Meals & macros" />
            <Doorway href="/progress" icon={<Trophy size={16} className="text-gold" />} title="Progress" sub="Photos & honor" />
          </div>
        </div>

        {/* RIGHT: coach chat (docked, desktop only — mobile uses the Coach tab) */}
        <div id="coach-chat" className="hidden scroll-mt-20 lg:sticky lg:top-[94px] lg:block">
          <div className="h-[calc(100dvh-120px)]">
            <CoachChat />
          </div>
        </div>
      </div>

      <LogWorkoutDialog
        open={loggingWorkout}
        onClose={() => setLoggingWorkout(false)}
        defaultTitle={coach?.route ? `${coach.route} session` : ""}
      />
    </AppShell>
  );
}

/* ================= building blocks ================= */

function SealButton({ allDone, onClick }: { allDone: boolean; onClick: () => void }) {
  const [anim, trigger] = useGleam();
  return (
    <button
      onClick={() => { if (allDone) { trigger(); onClick(); } }}
      style={anim}
      className={cn(
        "inline-flex items-center gap-2 rounded-[3px] px-[26px] py-[13px] text-xs font-semibold uppercase tracking-[0.14em]",
        allDone ? "btn-primary" : "cursor-default bg-[#efe9db] text-faint"
      )}
    >
      <Award size={14} />
      Seal the Day
    </button>
  );
}

function QuickAction({ icon, title, sub, onClick, disabled }: {
  icon: React.ReactNode; title: string; sub: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "panel flex flex-col items-center p-[14px] text-center lg:flex-row lg:items-center lg:gap-3.5 lg:px-[18px] lg:text-left",
        disabled ? "opacity-45" : "chisel-press"
      )}
    >
      {icon}
      <span className="lg:flex-1">
        <span className="mt-1.5 block font-display text-[13px] font-bold lg:mt-0 lg:text-sm">{title}</span>
        <span className="mt-0.5 block text-[10px] text-sec lg:text-[11px]">{sub}</span>
      </span>
    </button>
  );
}

function Doorway({ href, icon, title, sub }: {
  href: string; icon: React.ReactNode; title: string; sub: string;
}) {
  return (
    <Link href={href} className="panel chisel-press flex flex-col items-center gap-1 px-2 py-3.5 text-center">
      {icon}
      <span className="font-display text-xs font-bold uppercase tracking-[0.14em]">{title}</span>
      <span className="text-[9px] text-sec">{sub}</span>
    </Link>
  );
}

/* ---------------- calendar export ---------------- */

function downloadICS() {
  const dt = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const end = new Date(dt.getTime() + 60 * 60 * 1000);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FitNext//EN", "BEGIN:VEVENT",
    `DTSTART:${stamp(dt)}`, `DTEND:${stamp(end)}`,
    "SUMMARY:FitNext — Training session",
    "DESCRIPTION:Your coach has today's plan. Open FitNext to begin.",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url; a.download = "fitnext-training.ics"; a.click();
  URL.revokeObjectURL(url);
}
