"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function Choice({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "panel panel-hover relative flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors active:translate-y-px",
        selected && "border-gold bg-done-wash"
      )}
      style={
        selected
          ? { boxShadow: "0 0 0 1px var(--gold), 0 8px 20px -12px rgba(70,58,30,0.45)" }
          : undefined
      }
    >
      <span className="pr-7 font-medium text-marble">{label}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
      {selected && (
        <span
          className="absolute right-3 top-3 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-line-strong bg-panel text-gold"
          style={{ animation: "laurelPop 0.45s ease" }}
        >
          <Check size={11} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
