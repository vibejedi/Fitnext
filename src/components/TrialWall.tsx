"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Hourglass, Lock, MailCheck, Wallet } from "lucide-react";
import { useFit, localDay } from "@/lib/store";
import { pushProfile } from "@/lib/sync";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SOL_ADDRESS_RE, isLegacyEthAddress } from "@/lib/chain";
import { cn } from "@/lib/utils";

/**
 * The thirty-day gate. The trial is free and card-less; when it runs out the
 * temple seals until the athlete claims a verified name — a real email (and
 * with it a seat in the Hall of Honor). Signed-in accounts date the trial
 * from Supabase's created_at; device-only athletes from a local first-seen
 * day, and their only door is creating an account.
 */

const TRIAL_DAYS = 30;
const SYNTHETIC_DOMAIN = "@users.fitnext.app";
const LOCAL_START_KEY = "fitnext-trial-start";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isVerified = (u: User | null): boolean =>
  !!u?.email &&
  !u.email.endsWith(SYNTHETIC_DOMAIN) &&
  !!(u.email_confirmed_at ?? u.confirmed_at);

const daysSince = (iso: string): number =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

export function TrialWall() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [localStart, setLocalStart] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const sb = getSupabaseBrowser();
    if (!sb) { setChecked(true); return; }
    const { data } = await sb.auth.getUser();
    setUser(data.user ?? null);
    setChecked(true);
  }, []);

  useEffect(() => { void refreshUser(); }, [refreshUser]);

  // Device-only athletes have no account row to date the trial from — stamp
  // the first day this device saw the temple and count from there.
  useEffect(() => {
    try {
      let d = localStorage.getItem(LOCAL_START_KEY);
      if (!d) {
        d = localDay();
        localStorage.setItem(LOCAL_START_KEY, d);
      }
      setLocalStart(d);
    } catch {
      /* storage unavailable — never wall */
    }
  }, []);

  // A verified athlete holds a seat in the Hall — record it once.
  useEffect(() => {
    if (!user || !isVerified(user)) return;
    const s = useFit.getState();
    if (s.hallJoined) return;
    s.set("hallJoined", true);
    void pushProfile(useFit.getState());
  }, [user]);

  if (!checked || !isSupabaseConfigured) return null;
  if (isVerified(user)) return null;

  const started = user ? user.created_at : localStart;
  if (!started) return null;
  const spent = daysSince(started);
  if (spent < TRIAL_DAYS) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[color-mix(in_srgb,var(--page-top)_82%,transparent)] px-5 py-10 backdrop-blur-[6px]">
      <div className="panel w-full max-w-md shadow-[0_28px_60px_-24px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center gap-2 border-b border-line-soft px-6 pb-5 pt-7 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-panel-alt">
            <Hourglass size={18} className="text-gold" />
          </span>
          <h2 className="font-display text-[15px] font-bold uppercase tracking-[0.16em]">
            Thirty days are spent
          </h2>
          <p className="max-w-sm text-[12px] leading-relaxed text-sec">
            The free trial has run its course. Claim a verified name — a real
            email carved beside your record — to keep training and take your
            seat on the leaderboard.
          </p>
        </div>
        {user ? (
          <ClaimForm user={user} onRefresh={refreshUser} />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-6">
            <p className="text-center text-[11px] text-sec">
              This device has trained account-less. Create your account to keep
              your momentum — your local record stays with you.
            </p>
            <Link href="/login" className="btn-primary flex items-center gap-2 px-6 py-3 text-xs">
              <Lock size={13} /> Create your account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- email + leaderboard claim ---------------- */

function ClaimForm({ user, onRefresh }: { user: User; onRefresh: () => Promise<void> }) {
  const walletSaved = useFit((s) => s.walletAddress);
  // an email-change may already be in flight (real address, not yet confirmed)
  const awaiting = !!user.email && !user.email.endsWith(SYNTHETIC_DOMAIN);
  const [sentTo, setSentTo] = useState<string | null>(awaiting ? user.email! : null);
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState(walletSaved ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setErr(null);
    if (!EMAIL_RE.test(email.trim())) {
      setErr("Enter a real email — the temple requires a verified address.");
      return;
    }
    const w = wallet.trim();
    if (w && !SOL_ADDRESS_RE.test(w)) {
      setErr(
        isLegacyEthAddress(w)
          ? "That's an Ethereum address — rewards are paid on Solana now. Paste a Solana wallet address, or leave it blank."
          : "That doesn't look like a Solana address (base58, 32-44 characters). Leave it blank to skip."
      );
      return;
    }
    const sb = getSupabaseBrowser();
    if (!sb) return;
    setBusy(true);
    try {
      const { error } = await sb.auth.updateUser(
        { email: email.trim() },
        { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` }
      );
      if (error) {
        setErr(
          /already/i.test(error.message)
            ? "That email already belongs to another account."
            : error.message
        );
        return;
      }
      if (w) {
        const s = useFit.getState();
        s.set("walletAddress", w);
        void pushProfile(useFit.getState());
      }
      setSentTo(email.trim());
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    const sb = getSupabaseBrowser();
    if (!sb || !sentTo || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const { error } = await sb.auth.updateUser({ email: sentTo });
      if (error) setErr(error.message);
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-[4px] border border-line bg-panel-alt px-3 py-3 text-[13px] text-ink outline-none placeholder:text-faint focus:border-line-strong";

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-2.5 px-6 py-6 text-center">
        <MailCheck size={18} className="text-gold" />
        <p className="text-[12px] leading-relaxed text-sec">
          A verification link is on its way to{" "}
          <span className="font-semibold text-ink">{sentTo}</span>. Tap it and
          the temple reopens — trial over, record intact.
        </p>
        {err && <p className="text-[11px] text-clay">{err}</p>}
        <div className="flex gap-2.5">
          <button onClick={resend} disabled={busy} className="btn-ghost px-4 py-2.5 text-[10px] disabled:opacity-40">
            {busy ? "Sending…" : "Resend link"}
          </button>
          <button onClick={() => void onRefresh()} className="btn-primary px-4 py-2.5 text-[10px]">
            I&apos;ve verified
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-6 py-5">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email — for verification"
        autoComplete="email"
        className={field}
      />
      <label className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sec">
          <Wallet size={11} className="text-gold" /> Reward wallet
          <span className="font-normal normal-case tracking-normal text-faint">— optional</span>
        </span>
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="Solana address"
          spellCheck={false}
          autoCapitalize="none"
          className={cn(field, "font-mono text-[12px] placeholder:font-sans")}
        />
      </label>
      {err && <p className="text-[11px] text-clay">{err}</p>}
      <button
        onClick={submit}
        disabled={busy || !email.trim()}
        className="btn-primary w-full py-3 text-xs disabled:opacity-40"
      >
        {busy ? "Sending…" : "Verify & reopen the temple"}
      </button>
      <p className="text-center text-[9px] leading-relaxed text-faint">
        Your training record, streak, and laurels carry over untouched.
      </p>
    </div>
  );
}
