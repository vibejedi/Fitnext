"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MessageSquare, Play } from "lucide-react";
import { GoldDivider } from "@/components/Brand";
import { useGleam } from "@/components/ui";
import { useFit } from "@/lib/store";
import { chatPresence } from "@/lib/coachBus";
import { coachById } from "@/lib/coaches";
import { GOALS } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

/**
 * The coach shrine (mobile) / hero strip (desktop) with the "oracle awakens"
 * portrait animation. "Speak with Coach" focuses a mounted chat, or carries
 * the athlete to the Coach screen when none is on this screen.
 */

export function CoachHero() {
  const router = useRouter();
  const fit = useFit();
  const [playing, setPlaying] = useState(false);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (playTimer.current) clearTimeout(playTimer.current); }, []);

  const coach = coachById(fit.coach);
  const goal = GOALS.find((g) => g.id === fit.goal);

  // "the oracle awakens" — plays the coach video/animation for ~2.4s
  const awaken = () => {
    if (playing) return;
    setPlaying(true);
    if (playTimer.current) clearTimeout(playTimer.current);
    playTimer.current = setTimeout(() => setPlaying(false), 2400);
  };

  const speakWithCoach = () => {
    if (chatPresence.count > 0) {
      document.getElementById("coach-chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.dispatchEvent(new Event("coach-focus"));
    } else {
      router.push("/coach");
    }
  };

  if (!coach) return null;

  return (
    <>
      {/* coach shrine (mobile) */}
      <div className="pt-1.5 text-center lg:hidden">
        <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-gold">{coach.route}</p>
        <CoachPortrait
          coach={coach}
          videoUrl={fit.coachVideoUrl}
          playing={playing}
          onClick={awaken}
          className="mx-auto mt-3 h-[190px] w-[150px]"
          radius="150px 150px 6px 6px"
          ring={5}
          shadow
        />
        <h1 className="mt-3 font-display text-2xl font-bold tracking-[0.04em]">Coach {coach.name}</h1>
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
          playing={playing}
          onClick={awaken}
          className="h-[88px] w-[72px] shrink-0"
          radius="72px 72px 4px 4px"
          ring={3}
        />
        <div className="flex-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-gold">{coach.route}</p>
          <h1 className="mt-0.5 font-display text-[26px] font-bold tracking-[0.04em]">
            Coach {coach.name} is ready.
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
    </>
  );
}

export function SpeakButton({ onClick, className }: { onClick: () => void; className?: string }) {
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

export function CoachPortrait({ coach, videoUrl, playing, onClick, className, radius, ring, shadow }: {
  coach: NonNullable<ReturnType<typeof coachById>>;
  videoUrl: string | null;
  playing: boolean;
  onClick: () => void;
  className?: string;
  radius: string;
  ring: number;
  shadow?: boolean;
}) {
  const inset = `inset 0 0 0 ${ring}px var(--page-top), inset 0 0 0 ${ring + 1}px var(--line-strong)`;
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
            priority
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
        <span className="absolute bottom-1.5 right-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-line-strong bg-[color-mix(in_srgb,var(--panel)_92%,transparent)] shadow-[0_2px_6px_-2px_rgba(70,58,30,0.4)] lg:bottom-1 lg:right-1 lg:h-5 lg:w-5">
          <Play size={9} className="fill-gold text-gold" />
        </span>
      )}
    </div>
  );
}
