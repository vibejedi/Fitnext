import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "font-display text-xl font-bold tracking-[0.1em] select-none",
        className
      )}
    >
      <span className="text-ink">FIT</span>
      <span className="text-gold">NEXT</span>
    </Link>
  );
}

/** Greek meander (key) divider line — engraved antique gold. */
export function GreekKey({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 16"
      preserveAspectRatio="xMidYMid meet"
      className={cn("h-3 text-meander", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      {[0, 48, 96, 144, 192].map((x) => (
        <path
          key={x}
          d={`M${x} 14 V6 H${x + 16} V12 H${x + 8} V9`}
        />
      ))}
    </svg>
  );
}

/** Full-width meander strip — runs under headers. */
export function MeanderBand({ className }: { className?: string }) {
  return <div className={cn("meander-band w-full", className)} aria-hidden />;
}

/** Gold ornament: two hairlines flanking a gold dot. */
export function GoldDivider({
  className,
  lineWidth = 44,
}: {
  className?: string;
  lineWidth?: number;
}) {
  return (
    <div className={cn("flex items-center justify-center gap-2.5", className)} aria-hidden>
      <span className="block h-px bg-meander" style={{ width: lineWidth }} />
      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--gold)">
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span className="block h-px bg-meander" style={{ width: lineWidth }} />
    </div>
  );
}
