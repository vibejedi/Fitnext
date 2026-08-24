"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Apple, Check, ChevronDown, Dumbbell, HeartPulse, Sparkles,
} from "lucide-react";
import { Wordmark } from "@/components/Brand";
import { Choice } from "@/components/Choice";
import { COACHES, type CoachId } from "@/lib/coaches";
import { COACH_MODELS } from "@/lib/coachModels";
import { PERSONALITIES, type PersonalityId } from "@/lib/personalities";
import {
  GOALS,
  EXPERIENCE,
  SEX,
  ACTIVITY,
  EQUIPMENT,
  DAYS,
  TOTAL_STEPS,
} from "@/lib/onboarding";
import { useFit } from "@/lib/store";
import { pushProfile } from "@/lib/sync";
import { cn } from "@/lib/utils";

// three.js stage — client-only, loaded lazily so the wizard stays light
const CoachStage = dynamic(() => import("@/components/CoachStage"), { ssr: false });

/** The first fork: athletes with gear (or a gym) and athletes with none walk
 *  different roads. Empty-handed is a full path, not a fallback — bodyweight
 *  to begin, and the program tells them what's worth buying only when their
 *  progress earns it. */
type Path = "equipped" | "bare";

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const fit = useFit();
  const [step, setStep] = useState(0);
  // rehydrate the fork from a previously chosen equipment (back-navigation,
  // resumed onboarding); bodyweight ⇒ the bare-hands path
  const [path, setPath] = useState<Path | null>(
    fit.equipment === "bodyweight" ? "bare" : fit.equipment ? "equipped" : null
  );

  // preselect coach from ?coach=
  useEffect(() => {
    const c = params.get("coach") as CoachId | null;
    if (c && COACHES.some((x) => x.id === c) && !fit.coach) {
      fit.set("coach", c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickPath = (p: Path) => {
    setPath(p);
    if (p === "bare") {
      fit.set("equipment", "bodyweight");
    } else if (fit.equipment === "bodyweight") {
      fit.set("equipment", null); // they'll pick their gear on the access step
    }
  };

  const canAdvance = (() => {
    switch (step) {
      case 0: return !!path;
      case 1: return !!fit.coach;
      case 2: return !!fit.goal;
      case 3: return !!fit.experience;
      case 4:
        return (
          !!fit.profile.age &&
          !!fit.profile.weightKg &&
          !!fit.profile.heightCm &&
          !!fit.profile.sex &&
          !!fit.profile.activity
        );
      case 5: return !!fit.equipment && !!fit.days;
      case 6: return true;
      case 7: return !!fit.personality;
      default: return false;
    }
  })();

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else {
      fit.completeOnboarding();
      void pushProfile(useFit.getState()); // best-effort cloud sync
      router.push("/dashboard");
    }
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const pct = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex min-h-dvh flex-col">
      {/* header / progress */}
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-4">
          <Wordmark className="text-base" />
          <span className="font-mono text-xs text-muted">
            {step + 1} / {TOTAL_STEPS}
          </span>
        </div>
        <div className="h-0.5 w-full bg-stone-800">
          <motion.div
            className="h-full bg-green"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </header>

      {/* body */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex-1"
          >
            {step === 0 && <StepPath path={path} onPick={pickPath} />}
            {step === 1 && <StepCoach path={path} />}
            {step === 2 && (
              <Step title="What's your primary goal?" sub="This drives everything your coach plans.">
                <div className="grid grid-cols-2 gap-3">
                  {GOALS.map((g) => (
                    <Choice key={g.id} label={g.label} hint={g.hint}
                      selected={fit.goal === g.id} onClick={() => fit.set("goal", g.id)} />
                  ))}
                </div>
              </Step>
            )}
            {step === 3 && (
              <Step title="How experienced are you?" sub="Sets your volume, complexity, and pace.">
                <div className="grid gap-3">
                  {EXPERIENCE.map((e) => (
                    <Choice key={e.id} label={e.label} hint={e.hint}
                      selected={fit.experience === e.id} onClick={() => fit.set("experience", e.id)} />
                  ))}
                </div>
              </Step>
            )}
            {step === 4 && <StepProfile />}
            {step === 5 && <StepAccess path={path} />}
            {step === 6 && <StepAddons />}
            {step === 7 && (
              <Step title="Pick your coach's personality" sub="Same coach, different voice.">
                <div className="grid grid-cols-2 gap-3">
                  {PERSONALITIES.map((p) => (
                    <Choice key={p.id} label={p.name} hint={p.blurb}
                      selected={fit.personality === p.id}
                      onClick={() => fit.set("personality", p.id as PersonalityId)} />
                  ))}
                </div>
              </Step>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* footer nav */}
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-4">
          <button onClick={back} disabled={step === 0}
            className="btn-ghost flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-30">
            <ArrowLeft size={16} /> Back
          </button>
          <button onClick={next} disabled={!canAdvance}
            className="btn-primary flex items-center gap-2 px-6 py-2 text-sm disabled:opacity-40">
            {step === TOTAL_STEPS - 1 ? "Forge my coach" : "Continue"}
            <ArrowRight size={16} />
          </button>
        </div>
      </footer>
    </div>
    </MotionConfig>
  );
}

function Step({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      {sub && <p className="mt-2 text-marble-dim">{sub}</p>}
      <div className="mt-7">{children}</div>
    </div>
  );
}

function StepPath({ path, onPick }: { path: Path | null; onPick: (p: Path) => void }) {
  const doors: {
    id: Path; icon: React.ReactNode; title: string; sub: string; note: string;
  }[] = [
    {
      id: "bare",
      icon: <Sparkles size={20} />,
      title: "Empty-handed",
      sub: "No gear. Just you. It's how the old ones started.",
      note: "Start today. When you outgrow bodyweight, your coach names the next piece worth owning. Buying is always your call.",
    },
    {
      id: "equipped",
      icon: <Dumbbell size={20} />,
      title: "I have iron",
      sub: "Dumbbells at home, a rack in the garage, or a gym.",
      note: "The plan uses what you own. Nothing more.",
    },
  ];
  return (
    <Step
      title="How will you begin?"
      sub="Two roads. Same summit."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {doors.map((d) => {
          const selected = path === d.id;
          return (
            <button
              key={d.id}
              onClick={() => onPick(d.id)}
              className={cn(
                "panel panel-hover flex flex-col gap-3 px-5 py-5 text-left",
                selected && "border-green/60"
              )}
              style={
                selected
                  ? { boxShadow: "0 0 0 1px var(--gold), 0 12px 28px -14px rgba(70,58,30,0.5)" }
                  : undefined
              }
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg border",
                    selected ? "border-green/50 text-green" : "border-line text-muted"
                  )}
                >
                  {d.icon}
                </span>
                <span className="font-display text-lg font-bold text-marble">{d.title}</span>
                {selected && <Check size={15} className="ml-auto text-green" strokeWidth={3} />}
              </span>
              <span className="text-[13px] leading-relaxed text-marble-dim">{d.sub}</span>
              <span className="text-[11px] leading-relaxed text-muted">{d.note}</span>
            </button>
          );
        })}
      </div>
    </Step>
  );
}

function StepCoach({ path }: { path: Path | null }) {
  const fit = useFit();
  const [open, setOpen] = useState<CoachId | null>(null);
  return (
    <Step
      title="Choose your god"
      sub={
        path === "bare"
          ? "All six train the empty-handed. Atalanta was born for it."
          : "Your coach's name, domain, and training style."
      }
    >
      <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3">
        {COACHES.map((c) => {
          const isChosen = fit.coach === c.id;
          const model3d = COACH_MODELS[c.id];
          return (
          <div key={c.id}
            className={cn(
              // has-[:focus-visible] — overflow-hidden clips the UA focus ring,
              // so surface keyboard focus on the panel border instead
              "panel overflow-hidden transition-[opacity,filter,border-color] duration-300 has-[:focus-visible]:border-gold",
              isChosen
                ? "border-gold"
                : fit.coach
                  ? "panel-hover opacity-60 saturate-[0.75]"
                  : "panel-hover"
            )}
            style={
              isChosen
                ? {
                    boxShadow: "0 0 0 1px var(--gold), 0 12px 28px -14px rgba(70,58,30,0.5)",
                    // "the god awakens" pulse on selection
                    animation: "awakenGlow 1.6s ease",
                  }
                : undefined
            }>
            <button onClick={() => fit.set("coach", c.id)} className="block w-full text-left active:translate-y-px">
              <div className="relative aspect-[3/4]">
                <Image src={c.image} alt={c.name} fill sizes="33vw"
                  className="object-cover" />
                {model3d && (
                  <CoachStage model={model3d} selected={isChosen} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/10 to-transparent" />
                {isChosen && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(115deg, transparent 42%, rgba(255,244,214,0.55) 50%, transparent 58%)",
                      backgroundSize: "220% 100%",
                      backgroundPosition: "150% 0",
                      animation: "sheenSweep 1.4s ease 0.2s both",
                    }}
                  />
                )}
                {isChosen && (
                  <span
                    className="absolute right-2 top-2 flex h-[26px] w-[26px] items-center justify-center rounded-full border border-line-strong bg-[rgba(251,248,241,0.95)] text-gold shadow-[0_2px_6px_-2px_rgba(70,58,30,0.4)]"
                    style={{ animation: "laurelPop 0.45s ease" }}
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>
                )}
                <div className="absolute bottom-0 p-3">
                  <p className="eyebrow text-[0.55rem]">
                    {c.route}
                  </p>
                  <p className="font-display text-base font-bold leading-tight">
                    {c.name}
                  </p>
                  {isChosen && (
                    <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.24em] text-gold"
                      style={{ animation: "laurelPop 0.45s ease" }}>
                      Chosen
                    </p>
                  )}
                </div>
              </div>
            </button>
            {/* focuses & primary muscles dropdown */}
            <button
              onClick={() => setOpen((o) => (o === c.id ? null : c.id))}
              aria-expanded={open === c.id}
              className="flex w-full items-center justify-between gap-1 border-t border-line px-2.5 py-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-green active:bg-pressed sm:text-[9px]"
            >
              Focuses &amp; Muscles
              <ChevronDown
                size={11}
                className={cn("shrink-0 transition-transform duration-200", open === c.id && "rotate-180")}
              />
            </button>
            {open === c.id && (
              <div className="flex flex-col gap-2.5 border-t border-line-soft px-2.5 py-2.5">
                <div>
                  <p className="font-mono text-[7px] uppercase tracking-[0.22em] text-green sm:text-[8px]">
                    Focuses
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {c.focuses.map((f) => (
                      <li key={f} className="text-[10px] leading-snug text-marble-dim sm:text-[11px]">· {f}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-mono text-[7px] uppercase tracking-[0.22em] text-green sm:text-[8px]">
                    Primary muscles &amp; systems
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {c.muscles.map((m) => (
                      <li key={m} className="text-[10px] leading-snug text-marble-dim sm:text-[11px]">· {m}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>
    </Step>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "panel w-full bg-stone-850 px-3 py-2.5 text-marble outline-none focus:border-green/60";

function StepProfile() {
  const fit = useFit();
  const p = fit.profile;
  return (
    <Step title="Tell us about you" sub="Used to set calories and training loads.">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Age">
          <input type="number" className={inputCls} value={p.age ?? ""}
            onChange={(e) => fit.setProfile({ age: +e.target.value || undefined })} placeholder="28" />
        </Field>
        <Field label="Weight (kg)">
          <input type="number" className={inputCls} value={p.weightKg ?? ""}
            onChange={(e) => fit.setProfile({ weightKg: +e.target.value || undefined })} placeholder="75" />
        </Field>
        <Field label="Height (cm)">
          <input type="number" className={inputCls} value={p.heightCm ?? ""}
            onChange={(e) => fit.setProfile({ heightCm: +e.target.value || undefined })} placeholder="178" />
        </Field>
        <Field label="Sex">
          <select className={inputCls} value={p.sex ?? ""}
            onChange={(e) => fit.setProfile({ sex: e.target.value as never })}>
            <option value="" disabled>Select…</option>
            {SEX.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-muted">Daily activity</p>
        <div className="grid grid-cols-2 gap-3">
          {ACTIVITY.map((a) => (
            <Choice key={a.id} label={a.label} hint={a.hint}
              selected={p.activity === a.id}
              onClick={() => fit.setProfile({ activity: a.id as never })} />
          ))}
        </div>
      </div>
    </Step>
  );
}

/** The road the empty-handed walk: no gear today, and a clear, unpressured
 *  view of how the program grows if they ever want it to. */
const BARE_ROAD = [
  ["Just you", "Squats, push-ups, lunges, holds. A full program."],
  ["A band, when reps get easy", "Your coach says when. It costs less than a gym month."],
  ["Dumbbells, when you're ready", "The plan folds them in the day they arrive."],
] as const;

function StepAccess({ path }: { path: Path | null }) {
  const fit = useFit();
  const bare = path === "bare";
  return (
    <Step
      title={bare ? "How many days a week?" : "What can you train with?"}
      sub={bare
        ? "Pick a cadence you can keep. That's the whole secret."
        : "Equipment and how many days a week."}
    >
      {bare ? (
        <div className="panel flex flex-col gap-3 px-4 py-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-green">
            The bare-hands road
          </p>
          {BARE_ROAD.map(([t, s], i) => (
            <div key={t} className="flex gap-3">
              <span className="font-display text-[15px] font-bold text-green">{["I", "II", "III"][i]}</span>
              <span>
                <span className="block text-[13px] font-medium text-marble">{t}</span>
                <span className="block text-[11px] leading-relaxed text-muted">{s}</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted">Equipment</p>
          <div className="grid grid-cols-2 gap-3">
            {EQUIPMENT.filter((e) => e.id !== "bodyweight").map((e) => (
              <Choice key={e.id} label={e.label} hint={"hint" in e ? e.hint : undefined}
                selected={fit.equipment === e.id} onClick={() => fit.set("equipment", e.id)} />
            ))}
          </div>
        </>
      )}
      <p className="mb-2 mt-6 text-xs uppercase tracking-wider text-muted">Days per week</p>
      <div className="flex flex-wrap gap-2">
        {DAYS.map((d) => (
          <button key={d} onClick={() => fit.set("days", d)}
            className={cn(
              "h-11 w-11 rounded-full border border-line font-mono text-sm transition",
              fit.days === d ? "bg-green text-stone-950 glow-green" : "text-marble hover:border-green/50"
            )}>
            {d}
          </button>
        ))}
      </div>
    </Step>
  );
}

function StepAddons() {
  const fit = useFit();
  return (
    <Step title="Add specialist coaches?" sub="Optional. Toggle on what you want.">
      <div className="grid gap-3">
        <Toggle
          icon={<Apple size={18} />}
          title="Nutrition & Macro Coach"
          desc="Meal plans, macros, and a meal-prep button."
          on={fit.wantNutrition}
          onClick={() => fit.set("wantNutrition", !fit.wantNutrition)}
        />
        <Toggle
          icon={<HeartPulse size={18} />}
          title="Injury & Physical-Therapy Coach"
          desc="Rehab guidance and safe workarounds if you're hurt."
          on={fit.wantInjury}
          onClick={() => fit.set("wantInjury", !fit.wantInjury)}
        />
      </div>
    </Step>
  );
}

function Toggle({ icon, title, desc, on, onClick }: {
  icon: React.ReactNode; title: string; desc: string; on: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={cn("panel panel-hover flex items-center gap-4 px-4 py-4 text-left",
        on && "border-green/60")}>
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg border",
        on ? "border-green/50 text-green" : "border-line text-muted")}>{icon}</span>
      <span className="flex-1">
        <span className="block font-medium text-marble">{title}</span>
        <span className="block text-xs text-muted">{desc}</span>
      </span>
      <span className={cn("relative h-6 w-11 rounded-full transition",
        on ? "bg-green" : "bg-stone-700")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-stone-950 transition",
          on ? "left-[1.4rem]" : "left-0.5")} />
      </span>
    </button>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  );
}
