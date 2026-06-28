"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Mic, Sparkles, Trophy } from "lucide-react";
import { Wordmark, GreekKey } from "@/components/Brand";
import { AuthButton } from "@/components/AuthButton";
import { COACHES } from "@/lib/coaches";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

export default function Landing() {
  return (
    <div className="relative flex flex-col">
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-line bg-stone-900/80 backdrop-blur">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Wordmark />
          <div className="flex items-center gap-3">
            <AuthButton />
            <Link href="/onboarding" className="btn-primary px-5 py-2 text-sm">
              Enter the Gymnasium
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="tech-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2 md:py-28">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <p className="eyebrow mb-5">Forged by the gods · Powered by AI</p>
            <h1 className="font-display text-5xl font-bold leading-[1.05] md:text-6xl">
              Your fitness,
              <br />
              <span className="text-green text-glow">divinely coached.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-marble-dim">
              Pick your god. Set your goal. Then just talk. FitNext is an AI
              coach for workouts, macros, and recovery — all in one chat.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/onboarding"
                className="btn-primary flex items-center gap-2 px-6 py-3 text-sm"
              >
                Begin in 7 questions <ArrowRight size={16} />
              </Link>
              <span className="text-sm text-muted">
                Free for 2 weeks · no card
              </span>
            </div>
            <GreekKey className="mt-10 w-48" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative"
          >
            <div className="glow-green overflow-hidden rounded-2xl border border-line">
              <Image
                src="/brand/hero.png"
                alt="FitNext — marble god dissolving into green circuitry"
                width={1344}
                height={768}
                priority
                className="h-full w-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* COACHES */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mb-10 text-center">
          <p className="eyebrow mb-3">Choose your path</p>
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Six gods. Six disciplines.
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {COACHES.map((c, i) => (
            <motion.div
              key={c.id}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
            >
              <Link
                href={`/onboarding?coach=${c.id}`}
                className="panel panel-hover group block overflow-hidden"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src={c.image}
                    alt={c.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="eyebrow mb-1 text-[0.6rem]">{c.route}</p>
                    <h3 className="font-display text-xl font-bold">
                      Coach {c.name}
                    </h3>
                    <p className="mt-1 text-xs text-marble-dim">{c.tagline}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-line bg-stone-850/40">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Calibrate",
              body: "Answer 7 questions. Your coach is tuned to your body, goal, and gear.",
            },
            {
              icon: Mic,
              title: "Just talk",
              body: "Log workouts, meals, and how you feel — by voice or text. Your coach adapts.",
            },
            {
              icon: Trophy,
              title: "Win daily",
              body: "Streaks, targets, and daily wins keep you moving. Hit goals, earn rewards.",
            },
          ].map((s) => (
            <div key={s.title}>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-green/40 text-green glow-green">
                <s.icon size={20} />
              </div>
              <h3 className="font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-marble-dim">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="mx-auto w-full max-w-3xl px-6 py-20 text-center">
        <p className="eyebrow mb-3">Simple</p>
        <h2 className="font-display text-3xl font-bold md:text-4xl">
          Two weeks free. Then <span className="text-green">$14/mo</span>.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-marble-dim">
          Full access to your coach. Cancel anytime. Soon: earn the FitNext coin
          for hitting goals — and hold it to cut your subscription to zero.
        </p>
        <Link
          href="/onboarding"
          className="btn-primary mt-8 inline-flex items-center gap-2 px-7 py-3 text-sm"
        >
          Meet your coach <ArrowRight size={16} />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted sm:flex-row">
          <Wordmark className="text-base" />
          <p>Alpha · © {new Date().getFullYear()} FitNext</p>
        </div>
      </footer>
    </div>
  );
}
