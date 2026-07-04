"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Flame, Target, CalendarDays, Apple, HeartPulse, Dumbbell,
  Camera, Check, Plus, Sparkles,
} from "lucide-react";
import { Wordmark, GreekKey } from "@/components/Brand";
import { CoachChat } from "@/components/CoachChat";
import { AuthButton } from "@/components/AuthButton";
import { useFit } from "@/lib/store";
import { pullProfile } from "@/lib/sync";
import { coachById } from "@/lib/coaches";
import { GOALS } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

const ask = (prompt: string, mode: "coach" | "nutrition" = "coach") =>
  window.dispatchEvent(new CustomEvent("coach-ask", { detail: { prompt, mode } }));

export default function Dashboard() {
  const router = useRouter();
  const fit = useFit();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // hydrate calibration from the cloud when signed in
  useEffect(() => {
    if (!mounted) return;
    pullProfile().then((p) => {
      if (!p) return;
      (Object.entries(p) as [keyof typeof p, unknown][]).forEach(([k, v]) =>
        useFit.getState().set(k as never, v as never)
      );
    });
  }, [mounted]);

  useEffect(() => {
    if (mounted && !fit.onboarded) router.replace("/onboarding");
  }, [mounted, fit.onboarded, router]);

  if (!mounted || !fit.onboarded) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        <span className="animate-pulse-glow">Summoning your coach…</span>
      </div>
    );
  }

  const coach = coachById(fit.coach);
  const goal = GOALS.find((g) => g.id === fit.goal);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* header */}
      <header className="sticky top-0 z-20 border-b border-line bg-stone-900/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
          <Wordmark className="text-base" />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-marble-dim">
              <Flame size={16} className="text-green" />
              <span className="font-mono">{fit.streak}-day streak</span>
            </div>
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-5 px-6 py-6 lg:grid-cols-3">
        {/* LEFT: dashboard */}
        <div className="space-y-5 lg:col-span-2">
          {/* hero strip */}
          <div className="panel relative overflow-hidden">
            <div className="flex items-center gap-4 p-5">
              {coach && (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-green/40 glow-green">
                  <Image src={coach.image} alt={coach.name} fill className="object-cover" sizes="64px" />
                </div>
              )}
              <div className="flex-1">
                <p className="eyebrow text-[0.6rem]">{coach?.route}</p>
                <h1 className="font-display text-2xl font-bold">
                  Coach {coach?.name} is ready.
                </h1>
                <p className="text-sm text-marble-dim">
                  Goal: <span className="text-green">{goal?.label ?? "—"}</span> ·{" "}
                  {fit.days ?? "—"} days/week
                </p>
              </div>
            </div>
            <GreekKey className="absolute bottom-3 right-4 w-32 opacity-50" />
          </div>

          {/* stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={<Flame size={18} />} label="Streak" value={`${fit.streak}d`} />
            <Stat icon={<Target size={18} />} label="Focus" value={goal?.label ?? "—"} />
            <Stat icon={<CalendarDays size={18} />} label="Cadence" value={`${fit.days ?? "—"}/wk`} />
          </div>

          {/* today's plan */}
          <Card title="Today" icon={<CalendarDays size={16} />}
            action={<button onClick={downloadICS} className="btn-ghost px-3 py-1 text-xs">Add to calendar</button>}>
            <div className="flex items-center justify-between rounded-lg border border-line bg-stone-850 px-4 py-3">
              <div>
                <p className="font-medium">{coach?.route} session</p>
                <p className="text-xs text-muted">Your coach has your plan. Tap to start.</p>
              </div>
              <button onClick={() => ask("What's my workout for today? Give me the exact sets and reps.")}
                className="btn-primary px-4 py-2 text-xs">Start</button>
            </div>
          </Card>

          {/* daily wins */}
          <Card title="Daily Wins" icon={<Check size={16} />}>
            <div className="grid grid-cols-2 gap-2">
              {fit.wins.map((w) => (
                <button key={w.id} onClick={() => fit.toggleWin(w.id)}
                  className={cn("flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition",
                    w.done ? "border-green/60 bg-green/10 text-marble" : "border-line text-marble-dim hover:border-green/40")}>
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border",
                    w.done ? "border-green bg-green text-stone-950" : "border-line")}>
                    {w.done && <Check size={12} />}
                  </span>
                  {w.label}
                </button>
              ))}
            </div>
          </Card>

          {/* quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <Action icon={<Apple size={18} />} label="Meal Prep"
              disabled={!fit.wantNutrition}
              onClick={() => ask("Give me a simple meal-prep plan for today that hits my macros.", "nutrition")} />
            <Action icon={<HeartPulse size={18} />} label="Physical Therapy"
              disabled={!fit.wantInjury}
              onClick={() => ask("I'm dealing with some soreness/injury. Give me safe mobility and rehab work.")} />
          </div>

          {/* workout library */}
          <Card title="Workout Library" icon={<Dumbbell size={16} />}>
            <div className="grid grid-cols-3 gap-3">
              {["Push", "Pull", "Legs", "Conditioning", "Core", "Mobility"].map((w) => (
                <button key={w} onClick={() => ask(`Show me a ${w} workout I can do today.`)}
                  className="panel panel-hover flex aspect-square flex-col items-center justify-center gap-2 text-sm text-marble-dim">
                  <Dumbbell size={20} className="text-green/70" />
                  {w}
                </button>
              ))}
            </div>
          </Card>

          {/* progress gallery */}
          <Card title="Progress Photos" icon={<Camera size={16} />}>
            <div className="grid grid-cols-4 gap-3">
              <label className="panel panel-hover flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1 text-xs text-muted">
                <Plus size={18} className="text-green" />
                Add
                <input type="file" accept="image/*" className="hidden" />
              </label>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-line text-[0.6rem] text-muted">
                  Week {i + 1}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT: coach chat */}
        <div className="lg:col-span-1">
          <div className="sticky top-[5.5rem] h-[calc(100dvh-7rem)]">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted">
              <Sparkles size={13} className="text-green" /> Chat with Coach · voice-first
            </div>
            <div className="h-[calc(100%-1.5rem)]">
              <CoachChat />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="panel flex flex-col gap-1 p-4">
      <span className="text-green">{icon}</span>
      <span className="mt-1 font-display text-lg font-bold leading-none">{value}</span>
      <span className="text-[0.65rem] uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}

function Card({ title, icon, action, children }: {
  title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider">
          <span className="text-green">{icon}</span> {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Action({ icon, label, onClick, disabled }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn("panel panel-hover flex items-center gap-3 px-4 py-4 text-left",
        disabled && "opacity-40")}>
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-green/40 text-green">
        {icon}
      </span>
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-[0.65rem] text-muted">
          {disabled ? "Enable in settings" : "Ask your coach"}
        </span>
      </span>
    </button>
  );
}

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
