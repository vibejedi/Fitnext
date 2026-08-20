"use client";

import { useEffect, useState } from "react";
import { Camera, Eye, EyeOff, ImageUp } from "lucide-react";
import { Panel } from "@/components/ui";
import { uploadProgressPhoto, listProgressPhotos, type ProgressPhoto } from "@/lib/sync";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn, toRoman } from "@/lib/utils";

/**
 * Progress photos — veiled by default, stored in the private bucket. Two
 * ways in: shoot one live with the camera, or upload one already on the
 * phone (yesterday's mirror shot counts too).
 */

export function ProgressPhotos() {
  const [hidden, setHidden] = useState(true);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hidden) void listProgressPhotos().then(setPhotos);
  }, [hidden]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    const ok = await uploadProgressPhoto(file);
    if (ok) setPhotos(await listProgressPhotos());
    else setError(isSupabaseConfigured
      ? "That photo didn't make it to the vault — try again."
      : "Sign in to store photos privately in the cloud.");
    setBusy(false);
  };

  return (
    <Panel
      title="Progress Photos"
      action={
        <button
          onClick={() => setHidden((h) => !h)}
          className="inline-flex items-center gap-1.5 rounded-[3px] border border-line-strong bg-panel-alt px-2.5 py-[5px] text-[9px] font-semibold uppercase tracking-[0.16em] text-gold active:translate-y-px active:bg-pressed lg:px-3 lg:py-1.5 lg:text-[10px]"
        >
          {hidden ? <Eye size={11} /> : <EyeOff size={11} />}
          {hidden ? "Reveal" : "Hide"}
        </button>
      }
    >
      {hidden ? (
        <div className="flex flex-col items-center gap-1.5 px-[14px] py-[22px] text-center lg:flex-row lg:justify-center lg:gap-3 lg:text-left">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-line-strong bg-panel-alt lg:h-8 lg:w-8">
            <EyeOff size={13} className="text-gold" />
          </span>
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.14em] lg:text-[13px]">Veiled</p>
            <p className="mt-px text-[10px] text-sec lg:text-[11px]">
              Your photos stay private — only you can reveal them
            </p>
          </div>
        </div>
      ) : (
        <div className="px-[14px] py-3 lg:px-[18px] lg:py-[14px]">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.26em] text-gold lg:text-[10px]">
              Before · After
            </span>
            <span className="h-px flex-1 bg-line-soft" />
            <span className="font-mono text-[8px] text-faint lg:text-[9px]">
              WEEK I → {toRoman(Math.max(photos.length, 4))}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-2.5">
            {photos.length === 0 ? (
              <>
                <PhotoPlaceholder label="Before · W I" gold={false} />
                <PhotoPlaceholder label="After · W IV" gold />
              </>
            ) : (
              photos.map((p, i) => (
                <div key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-[4px] border border-line">
                  {/* signed URLs are short-lived — plain img, not next/image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`Progress week ${i + 1}`} className="h-full w-full object-cover" />
                  <span className="absolute left-1.5 top-1.5 rounded-[2px] border border-line bg-[color-mix(in_srgb,var(--panel)_90%,transparent)] px-[5px] py-px text-[7px] uppercase tracking-[0.2em] text-sec lg:text-[8px]">
                    W {toRoman(i + 1)}
                  </span>
                </div>
              ))
            )}
            {/* add a photo — camera OR upload from the phone's library */}
            <div
              className={cn(
                "flex aspect-[3/4] flex-col rounded-[4px] border border-dashed border-line-strong",
                busy && "opacity-50"
              )}
            >
              {busy ? (
                <span className="flex flex-1 items-center justify-center text-[9px] text-gold animate-pulse-glow">
                  Uploading…
                </span>
              ) : (
                <>
                  <label className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 border-b border-dashed border-line-soft text-[9px] font-semibold uppercase tracking-[0.14em] text-gold active:bg-pressed">
                    <Camera size={14} />
                    Take photo
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} disabled={busy} />
                  </label>
                  <label className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-gold active:bg-pressed">
                    <ImageUp size={14} />
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
                  </label>
                </>
              )}
            </div>
            <div className="hidden aspect-[3/4] flex-col items-center justify-center gap-1 rounded-[4px] border border-dashed border-line-soft text-[9px] uppercase tracking-[0.14em] text-faint lg:flex">
              Week {toRoman(Math.max(photos.length, 4) + 4)}
            </div>
          </div>
          {error && <p className="mt-2 text-center text-[10px] text-clay">{error}</p>}
          <p className="mt-2 text-center text-[9px] text-faint lg:text-[10px]">
            {isSupabaseConfigured
              ? "Stored privately · never shared, never on the leaderboard"
              : "Sign in to store photos privately in the cloud"}
          </p>
        </div>
      )}
    </Panel>
  );
}

function PhotoPlaceholder({ label, gold }: { label: string; gold: boolean }) {
  return (
    <div
      className="relative flex aspect-[3/4] items-center justify-center rounded-[4px] border border-line"
      style={{ background: "linear-gradient(180deg,#f3ecd9,#e7dcc2)" }}
    >
      <span
        className={cn(
          "absolute left-1.5 top-1.5 rounded-[2px] border bg-[color-mix(in_srgb,var(--panel)_90%,transparent)] px-[5px] py-px text-[7px] uppercase tracking-[0.2em] lg:text-[8px]",
          gold ? "border-line-strong text-gold" : "border-line text-sec"
        )}
      >
        {label}
      </span>
      <Camera size={20} strokeWidth={1.6} className="text-line-strong" />
    </div>
  );
}
