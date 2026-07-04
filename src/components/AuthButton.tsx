"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Prefer the username; fall back to email for any legacy accounts. */
const displayName = (u: { email?: string; user_metadata?: Record<string, unknown> } | null) =>
  u ? ((u.user_metadata?.username as string | undefined) ?? u.email ?? null) : null;

export function AuthButton() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) {
      setReady(true);
      return;
    }
    sb.auth.getUser().then(({ data }) => {
      setEmail(displayName(data.user));
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setEmail(displayName(session?.user ?? null));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return <span className="font-mono text-[0.65rem] text-muted">local mode</span>;
  }
  if (!ready) return null;

  if (!email) {
    return (
      <Link href="/login" className="btn-ghost px-4 py-1.5 text-xs">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden font-mono text-[0.65rem] text-muted sm:inline">
        {email}
      </span>
      <button
        onClick={async () => {
          await getSupabaseBrowser()?.auth.signOut();
          location.href = "/";
        }}
        className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs"
        title="Sign out"
      >
        <LogOut size={13} /> Out
      </button>
    </div>
  );
}
