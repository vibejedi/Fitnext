"use client";

import { useEffect, useRef, useState } from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { Wallet } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { SOL_ADDRESS_RE } from "@/lib/chain";
import { useFit } from "@/lib/store";
import { pushProfile } from "@/lib/sync";

/**
 * "Continue with a Solana wallet" — Privy authenticates the wallet
 * (Phantom, Solflare, Backpack…), then /api/auth/wallet bridges the session
 * onto the same Supabase account model every other athlete uses.
 *
 * Renders nothing unless NEXT_PUBLIC_PRIVY_APP_ID is configured, so the gate
 * works unchanged on installs that haven't set Privy up.
 */

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function WalletSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  if (!PRIVY_APP_ID) return null;
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["wallet"],
        appearance: {
          walletChainType: "solana-only",
          theme: "light",
          accentColor: "#9a7b2d",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "off" },
        },
        externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },
      }}
    >
      <WalletButton onSignedIn={onSignedIn} />
    </PrivyProvider>
  );
}

function WalletButton({ onSignedIn }: { onSignedIn: () => void }) {
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // the exchange must run once per wallet session, not once per render
  const exchanging = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated || exchanging.current) return;
    exchanging.current = true;
    setBusy(true);
    setErr(null);

    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Wallet session expired — try again.");
        const res = await fetch("/api/auth/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Wallet sign-in failed — try again.");

        const sb = getSupabaseBrowser();
        if (!sb) throw new Error("Accounts aren't configured on this install.");
        const { error } = await sb.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw new Error(error.message);
        // the wallet that opened the door is also where SOL rewards go —
        // adopt it as the reward address unless one is already set
        const s = useFit.getState();
        if (
          !s.walletAddress &&
          typeof data.solanaAddress === "string" &&
          SOL_ADDRESS_RE.test(data.solanaAddress)
        ) {
          s.set("walletAddress", data.solanaAddress);
          void pushProfile(useFit.getState());
        }
        onSignedIn();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Wallet sign-in failed — try again.");
        // drop the Privy session so the button can retry cleanly
        await logout().catch(() => undefined);
        exchanging.current = false;
      } finally {
        setBusy(false);
      }
    })();
  }, [ready, authenticated, getAccessToken, logout, onSignedIn]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        <span className="text-[9px] uppercase tracking-[0.3em] text-faint">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <button
        onClick={() => login()}
        disabled={!ready || busy}
        className="btn-ghost flex w-full items-center justify-center gap-2 py-3 text-xs disabled:opacity-40"
      >
        <Wallet size={14} className="text-gold" />
        {busy ? "Opening the vault…" : "Continue with a Solana wallet"}
      </button>
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
