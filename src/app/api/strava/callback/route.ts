import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  stravaConfigured, exchangeCode, listActivities, upsertActivity,
} from "@/lib/strava";

export const runtime = "nodejs";
// initial backfill fetches + writes up to 30 activities
export const maxDuration = 60;

/**
 * OAuth return leg: verify state, exchange the code, store the tokens on
 * the athlete's row, and backfill their recent activities into the
 * training log. Every failure lands back on /train with a status flag the
 * panel can read — never a bare error page.
 */
export async function GET(req: NextRequest) {
  const back = (flag: string) =>
    NextResponse.redirect(new URL(`/train?strava=${flag}`, req.nextUrl.origin));

  if (!stravaConfigured) return back("unconfigured");
  if (req.nextUrl.searchParams.get("error")) return back("denied");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("strava_oauth_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) return back("state");

  const sb = await getSupabaseServer();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!sb || !user) return back("signin");

  try {
    const tokens = await exchangeCode(code);
    const { error } = await sb.from("strava_connections").upsert({
      user_id: user.id,
      athlete_id: tokens.athlete_id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      scope: "activity:read_all",
    });
    if (error) {
      console.error("[strava] connection upsert failed:", error.message);
      return back("error");
    }

    // Backfill the last ~30 activities so the log fills immediately;
    // the webhook keeps it current from here.
    let imported = 0;
    try {
      const activities = await listActivities(tokens.access_token, 30);
      for (const a of activities) {
        await upsertActivity(sb, user.id, a);
        imported++;
      }
    } catch (err) {
      console.error("[strava] backfill failed (connection kept):", err);
    }

    const res = back(`connected&imported=${imported}`);
    res.cookies.delete("strava_oauth_state");
    return res;
  } catch (err) {
    console.error("[strava] callback failed:", err);
    return back("error");
  }
}
