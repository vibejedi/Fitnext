"use client";

import { getSupabaseBrowser } from "./supabase/client";
import type { FitState } from "./store";

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
  };
}

/** Persist a single chat message (best-effort). */
export async function saveMessage(role: "user" | "assistant", content: string) {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  await sb.from("chat_messages").insert({ user_id: uid, role, content });
}
