"use client";

import { useState } from "react";
import { Check, Pencil, RotateCcw } from "lucide-react";
import { Panel } from "@/components/ui";
import { useFit, localDay } from "@/lib/store";
import { pushProfile, pushRites } from "@/lib/sync";
import { RITES, EMPTY_RITES, ritesWith, type RiteId } from "@/lib/rites";
import { cn, toRoman } from "@/lib/utils";

/**
 * The Daily Rites panel — tap to complete, pencil to edit. Editing lets the
 * athlete rewrite any rite's target ("12,000 steps", "20 min mobility"…);
 * overrides sync to the profile so every device shows the same rites.
 */

export function DailyRites() {
  const fit = useFit();
  const [editing, setEditing] = useState(false);

  const today = localDay();
  const rites = fit.ritesDate === today ? fit.rites : EMPTY_RITES;
  const effective = ritesWith(fit.riteOverrides);
  const doneCount = effective.filter((r) => rites[r.id]).length;

  const toggleRite = (id: RiteId) => {
    fit.toggleRite(id);
    void pushRites(today, useFit.getState().rites);
  };

  const setTarget = (id: RiteId, target: string) => {
    fit.setRiteTarget(id, target);
  };

  const finishEditing = () => {
    setEditing(false);
    void pushProfile(useFit.getState());
  };

  return (
    <Panel
      className="order-1"
      title="Daily Rites"
      action={
        <span className="flex items-center gap-2.5">
          <span className="font-mono text-[9px] tracking-[0.12em] text-gold lg:text-[10px]">
            {toRoman(doneCount)} / {toRoman(effective.length)}
          </span>
          <button
            onClick={() => (editing ? finishEditing() : setEditing(true))}
            aria-label={editing ? "Done editing rites" : "Edit your rites"}
            title={editing ? "Done" : "Edit your rites"}
            className={cn(
              "inline-flex items-center gap-1 rounded-[3px] border px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.14em] active:translate-y-px",
              editing
                ? "border-line-strong bg-done-wash text-gold"
                : "border-line-soft text-faint hover:text-gold"
            )}
          >
            {editing ? <Check size={10} /> : <Pencil size={10} />}
            {editing ? "Done" : "Edit"}
          </button>
        </span>
      }
    >
      {effective.map((r) => {
        const done = rites[r.id];
        const overridden = !!fit.riteOverrides[r.id];
        if (editing) {
          const original = RITES.find((x) => x.id === r.id)!;
          return (
            <div
              key={r.id}
              className="flex w-full items-center gap-2.5 border-b border-line-soft px-[14px] py-2.5 lg:px-[18px]"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold lg:text-[13px]">{r.label}</span>
                <input
                  value={fit.riteOverrides[r.id] ?? ""}
                  onChange={(e) => setTarget(r.id, e.target.value)}
                  placeholder={original.target}
                  maxLength={80}
                  aria-label={`${r.label} target`}
                  className="mt-1 w-full rounded-[3px] border border-line bg-panel-alt px-2 py-1.5 text-[11px] text-ink outline-none placeholder:text-faint focus:border-line-strong"
                />
              </span>
              {overridden && (
                <button
                  onClick={() => setTarget(r.id, "")}
                  title="Reset to default"
                  aria-label={`Reset ${r.label} to default`}
                  className="shrink-0 p-1.5 text-faint hover:text-gold"
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </div>
          );
        }
        return (
          <button
            key={r.id}
            onClick={() => toggleRite(r.id)}
            className={cn(
              "flex w-full select-none items-center gap-2.5 border-b border-line-soft px-[14px] py-2.5 text-left transition-colors active:bg-pressed lg:px-[18px]",
              done ? "bg-done-wash text-ink" : "text-faint"
            )}
          >
            <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[2px] border border-line-strong">
              {done && (
                <Check
                  size={13}
                  strokeWidth={3}
                  className="text-gold"
                  style={{ animation: "laurelPop 0.45s ease" }}
                />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold lg:text-[13px]">{r.label}</span>
              <span className="mt-px block text-[10px] text-sec lg:text-[11px]">{r.target}</span>
            </span>
            <span className="shrink-0 rounded-[2px] border border-line-soft px-[5px] py-[2px] text-[8px] uppercase tracking-[0.16em] text-faint">
              {overridden ? "yours" : r.source}
            </span>
          </button>
        );
      })}
      {editing && (
        <p className="px-[14px] py-2 text-[9px] text-faint lg:px-[18px]">
          Rewrite any target to make it yours — leave one blank to fall back to your coach&apos;s default.
        </p>
      )}
    </Panel>
  );
}
