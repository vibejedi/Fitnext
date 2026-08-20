import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getSupabaseServer } from "@/lib/supabase/server";
import { stravaConfigured, STRAVA_CLIENT_ID } from "@/lib/strava";

export const runtime = "nodejs";

/**
 * Kick off the Strava OAuth dance. Requires a signed-in athlete (the
 * tokens are stored against their user id). A random `state` cookie guards
 * the callback against CSRF.
 */
export async function GET(req: NextRequest) {
  if (!stravaConfigured) {
    return NextResponse.redirect(new URL("/train?strava=unconfigured", req.nextUrl.origin));
  }
  const sb = await getSupabaseServer();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!user) {
    return NextResponse.redirect(new URL("/train?strava=signin", req.nextUrl.origin));
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${req.nextUrl.origin}/api/strava/callback`;
  const authorize = new URL("https://www.strava.com/oauth/authorize");
  authorize.searchParams.set("client_id", STRAVA_CLIENT_ID!);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("approval_prompt", "auto");
  authorize.searchParams.set("scope", "read,activity:read_all");
  authorize.searchParams.set("state", state);

  const res = NextResponse.redirect(authorize);
  res.cookies.set("strava_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/strava",
  });
  return res;
}
