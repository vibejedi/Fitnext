"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  motion, useScroll, useMotionValueEvent, useReducedMotion,
} from "framer-motion";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Wordmark, MeanderBand, GoldDivider } from "@/components/Brand";
import { cn, toRoman } from "@/lib/utils";

/* The six immortals on the dais — landing copy + "The Measure" stat bars. */
const GODS = [
  { id: "kratos", name: "Kratos", route: "Powerlifting", img: "/brand/coach-kratos.png",
    line: "The bar goes up. Every excuse stays on the floor.",
    stats: [["Strength", 5], ["Power", 4], ["Endurance", 2], ["Mobility", 2]] as const },
  { id: "prometheus", name: "Prometheus", route: "Hybrid Fitness", img: "/brand/coach-prometheus.png",
    line: "Fire stolen from every discipline, forged into one plan.",
    stats: [["Strength", 4], ["Power", 3], ["Endurance", 4], ["Mobility", 3]] as const },
  { id: "adonis", name: "Adonis", route: "Bodybuilding", img: "/brand/coach-adonis.png",
    line: "Sculpt the body the way the masters carved marble.",
    stats: [["Strength", 4], ["Power", 3], ["Endurance", 3], ["Mobility", 2]] as const },
  { id: "nike", name: "Nike", route: "CrossFit", img: "/brand/coach-nike.png",
    line: "Victory is a habit. Train it daily.",
    stats: [["Strength", 3], ["Power", 4], ["Endurance", 5], ["Mobility", 3]] as const },
  { id: "atalanta", name: "Atalanta", route: "Calisthenics", img: "/brand/coach-atalanta.png",
    line: "Your body is the only barbell you will ever need.",
    stats: [["Strength", 3], ["Power", 3], ["Endurance", 4], ["Mobility", 5]] as const },
  { id: "hermes", name: "Hermes", route: "Running", img: "/brand/coach-hermes.png",
    line: "Swift feet, quiet mind. The miles are messages.",
    stats: [["Strength", 2], ["Power", 3], ["Endurance", 5], ["Mobility", 4]] as const },
];

const HERO_WORDS = ["Every", "legend", "begins", "with", "a", "single", "rep."];

export default function Landing() {
  const rmPref = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // only honor the OS reduced-motion preference after mount — branching on it
  // during hydration makes the server and client first paint disagree
  const reduceMotion = mounted && !!rmPref;
  const { scrollY } = useScroll();
  const [progress, setProgress] = useState(0);

  useMotionValueEvent(scrollY, "change", (y) => {
    const vh = window.innerHeight || 800;
    setProgress(Math.max(0, Math.min(1, y / (vh * 1.8))));
  });

  // pick up the scroll position on mount (e.g. reload mid-page)
  useEffect(() => {
    const vh = window.innerHeight || 800;
    setProgress(Math.max(0, Math.min(1, window.scrollY / (vh * 1.8))));
  }, []);

  const p = reduceMotion ? 1 : progress;
  const n = HERO_WORDS.length;

  // whileInView must ALWAYS be attached: useReducedMotion() is null on the
  // first render (sections mount at opacity 0), then can flip true — if that
  // strips the trigger, the sections freeze invisible (blank Acts II/III on
  // iPhones with Reduce Motion enabled). Reduced motion only zeroes the
  // duration; `initial` stays constant so SSR and client markup match.
  const reveal = {
    initial: { opacity: 0, y: 44 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-15% 0px" },
    transition: { duration: reduceMotion ? 0 : 0.7, ease: "easeOut" as const },
  };

  return (
    <div className="overflow-x-clip">
      {/* top bar */}
      <div className="fixed inset-x-0 top-0 z-50 border-b border-line bg-[rgba(247,244,236,0.9)] backdrop-blur-[10px]">
        <div className="mx-auto flex h-[58px] w-full max-w-[1280px] items-center justify-between px-5 sm:px-8">
          <Wordmark className="text-lg" />
          <div className="flex items-center gap-4 sm:gap-[18px]">
            <a
              href="#coaches"
              className="text-[11px] uppercase tracking-[0.2em] text-sec hover:text-ink"
            >
              The Coaches
            </a>
            <Link href="/login" className="btn-ghost px-4 py-2 text-[11px] tracking-[0.14em]">
              Enter
            </Link>
          </div>
        </div>
        <MeanderBand />
      </div>

      {/* ACT I — pinned word reveal */}
      <div className="relative h-[280vh]">
        <div className="sticky top-0 flex h-dvh flex-col items-center justify-center gap-9 overflow-hidden px-6">
          <p
            className="font-mono text-[11px] uppercase tracking-[0.44em] text-gold transition-opacity duration-500"
            style={{ opacity: p > 0.04 ? 1 : 0 }}
          >
            FitNext · Your coach from Olympus
          </p>
          <h1 className="flex max-w-[1020px] flex-wrap justify-center gap-x-[22px] gap-y-4 text-center">
            {HERO_WORDS.map((word, i) => {
              const lit = p >= (i + 0.6) / (n + 0.6);
              const gold = i === n - 1;
              return (
                <span
                  key={word}
                  className="font-display font-extrabold leading-none transition-[opacity,transform,color] duration-[450ms] ease-out"
                  style={{
                    fontSize: "clamp(44px, 7vw, 92px)",
                    opacity: lit ? 1 : 0.14,
                    transform: lit ? "translateY(0)" : "translateY(14px)",
                    color: lit ? (gold ? "var(--gold)" : "var(--ink)") : "var(--sec)",
                  }}
                >
                  {word}
                </span>
              );
            })}
          </h1>
          <div
            className="transition-opacity duration-500"
            style={{ opacity: p > 0.92 ? 1 : 0 }}
          >
            <GoldDivider lineWidth={54} />
          </div>
          <div
            className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 transition-opacity duration-[400ms]"
            style={{ opacity: p < 0.9 ? 1 : 0 }}
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-faint">Scroll</span>
            <ChevronDown size={14} className="text-gold" />
          </div>
        </div>
      </div>

      {/* ACT II — the coaches */}
      <section id="coaches" className="relative px-5 pb-[60px] pt-[110px] sm:px-8">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-[70px] text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.44em] text-gold">Act II</p>
            <h2
              className="mt-2.5 font-display font-bold"
              style={{ fontSize: "clamp(30px, 4vw, 52px)" }}
            >
              Choose your coach
            </h2>
            <p className="mx-auto mt-3 max-w-[520px] text-[15px] text-sec">
              Six immortals on the dais. Turn the wheel — hover or tap a god to read their
              focus and measure.
            </p>
          </div>
          <motion.div {...reveal}>
            <CoachRing />
          </motion.div>
        </div>
      </section>

      {/* meander divider */}
      <MeanderBand className="mx-auto my-10 max-w-[1180px]" />

      {/* ACT III — entry */}
      <section id="enter" className="px-5 pb-[130px] pt-[90px] sm:px-8">
        <motion.div {...reveal} className="mx-auto max-w-[680px] text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.44em] text-gold">Act III</p>
          <h2
            className="mt-3 font-display font-extrabold leading-[1.12]"
            style={{ fontSize: "clamp(34px, 5vw, 60px)" }}
          >
            The temple is open.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-sec">
            Daily rites, nutrition tracked to the gram, movement guides for every labor —
            and a coach who answers when you speak. Your first trial is inscribed and waiting.
          </p>
          <div className="mt-[34px] flex flex-wrap items-center justify-center gap-3.5">
            <EnterButton />
            <Link href="/login" className="btn-ghost px-[26px] py-[15px] text-xs tracking-[0.14em]">
              I have an account
            </Link>
          </div>
          <GoldDivider lineWidth={54} className="mt-11" />
          <p className="mt-[18px] font-mono text-[9px] uppercase tracking-[0.3em] text-faint">
            Free trial · No card · Mortals welcome
          </p>
        </motion.div>
      </section>
    </div>
  );
}

/* ---------------- Act II: 3D coach carousel ---------------- */

function CoachRing() {
  const N = GODS.length;
  const [rot, setRot] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const facingIdx = ((rot % N) + N) % N;
  const shown = GODS[hoverIdx ?? facingIdx];

  const pick = (i: number) => {
    let d = (((i - facingIdx) % N) + N) % N;
    if (d > N / 2) d -= N; // rotate the shortest way around
    setRot((r) => r + d);
    setHoverIdx(null);
  };

  return (
    <div>
      <div className="relative flex h-[480px] items-center justify-center">
        {/* marble dais */}
        <div
          className="absolute bottom-9 left-1/2 h-[120px] w-[620px] max-w-[90%] -translate-x-1/2 rounded-full border border-line-strong"
          style={{
            background:
              "radial-gradient(ellipse at 50% 42%, #fbf8f1 0%, #efe7d2 55%, #e2d7bb 100%)",
            boxShadow:
              "inset 0 4px 12px rgba(255,255,255,0.8), inset 0 -8px 16px rgba(70,58,30,0.14), 0 18px 34px -20px rgba(70,58,30,0.5)",
          }}
        />
        <div className="absolute bottom-[26px] left-1/2 h-[130px] w-[680px] max-w-[96%] -translate-x-1/2 rounded-full border border-line opacity-60" />

        {/* 3D ring */}
        <div className="relative mb-[60px] h-[330px] w-[190px]" style={{ perspective: 1300 }}>
          <div
            className="absolute inset-0"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateY(${-rot * (360 / N)}deg)`,
              transition: "transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {GODS.map((g, i) => {
              const facing = i === facingIdx;
              return (
                <div
                  key={g.id}
                  onClick={() => pick(i)}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  className="absolute inset-0 flex cursor-pointer flex-col items-center transition-[opacity,filter] duration-700"
                  style={{
                    transform: `rotateY(${i * (360 / N)}deg) translateZ(300px)`,
                    opacity: facing ? 1 : 0.45,
                    filter: facing ? "none" : "saturate(0.6) brightness(1.04)",
                  }}
                >
                  <div className="relative h-[225px] w-[160px]">
                    <div
                      className="h-full w-full overflow-hidden border border-line-strong bg-[#0b0f0e]"
                      style={{
                        borderRadius: "160px 160px 5px 5px",
                        boxShadow:
                          "inset 0 0 0 5px #f7f4ec, inset 0 0 0 6px #cbbb92, 0 14px 30px -16px rgba(70,58,30,0.55)",
                      }}
                    >
                      <Image
                        src={g.img}
                        alt={`Coach ${g.name} — ${g.route}`}
                        fill
                        sizes="160px"
                        className="object-cover"
                        style={{ borderRadius: "160px 160px 5px 5px" }}
                      />
                    </div>
                    {facing && (
                      <div
                        key={rot}
                        className="pointer-events-none absolute inset-0"
                        style={{
                          borderRadius: "160px 160px 5px 5px",
                          animation: "awakenGlow 1.6s ease",
                        }}
                      />
                    )}
                    <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-[2px] border border-dashed border-line-strong bg-[rgba(247,244,236,0.85)] px-1.5 py-0.5 font-mono text-[7px] tracking-[0.2em] text-faint">
                      3D MODEL SLOT
                    </span>
                  </div>
                  {/* pedestal */}
                  <div
                    className="-mt-0.5 h-4 w-[120px] rounded-[2px] border border-line-strong"
                    style={{ background: "linear-gradient(180deg,#fbf8f1,#e7dcc2)" }}
                  />
                  <div
                    className="h-5 w-[150px] rounded-[3px] border border-line-strong"
                    style={{ background: "linear-gradient(180deg,#f3ecd9,#ddd0b0)" }}
                  />
                  <p className="mt-2.5 font-display text-[15px] font-bold text-ink">{g.name}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* controls */}
        <RingButton side="left" onClick={() => { setRot((r) => r - 1); setHoverIdx(null); }} />
        <RingButton side="right" onClick={() => { setRot((r) => r + 1); setHoverIdx(null); }} />
      </div>

      {/* stats tablet */}
      <div className="panel mx-auto mt-2.5 max-w-[640px]">
        <div className="flex items-baseline justify-between gap-3 border-b border-line-soft px-5 py-3.5">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-xl font-bold">{shown.name}</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-gold">
              {shown.route}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-faint">The Measure</span>
        </div>
        <p className="border-b border-line-soft px-5 py-3 text-[13px] text-sec">{shown.line}</p>
        <div className="grid grid-cols-1 gap-x-[26px] gap-y-2.5 px-5 pb-[18px] pt-3.5 sm:grid-cols-2">
          {shown.stats.map(([label, v]) => (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sec">
                  {label}
                </span>
                <span className="font-display text-[13px] font-bold text-gold">{toRoman(v)}</span>
              </div>
              <div className="h-[5px] overflow-hidden rounded-[2px] bg-line-soft">
                <div
                  className="h-full bg-gold transition-[width] duration-[600ms] ease-out"
                  style={{ width: `${(v / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3.5 text-center font-mono text-[9px] uppercase tracking-[0.24em] text-faint">
        Hover or tap a god · statue placeholders until the 3D models arrive
      </p>
    </div>
  );
}

function RingButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "Previous god" : "Next god"}
      className="absolute top-[42%] flex h-[46px] w-[46px] items-center justify-center rounded-full border border-line-strong bg-panel shadow-[0_4px_12px_-6px_rgba(70,58,30,0.4)] active:translate-y-px active:bg-pressed"
      style={
        side === "left"
          ? { left: "max(4px, calc(50% - 400px))" }
          : { right: "max(4px, calc(50% - 400px))" }
      }
    >
      {side === "left" ? (
        <ChevronLeft size={16} className="text-gold" />
      ) : (
        <ChevronRight size={16} className="text-gold" />
      )}
    </button>
  );
}

/* ---------------- Act III: gleaming entry ---------------- */

function EnterButton() {
  const router = useRouter();
  const [tick, setTick] = useState(0);
  return (
    <button
      onClick={() => {
        setTick((t) => t + 1);
        // let the gold gleam play before crossing the threshold
        setTimeout(() => router.push("/onboarding"), 450);
      }}
      style={
        tick
          ? {
              animation: `${tick % 2 ? "gleamA" : "gleamB"} 0.7s ease, ${tick % 2 ? "ringA" : "ringB"} 0.7s ease`,
            }
          : undefined
      }
      className={cn("btn-primary inline-flex items-center gap-[9px] px-[34px] py-4 text-[13px] tracking-[0.16em]")}
    >
      Enter the Temple
      <ArrowRight size={14} />
    </button>
  );
}
