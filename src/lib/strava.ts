import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inferLabor, type LaborId } from "./labors";

/**
 * Strava integration (server-only — imported by the /api/strava/* routes).
 * The universal watch bridge: Garmin, Apple Watch, Coros, Polar all sync
 * into Strava, so one OAuth link imports activities from any of them into
 * the training log. Tokens live per-user in `strava_connections`; the
 * webhook keeps the log current after the initial backfill.
 */

export const STRAVA_CLIENT_ID = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

/** Both halves of the Strava app credentials are present. */
export const stravaConfigured = !!(STRAVA_CLIENT_ID && STRAVA_CLIENT_SECRET);

/** Service-role client for webhook handling (no user session there). */
export function stravaAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/* ---------------- OAuth tokens ---------------- */

export interface StravaTokens {
  athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  scope?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number };
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      ...params,
    }),
  });
  if (!res.ok) throw new Error(`strava token request failed: ${res.status}`);
  return (await res.json()) as TokenResponse;
}

export async function exchangeCode(code: string): Promise<StravaTokens> {
  const t = await tokenRequest({ code, grant_type: "authorization_code" });
  if (!t.athlete?.id) throw new Error("strava token response missing athlete");
  return {
    athlete_id: t.athlete.id,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: t.expires_at,
  };
}

/** Row from strava_connections, refreshed & persisted if near expiry. */
export async function freshAccessToken(
  db: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await db
    .from("strava_connections")
    .select("athlete_id, access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single();
  if (!data) return null;
  if (data.expires_at > Date.now() / 1000 + 300) return data.access_token;
  const t = await tokenRequest({
    refresh_token: data.refresh_token,
    grant_type: "refresh_token",
  });
  await db
    .from("strava_connections")
    .update({
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at: t.expires_at,
    })
    .eq("user_id", userId);
  return t.access_token;
}

/* ---------------- Activities ---------------- */

export interface StravaActivity {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  distance?: number; // meters
  moving_time?: number; // seconds
  average_heartrate?: number;
  start_date_local?: string; // ISO
  start_date?: string;
}

const API = "https://www.strava.com/api/v3";

export async function listActivities(
  accessToken: string,
  perPage = 30
): Promise<StravaActivity[]> {
  const res = await fetch(`${API}/athlete/activities?per_page=${perPage}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`strava activities failed: ${res.status}`);
  return (await res.json()) as StravaActivity[];
}

export async function getActivity(
  accessToken: string,
  id: number
): Promise<StravaActivity> {
  const res = await fetch(`${API}/activities/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`strava activity ${id} failed: ${res.status}`);
  return (await res.json()) as StravaActivity;
}

/* ---------------- Mapping: activity → training-log row ---------------- */

/** Cardio sports map straight to the Conditioning labor; gym-style sports
 *  fall back to inferring from the activity name. */
const SPORT_LABOR: Record<string, LaborId> = {
  Run: "conditioning", TrailRun: "conditioning", VirtualRun: "conditioning",
  Walk: "conditioning", Hike: "conditioning",
  Ride: "conditioning", VirtualRide: "conditioning", GravelRide: "conditioning",
  MountainBikeRide: "conditioning", EBikeRide: "conditioning",
  Swim: "conditioning", Rowing: "conditioning", Elliptical: "conditioning",
  StairStepper: "conditioning", Crossfit: "conditioning", HighIntensityIntervalTraining: "conditioning",
  Yoga: "mobility", Pilates: "mobility",
};

const mmss = (s: number) => {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, "0")}`;
};

/** The jsonb `data` payload for workout_logs, matching the app's shape
 *  (see sync.ts) with a stable `cid` so re-delivery never duplicates. */
export function activityToWorkoutData(a: StravaActivity) {
  const sport = a.sport_type ?? a.type ?? "Workout";
  const km = a.distance ? a.distance / 1000 : 0;
  const summary = [
    km >= 0.1 ? `${km.toFixed(km >= 10 ? 0 : 1)} km` : null,
    a.moving_time ? mmss(a.moving_time) : null,
  ].filter(Boolean).join(" · ");

  const startedAt = a.start_date_local ?? a.start_date ?? new Date().toISOString();
  const feelParts = [`Imported from Strava (${sport})`];
  if (summary) feelParts.push(summary);
  if (a.average_heartrate) feelParts.push(`avg HR ${Math.round(a.average_heartrate)}`);

  return {
    cid: `strava-${a.id}`,
    day: startedAt.slice(0, 10),
    title: a.name || sport,
    labor: SPORT_LABOR[sport] ?? inferLabor(a.name || sport) ?? null,
    exercises: [
      {
        name: summary ? `${sport} — ${summary}` : sport,
        sets: [{ reps: 1, weight: 0 }],
      },
    ],
    energy: null,
    source: "strava",
    feel: feelParts.join(" — "),
    loggedAt: new Date(startedAt).toISOString(),
  };
}

/** Insert or update the workout_logs row for an activity (idempotent on
 *  the strava cid). Returns "inserted" | "updated". */
export async function upsertActivity(
  db: SupabaseClient,
  userId: string,
  a: StravaActivity
): Promise<"inserted" | "updated"> {
  const d = activityToWorkoutData(a);
  const row = {
    user_id: userId,
    note: d.feel,
    data: {
      cid: d.cid, day: d.day, title: d.title, labor: d.labor,
      exercises: d.exercises, energy: d.energy, source: d.source,
    },
    logged_at: d.loggedAt,
  };
  const { data: existing } = await db
    .from("workout_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("data->>cid", d.cid)
    .limit(1);
  if (existing && existing.length > 0) {
    await db.from("workout_logs").update(row).eq("id", existing[0].id);
    return "updated";
  }
  await db.from("workout_logs").insert(row);
  return "inserted";
}

/** Remove the row for a deleted Strava activity (webhook delete events). */
export async function deleteActivity(
  db: SupabaseClient,
  userId: string,
  activityId: number
): Promise<void> {
  await db
    .from("workout_logs")
    .delete()
    .eq("user_id", userId)
    .eq("data->>cid", `strava-${activityId}`);
}
