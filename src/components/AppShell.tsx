"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Landmark, Dumbbell, Apple, MessageSquare, Trophy, Flame, ScrollText,
  SlidersHorizontal, Sun, Moon,
} from "lucide-react";
import { Wordmark, MeanderBand } from "@/components/Brand";
import { AuthButton } from "@/components/AuthButton";
import { useFit, type Theme, type UiMode } from "@/lib/store";
import { cn, toRoman } from "@/lib/utils";

/**
 * The app shell shared by every module screen: sticky marble header on top,
 * and — on mobile — a fixed bottom tab bar, one tab per module. The tab
 * layout maps 1:1 onto an iOS tab bar so the Expo/native port can mirror it
 * screen-for-screen. Desktop shows the tabs inline in the header instead.
 */

const TABS = [
  { href: "/dashboard", label: "Today", icon: Landmark },
  { href: "/train", label: "Train", icon: Dumbbell },
  { href: "/nutrition", label: "Fuel", icon: Apple },
  { href: "/coach", label: "Coach", icon: MessageSquare },
  { href: "/progress", label: "Progress", icon: Trophy },
] as const;

export function AppShell({ children, maxWidth = "max-w-[1280px]" }: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const pathname = usePathname();
  const streak = useFit((s) => s.streak);
  const theme = useFit((s) => s.theme);

  // Obsidian is applied to <html> only while an app screen is mounted, so
  // the landing/onboarding/login always stay Marble.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "obsidian") root.dataset.theme = "obsidian";
    else delete root.dataset.theme;
    return () => { delete root.dataset.theme; };
  }, [theme]);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* header */}
      <header className="sticky top-0 z-20 border-b border-line bg-[color-mix(in_srgb,var(--page-top)_92%,transparent)] backdrop-blur">
        <div className={cn("mx-auto flex h-[54px] w-full items-center justify-between px-[18px] lg:h-[60px] lg:px-8", maxWidth)}>
          <div className="flex items-center gap-5">
            {/* Wordmark is itself a link home — don't nest another <a> */}
            <Wordmark className="text-base lg:text-[19px]" />
            {/* desktop nav — same five modules as the mobile tab bar */}
            <nav className="hidden items-center gap-1 lg:flex">
              {TABS.map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "rounded-[3px] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
                      active ? "bg-panel-alt text-gold" : "text-sec hover:text-ink"
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 lg:gap-5">
            <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] text-sec lg:text-[11px]">
              <Flame size={13} className="text-gold" />
              <span className="hidden sm:inline">DAY {toRoman(streak)} OF THE STREAK</span>
              <span className="sm:hidden">{toRoman(streak)}</span>
            </div>
            <Link
              href="/history"
              aria-label="Records"
              title="Your records"
              className="inline-flex items-center gap-1.5 rounded-[3px] border border-line-strong bg-panel-alt px-2.5 py-[5px] text-[9px] font-semibold uppercase tracking-[0.16em] text-gold active:translate-y-px active:bg-pressed lg:text-[10px]"
            >
              <ScrollText size={12} />
              <span className="hidden sm:inline">Records</span>
            </Link>
            <SettingsMenu />
            <div className="hidden lg:block">
              <AuthButton />
            </div>
          </div>
        </div>
        <MeanderBand />
      </header>

      {/* screen content — bottom padding clears the mobile tab bar */}
      <main
        className={cn("mx-auto w-full flex-1 px-[18px] py-6 pb-[86px] lg:px-8 lg:pb-8", maxWidth)}
      >
        {children}
      </main>

      {/* mobile tab bar — fixed, marble, safe-area aware (iOS home indicator) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-[color-mix(in_srgb,var(--panel)_96%,transparent)] backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Modules"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[8px] font-semibold uppercase tracking-[0.16em] active:bg-pressed",
                  active ? "text-gold" : "text-faint"
                )}
              >
                <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                {label}
                <span
                  className={cn(
                    "h-[2px] w-5 rounded-full",
                    active ? "bg-gold" : "bg-transparent"
                  )}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ---------------- settings: mode & theme ---------------- */

const MODES: { id: UiMode; name: string; blurb: string }[] = [
  { id: "spartan", name: "Spartan", blurb: "The essentials — plan, rites, seal. Nothing else." },
  { id: "olympian", name: "Olympian", blurb: "Every measure — charts, records, labors, guides." },
];

/** Popover with the two per-device preferences: how much temple you see
 *  (Spartan/Olympian) and its face (Marble/Obsidian). */
function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const uiMode = useFit((s) => s.uiMode);
  const theme = useFit((s) => s.theme);
  const set = useFit((s) => s.set);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Display settings"
        aria-expanded={open}
        title="Mode & theme"
        className={cn(
          "flex h-[30px] w-[30px] items-center justify-center rounded-[3px] border active:translate-y-px",
          open ? "border-line-strong bg-pressed text-gold" : "border-line text-sec"
        )}
      >
        <SlidersHorizontal size={13} />
      </button>

      {open && (
        <>
          {/* scrim closes on any outside tap */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="panel absolute right-0 top-[38px] z-50 w-[264px] shadow-[0_18px_36px_-18px_rgba(0,0,0,0.45)]">
            <p className="border-b border-line-soft px-3.5 py-2.5 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
              The Temple&apos;s Face
            </p>

            {/* mode */}
            <div className="flex flex-col gap-1.5 px-3.5 py-3">
              {MODES.map((m) => {
                const active = uiMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => set("uiMode", m.id)}
                    className={cn(
                      "rounded-[3px] border px-3 py-2 text-left",
                      active ? "border-line-strong bg-done-wash" : "border-line active:bg-pressed"
                    )}
                  >
                    <span className={cn(
                      "block font-display text-[12px] font-bold tracking-[0.08em]",
                      active ? "text-gold" : "text-ink"
                    )}>
                      {m.name}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-sec">{m.blurb}</span>
                  </button>
                );
              })}
            </div>

            {/* theme */}
            <div className="grid grid-cols-2 gap-1.5 border-t border-line-soft px-3.5 py-3">
              {([
                { id: "marble" as Theme, name: "Marble", icon: Sun },
                { id: "obsidian" as Theme, name: "Obsidian", icon: Moon },
              ]).map(({ id, name, icon: Icon }) => {
                const active = theme === id;
                return (
                  <button
                    key={id}
                    onClick={() => set("theme", id)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-[3px] border px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em]",
                      active ? "border-line-strong bg-done-wash text-gold" : "border-line text-sec active:bg-pressed"
                    )}
                  >
                    <Icon size={12} /> {name}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
