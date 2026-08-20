"use client";

import { useEffect, useState } from "react";
import { Activity, Check, Link2 } from "lucide-react";
import { Panel } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * The Emissary — link Strava once and every watch workout (Garmin, Apple
 * Watch, Coros, Polar… they all sync into Strava) flows into the training
 * log by itself. Renders nothing until the Strava app credentials are
 * configured; requires a signed-in athlete since tokens are stored
 * per-account.
 */

const STRAVA_ENABLED = !!process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;

type Status =
  | { state: "loading" }
  | { state: "signedout" }
  | { state: "disconnected" }
  | { state: "connected" };

export function StravaPanel() {
  const [status, setStatus] = useState<Status>({ state: "loading" });
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const res = await fetch("/api/strava/status");
      const j = await res.json();
      if (!j.configured) return; // stays "loading" → renders nothing below
      setStatus(
        !j.signedIn ? { state: "signedout" }
        : j.connected ? { state: "connected" }
        : { state: "disconnected" }
      );
    } catch {
      // network hiccup — leave as-is
    }
  };

  useEffect(() => {
    if (STRAVA_ENABLED && isSupabaseConfigured) void refresh();
  }, []);

  if (!STRAVA_ENABLED || !isSupabaseConfigured || status.state === "loading") return null;

  const disconnect = async () => {
    if (busy) return;
    setBusy(true);
    await fetch("/api/strava/status", { method: "DELETE" }).catch(() => {});
    setBusy(false);
    void refresh();
  };

  return (
    <Panel title="The Emissary">
      <div className="flex items-center gap-3 px-[14px] py-[13px] lg:px-[18px]">
        <Activity size={17} strokeWidth={1.8} className="shrink-0 text-gold" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold lg:text-sm">Strava</p>
          <p className="mt-0.5 text-[10px] text-sec lg:text-[11px]">
            {status.state === "connected"
              ? "Linked — watch workouts arrive in your log on their own"
              : "Link once and workouts from any watch — Garmin, Apple, Coros — log themselves"}
          </p>
        </div>
        {status.state === "connected" ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-[3px] border border-line-strong bg-done-wash px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-gold">
              <Check size={11} /> Linked
            </span>
            <button
              onClick={disconnect}
              disabled={busy}
              className="px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-faint active:opacity-60 disabled:opacity-40"
            >
              {busy ? "…" : "Unlink"}
            </button>
          </div>
        ) : status.state === "signedout" ? (
          <span className="shrink-0 text-right text-[9px] leading-snug text-faint">
            Sign in first —<br />the link is saved to your name
          </span>
        ) : (
          <a
            href="/api/strava/connect"
            className="btn-ghost inline-flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-[10px]"
          >
            <Link2 size={12} /> Connect
          </a>
        )}
      </div>
    </Panel>
  );
}
