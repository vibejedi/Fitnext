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
        "panel panel-hover relative flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left",
        selected && "border-green/70 glow-green"
      )}
    >
      <span className="font-medium text-marble">{label}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
      {selected && (
        <span className="absolute right-3 top-3 text-green">
          <Check size={16} />
        </span>
      )}
    </button>
  );
}
