"use client";

import { useState } from "react";
import { ChevronDown, Play, Search } from "lucide-react";
import { TODAY_GUIDES, GUIDE_LIBRARY, filterGuides, guideVideoSrc, type Guide } from "@/lib/guides";
import { cn, toRoman } from "@/lib/utils";

/** Collapsible movement-guide shorts: today's session moves + full library. */

export function MovementGuides() {
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
