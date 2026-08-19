"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Sacred Marble chart primitives — tiny dependency-free SVGs in the temple
 * palette. Bars for weekly volume & calories, a line for lift progression,
 * a month-grid heatmap for consistency, and the closure Ring around Seal
 * the Day. All read their colors from the CSS tokens via currentColor or
 * the raw hex the tokens resolve to.
 */

const GOLD = "#9a7b2d";
const GLEAM = "#d3b25e";
const LINE_SOFT = "#e7dfcc";
const FAINT = "#a29677";
const CLAY = "#b4552b";

/* ---------------- Bars (weekly volume, calorie trend) ---------------- */

export interface BarDatum {
  label: string;
  value: number;
  /** Optional per-bar tint: "gold" (default) | "clay" | "faint". */
  tone?: "gold" | "clay" | "faint";
  /** Second line under the label (e.g. session count). */
  sub?: string;
}

/** Chiseled bar chart: value captions above gold bars, labels below. */
export function TrendBars({ data, format, target, className }: {
  data: BarDatum[];
  /** Formats the value caption above each bar. */
  format?: (v: number) => string;
  /** Optional target line drawn across the bars (same unit as values). */
  target?: number;
  className?: string;
}) {
  const max = Math.max(target ?? 0, ...data.map((d) => d.value), 1);
  const fmt = format ?? ((v: number) => v.toLocaleString());
  const tones = { gold: GOLD, clay: CLAY, faint: FAINT } as const;
  return (
    <div className={cn("relative", className)}>
      {target !== undefined && target > 0 && (
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line-strong"
          style={{ bottom: `calc(${(target / max) * 72}px + 26px)` }}
          aria-hidden
        />
      )}
      <div className="grid auto-cols-fr grid-flow-col items-end gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex min-w-0 flex-col items-center gap-1">
            <span className="font-mono text-[8px] text-sec">
              {d.value > 0 ? fmt(d.value) : ""}
            </span>
            <div className="flex h-[72px] w-full items-end justify-center">
              <div
                className="w-full max-w-[26px] rounded-t-[2px]"
                style={{
                  height: `${Math.max(d.value > 0 ? 3 : 1, (d.value / max) * 72)}px`,
                  background: d.value > 0 ? tones[d.tone ?? "gold"] : LINE_SOFT,
                }}
              />
            </div>
            <span className="truncate font-mono text-[8px] uppercase tracking-[0.06em] text-faint">
              {d.label}
            </span>
            {d.sub !== undefined && (
              <span className="font-mono text-[8px] text-gold">{d.sub}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Line (lift progression, bodyweight) ---------------- */

export interface LinePoint {
  y: number;
  /** Marks the point with a gold record dot + halo. */
  pr?: boolean;
}

/** Smooth-enough polyline with an area wash — the line that goes up. */
export function TrendLine({ points, height = 72, className }: {
  points: LinePoint[];
  height?: number;
  className?: string;
}) {
  const gid = useId();
  if (points.length === 0) return null;
  const w = 100; // viewBox units; stretches to container
  const ys = points.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const pad = 8;
  const px = (i: number) =>
    points.length === 1 ? w / 2 : (i / (points.length - 1)) * (w - 4) + 2;
  const py = (y: number) => height - pad - ((y - min) / span) * (height - pad * 2);
  const path = points.map((p, i) => `${i ? "L" : "M"}${px(i)},${py(p.y)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GLEAM} stopOpacity="0.35" />
          <stop offset="100%" stopColor={GLEAM} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L${px(points.length - 1)},${height} L${px(0)},${height} Z`}
        fill={`url(#${gid})`}
      />
      <path d={path} fill="none" stroke={GOLD} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      {points.map((p, i) =>
        p.pr ? (
          <g key={i}>
            <circle cx={px(i)} cy={py(p.y)} r="4" fill={GLEAM} opacity="0.35" />
            <circle cx={px(i)} cy={py(p.y)} r="2" fill={GOLD} />
          </g>
        ) : (
          <circle key={i} cx={px(i)} cy={py(p.y)} r="1.4" fill={GOLD} />
        )
      )}
    </svg>
  );
}

/* ---------------- Consistency heatmap (rites per day) ---------------- */

/** GitHub-style week columns: one cell per day, gold intensity = completion.
 *  `days` maps YYYY-MM-DD → 0..1 fraction. */
export function ConsistencyGrid({ days, weeks = 16, className }: {
  days: Record<string, number>;
  weeks?: number;
  className?: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // last cell = today; columns are weeks, rows are Mon..Sun
  const dow = (today.getDay() + 6) % 7; // Mon=0
  const cells: { day: string; frac: number | null; isToday: boolean }[][] = [];
  for (let wk = 0; wk < weeks; wk++) {
    const col: { day: string; frac: number | null; isToday: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const offset = (weeks - 1 - wk) * 7 + dow - d;
      const date = new Date(today);
      date.setDate(date.getDate() - offset);
      const day = date.toLocaleDateString("en-CA");
      const future = date.getTime() > today.getTime();
      col.push({
        day,
        frac: future ? null : days[day] ?? 0,
        isToday: offset === 0,
      });
    }
    cells.push(col);
  }
  const fill = (f: number) =>
    f <= 0 ? LINE_SOFT
    : f < 0.4 ? "#e2d3a8"
    : f < 0.8 ? GLEAM
    : f < 1 ? "#b8963f"
    : GOLD;
  return (
    <div className={cn("flex justify-center gap-[3px]", className)} role="img" aria-label="Daily rite completion, last weeks">
      {cells.map((col, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {col.map((c) => (
            <div
              key={c.day}
              title={c.frac === null ? undefined : `${c.day} · ${Math.round((c.frac ?? 0) * 100)}%`}
              className={cn("h-[10px] w-[10px] rounded-[2px]", c.isToday && "ring-1 ring-gold ring-offset-1 ring-offset-panel")}
              style={{ background: c.frac === null ? "transparent" : fill(c.frac) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Closure ring (Seal the Day) ---------------- */

/** Circular progress ring — the open loop the day closes. */
export function Ring({ pct, size = 64, stroke = 5, children, className }: {
  pct: number; // 0..1
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, pct));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={LINE_SOFT} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={clamped >= 1 ? GOLD : GLEAM}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
