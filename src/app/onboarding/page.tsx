"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Apple, ChevronDown, HeartPulse } from "lucide-react";
import { Wordmark } from "@/components/Brand";
import { Choice } from "@/components/Choice";
import { COACHES, type CoachId } from "@/lib/coaches";
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

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const fit = useFit();
  const [step, setStep] = useState(0);

  // preselect coach from ?coach=
  useEffect(() => {
    const c = params.get("coach") as CoachId | null;
    if (c && COACHES.some((x) => x.id === c) && !fit.coach) {
      fit.set("coach", c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAdvance = (() => {
    switch (step) {
      case 0: return !!fit.coach;
      case 1: return !!fit.goal;
      case 2: return !!fit.experience;
      case 3:
        return (
          !!fit.profile.age &&
          !!fit.profile.weightKg &&
          !!fit.profile.heightCm &&
          !!fit.profile.sex &&
          !!fit.profile.activity
        );
      case 4: return !!fit.equipment && !!fit.days;
      case 5: return true;
      case 6: return !!fit.personality;
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
            {step === 0 && <StepCoach />}
            {step === 1 && (
              <Step title="What's your primary goal?" sub="This drives everything your coach plans.">
                <div className="grid grid-cols-2 gap-3">
                  {GOALS.map((g) => (
                    <Choice key={g.id} label={g.label} hint={g.hint}
                      selected={fit.goal === g.id} onClick={() => fit.set("goal", g.id)} />
                  ))}
                </div>
              </Step>
            )}
            {step === 2 && (
              <Step title="How experienced are you?" sub="Sets your volume, complexity, and pace.">
                <div className="grid gap-3">
                  {EXPERIENCE.map((e) => (
                    <Choice key={e.id} label={e.label} hint={e.hint}
                      selected={fit.experience === e.id} onClick={() => fit.set("experience", e.id)} />
                  ))}
                </div>
              </Step>
            )}
            {step === 3 && <StepProfile />}
            {step === 4 && <StepAccess />}
            {step === 5 && <StepAddons />}
            {step === 6 && (
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

function StepCoach() {
  const fit = useFit();
  const [open, setOpen] = useState<CoachId | null>(null);
  return (
    <Step title="Choose your god" sub="Your coach's name, domain, and training style.">
      <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3">
        {COACHES.map((c) => (
          <div key={c.id}
            className={cn(
              "panel panel-hover overflow-hidden",
              fit.coach === c.id && "border-green/70 glow-green"
            )}>
            <button onClick={() => fit.set("coach", c.id)} className="block w-full text-left">
              <div className="relative aspect-[3/4]">
                <Image src={c.image} alt={c.name} fill sizes="33vw"
                  className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/10 to-transparent" />
                <div className="absolute bottom-0 p-3">
                  <p className="eyebrow text-[0.55rem]">{c.route}</p>
                  <p className="font-display text-base font-bold leading-tight">
                    {c.name}
                  </p>
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
        ))}
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

function StepAccess() {
  const fit = useFit();
  return (
    <Step title="What can you train with?" sub="Equipment and how many days a week.">
      <p className="mb-2 text-xs uppercase tracking-wider text-muted">Equipment</p>
      <div className="grid grid-cols-2 gap-3">
        {EQUIPMENT.map((e) => (
          <Choice key={e.id} label={e.label} hint={"hint" in e ? e.hint : undefined}
            selected={fit.equipment === e.id} onClick={() => fit.set("equipment", e.id)} />
        ))}
      </div>
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
