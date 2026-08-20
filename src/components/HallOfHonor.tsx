"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import {
  Award, Check, ExternalLink, Landmark, Lock, MailCheck, Pencil, Trophy, Wallet, X,
} from "lucide-react";
import { Panel, Sheet } from "@/components/ui";
import { useFit } from "@/lib/store";
import { pushProfile } from "@/lib/sync";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { USERNAME_RE, PASSWORD_MIN } from "@/lib/auth";
import { REWARDS_CHAIN, explorerAddressUrl } from "@/lib/chain";
import { cn } from "@/lib/utils";

/**
 * The Hall of Honor — the laurel leaderboard. Entry is earned, not free:
 * the athlete must hold a real account (username + password), verify their
 * email, and may optionally register an Ethereum address for rewards
 * (seasonal prizes are paid out in ETH).
 */

const ETH_RE = /^0x[a-fA-F0-9]{40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SYNTHETIC_DOMAIN = "@users.fitnext.app";

/** Signed in with a real (non-synthetic), confirmed email? */
const isVerified = (u: User | null): boolean =>
  !!u?.email &&
  !u.email.endsWith(SYNTHETIC_DOMAIN) &&
  !!(u.email_confirmed_at ?? u.confirmed_at);

const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function HallOfHonor() {
  const fit = useFit();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const refreshUser = useCallback(async () => {
    const sb = getSupabaseBrowser();
    if (!sb) { setChecked(true); return; }
    const { data } = await sb.auth.getUser();
    setUser(data.user ?? null);
    setChecked(true);
  }, []);

  useEffect(() => { void refreshUser(); }, [refreshUser]);

  // Close the loop after the email round-trip: a verified athlete who hasn't
  // been marked enrolled yet gets their seat (and any wallet they entered
  // during signup, carried in user metadata) written to the profile.
  useEffect(() => {
    if (!user || !isVerified(user) || fit.hallJoined) return;
    const s = useFit.getState();
    s.set("hallJoined", true);
    const metaWallet = user.user_metadata?.wallet_address;
    if (!s.walletAddress && typeof metaWallet === "string" && ETH_RE.test(metaWallet)) {
      s.set("walletAddress", metaWallet);
    }
    void pushProfile(useFit.getState());
  }, [user, fit.hallJoined]);

  const enrolled = fit.hallJoined && isVerified(user);

  const rows = [
    { rank: "I", name: "Achilles", score: "1,240" },
    { rank: "II", name: "Atalanta", score: "1,105" },
    {
      rank: "III",
      name: (user?.user_metadata?.username as string) || "You",
      score: fit.laurels.toLocaleString(),
      you: true,
    },
  ];

  return (
    <Panel
      title="Hall of Honor"
      action={enrolled
        ? <Trophy size={14} className="text-gold" />
        : <Lock size={14} className="text-gold" />}
      className="mb-2.5 lg:mb-0"
    >
      {enrolled ? (
        <div className="flex flex-col">
          <div className="flex flex-col gap-2.5 p-[14px] lg:grid lg:grid-cols-3 lg:gap-3.5 lg:px-[18px] lg:py-4">
            {rows.map((r) => (
              <div key={r.rank} className={cn("flex items-center gap-2.5", r.you && "text-gold")}>
                <span className="w-5 font-display text-[13px] font-bold text-gold lg:text-[15px]">{r.rank}</span>
                <span className={cn("flex-1 truncate text-xs lg:text-[13px]", r.you && "font-semibold")}>
                  {r.name}
                </span>
                <span className="font-mono text-[10px] text-sec">{r.score} laurels</span>
              </div>
            ))}
          </div>
          <WalletRow />
          <p className="border-t border-line-soft bg-panel-alt px-[14px] py-2 text-[9px] text-faint lg:px-[18px]">
            Seasonal honors are rewarded in ETH on {REWARDS_CHAIN.name} — Ethereum L2, same 0x
            address. Alpha leaderboard — global ranks arrive with the public season.
          </p>
        </div>
      ) : (
        <div className="relative">
          <div
            className="pointer-events-none flex flex-col gap-2.5 p-[14px] opacity-50 blur-[3px] lg:grid lg:grid-cols-3 lg:gap-3.5 lg:px-[18px] lg:py-4"
            aria-hidden
          >
            {rows.map((r) => (
              <div key={r.rank} className="flex items-center gap-2.5">
                <span className="w-5 font-display text-[13px] font-bold text-gold lg:text-[15px]">{r.rank}</span>
                <span className="flex-1 text-xs lg:text-[13px]">{r.name}</span>
                <span className="font-mono text-[10px] text-sec">{r.score} laurels</span>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[color-mix(in_srgb,var(--page-top)_55%,transparent)]">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-line-strong bg-panel lg:h-7 lg:w-7">
              <Lock size={13} className="text-gold" />
            </span>
            <p className="font-display text-xs font-bold uppercase tracking-[0.14em] lg:text-[13px]">
              The Hall is sealed
            </p>
            <p className="max-w-xs px-4 text-center text-[10px] text-sec lg:text-[11px]">
              {isSupabaseConfigured
                ? "Claim a verified name to compete for laurels — and ETH rewards."
                : "Leaderboard & rewards — coming soon"}
            </p>
            {isSupabaseConfigured && checked && (
              <button
                onClick={() => setEnrolling(true)}
                className="btn-primary mt-1 inline-flex items-center gap-1.5 px-5 py-2.5 text-[10px]"
              >
                <Landmark size={12} /> Enter the Hall
              </button>
            )}
          </div>
        </div>
      )}

      {enrolling && (
        <EnrollSheet
          user={user}
          onDismiss={() => { setEnrolling(false); void refreshUser(); }}
        />
      )}
    </Panel>
  );
}

/* ---------------- wallet management (enrolled) ---------------- */

function WalletRow() {
  const wallet = useFit((s) => s.walletAddress);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const save = () => {
    const v = value.trim();
    if (v && !ETH_RE.test(v)) {
      setErr("That doesn't look like an Ethereum address (0x + 40 hex characters).");
      return;
    }
    const s = useFit.getState();
    s.set("walletAddress", v || null);
    void pushProfile(useFit.getState());
    setErr(null);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5 border-t border-line-soft px-[14px] py-2.5 lg:px-[18px]">
        <div className="flex items-center gap-2">
          <Wallet size={13} className="shrink-0 text-gold" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0x… Ethereum address (leave blank to remove)"
            spellCheck={false}
            autoCapitalize="none"
            className="min-w-0 flex-1 rounded-[3px] border border-line bg-panel-alt px-2 py-1.5 font-mono text-[11px] text-ink outline-none placeholder:font-sans placeholder:text-faint focus:border-line-strong"
          />
          <button onClick={save} className="p-1.5 text-gold" aria-label="Save wallet address">
            <Check size={14} />
          </button>
          <button onClick={() => { setEditing(false); setErr(null); }} className="p-1.5 text-sec" aria-label="Cancel">
            <X size={14} />
          </button>
        </div>
        {err && <p className="pl-6 text-[10px] text-clay">{err}</p>}
      </div>
    );
  }

  if (wallet) {
    return (
      <div className="flex w-full items-center gap-2 border-t border-line-soft px-[14px] py-2.5 lg:px-[18px]">
        <Wallet size={13} className="shrink-0 text-gold" />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink">{shortAddr(wallet)}</span>
        <span className="rounded-[3px] border border-line px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-gold">
          {REWARDS_CHAIN.name}
        </span>
        <a
          href={explorerAddressUrl(wallet)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 text-faint active:opacity-60"
          aria-label="View address on the block explorer"
        >
          <ExternalLink size={11} />
        </a>
        <button
          onClick={() => { setValue(wallet); setEditing(true); }}
          className="p-1 text-faint active:opacity-60"
          aria-label="Edit wallet address"
        >
          <Pencil size={11} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setValue(""); setEditing(true); }}
      className="flex w-full items-center gap-2 border-t border-line-soft px-[14px] py-2.5 text-left active:bg-pressed lg:px-[18px]"
    >
      <Wallet size={13} className="shrink-0 text-gold" />
      <span className="flex-1 text-[11px] text-sec">
        Add an Ethereum address for rewards <span className="text-faint">(optional)</span>
      </span>
      <Pencil size={11} className="text-faint" />
    </button>
  );
}

/* ---------------- enrollment sheet ---------------- */

type Step = "signup" | "add-email" | "await-verify";

function EnrollSheet({ user, onDismiss }: { user: User | null; onDismiss: () => void }) {
  const hasSyntheticAccount = !!user?.email?.endsWith(SYNTHETIC_DOMAIN);
  const awaitingOnly =
    !!user && !hasSyntheticAccount && !!user.email && !isVerified(user);

  const [step, setStep] = useState<Step>(
    awaitingOnly ? "await-verify" : hasSyntheticAccount ? "add-email" : "signup"
  );
  const [username, setUsername] = useState(
    (user?.user_metadata?.username as string) ?? ""
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [wallet, setWallet] = useState(useFit.getState().walletAddress ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const validateWallet = (): string | null => {
    const w = wallet.trim();
    if (w && !ETH_RE.test(w)) {
      return "That doesn't look like an Ethereum address (0x + 40 hex characters). Leave it blank to skip.";
    }
    return null;
  };

  const rememberWallet = () => {
    const w = wallet.trim();
    if (w) {
      const s = useFit.getState();
      s.set("walletAddress", w);
    }
  };

  /** New athlete: create the account with a REAL email — Supabase sends the
   *  verification link; the Hall unlocks once it's clicked. */
  const signup = async () => {
    if (busy) return;
    setErr(null);
    const uname = username.trim();
    if (!USERNAME_RE.test(uname)) {
      setErr("Username must be 3-20 characters: letters, numbers, underscores.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setErr("Enter a real email — the Hall requires a verified address.");
      return;
    }
    if (password.length < PASSWORD_MIN) {
      setErr(`Password must be at least ${PASSWORD_MIN} characters.`);
      return;
    }
    if (password !== confirm) {
      setErr("Passwords don't match.");
      return;
    }
    const walletErr = validateWallet();
    if (walletErr) { setErr(walletErr); return; }

    const sb = getSupabaseBrowser();
    if (!sb) return;
    setBusy(true);
    try {
      const { error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: uname,
            ...(wallet.trim() ? { wallet_address: wallet.trim() } : {}),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/progress`,
        },
      });
      if (error) {
        setErr(
          /already registered/i.test(error.message)
            ? "That email already has an account — sign in instead."
            : /database error/i.test(error.message)
              ? "That username may be taken — try another."
              : error.message
        );
        return;
      }
      rememberWallet();
      setSentTo(email.trim());
      setStep("await-verify");
    } finally {
      setBusy(false);
    }
  };

  /** Existing username-only account: attach a real email (Supabase emails a
   *  confirmation link to the new address). */
  const addEmail = async () => {
    if (busy) return;
    setErr(null);
    if (!EMAIL_RE.test(email.trim())) {
      setErr("Enter a real email — the Hall requires a verified address.");
      return;
    }
    const walletErr = validateWallet();
    if (walletErr) { setErr(walletErr); return; }

    const sb = getSupabaseBrowser();
    if (!sb) return;
    setBusy(true);
    try {
      const { error } = await sb.auth.updateUser(
        { email: email.trim() },
        { emailRedirectTo: `${window.location.origin}/auth/callback?next=/progress` }
      );
      if (error) {
        setErr(
          /already/i.test(error.message)
            ? "That email already belongs to another account."
            : error.message
        );
        return;
      }
      rememberWallet();
      void pushProfile(useFit.getState());
      setSentTo(email.trim());
      setStep("await-verify");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    const sb = getSupabaseBrowser();
    const target = sentTo ?? user?.email;
    if (!sb || !target || busy) return;
    setBusy(true);
    setErr(null);
    try {
      // email-change confirmations re-send via updateUser; fresh signups via resend
      const { error } = hasSyntheticAccount
        ? await sb.auth.updateUser({ email: target })
        : await sb.auth.resend({ type: "signup", email: target });
      if (error) setErr(error.message);
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-[4px] border border-line bg-panel-alt px-3 py-3 text-[13px] text-ink outline-none placeholder:text-faint focus:border-line-strong";

  return (
    <Sheet onDismiss={onDismiss}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line-soft bg-panel px-4 py-3">
        <div>
          <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.18em]">
            Enter the Hall of Honor
          </h2>
          <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.24em] text-gold">
            Verified names only · Rewards in ETH on {REWARDS_CHAIN.name}
          </p>
        </div>
        <button onClick={onDismiss} className="p-1.5 text-sec hover:text-ink" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {step === "await-verify" ? (
        <div className="flex flex-col items-center gap-2.5 px-5 py-8 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-done-wash">
            <MailCheck size={17} className="text-gold" />
          </span>
          <p className="font-display text-sm font-bold uppercase tracking-[0.14em]">
            Check your email
          </p>
          <p className="max-w-xs text-[11px] leading-relaxed text-sec">
            A verification link is on its way to{" "}
            <span className="font-semibold text-ink">{sentTo ?? user?.email}</span>.
            Tap it, come back, and your seat in the Hall is carved.
          </p>
          {err && <p className="text-[11px] text-clay">{err}</p>}
          <div className="mt-1 flex gap-2.5">
            <button onClick={resend} disabled={busy} className="btn-ghost px-4 py-2.5 text-[10px] disabled:opacity-40">
              {busy ? "Sending…" : "Resend link"}
            </button>
            <button onClick={onDismiss} className="btn-primary px-4 py-2.5 text-[10px]">
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4 py-4">
          <p className="text-[11px] leading-relaxed text-sec">
            {step === "signup" ? (
              <>The Hall ranks real athletes. Create your account — username, password, and a
              verified email — to compete for laurels.</>
            ) : (
              <>Your training account is ready — add a verified email to claim your seat in
              the Hall.</>
            )}
          </p>

          {step === "signup" && (
            <>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username — carved on the leaderboard"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className={field}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email — for verification"
                autoComplete="email"
                className={field}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="new-password"
                className={field}
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                className={field}
              />
            </>
          )}

          {step === "add-email" && (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email — for verification"
              autoComplete="email"
              className={field}
            />
          )}

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sec">
              Reward wallet <span className="font-normal normal-case tracking-normal text-faint">— optional, add anytime</span>
            </span>
            <input
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x… Ethereum address"
              spellCheck={false}
              autoCapitalize="none"
              className={cn(field, "font-mono text-[12px] placeholder:font-sans")}
            />
            <span className="text-[9px] leading-relaxed text-faint">
              Seasonal honors are rewarded in ETH on {REWARDS_CHAIN.name} — an Ethereum L2, so
              any normal 0x address works.
            </span>
          </label>

          {err && <p className="text-[11px] text-clay">{err}</p>}

          <button
            onClick={step === "signup" ? signup : addEmail}
            disabled={busy}
            className="btn-primary flex w-full items-center justify-center gap-1.5 py-3 text-xs disabled:opacity-40"
          >
            <Award size={14} />
            {busy ? "Carving your name…" : step === "signup" ? "Create account & verify" : "Send verification"}
          </button>

          {step === "signup" && (
            <p className="text-center text-[10px] text-faint">
              Already sworn in?{" "}
              <Link href="/login" className="text-gold underline-offset-2 hover:underline">
                Sign in
              </Link>{" "}
              first, then return to the Hall.
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}
