import { NextRequest, NextResponse } from "next/server";
import {
  stravaAdmin, freshAccessToken, getActivity, upsertActivity, deleteActivity,
} from "@/lib/strava";

export const runtime = "nodejs";

/**
 * Strava push webhook. One subscription per app (created once with
 * scripts/strava-subscribe.mjs). GET is Strava's subscription-validation
 * handshake; POST delivers activity events, which we mirror into
 * workout_logs. Always answer fast and 200 — Strava retries non-200s and
 * drops subscriptions that keep failing.
 */

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  if (
    params.get("hub.mode") === "subscribe" &&
    params.get("hub.verify_token") === process.env.STRAVA_VERIFY_TOKEN
  ) {
    return NextResponse.json({ "hub.challenge": params.get("hub.challenge") });
  }
  return NextResponse.json({ error: "verification_failed" }, { status: 403 });
}

interface StravaEvent {
  object_type?: string;
  aspect_type?: "create" | "update" | "delete";
  object_id?: number;
  owner_id?: number;
}

export async function POST(req: NextRequest) {
  let event: StravaEvent;
  try {
    event = (await req.json()) as StravaEvent;
  } catch {
    return NextResponse.json({ ok: true }); // malformed — ack and move on
  }

  if (event.object_type !== "activity" || !event.object_id || !event.owner_id) {
    return NextResponse.json({ ok: true }); // athlete events etc. — ignore
  }

  const admin = stravaAdmin();
  if (!admin) return NextResponse.json({ ok: true });

  try {
    const { data: conn } = await admin
      .from("strava_connections")
      .select("user_id")
      .eq("athlete_id", event.owner_id)
      .single();
    if (!conn) return NextResponse.json({ ok: true }); // not one of ours

    if (event.aspect_type === "delete") {
      await deleteActivity(admin, conn.user_id, event.object_id);
      return NextResponse.json({ ok: true });
    }

    const token = await freshAccessToken(admin, conn.user_id);
    if (!token) return NextResponse.json({ ok: true });
    const activity = await getActivity(token, event.object_id);
    await upsertActivity(admin, conn.user_id, activity);
  } catch (err) {
    // log but still 200 — Strava retries, and a poisoned event must not
    // take the subscription down
    console.error("[strava] webhook event failed:", err);
  }
  return NextResponse.json({ ok: true });
}
