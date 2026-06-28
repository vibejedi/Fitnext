"use client";

import { useState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { Wordmark, GreekKey } from "@/components/Brand";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sendLink = async () => {
    const sb = getSupabaseBrowser();
    if (!sb || !email) return;
    setBusy(true); setErr(null);
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  const google = async () => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto w-full max-w-md px-6 py-4"><Wordmark className="text-base" /></div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <p className="eyebrow mb-3">Enter the gymnasium</p>
        <h1 className="font-display text-3xl font-bold">Sign in to FitNext</h1>
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
        ) : sent ? (
          <div className="panel p-5 text-center">
            <Mail className="mx-auto mb-3 text-green" />
            <p className="font-medium">Check your inbox</p>
            <p className="mt-1 text-sm text-muted">
              We sent a magic link to {email}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <button onClick={google} className="btn-ghost flex w-full items-center justify-center gap-2 py-3 text-sm">
              Continue with Google
            </button>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="panel w-full bg-stone-850 px-3 py-3 text-marble outline-none focus:border-green/60"
            />
            <button onClick={sendLink} disabled={busy || !email}
              className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm disabled:opacity-40">
              {busy ? "Sending…" : "Email me a magic link"} <ArrowRight size={16} />
            </button>
            {err && <p className="text-sm text-red-400">{err}</p>}
          </div>
        )}
      </main>
    </div>
  );
}
