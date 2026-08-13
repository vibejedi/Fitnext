"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* Shared Sacred Marble building blocks used across the module screens. */

/** Gold gleam + ring pulse, retriggered per click by alternating keyframe names. */
export function useGleam(kind: "gleam" | "ring" = "gleam") {
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

export function Panel({ title, action, children, className }: {
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

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-panel px-2.5 py-3.5 text-center lg:px-3 lg:py-[18px]">
      <div className="font-display text-[19px] font-bold text-ink lg:text-[22px]">{value}</div>
      <div className="mt-1 text-[8px] uppercase tracking-[0.22em] text-gold lg:text-[9px]">{label}</div>
    </div>
  );
}

export function SummaryStrip({ items, className }: {
  items: [string, string][]; className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-px border border-line bg-line", className)}>
      {items.map(([value, label], i) => (
        <div key={i} className="bg-panel px-2 py-3 text-center">
          <div className="truncate font-display text-[17px] font-bold text-ink lg:text-[19px]">{value}</div>
          <div className="mt-0.5 text-[8px] uppercase tracking-[0.2em] text-gold">{label}</div>
        </div>
      ))}
    </div>
  );
}

/** A collapsible day/session row with a chiseled summary header. */
export function Expandable({ header, defaultOpen, children }: {
  header: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section className="panel">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full select-none items-center gap-3 px-[14px] py-3 text-left active:bg-pressed lg:px-[18px]"
      >
        <div className="min-w-0 flex-1">{header}</div>
        <ChevronDown
          size={15}
          className={cn("shrink-0 text-gold transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && <div className="border-t border-line-soft">{children}</div>}
    </section>
  );
}

export function EmptyState({ icon, title, sub, action }: {
  icon: React.ReactNode; title: string; sub: string; action?: React.ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-panel-alt">
        {icon}
      </span>
      <p className="font-display text-sm font-bold uppercase tracking-[0.14em]">{title}</p>
      <p className="max-w-xs text-[11px] text-sec">{sub}</p>
      {action}
    </div>
  );
}

/** Local date string N days before today. */
export const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("en-CA");
};

/** "Today" / "Yesterday" / "Mon, Jul 28" for a YYYY-MM-DD local day. */
export function labelDay(day: string, today: string, yesterday: string): string {
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  const d = new Date(`${day}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/** Full-screen dialog scrim + centered sheet, Sacred Marble style. */
export function Sheet({ onDismiss, children, wide }: {
  onDismiss: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(33,29,22,0.4)] backdrop-blur-[2px] sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <div className={cn("panel max-h-[92dvh] w-full overflow-y-auto", wide ? "max-w-lg" : "max-w-md")}>
        {children}
      </div>
    </div>
  );
}
