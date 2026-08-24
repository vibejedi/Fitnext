import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PrivyClient } from "@privy-io/server-auth";

export const runtime = "nodejs";

/**
 * Solana-wallet sign-in, bridged onto Supabase auth.
 *
 * The client authenticates the wallet with Privy and sends the Privy access
 * token here. We verify it server-side, then map the Privy user to a
 * deterministic Supabase account (synthetic email + a password derived from
 * a server-only secret), the same shape username accounts use. The client
 * signs in with the returned credentials — no email round-trip, no second
 * password for the athlete to remember.
 */

const SYNTHETIC_DOMAIN = "users.fitnext.app";

export async function POST(req: NextRequest) {
  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.token !== "string" || !body.token) {
    return NextResponse.json({ error: "Missing wallet session." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const privySecret = process.env.PRIVY_APP_SECRET;
  if (!url || !secret || !privyAppId || !privySecret) {
    return NextResponse.json(
      { error: "Wallet sign-in isn't configured yet." },
      { status: 503 }
    );
  }

  // ---- verify the Privy token & find the Solana wallet ----
  const privy = new PrivyClient(privyAppId, privySecret);
  let privyUserId: string;
  try {
    const claims = await privy.verifyAuthToken(body.token);
    privyUserId = claims.userId; // "did:privy:<id>"
  } catch {
    return NextResponse.json({ error: "Wallet session expired — try again." }, { status: 401 });
  }

  let solanaAddress: string | null = null;
  try {
    const pUser = await privy.getUser(privyUserId);
    for (const account of pUser.linkedAccounts) {
      if (account.type === "wallet" && account.chainType === "solana") {
        solanaAddress = account.address;
        break;
      }
    }
  } catch {
    /* address is informational — sign-in still works without it */
  }

  // ---- deterministic Supabase identity for this Privy user ----
  // did:privy:<id> → privy_<id>@users.fitnext.app; the password is an HMAC of
  // the Privy user id under a server-only secret, so only this route (after a
  // verified Privy token) can ever produce it.
  const id = privyUserId.replace(/^did:privy:/, "").toLowerCase();
  const email = `privy_${id}@${SYNTHETIC_DOMAIN}`;
  const pepper = process.env.WALLET_AUTH_PEPPER || secret;
  const password = createHmac("sha256", pepper).update(privyUserId).digest("hex");

  // display name for the leaderboard until they pick one: sol_<head><tail>
  const username = solanaAddress
    ? `sol_${(solanaAddress.slice(0, 4) + solanaAddress.slice(-4)).toLowerCase()}`
    : `sol_${id.slice(0, 8)}`;

  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      privy_id: privyUserId,
      ...(solanaAddress ? { solana_address: solanaAddress } : {}),
    },
  });

  if (error && error.code !== "email_exists") {
    console.error("[wallet-auth] createUser failed:", error.code, error.message);
    return NextResponse.json(
      { error: "Could not open the account — try again." },
      { status: 500 }
    );
  }

  // first arrival: seed the profile row like the username signup does
  if (data?.user) {
    const { error: profileErr } = await admin
      .from("profiles")
      .upsert({ id: data.user.id, username });
    if (profileErr) {
      console.error("[wallet-auth] profile upsert failed:", profileErr.message);
    }
  }

  // solanaAddress rides along so the client can adopt it as the reward
  // address (rewards are paid in SOL — same wallet they just signed in with)
  return NextResponse.json({ email, password, solanaAddress });
}
