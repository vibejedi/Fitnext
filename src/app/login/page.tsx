"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Wordmark, GreekKey } from "@/components/Brand";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { usernameToEmail, USERNAME_RE, PASSWORD_MIN } from "@/lib/auth";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const signIn = async () => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    const { error } = await sb.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    if (error) {
      throw new Error(
        error.message === "Invalid login credentials"
          ? "Wrong username or password."
          : error.message
      );
    }
  };

  const submit = async () => {
    if (busy) return;
    setErr(null);

    const uname = username.trim();
    if (!USERNAME_RE.test(uname)) {
      setErr("Username must be 3-20 characters: letters, numbers, underscores.");
      return;
    }
    if (password.length < PASSWORD_MIN) {
      setErr(`Password must be at least ${PASSWORD_MIN} characters.`);
      return;
    }
    if (mode === "signup" && password !== confirm) {
      setErr("Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: uname, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not create the account — try again.");
        }
      }
      await signIn();
      router.push("/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "panel w-full bg-stone-850 px-3 py-3 text-marble outline-none focus:border-green/60";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto w-full max-w-md px-6 py-4"><Wordmark className="text-base" /></div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <p className="eyebrow mb-3">Enter the gymnasium</p>
        <h1 className="font-display text-3xl font-bold">
          {mode === "signin" ? "Sign in to FitNext" : "Create your account"}
        </h1>
        <p className="mt-2 text-marble-dim">
          Your coach, calibration, and progress — synced across every device.
        </p>
        <GreekKey className="my-6 w-40" />

        {!isSupabaseConfigured ? (
          <div className="panel p-4 text-sm text-marble-dim">
            Supabase isn&apos;t configured yet. Add{" "}
            <code className="text-green">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-green">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
            <code className="text-green">.env.local</code>, then restart. Until then,
            FitNext runs in local-only mode.
          </div>
        ) : (
          <div className="space-y-3">
            {/* mode toggle */}
            <div className="flex gap-1 rounded-lg border border-line p-1">
              {(["signin", "signup"] as const).map((m) => (
                <button key={m} onClick={() => { setMode(m); setErr(null); }}
                  className={
                    "flex-1 rounded-md py-2 text-xs font-medium uppercase tracking-wider transition " +
                    (mode === m ? "bg-green/15 text-green" : "text-muted hover:text-marble")
                  }>
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className={field}
            />

            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && mode === "signin") submit(); }}
                placeholder="Password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className={field + " pr-11"}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                title={showPw ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-marble"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {mode === "signup" && (
              <input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                placeholder="Confirm password"
                autoComplete="new-password"
                className={field}
              />
            )}

            <button onClick={submit} disabled={busy || !username.trim() || !password}
              className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm disabled:opacity-40">
              {busy
                ? (mode === "signin" ? "Signing in…" : "Creating account…")
                : (mode === "signin" ? "Sign in" : "Create account")}
              <ArrowRight size={16} />
            </button>

            {err && <p className="text-sm text-red-400">{err}</p>}

            <p className="pt-2 text-center text-xs text-muted">
              <Link href="/dashboard" className="hover:text-marble">
                Skip for now — train locally on this device
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
