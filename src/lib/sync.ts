"use client";

import { getSupabaseBrowser } from "./supabase/client";
import { RITES, type RiteId } from "./rites";
import type { ChatMode, FitState } from "./store";

/** Shape stored in the `profiles` table (snake_case). */
function toRow(s: FitState, id: string) {
  return {
    id,
    coach: s.coach,
    goal: s.goal,
    experience: s.experience,
    age: s.profile.age ?? null,
    weight_kg: s.profile.weightKg ?? null,
    height_cm: s.profile.heightCm ?? null,
    sex: s.profile.sex ?? null,
    activity: s.profile.activity ?? null,
    equipment: s.equipment,
    days: s.days,
    want_nutrition: s.wantNutrition,
    want_injury: s.wantInjury,
    personality: s.personality,
    target_date: s.targetDate,
    onboarded: s.onboarded,
    streak: s.streak,
    laurels: s.laurels,
    sealed_date: s.sealedDate,
    updated_at: new Date().toISOString(),
  };
}

export async function currentUserId(): Promise<string | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

/** Push the local calibration to the cloud (best-effort, no-op when signed out). */
export async function pushProfile(state: FitState) {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  await sb.from("profiles").upsert(toRow(state, uid));
}

/** Pull the cloud calibration, mapped back to store shape. Null if none/signed out. */
export async function pullProfile(): Promise<Partial<FitState> | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const uid = await currentUserId();
  if (!uid) return null;
  const { data } = await sb.from("profiles").select("*").eq("id", uid).single();
  if (!data || !data.onboarded) return null;
  return {
    coach: data.coach,
    goal: data.goal,
    experience: data.experience,
    profile: {
      age: data.age ?? undefined,
      weightKg: data.weight_kg ?? undefined,
      heightCm: data.height_cm ?? undefined,
      sex: data.sex ?? undefined,
      activity: data.activity ?? undefined,
    },
    equipment: data.equipment,
    days: data.days,
    wantNutrition: data.want_nutrition,
    wantInjury: data.want_injury,
    personality: data.personality,
    targetDate: data.target_date,
    onboarded: data.onboarded,
    streak: data.streak ?? 0,
    laurels: data.laurels ?? 0,
    sealedDate: data.sealed_date ?? null,
  };
}

/** Persist a single chat message (best-effort). */
export async function saveMessage(
  role: "user" | "assistant",
  content: string,
  mode: ChatMode = "coach"
) {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  await sb.from("chat_messages").insert({ user_id: uid, role, content, mode });
}

/* ---------------- Daily Rites (stored in daily_wins) ---------------- */

/** Push today's rites (best-effort). One row per rite in daily_wins. */
export async function pushRites(day: string, rites: Record<RiteId, boolean>) {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  await sb.from("daily_wins").upsert(
    RITES.map((r) => ({ user_id: uid, day, win_id: r.id, done: rites[r.id] })),
    { onConflict: "user_id,day,win_id" }
  );
}

/** Pull today's rites. Null when signed out / nothing stored. */
export async function pullRites(
  day: string
): Promise<Partial<Record<RiteId, boolean>> | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const uid = await currentUserId();
  if (!uid) return null;
  const { data } = await sb
    .from("daily_wins")
    .select("win_id, done")
    .eq("user_id", uid)
    .eq("day", day);
  if (!data || data.length === 0) return null;
  const out: Partial<Record<RiteId, boolean>> = {};
  for (const row of data) out[row.win_id as RiteId] = !!row.done;
  return out;
}

/* ---------------- Progress photos (private Storage bucket) ---------------- */

export interface ProgressPhoto {
  id: number;
  url: string;
  takenAt: string;
}

/** Upload a progress photo to the private bucket. Null when signed out. */
export async function uploadProgressPhoto(file: File): Promise<boolean> {
  const sb = getSupabaseBrowser();
  if (!sb) return false;
  const uid = await currentUserId();
  if (!uid) return false;
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${uid}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("progress").upload(path, file);
  if (error) return false;
  await sb.from("progress_photos").insert({ user_id: uid, path });
  return true;
}

/** List the user's progress photos as short-lived signed URLs (newest last). */
export async function listProgressPhotos(limit = 8): Promise<ProgressPhoto[]> {
  const sb = getSupabaseBrowser();
  if (!sb) return [];
  const uid = await currentUserId();
  if (!uid) return [];
  const { data } = await sb
    .from("progress_photos")
    .select("id, path, taken_at")
    .eq("user_id", uid)
    .order("taken_at", { ascending: true })
    .limit(limit);
  if (!data || data.length === 0) return [];
  const { data: signed } = await sb.storage
    .from("progress")
    .createSignedUrls(data.map((d) => d.path), 60 * 60);
  if (!signed) return [];
  return data.flatMap((d, i) =>
    signed[i]?.signedUrl
      ? [{ id: d.id, url: signed[i].signedUrl, takenAt: d.taken_at }]
      : []
  );
}
