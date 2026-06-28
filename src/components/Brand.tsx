import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "font-display text-xl font-bold tracking-wide select-none",
        className
      )}
    >
      <span className="text-marble">FIT</span>
      <span className="text-green text-glow">NEXT</span>
    </Link>
  );
}

/** Greek meander (key) divider line. */
export function GreekKey({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 16"
      preserveAspectRatio="xMidYMid meet"
      className={cn("h-3 text-green/60", className)}
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
