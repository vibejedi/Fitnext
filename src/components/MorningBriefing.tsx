"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Panel } from "@/components/ui";
import { useTodayPlan, planAsText } from "@/components/TodayPlan";
import { useFit, localDay } from "@/lib/store";
import { buildBriefingContext, localBriefing } from "@/lib/briefing";
import { coachById } from "@/lib/coaches";

/**
 * Morning briefing — the coach speaks first. Generated once per local day
 * (cached in the store), three scannable lines: Yesterday / Today / One
 * thing. AI-written when the key is configured; the deterministic local
 * version otherwise — the card never sits empty.
 */

export function MorningBriefing() {
  const fit = useFit();
  const plan = useTodayPlan();
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);
  const today = localDay();
  const coach = coachById(fit.coach);
  const cached = fit.briefing?.day === today ? fit.briefing.text : null;

  const generate = async (force = false) => {
    if (inFlight.current) return;
    if (!force && cached) return;
    inFlight.current = true;
    setLoading(true);
    const s = useFit.getState();
    const ctx = buildBriefingContext(s, today, plan, planAsText(plan));
    let text: string | null = null;
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: ctx }),
      });
      if (res.ok) text = (await res.text()).trim() || null;
    } catch {
      // fall through to the local briefing
    }
    useFit.getState().set("briefing", { day: today, text: text ?? localBriefing(ctx) });
    inFlight.current = false;
    setLoading(false);
  };

  useEffect(() => {
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  const lines = (cached ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((l) => {
      const i = l.indexOf(":");
      return i > 0 && i < 24
        ? { label: l.slice(0, i).trim(), text: l.slice(i + 1).trim() }
        : { label: "", text: l };
    });

  return (
    <Panel
      title="Morning Briefing"
      action={
        <button
          onClick={() => void generate(true)}
          disabled={loading}
          className="p-1.5 text-gold active:translate-y-px active:opacity-60 disabled:opacity-40"
          aria-label="Regenerate briefing"
        >
          <RotateCcw size={12} />
        </button>
      }
    >
      <div className="flex gap-3 px-[14px] py-3 lg:px-[18px] lg:py-[14px]">
        {coach && (
          <div className="relative h-11 w-9 shrink-0 overflow-hidden rounded-t-full border border-line-strong bg-panel-alt">
            <Image src={coach.image} alt={`Coach ${coach.name}`} fill sizes="36px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {!cached ? (
            <p className="animate-pulse-glow py-2 text-[11px] text-faint">
              Coach {coach?.name ?? ""} reads yesterday&apos;s records…
            </p>
          ) : (
            <div className="flex flex-col gap-[7px]">
              {lines.map((l, i) => (
                <p key={i} className="text-[11px] leading-[1.5] text-ink lg:text-xs">
                  {l.label && (
                    <span className="mr-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-gold">
                      {l.label}
                    </span>
                  )}
                  {l.text}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
