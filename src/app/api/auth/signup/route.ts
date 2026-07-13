import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { usernameToEmail, validateSignup } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Creates a username/password account server-side.
 *
 * Uses the Supabase secret key so the account can be created with the
 * synthetic email pre-confirmed — users sign in with username + password
 * immediately, no email round-trip. The client signs in with
 * signInWithPassword right after this returns ok.
 */
export async function POST(req: NextRequest) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const invalid = validateSignup(body.username, body.password);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }
  const username = (body.username as string).trim().toLowerCase();
  const password = body.password as string;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    return NextResponse.json(
      { error: "Accounts aren't configured yet — the app runs in local mode." },
      { status: 503 }
    );
  }

  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (error) {
    if (error.code === "email_exists") {
      return NextResponse.json({ error: "That username is taken." }, { status: 409 });
    }
    if (error.code === "weak_password") {
      return NextResponse.json(
        { error: "That password is too weak — try something longer." },
        { status: 400 }
      );
    }
    console.error("[signup] createUser failed:", error.code, error.message);
    // status 0 / "fetch failed" = Supabase itself is unreachable (e.g. the
    // free-tier project auto-paused) — not something retrying will fix.
    if (error.status === 0 || error.message.includes("fetch failed")) {
      return NextResponse.json(
        { error: "The account service is unreachable — it may be paused. Check the Supabase project, then try again." },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "Could not create the account — try again." },
      { status: 500 }
    );
  }

  // Record the username on the profile row (best-effort — the DB trigger
  // also copies it from user_metadata for schemas that include it).
  const { error: profileErr } = await admin
    .from("profiles")
    .upsert({ id: data.user.id, username });
  if (profileErr) {
    console.error("[signup] profile upsert failed:", profileErr.message);
  }

  return NextResponse.json({ ok: true });
}
