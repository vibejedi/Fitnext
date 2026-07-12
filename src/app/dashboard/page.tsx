"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Flame, Apple, HeartPulse, Check, Search, Play, Plus, Lock,
  MessageSquare, Eye, EyeOff, Camera, ChevronDown, Award,
} from "lucide-react";
import { Wordmark, MeanderBand, GoldDivider } from "@/components/Brand";
import { CoachChat } from "@/components/CoachChat";
import { AuthButton } from "@/components/AuthButton";
import { useFit, localDay } from "@/lib/store";
import { pullProfile, pullRites, pushProfile, pushRites, uploadProgressPhoto, listProgressPhotos, type ProgressPhoto } from "@/lib/sync";
import { coachById } from "@/lib/coaches";
import { GOALS } from "@/lib/onboarding";
import { RITES, EMPTY_RITES, SEAL_LAURELS, type RiteId } from "@/lib/rites";
import { TODAY_GUIDES, GUIDE_LIBRARY, filterGuides, guideVideoSrc, type Guide } from "@/lib/guides";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn, toRoman } from "@/lib/utils";

const ask = (prompt: string, mode: "coach" | "nutrition" = "coach") =>
  window.dispatchEvent(new CustomEvent("coach-ask", { detail: { prompt, mode } }));

/** Short focus word for the stats triptych. */
const FOCUS: Record<string, string> = {
  fatloss: "Fat Loss", muscle: "Muscle", strength: "Strength",
  endurance: "Endurance", performance: "Performance", health: "Health",
};

/** Gold gleam + ring pulse, retriggered per click by alternating keyframe names. */
function useGleam(kind: "gleam" | "ring" = "gleam") {
  const [n, setN] = useState(0);
  const style: React.CSSProperties | undefined = n
    ? {
        animation:
          kind === "ring"
            ? `${n % 2 ? "ringA" : "ringB"} 0.6s ease`
            : `${n % 2 ? "gleamA" : "gleamB"} 0.7s ease, ${n % 2 ? "ringA" : "ringB"} 0.7s ease`,
      }
    : undefined;
  return [style, () => setN((v) => v + 1)] as const;
}

export default function Dashboard() {
  const router = useRouter();
  const fit = useFit();
  const [mounted, setMounted] = useState(false);
  const [coachPlaying, setCoachPlaying] = useState(false);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  // day rollover + hydrate calibration and today's rites from the cloud
  useEffect(() => {
    if (!mounted) return;
    useFit.getState().beginDay();
    pullProfile().then((p) => {
      if (!p) return;
      (Object.entries(p) as [keyof typeof p, unknown][]).forEach(([k, v]) =>
        useFit.getState().set(k as never, v as never)
      );
    });
    pullRites(localDay()).then((r) => {
      if (!r) return;
      const s = useFit.getState();
      s.set("rites", { ...EMPTY_RITES, ...r });
      s.set("ritesDate", localDay());
    });
  }, [mounted]);

  useEffect(() => {
    if (mounted && !fit.onboarded) router.replace("/onboarding");
  }, [mounted, fit.onboarded, router]);

  useEffect(() => () => { if (playTimer.current) clearTimeout(playTimer.current); }, []);

  if (!mounted || !fit.onboarded) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-faint">
        <span className="animate-pulse-glow font-display tracking-[0.18em]">Summoning your coach…</span>
      </div>
    );
  }

  const coach = coachById(fit.coach);
  const goal = GOALS.find((g) => g.id === fit.goal);
  const today = localDay();
  const rites = fit.ritesDate === today ? fit.rites : EMPTY_RITES;
  const doneCount = RITES.filter((r) => rites[r.id]).length;
  const allDone = doneCount === RITES.length;
  const sealedToday = fit.sealedDate === today;

  // "the oracle awakens" — plays the coach video/animation for ~2.4s
  const awaken = () => {
    if (coachPlaying) return;
    setCoachPlaying(true);
    if (playTimer.current) clearTimeout(playTimer.current);
    playTimer.current = setTimeout(() => setCoachPlaying(false), 2400);
  };

  const toggleRite = (id: RiteId) => {
    fit.toggleRite(id);
    void pushRites(today, useFit.getState().rites);
  };

  const seal = () => {
    if (!allDone || sealedToday) return;
    fit.sealDay();
    awaken();
    void pushProfile(useFit.getState());
  };

  const speakWithCoach = () => {
    document.getElementById("coach-chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.dispatchEvent(new Event("coach-focus"));
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {/* header */}
      <header className="sticky top-0 z-20 border-b border-line bg-[rgba(247,244,236,0.92)] backdrop-blur">
        <div className="mx-auto flex h-[54px] w-full max-w-[1280px] items-center justify-between px-[18px] lg:h-[60px] lg:px-8">
          <Wordmark className="text-base lg:text-[19px]" />
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] text-sec lg:text-[11px]">
              <Flame size={13} className="text-gold" />
              DAY {toRoman(fit.streak)} OF THE STREAK
            </div>
            <div className="hidden lg:block">
              <AuthButton />
            </div>
          </div>
        </div>
        <MeanderBand />
      </header>

      <main className="mx-auto grid w-full max-w-[1280px] flex-1 items-start gap-6 px-[18px] py-6 lg:grid-cols-[1fr_380px] lg:px-8">
        {/* LEFT: dashboard */}
        <div className="flex flex-col gap-4 lg:gap-[18px]">
          {/* coach shrine (mobile) */}
          <div className="pt-1.5 text-center lg:hidden">
            <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-gold">{coach?.route}</p>
            <CoachPortrait
              coach={coach}
              videoUrl={fit.coachVideoUrl}
              playing={coachPlaying}
              onClick={awaken}
              className="mx-auto mt-3 h-[190px] w-[150px]"
              radius="150px 150px 6px 6px"
              ring={5}
              shadow
            />
            <h1 className="mt-3 font-display text-2xl font-bold tracking-[0.04em]">Coach {coach?.name}</h1>
            <p className="mt-1 text-xs text-sec">
              Goal: <span className="font-semibold text-gold">{goal?.label ?? "—"}</span> · {fit.days ?? "—"} days a week
            </p>
            <GoldDivider className="mt-2.5" />
            <SpeakButton onClick={speakWithCoach} className="mt-3.5" />
          </div>

          {/* coach hero strip (desktop) */}
          <div className="panel hidden items-center gap-5 px-[22px] py-[18px] lg:flex">
            <CoachPortrait
              coach={coach}
              videoUrl={fit.coachVideoUrl}
              playing={coachPlaying}
              onClick={awaken}
              className="h-[88px] w-[72px] shrink-0"
              radius="72px 72px 4px 4px"
              ring={3}
            />
            <div className="flex-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-gold">{coach?.route}</p>
              <h1 className="mt-0.5 font-display text-[26px] font-bold tracking-[0.04em]">
                Coach {coach?.name} is ready.
              </h1>
              <p className="mt-1 text-[13px] text-sec">
                Goal: <span className="font-semibold text-gold">{goal?.label ?? "—"}</span> · {fit.days ?? "—"} days a week
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <GoldDivider />
              <SpeakButton onClick={speakWithCoach} />
            </div>
          </div>

          {/* stats triptych */}
          <div className="grid grid-cols-3 gap-px border border-line bg-line">
            <Stat value={toRoman(fit.streak)} label="Day streak" />
            <Stat value={FOCUS[fit.goal ?? ""] ?? "—"} label="Focus" />
            <Stat value={`${toRoman(fit.days)} / VII`} label="Cadence" />
          </div>

          {/* today's labor */}
          <Panel
            title="Today's Labor"
            action={
              <button
                onClick={downloadICS}
                className="px-1.5 py-1 font-mono text-[9px] tracking-[0.1em] text-gold active:translate-y-px active:opacity-60 lg:text-[10px]"
              >
                + CALENDAR
              </button>
            }
          >
            <div className="flex items-center justify-between gap-3 px-[14px] py-[13px] lg:px-[18px] lg:py-[15px]">
              <div>
                <p className="text-[13px] font-semibold lg:text-sm">{coach?.route} session</p>
                <p className="mt-0.5 text-[11px] text-sec lg:text-xs">Your coach has inscribed the plan.</p>
              </div>
              <BeginButton
                onClick={() => ask("What's my workout for today? Give me the exact sets and reps.")}
              />
            </div>
          </Panel>

          {/* rites / actions / seal / nutrition (order differs mobile ↔ desktop) */}
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-[18px]">
            {/* daily rites */}
            <Panel
              className="order-1"
              title="Daily Rites"
              action={
                <span className="font-mono text-[9px] tracking-[0.12em] text-gold lg:text-[10px]">
                  {toRoman(doneCount)} / {toRoman(RITES.length)}
                </span>
              }
            >
              {RITES.map((r) => {
                const done = rites[r.id];
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleRite(r.id)}
                    className={cn(
                      "flex w-full select-none items-center gap-2.5 border-b border-line-soft px-[14px] py-2.5 text-left transition-colors active:bg-pressed lg:px-[18px]",
                      done ? "bg-done-wash text-ink" : "text-faint"
                    )}
                  >
                    <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[2px] border border-line-strong">
                      {done && (
                        <Check
                          size={13}
                          strokeWidth={3}
                          className="text-gold"
                          style={{ animation: "laurelPop 0.45s ease" }}
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold lg:text-[13px]">{r.label}</span>
                      <span className="mt-px block text-[10px] text-sec lg:text-[11px]">{r.target}</span>
                    </span>
                    <span className="shrink-0 rounded-[2px] border border-line-soft px-[5px] py-[2px] text-[8px] uppercase tracking-[0.16em] text-faint">
                      {r.source}
                    </span>
                  </button>
                );
              })}
            </Panel>

            {/* quick actions — Ambrosia & Healing */}
            <div className="order-4 grid grid-cols-2 gap-3 lg:order-2 lg:grid-cols-1 lg:grid-rows-2 lg:gap-[18px]">
              <QuickAction
                icon={<Apple size={18} strokeWidth={1.8} className="text-gold lg:h-5 lg:w-5" />}
                title="Ambrosia"
                sub="Meal prep with your coach"
                disabled={!fit.wantNutrition}
                onClick={() => ask("Give me a simple meal-prep plan for today that hits my macros.", "nutrition")}
              />
              <QuickAction
                icon={<HeartPulse size={18} strokeWidth={1.8} className="text-gold lg:h-5 lg:w-5" />}
                title="Healing"
                sub={fit.wantInjury ? "Therapy with your coach" : "Enable in settings"}
                disabled={!fit.wantInjury}
                onClick={() => ask("I'm dealing with some soreness/injury. Give me safe mobility and rehab work.")}
              />
            </div>

            {/* seal the day */}
            <div className="panel order-2 px-[14px] py-4 text-center lg:order-3 lg:col-span-2 lg:px-[18px] lg:py-[18px]">
              {!sealedToday ? (
                <div className="flex flex-col items-center justify-center gap-2 lg:flex-row lg:gap-[18px]">
                  <SealButton allDone={allDone} onClick={seal} />
                  <p className="text-[10px] text-sec lg:text-[11px]">
                    {allDone
                      ? `All rites complete — earn ${SEAL_LAURELS} laurels toward the Hall of Honor`
                      : `${RITES.length - doneCount} rite${RITES.length - doneCount > 1 ? "s" : ""} remain to seal the day`}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5 lg:flex-row lg:gap-4 lg:text-left">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-done-wash"
                    style={{ animation: "laurelPop 0.5s ease" }}
                  >
                    <Award size={18} className="text-gold" />
                  </span>
                  <div>
                    <p className="font-display text-[15px] font-bold tracking-[0.08em]">Day Sealed</p>
                    <p className="mt-0.5 text-[10px] text-sec lg:text-[11px]">
                      +{SEAL_LAURELS} laurels · Coach {coach?.name}&apos;s message is playing above — new video each week
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* nutrition */}
            <div className="order-3 lg:order-4 lg:col-span-2">
              <NutritionPanel />
            </div>
          </div>

          {/* the labors */}
          <Panel title="The Labors">
            <div className="grid grid-cols-3 gap-px bg-line-soft lg:grid-cols-6">
              {["Push", "Pull", "Legs", "Conditioning", "Core", "Mobility"].map((w, i) => (
                <button
                  key={w}
                  onClick={() => ask(`Show me a ${w} workout I can do today.`)}
                  className="chisel-press bg-panel px-2 py-4 text-center lg:py-5"
                >
                  <span className="block font-display text-[13px] font-semibold lg:text-sm">{w}</span>
                  <span className="mt-0.5 block text-[8px] tracking-[0.2em] text-gold lg:text-[9px]">
                    {toRoman(i + 1)}
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          <MovementGuides />

          <ProgressPhotos />

          <HallOfHonor laurels={fit.laurels} />
        </div>

        {/* RIGHT: coach chat (docked on desktop, stacked on mobile) */}
        <div id="coach-chat" className="scroll-mt-20 lg:sticky lg:top-[94px]">
          <div className="h-[75dvh] lg:h-[calc(100dvh-120px)]">
            <CoachChat />
          </div>
        </div>
      </main>
    </div>
  );
}

/* ================= building blocks ================= */

function Panel({ title, action, children, className }: {
  title: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={cn("panel", className)}>
      <div className="flex items-center justify-between border-b border-line-soft px-[14px] py-3 lg:px-[18px] lg:py-[14px]">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-ink lg:text-[13px]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-panel px-2.5 py-3.5 text-center lg:px-3 lg:py-[18px]">
      <div className="font-display text-[19px] font-bold text-ink lg:text-[22px]">{value}</div>
      <div className="mt-1 text-[8px] uppercase tracking-[0.22em] text-gold lg:text-[9px]">{label}</div>
    </div>
  );
}

function BeginButton({ onClick }: { onClick: () => void }) {
  const [anim, trigger] = useGleam();
  return (
    <button
      onClick={() => { trigger(); onClick(); }}
      style={anim}
      className="btn-primary px-[18px] py-[9px] text-[11px] lg:px-6 lg:py-[11px] lg:text-xs"
    >
      Begin
    </button>
  );
}

function SpeakButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const [anim, trigger] = useGleam();
  return (
    <button
      onClick={() => { trigger(); onClick(); }}
      style={anim}
      className={cn("btn-primary inline-flex items-center gap-2 px-6 py-3 text-[11px] lg:px-[22px]", className)}
    >
      <MessageSquare size={13} />
      Speak with Coach
    </button>
  );
}

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

function CoachPortrait({ coach, videoUrl, playing, onClick, className, radius, ring, shadow }: {
  coach: ReturnType<typeof coachById>;
  videoUrl: string | null;
  playing: boolean;
  onClick: () => void;
  className?: string;
  radius: string;
  ring: number;
  shadow?: boolean;
}) {
  if (!coach) return null;
  const inset = `inset 0 0 0 ${ring}px #f7f4ec, inset 0 0 0 ${ring + 1}px #cbbb92`;
  return (
    <div className={cn("relative cursor-pointer", className)} onClick={onClick} role="button" aria-label={`Play Coach ${coach.name}'s message`}>
      <div
        className="relative h-full w-full overflow-hidden border border-line-strong bg-[#0b0f0e]"
        style={{
          borderRadius: radius,
          boxShadow: shadow ? `${inset}, 0 12px 28px -14px rgba(70,58,30,0.5)` : inset,
        }}
      >
        {videoUrl && playing ? (
          <video src={videoUrl} autoPlay playsInline className="h-full w-full object-cover" />
        ) : (
          <Image
            src={coach.image}
            alt={`Coach ${coach.name}`}
            fill
            sizes="190px"
            className="object-cover"
            style={playing ? { animation: "awakenZoom 2.4s ease" } : undefined}
          />
        )}
        {playing && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "linear-gradient(115deg, transparent 42%, rgba(255,244,214,0.55) 50%, transparent 58%)",
              backgroundSize: "220% 100%",
              backgroundPosition: "150% 0",
              animation: "sheenSweep 1.4s ease 0.2s both",
            }}
          />
        )}
      </div>
      {playing && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ borderRadius: radius, animation: "awakenGlow 2.4s ease" }}
        />
      )}
      {!playing && (
        <span className="absolute bottom-1.5 right-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-line-strong bg-[rgba(251,248,241,0.92)] shadow-[0_2px_6px_-2px_rgba(70,58,30,0.4)] lg:bottom-1 lg:right-1 lg:h-5 lg:w-5">
          <Play size={9} className="fill-gold text-gold" />
        </span>
      )}
    </div>
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

/* ---------------- nutrition ---------------- */

const DEMO_MEALS = [
  { name: "Greek yogurt & honey", slot: "Breakfast", p: 32, c: 45, f: 12, kcal: 420 },
  { name: "Chicken souvlaki bowl", slot: "Lunch", p: 52, c: 70, f: 18, kcal: 680 },
  { name: "Almonds & figs", slot: "Snack", p: 9, c: 22, f: 22, kcal: 310 },
  { name: "Salmon, potatoes & greens", slot: "Dinner", p: 48, c: 58, f: 28, kcal: 720 },
];
const TARGETS = { kcal: 2450, p: 180, c: 250, f: 70 };

function NutritionPanel() {
  const sum = DEMO_MEALS.reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );
  return (
    <Panel
      title="Nutrition"
      action={
        <button
          onClick={() => ask("I want to log a meal. Ask me what I ate and estimate the calories and macros.", "nutrition")}
          className="px-1.5 py-1 font-mono text-[9px] tracking-[0.1em] text-gold active:translate-y-px active:opacity-60 lg:text-[10px]"
        >
          + LOG A MEAL
        </button>
      }
    >
      <div className="lg:grid lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col lg:border-r lg:border-line-soft">
          {DEMO_MEALS.map((m, i) => (
            <div
              key={m.name}
              className={cn(
                "flex items-baseline gap-2 px-[14px] py-2.5 lg:px-[18px]",
                i < DEMO_MEALS.length - 1 && "border-b border-line-soft"
              )}
            >
              <span className="min-w-0 flex-1 text-xs font-semibold lg:text-[13px]">
                {m.name}{" "}
                <span className="text-[9px] font-normal tracking-[0.08em] text-faint">· {m.slot.toUpperCase()}</span>
              </span>
              <span className="font-mono text-[10px] text-sec">{m.p}P · {m.c}C · {m.f}F</span>
              <span className="w-16 text-right font-mono text-[10px] text-ink lg:text-[11px]">{m.kcal.toLocaleString()} kcal</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-[9px] bg-panel-alt px-[14px] py-3 lg:gap-2.5 lg:px-[18px] lg:py-[14px]">
          <MacroBar label="Calories" cur={sum.kcal} max={TARGETS.kcal}
            text={`${sum.kcal.toLocaleString()} / ${TARGETS.kcal.toLocaleString()}`} unit="" />
          <MacroBar label="Protein" cur={sum.p} max={TARGETS.p} text={`${sum.p}g / ${TARGETS.p}g`} unit="g" />
          <MacroBar label="Carbs" cur={sum.c} max={TARGETS.c} text={`${sum.c}g / ${TARGETS.c}g`} unit="g" />
          <MacroBar label="Fats" cur={sum.f} max={TARGETS.f} text={`${sum.f}g / ${TARGETS.f}g`} unit="g" />
          <p className="mt-0.5 text-[9px] text-faint">
            Targets set by your Nutrition Coach · updates as you log meals in chat
          </p>
        </div>
      </div>
    </Panel>
  );
}

function MacroBar({ label, cur, max, text, unit }: {
  label: string; cur: number; max: number; text: string; unit: string;
}) {
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

/* ---------------- movement guides ---------------- */

function MovementGuides() {
  const [open, setOpen] = useState(false);
  const [fullLib, setFullLib] = useState(false);
  const [query, setQuery] = useState("");
  const todayMoves = filterGuides(TODAY_GUIDES, query);

  return (
    <section className="panel">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full select-none items-center justify-between gap-3 px-[14px] py-3 active:bg-pressed lg:px-[18px] lg:py-[14px]"
      >
        <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-ink lg:text-[13px]">
          Movement Guides
        </span>
        <span className="flex items-center gap-2.5">
          <span className="font-mono text-[9px] tracking-[0.12em] text-gold lg:text-[10px]">
            {toRoman(TODAY_GUIDES.length)} FOR TODAY
          </span>
          <ChevronDown
            size={14}
            className={cn("text-gold transition-transform duration-200", open && "rotate-180")}
          />
        </span>
      </button>

      {!open && (
        <p className="px-[14px] pb-3 text-[10px] text-sec lg:px-[18px] lg:text-[11px]">
          Quick 5–10s shorts for today&apos;s session — tap to open
        </p>
      )}

      {open && (
        <div className="border-t border-line-soft">
          <div className="border-b border-line-soft px-[14px] py-2.5 lg:px-[18px]">
            <div className="flex items-center gap-2 rounded-[4px] border border-line bg-panel-alt px-3 py-[9px] lg:max-w-[260px]">
              <Search size={13} className="text-gold" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={fullLib ? "Search a movement…" : "Search today's movements…"}
                className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-faint"
              />
            </div>
          </div>

          {!fullLib ? (
            <>
              <div className="flex gap-2 overflow-x-auto px-[14px] py-3 lg:px-[18px]">
                {todayMoves.map((mv) => <GuideCard key={mv.name} guide={mv} />)}
              </div>
              {todayMoves.length === 0 && (
                <p className="px-[14px] pb-3.5 text-center text-[11px] text-faint">
                  No movement in today&apos;s session for &ldquo;{query}&rdquo;
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col">
              {GUIDE_LIBRARY.map(({ part, moves }) => {
                const list = filterGuides(moves.map((m) => ({ ...m, part })), query);
                if (list.length === 0) return null;
                return (
                  <div key={part} className="px-[14px] pt-3 lg:px-[18px]">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.26em] text-gold">{part}</span>
                      <span className="h-px flex-1 bg-line-soft" />
                      <span className="font-mono text-[9px] text-faint">{toRoman(list.length)}</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto py-3">
                      {list.map((mv) => <GuideCard key={mv.name} guide={mv} />)}
                    </div>
                  </div>
                );
              })}
              {filterGuides(GUIDE_LIBRARY.flatMap(({ part, moves }) => moves.map((m) => ({ ...m, part }))), query).length === 0 && (
                <p className="px-[14px] py-3.5 text-center text-[11px] text-faint">
                  No movement found for &ldquo;{query}&rdquo;
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => setFullLib((f) => !f)}
            className="flex w-full items-center justify-center gap-1.5 border-t border-line-soft px-[14px] py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold active:bg-pressed"
          >
            {fullLib ? "Today's session" : "Full library"}
            <ChevronDown size={11} className={cn("-rotate-90", fullLib && "rotate-90")} />
          </button>
        </div>
      )}
    </section>
  );
}

function GuideCard({ guide }: { guide: Guide }) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const showVideo = playing && !failed;
  return (
    <div
      onClick={() => { setPlaying(true); setPlayKey((k) => k + 1); }}
      className="relative aspect-[9/16] w-[88px] shrink-0 cursor-pointer overflow-hidden rounded-md border border-line-strong active:translate-y-px lg:w-[96px]"
      style={{ background: "linear-gradient(180deg,#3a2f1c,#211d16)" }}
    >
      {showVideo && (
        <video
          key={playKey}
          src={guideVideoSrc(guide)}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <span className="absolute left-1.5 top-1.5 rounded-[2px] bg-[rgba(30,17,8,0.7)] px-1 py-px text-[7px] uppercase tracking-[0.18em] text-[#f6e7c9]">
        {guide.part}
      </span>
      <span className="absolute right-1.5 top-1.5 rounded-[2px] bg-[rgba(30,17,8,0.7)] px-1 py-px font-mono text-[8px] text-[#f6e7c9]">
        {guide.dur}
      </span>
      {!showVideo && (
        <span className="absolute left-1/2 top-1/2 flex h-[26px] w-[26px] -translate-x-1/2 -translate-y-[60%] items-center justify-center rounded-full border border-line-strong bg-[rgba(251,248,241,0.9)]">
          <Play size={9} className="fill-gold text-gold" />
        </span>
      )}
      <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[9px] font-semibold leading-tight text-ivory lg:text-[10px]">
        {guide.name}
      </span>
    </div>
  );
}

/* ---------------- progress photos ---------------- */

function ProgressPhotos() {
  const [hidden, setHidden] = useState(true);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hidden) void listProgressPhotos().then(setPhotos);
  }, [hidden]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    setBusy(true);
    const ok = await uploadProgressPhoto(file);
    if (ok) setPhotos(await listProgressPhotos());
    setBusy(false);
  };

  return (
    <Panel
      title="Progress Photos"
      action={
        <button
          onClick={() => setHidden((h) => !h)}
          className="inline-flex items-center gap-1.5 rounded-[3px] border border-line-strong bg-panel-alt px-2.5 py-[5px] text-[9px] font-semibold uppercase tracking-[0.16em] text-gold active:translate-y-px active:bg-pressed lg:px-3 lg:py-1.5 lg:text-[10px]"
        >
          {hidden ? <Eye size={11} /> : <EyeOff size={11} />}
          {hidden ? "Reveal" : "Hide"}
        </button>
      }
    >
      {hidden ? (
        <div className="flex flex-col items-center gap-1.5 px-[14px] py-[22px] text-center lg:flex-row lg:justify-center lg:gap-3 lg:text-left">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-line-strong bg-panel-alt lg:h-8 lg:w-8">
            <EyeOff size={13} className="text-gold" />
          </span>
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.14em] lg:text-[13px]">Veiled</p>
            <p className="mt-px text-[10px] text-sec lg:text-[11px]">
              Your photos stay private — only you can reveal them
            </p>
          </div>
        </div>
      ) : (
        <div className="px-[14px] py-3 lg:px-[18px] lg:py-[14px]">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.26em] text-gold lg:text-[10px]">
              Before · After
            </span>
            <span className="h-px flex-1 bg-line-soft" />
            <span className="font-mono text-[8px] text-faint lg:text-[9px]">
              WEEK I → {toRoman(Math.max(photos.length, 4))}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-2.5">
            {photos.length === 0 ? (
              <>
                <PhotoPlaceholder label="Before · W I" gold={false} />
                <PhotoPlaceholder label="After · W IV" gold />
              </>
            ) : (
              photos.map((p, i) => (
                <div key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-[4px] border border-line">
                  {/* signed URLs are short-lived — plain img, not next/image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`Progress week ${i + 1}`} className="h-full w-full object-cover" />
                  <span className="absolute left-1.5 top-1.5 rounded-[2px] border border-line bg-[rgba(251,248,241,0.9)] px-[5px] py-px text-[7px] uppercase tracking-[0.2em] text-sec lg:text-[8px]">
                    W {toRoman(i + 1)}
                  </span>
                </div>
              ))
            )}
            <label
              className={cn(
                "flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[4px] border border-dashed border-line-strong text-[10px] font-semibold uppercase tracking-[0.14em] text-gold active:translate-y-px active:bg-pressed",
                busy && "opacity-50"
              )}
            >
              {busy ? <span className="animate-pulse-glow text-[9px] normal-case tracking-normal">Uploading…</span> : (
                <>
                  <Plus size={14} />
                  Add photo
                </>
              )}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} disabled={busy} />
            </label>
            <div className="hidden aspect-[3/4] flex-col items-center justify-center gap-1 rounded-[4px] border border-dashed border-line-soft text-[9px] uppercase tracking-[0.14em] text-faint lg:flex">
              Week {toRoman(Math.max(photos.length, 4) + 4)}
            </div>
          </div>
          <p className="mt-2 text-center text-[9px] text-faint lg:text-[10px]">
            {isSupabaseConfigured
              ? "Stored privately · never shared, never on the leaderboard"
              : "Sign in to store photos privately in the cloud"}
          </p>
        </div>
      )}
    </Panel>
  );
}

function PhotoPlaceholder({ label, gold }: { label: string; gold: boolean }) {
  return (
    <div
      className="relative flex aspect-[3/4] items-center justify-center rounded-[4px] border border-line"
      style={{ background: "linear-gradient(180deg,#f3ecd9,#e7dcc2)" }}
    >
      <span
        className={cn(
          "absolute left-1.5 top-1.5 rounded-[2px] border bg-[rgba(251,248,241,0.9)] px-[5px] py-px text-[7px] uppercase tracking-[0.2em] lg:text-[8px]",
          gold ? "border-line-strong text-gold" : "border-line text-sec"
        )}
      >
        {label}
      </span>
      <Camera size={20} strokeWidth={1.6} className="text-line-strong" />
    </div>
  );
}

/* ---------------- hall of honor ---------------- */

function HallOfHonor({ laurels }: { laurels: number }) {
  const rows = [
    { rank: "I", name: "Achilles", score: "1,240" },
    { rank: "II", name: "Atalanta", score: "1,105" },
    { rank: "III", name: "You", score: laurels.toLocaleString() },
  ];
  return (
    <Panel title="Hall of Honor" action={<Lock size={14} className="text-gold" />} className="mb-2.5 lg:mb-0">
      <div className="relative">
        <div
          className="pointer-events-none flex flex-col gap-2.5 p-[14px] opacity-50 blur-[3px] lg:grid lg:grid-cols-3 lg:gap-3.5 lg:px-[18px] lg:py-4"
          aria-hidden
        >
          {rows.map((r) => (
            <div key={r.rank} className="flex items-center gap-2.5">
              <span className="w-5 font-display text-[13px] font-bold text-gold lg:text-[15px]">{r.rank}</span>
              <span className="flex-1 text-xs lg:text-[13px]">{r.name}</span>
              <span className="font-mono text-[10px] text-sec">{r.score} laurels</span>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[rgba(247,244,236,0.55)] lg:flex-row lg:gap-2.5">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-line-strong bg-panel lg:h-7 lg:w-7">
            <Lock size={13} className="text-gold" />
          </span>
          <p className="font-display text-xs font-bold uppercase tracking-[0.14em] lg:text-[13px]">Locked</p>
          <p className="text-[10px] text-sec lg:text-[11px]">Leaderboard &amp; rewards — coming soon</p>
        </div>
      </div>
    </Panel>
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
