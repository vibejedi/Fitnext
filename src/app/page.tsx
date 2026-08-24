"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  motion, useScroll, useMotionValueEvent, useReducedMotion,
} from "framer-motion";
import {
  ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  Activity, Coins, Wallet, Watch,
} from "lucide-react";
import { Wordmark, MeanderBand, GoldDivider } from "@/components/Brand";
import { COACH_MODELS } from "@/lib/coachModels";
import type { CoachId } from "@/lib/coaches";
import { cn, toRoman } from "@/lib/utils";

// three.js stage — client-only, loaded lazily so the landing stays light
const CoachStage = dynamic(() => import("@/components/CoachStage"), { ssr: false });

/* The six immortals on the dais — landing copy + "The Measure" stat bars. */
const GODS = [
  { id: "kratos", name: "Kratos", route: "Powerlifting", img: "/brand/coach-kratos.png",
    line: "The bar goes up. Every excuse stays on the floor.",
    stats: [["Strength", 5], ["Power", 4], ["Endurance", 2], ["Mobility", 2]] as const },
  { id: "prometheus", name: "Prometheus", route: "Hybrid Athlete · Strength", img: "/brand/coach-prometheus.png",
    line: "Dumbbells and fire. The whole athlete, built at home.",
    stats: [["Strength", 4], ["Power", 3], ["Endurance", 4], ["Mobility", 3]] as const },
  { id: "adonis", name: "Adonis", route: "Bodybuilding", img: "/brand/coach-adonis.png",
    line: "Sculpt the body the way the masters carved marble.",
    stats: [["Strength", 4], ["Power", 3], ["Endurance", 3], ["Mobility", 2]] as const },
  { id: "nike", name: "Nike", route: "Hybrid Athlete · Engine", img: "/brand/coach-nike.png",
    line: "Victory is a habit. Bands, rope, laps. Daily.",
    stats: [["Strength", 3], ["Power", 4], ["Endurance", 5], ["Mobility", 3]] as const },
  { id: "atalanta", name: "Atalanta", route: "Calisthenics", img: "/brand/coach-atalanta.png",
    line: "Your body is the only barbell you will ever need.",
    stats: [["Strength", 3], ["Power", 3], ["Endurance", 4], ["Mobility", 5]] as const },
  { id: "hermes", name: "Hermes", route: "Running", img: "/brand/coach-hermes.png",
    line: "Swift feet, quiet mind. The miles are messages.",
    stats: [["Strength", 2], ["Power", 3], ["Endurance", 5], ["Mobility", 4]] as const },
];

const HERO_WORDS = ["Every", "legend", "begins", "with", "a", "single", "rep."];

/* Act V — the tribute. One free month, then the plan of your choosing. */
const TIERS = [
  { name: "First 30 Days", price: "Free", per: "no card · full temple", best: false },
  { name: "Monthly", price: "$8.99", per: "per month", best: false },
  { name: "Quarterly", price: "$22.99", per: "≈ $7.66 / month", best: false },
  { name: "Semi-Annual", price: "$44.99", per: "≈ $7.50 / month", best: false },
  { name: "Annual", price: "$74.99", per: "≈ $6.25 / month", best: true },
];

/* The crypto path into the temple, step by step. */
const CRYPTO_STEPS = [
  ["Forge a wallet", "Phantom or Solflare. Two minutes."],
  ["Enter with it", "Sign up with the wallet. It's your name here."],
  ["Keep USDC", "Same prices, paid in USDC when checkout opens."],
  ["The Vault favors wallets", "Monthly rewards for training performance. Wallets get them first."],
] as const;

/* Act III — real screens from the app, framed like votive tablets. */
const APP_SHOTS = [
  { src: "/landing/altar.png", title: "The Altar",
    sub: "Today's plan written out, the daily rites, and your coach's morning briefing." },
  { src: "/landing/arena.png", title: "The Arena",
    sub: "Live sessions — last time's numbers to beat, a rest timer, records the moment you break them." },
  { src: "/landing/monument.png", title: "The Monument",
    sub: "Your streak, the mosaic of your days, progress photos, the Hall of Honor." },
];

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
    setProgress(Math.max(0, Math.min(1, y / (vh * 1.05))));
  });

  // pick up the scroll position on mount (e.g. reload mid-page)
  useEffect(() => {
    const vh = window.innerHeight || 800;
    setProgress(Math.max(0, Math.min(1, window.scrollY / (vh * 1.05))));
  }, []);

  // gold spotlight that follows the pointer across the hero marble —
  // written straight to the node so it never re-renders the word reveal
  const glowRef = useRef<HTMLDivElement>(null);
  const moveGlow = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || !glowRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    glowRef.current.style.background =
      `radial-gradient(340px circle at ${e.clientX - r.left}px ${e.clientY - r.top}px, rgba(211,178,94,0.16), transparent 70%)`;
  };

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
            <a
              href="#tribute"
              className="hidden text-[11px] uppercase tracking-[0.2em] text-sec hover:text-ink sm:inline"
            >
              The Tribute
            </a>
            <Link href="/login" className="btn-ghost px-4 py-2 text-[11px] tracking-[0.14em]">
              Enter
            </Link>
          </div>
        </div>
        <MeanderBand />
      </div>

      {/* ACT I — pinned word reveal, then the first rep. The runway past the
          reveal (~15vh) is the dwell where the barbell invites a lift. */}
      <div className="relative h-[220vh]">
        <div
          onPointerMove={moveGlow}
          className="sticky top-0 flex h-dvh flex-col items-center justify-center gap-8 overflow-hidden px-6"
        >
          <div ref={glowRef} className="pointer-events-none absolute inset-0" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-light.png"
            alt="FitNext — the pillar and the bolt"
            className="-mb-2 w-[74px] transition-opacity duration-500 sm:w-[88px]"
            style={{ opacity: p > 0.04 ? 1 : 0 }}
          />
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
            style={{ opacity: p > 0.88 ? 1 : 0 }}
          >
            <GoldDivider lineWidth={54} />
          </div>
          {/* the tagline made literal: the visitor's first rep */}
          <DoARep visible={p > 0.9} />
          <div
            className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 transition-opacity duration-[400ms]"
            style={{ opacity: p < 0.88 ? 1 : 0 }}
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-faint">Scroll</span>
            <ChevronDown size={14} className="text-gold" />
          </div>
        </div>
      </div>

      {/* ACT II — the coaches */}
      <section id="coaches" className="relative px-5 pb-[60px] pt-[110px] sm:px-8">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-10 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.44em] text-gold">Act II</p>
            <h2
              className="mt-2.5 font-display font-bold"
              style={{ fontSize: "clamp(30px, 4vw, 52px)" }}
            >
              Choose your coach
            </h2>
            <p className="mx-auto mt-3 max-w-[520px] text-[15px] text-sec">
              Six immortals. Drag the wheel, tap a god. No gym required — most of the
              temple trains at home.
            </p>
          </div>
          <motion.div {...reveal}>
            <CoachRing />
          </motion.div>
        </div>
      </section>

      {/* meander divider */}
      <MeanderBand className="mx-auto my-10 max-w-[1180px]" />

      {/* ACT III — within the temple (the product itself, in gilded frames) */}
      <section id="inside" className="px-5 pt-14 sm:px-8 lg:pt-[80px]">
        <div className="mx-auto max-w-[1080px]">
          <div className="text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.44em] text-gold">Act III</p>
            <h2
              className="mt-2.5 font-display font-bold"
              style={{ fontSize: "clamp(30px, 4vw, 52px)" }}
            >
              Within the temple
            </h2>
            <p className="mx-auto mt-3 max-w-[520px] text-[15px] text-sec">
              Not mockups. Three screens from the app as it stands.
            </p>
          </div>
          <motion.div
            {...reveal}
            className="mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto px-2 pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0"
          >
            {APP_SHOTS.map((s) => (
              <TiltCard key={s.title} {...s} disabled={reduceMotion} />
            ))}
          </motion.div>
          <p className="mt-1 text-center font-mono text-[9px] uppercase tracking-[0.24em] text-faint lg:hidden">
            Swipe the tablets →
          </p>
          <p className="mt-1 hidden text-center font-mono text-[9px] uppercase tracking-[0.24em] text-faint lg:block">
            They tilt toward your cursor
          </p>
        </div>
      </section>

      {/* meander divider */}
      <MeanderBand className="mx-auto my-10 max-w-[1180px]" />

      {/* ACT IV — the emissary (Strava) */}
      <section id="strava" className="px-5 pt-14 sm:px-8 lg:pt-[80px]">
        <motion.div {...reveal} className="mx-auto max-w-[760px] text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.44em] text-gold">Act IV</p>
          <h2
            className="mt-2.5 font-display font-bold"
            style={{ fontSize: "clamp(30px, 4vw, 52px)" }}
          >
            Arrive with your history
          </h2>
          <p className="mx-auto mt-3 max-w-[560px] text-[15px] leading-relaxed text-sec">
            Your past work counts. Link Strava and it walks in with you — every run,
            ride, and lift from your watch, synced without being asked.
          </p>

          {/* the sync road: watch → Strava → temple */}
          <div className="mx-auto mt-8 flex max-w-[560px] flex-wrap items-center justify-center gap-2.5">
            <span className="flex items-center gap-2 rounded-full border border-line-strong bg-panel px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sec">
              <Watch size={13} className="text-gold" /> Garmin · Apple · Coros · Polar
            </span>
            <ArrowRight size={13} className="text-faint" aria-hidden />
            <span
              className="flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
              style={{ background: "#FC4C02" }}
            >
              <Activity size={13} /> Strava
            </span>
            <ArrowRight size={13} className="text-faint" aria-hidden />
            <span className="flex items-center gap-2 rounded-full border border-line-strong bg-panel px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
              The Temple
            </span>
          </div>

          <div className="mt-8">
            <Link
              href="/login?next=strava"
              className="inline-flex items-center gap-2.5 rounded-[4px] px-8 py-[15px] text-[12px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_14px_28px_-14px_rgba(252,76,2,0.65)] transition-transform active:translate-y-px"
              style={{ background: "linear-gradient(175deg, #ff6a2b 0%, #fc4c02 55%, #d94100 100%)" }}
            >
              <Activity size={15} /> Connect Strava &amp; enter
            </Link>
          </div>
          <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.24em] text-faint">
            New here? Make your account at the gate. Strava follows.
          </p>
        </motion.div>
      </section>

      {/* meander divider */}
      <MeanderBand className="mx-auto my-10 max-w-[1180px]" />

      {/* ACT V — the tribute (pricing + the crypto path) */}
      <section id="tribute" className="px-5 pt-14 sm:px-8 lg:pt-[80px]">
        <div className="mx-auto max-w-[1080px]">
          <motion.div {...reveal} className="text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.44em] text-gold">Act V</p>
            <h2
              className="mt-2.5 font-display font-bold"
              style={{ fontSize: "clamp(30px, 4vw, 52px)" }}
            >
              The tribute
            </h2>
            <p className="mx-auto mt-3 max-w-[520px] text-[15px] text-sec">
              Thirty days free. No card at the door. If you stay, choose your tribute.
            </p>
          </motion.div>

          <motion.div
            {...reveal}
            className="mt-11 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5"
          >
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={cn("relative flex flex-col items-center gap-1.5 px-4 py-6 text-center", !t.best && "panel")}
                style={
                  t.best
                    ? {
                        borderRadius: 6,
                        background:
                          "linear-gradient(165deg, #e9d191 0%, #d3b25e 45%, #b08d3e 100%)",
                        boxShadow:
                          "0 0 0 1px #a8863b, inset 0 1px 0 rgba(255,248,225,0.75), 0 18px 36px -18px rgba(70,58,30,0.55)",
                      }
                    : undefined
                }
              >
                {t.best && (
                  <span className="absolute -top-2.5 rounded-full border border-[#8a6f28] bg-[#fdf8ea] px-2.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-[#8a6f28]">
                    Best value
                  </span>
                )}
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.18em]",
                    t.best ? "text-[#5c4a1a]" : "text-sec"
                  )}
                >
                  {t.name}
                </span>
                <span
                  className={cn(
                    "font-display text-[26px] font-extrabold leading-none",
                    t.best ? "text-[#3c300f]" : t.price === "Free" ? "text-gold" : "text-ink"
                  )}
                >
                  {t.price}
                </span>
                <span
                  className={cn(
                    "font-mono text-[9px] uppercase tracking-[0.12em]",
                    t.best ? "text-[#6d5a22]" : "text-faint"
                  )}
                >
                  {t.per}
                </span>
              </div>
            ))}
          </motion.div>

          {/* the crypto path */}
          <motion.div {...reveal} className="panel mx-auto mt-9 max-w-[820px]">
            <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Coins size={15} className="text-gold" />
                <span className="font-display text-[13px] font-bold uppercase tracking-[0.16em]">
                  Join with crypto
                </span>
              </div>
              <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-faint">
                Solana · USDC
              </span>
            </div>
            <ol className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2">
              {CRYPTO_STEPS.map(([title, sub], i) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 font-display text-[15px] font-bold text-gold">
                    {toRoman(i + 1)}
                  </span>
                  <span>
                    <span className="block text-[12px] font-semibold text-ink">{title}</span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-sec">{sub}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-3.5">
              <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-faint">
                Card checkout works everywhere · crypto is the scenic route
              </p>
              <Link
                href="/login"
                className="btn-ghost inline-flex items-center gap-2 px-4 py-2.5 text-[10px] tracking-[0.14em]"
              >
                <Wallet size={12} className="text-gold" /> Enter with a wallet
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* meander divider */}
      <MeanderBand className="mx-auto my-10 max-w-[1180px]" />

      {/* ACT VI — entry */}
      <section id="enter" className="px-5 pb-[110px] pt-12 sm:px-8 lg:pt-[80px]">
        <motion.div {...reveal} className="mx-auto max-w-[680px] text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.44em] text-gold">Act VI</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-light.png"
            alt=""
            className="mx-auto mt-5 w-[64px]"
          />
          <h2
            className="mt-3 font-display font-extrabold leading-[1.12]"
            style={{ fontSize: "clamp(34px, 5vw, 60px)" }}
          >
            The temple is open.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-sec">
            Start in your living room. Dumbbells or nothing at all. Daily rites,
            nutrition to the gram, a guide for every labor, a coach who answers.
            Thirty days are yours.
          </p>
          <div className="mt-[34px] flex flex-wrap items-center justify-center gap-3.5">
            <EnterButton />
            <Link href="/login" className="btn-ghost px-[26px] py-[15px] text-xs tracking-[0.14em]">
              I have an account
            </Link>
          </div>
          <GoldDivider lineWidth={54} className="mt-11" />
          <p className="mt-[18px] font-mono text-[9px] uppercase tracking-[0.3em] text-faint">
            30 days free · No gym · No card · Mortals welcome
          </p>
        </motion.div>
      </section>
    </div>
  );
}

/* ---------------- Act II: 3D coach carousel ---------------- */

function CoachRing() {
  const N = GODS.length;
  const STEP = 360 / N;
  const [rot, setRot] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const facingIdx = ((rot % N) + N) % N;
  const shown = GODS[hoverIdx ?? facingIdx];

  // drag-to-spin: pointer x-drag turns the wheel live, release snaps to the
  // nearest god. `moved` suppresses the click that follows a drag.
  const [dragDeg, setDragDeg] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef({ startX: 0, active: false, moved: false });
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = { startX: e.clientX, active: true, moved: false };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    const deg = (e.clientX - dragState.current.startX) * 0.35;
    if (Math.abs(deg) > 2.5) dragState.current.moved = true;
    setDragDeg(deg);
  };
  const endDrag = () => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    setDragging(false);
    setDragDeg((deg) => {
      const steps = Math.round(deg / STEP);
      if (steps !== 0) {
        setRot((r) => r - steps);
        setHoverIdx(null);
      }
      return 0;
    });
    // let the trailing click event see `moved` before clearing it
    setTimeout(() => { dragState.current.moved = false; }, 60);
  };

  const pick = (i: number) => {
    if (dragState.current.moved) return; // that click was a drag
    let d = (((i - facingIdx) % N) + N) % N;
    if (d > N / 2) d -= N; // rotate the shortest way around
    setRot((r) => r + d);
    setHoverIdx(null);
  };

  return (
    <div>
      <div className="relative flex h-[440px] items-center justify-center">
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

        {/* 3D ring — drag anywhere on it to spin */}
        <div
          className="relative mb-[60px] h-[330px] w-[190px]"
          style={{ perspective: 1300, touchAction: "pan-y", cursor: dragging ? "grabbing" : "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div
            className="absolute inset-0"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateY(${-rot * STEP + dragDeg}deg)`,
              transition: dragging ? "none" : "transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {GODS.map((g, i) => {
              const facing = i === facingIdx;
              const model3d = COACH_MODELS[g.id as CoachId];
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
                    {/* gilded arch frame around the temple door */}
                    <div
                      className="h-full w-full p-[6px]"
                      style={{
                        borderRadius: "160px 160px 8px 8px",
                        background:
                          "linear-gradient(165deg, #e9d191 0%, #b08d3e 28%, #d3b25e 52%, #9a7b2d 78%, #dcc078 100%)",
                        boxShadow:
                          "0 0 0 1px #a8863b, inset 0 1px 0 rgba(255,248,225,0.75), 0 14px 30px -16px rgba(70,58,30,0.55)",
                      }}
                    >
                      <div
                        className="relative h-full w-full overflow-hidden bg-[#0b0f0e]"
                        style={{ borderRadius: "150px 150px 4px 4px" }}
                      >
                        <Image
                          src={g.img}
                          alt={`Coach ${g.name} — ${g.route}`}
                          fill
                          sizes="160px"
                          className="object-cover"
                          style={{ borderRadius: "150px 150px 4px 4px" }}
                        />
                        {model3d && <CoachStage model={model3d} selected={facing} />}
                        {/* ivory fillet between the gold frame and the scene */}
                        <div
                          className="pointer-events-none absolute inset-0 border-[3px] border-[#f7f4ec]"
                          style={{ borderRadius: "150px 150px 4px 4px" }}
                        />
                      </div>
                    </div>
                    {facing && (
                      <div
                        key={rot}
                        className="pointer-events-none absolute inset-0"
                        style={{
                          borderRadius: "160px 160px 8px 8px",
                          animation: "awakenGlow 1.6s ease",
                        }}
                      />
                    )}
                  </div>
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
        Drag to spin · tap a god to choose · three move in living marble
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

/* ---------------- Act I: the visitor's first rep ---------------- */

/** A barbell you actually lift: drag it up past the sticking point and the
 *  rep counts, in Roman numerals, with a laurel pop. The tagline, made
 *  physical — nobody else's landing page lets you train on it. */
function DoARep({ visible }: { visible: boolean }) {
  const [reps, setReps] = useState(0);
  const [pop, setPop] = useState(0);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2.5 transition-opacity duration-500",
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <motion.div
        drag="y"
        dragConstraints={{ top: -60, bottom: 0 }}
        dragElastic={0.06}
        dragSnapToOrigin
        whileDrag={{ scale: 1.05 }}
        onDragEnd={(_, info) => {
          if (info.offset.y < -42) {
            setReps((r) => r + 1);
            setPop((b) => b + 1);
            if (typeof navigator !== "undefined") navigator.vibrate?.(30);
          }
        }}
        className="cursor-grab touch-none active:cursor-grabbing"
        aria-label="Lift the barbell — drag it upward to count a rep"
        role="slider"
        aria-valuenow={reps}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setReps((r) => r + 1);
            setPop((b) => b + 1);
          }
        }}
      >
        <Barbell />
      </motion.div>
      <span
        key={pop}
        style={pop ? { animation: "laurelPop 0.45s ease" } : undefined}
        className={cn(
          "font-mono text-[10px] uppercase tracking-[0.3em]",
          reps > 0 ? "text-gold" : "text-faint"
        )}
      >
        {reps === 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <ChevronUp size={11} className="text-gold" /> Go on — lift one
          </span>
        ) : (
          `Reps · ${toRoman(reps)}`
        )}
      </span>
      <span
        className={cn(
          "text-[11px] text-sec transition-opacity duration-500",
          reps >= 5 ? "opacity-100" : "opacity-0"
        )}
      >
        {toRoman(Math.max(reps, 5))} already. The temple is below.
      </span>
    </div>
  );
}

/** Chiseled-gold barbell with real weight to it: dimensional highlights,
 *  a cast shadow on the marble, sized up on desktop. */
function Barbell() {
  return (
    <svg
      width="230"
      height="64"
      viewBox="0 0 230 64"
      aria-hidden
      className="w-[200px] sm:w-[230px]"
      style={{ filter: "drop-shadow(0 6px 10px rgba(70,58,30,0.28))" }}
    >
      <defs>
        <linearGradient id="bb-plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2e0ac" />
          <stop offset="30%" stopColor="#d3b25e" />
          <stop offset="62%" stopColor="#a8863b" />
          <stop offset="100%" stopColor="#8a6f28" />
        </linearGradient>
        <linearGradient id="bb-plate-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6dd" />
          <stop offset="100%" stopColor="#9a7b2d" />
        </linearGradient>
        <linearGradient id="bb-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e7dfcc" />
          <stop offset="45%" stopColor="#a29677" />
          <stop offset="100%" stopColor="#6d6350" />
        </linearGradient>
      </defs>
      {/* cast shadow on the marble floor */}
      <ellipse cx="115" cy="57" rx="86" ry="5" fill="rgba(70,58,30,0.16)" />
      {/* bar */}
      <rect x="10" y="23" width="210" height="7" rx="3.5" fill="url(#bb-bar)" />
      <rect x="10" y="24" width="210" height="2" rx="1" fill="rgba(255,251,240,0.55)" />
      {/* knurl marks */}
      {[96, 102, 108, 114, 120, 126, 132].map((x) => (
        <rect key={x} x={x} y="24" width="1.4" height="5" fill="rgba(70,58,30,0.28)" />
      ))}
      {/* inner plates */}
      <rect x="40" y="5" width="15" height="43" rx="4" fill="url(#bb-plate)" stroke="#7c6222" strokeWidth="1" />
      <rect x="42" y="7" width="4" height="39" rx="2" fill="url(#bb-plate-edge)" opacity="0.5" />
      <rect x="175" y="5" width="15" height="43" rx="4" fill="url(#bb-plate)" stroke="#7c6222" strokeWidth="1" />
      <rect x="177" y="7" width="4" height="39" rx="2" fill="url(#bb-plate-edge)" opacity="0.5" />
      {/* outer plates */}
      <rect x="24" y="11" width="12" height="31" rx="3.5" fill="url(#bb-plate)" stroke="#7c6222" strokeWidth="1" />
      <rect x="194" y="11" width="12" height="31" rx="3.5" fill="url(#bb-plate)" stroke="#7c6222" strokeWidth="1" />
      {/* collars */}
      <rect x="59" y="18" width="8" height="17" rx="2.5" fill="#d3b25e" stroke="#8a6f28" strokeWidth="0.9" />
      <rect x="163" y="18" width="8" height="17" rx="2.5" fill="#d3b25e" stroke="#8a6f28" strokeWidth="0.9" />
    </svg>
  );
}

/* ---------------- Act III: tilting votive tablets ---------------- */

/** A phone screen in a gilded frame that tilts toward the cursor — transforms
 *  are written straight to the node so tracking never re-renders. */
function TiltCard({ src, title, sub, disabled }: {
  src: string; title: string; sub: string; disabled: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (disabled || !el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transition = "transform 70ms linear";
    el.style.transform =
      `perspective(950px) rotateX(${(-py * 9).toFixed(2)}deg) rotateY(${(px * 11).toFixed(2)}deg) scale(1.02)`;
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 0.45s ease";
    el.style.transform = "perspective(950px) rotateX(0deg) rotateY(0deg) scale(1)";
  };

  return (
    <figure className="w-[240px] shrink-0 snap-center sm:w-[260px] lg:w-auto">
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="p-[6px]"
        style={{
          borderRadius: 30,
          background:
            "linear-gradient(165deg, #e9d191 0%, #b08d3e 28%, #d3b25e 52%, #9a7b2d 78%, #dcc078 100%)",
          boxShadow:
            "0 0 0 1px #a8863b, inset 0 1px 0 rgba(255,248,225,0.75), 0 18px 36px -18px rgba(70,58,30,0.55)",
        }}
      >
        <div
          className="relative w-full overflow-hidden border-[3px] border-[#f7f4ec] bg-panel"
          style={{ borderRadius: 24, aspectRatio: "390 / 800" }}
        >
          <Image
            src={src}
            alt={`${title} — FitNext app screen`}
            fill
            sizes="(min-width: 1024px) 330px, 260px"
            className="object-cover object-top"
          />
        </div>
      </div>
      <figcaption className="mt-4 px-1 text-center">
        <p className="font-display text-[15px] font-bold tracking-[0.06em]">{title}</p>
        <p className="mx-auto mt-1 max-w-[300px] text-[11px] leading-relaxed text-sec">{sub}</p>
      </figcaption>
    </figure>
  );
}

/* ---------------- Act IV: gleaming entry ---------------- */

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
