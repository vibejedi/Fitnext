"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CoachId } from "./coaches";
import type { PersonalityId } from "./personalities";
import { EMPTY_RITES, SEAL_LAURELS, type RiteId } from "./rites";

export interface Profile {
  age?: number;
  weightKg?: number;
  heightCm?: number;
  sex?: "male" | "female" | "other";
  activity?: "sedentary" | "light" | "moderate" | "high";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

/** Chat sub-areas under "Chat with Coach". Therapy is coming soon. */
export type ChatMode = "coach" | "nutrition";

/** The user's local date as YYYY-MM-DD. */
export const localDay = () => new Date().toLocaleDateString("en-CA");

export interface FitState {
  // onboarding answers
  coach: CoachId | null;
  goal: string | null;
  experience: string | null;
  profile: Profile;
  equipment: string | null;
  days: number | null;
  wantNutrition: boolean;
  wantInjury: boolean;
  personality: PersonalityId | null;
  onboarded: boolean;

  // dashboard data
  targetDate: string | null;
  streak: number;
  /** Daily Rites — reset each local day (ritesDate tracks which day). */
  rites: Record<RiteId, boolean>;
  ritesDate: string | null;
  /** Day sealed (ISO date) — sealing awards laurels toward the Hall of Honor. */
  sealedDate: string | null;
  laurels: number;
  /** Current coach video (backend-rotated weekly/bi-weekly); null → still portrait. */
  coachVideoUrl: string | null;
  messages: ChatMessage[];          // training coach thread
  nutritionMessages: ChatMessage[]; // nutrition coach thread

  // actions
  set: <K extends keyof FitState>(key: K, value: FitState[K]) => void;
  setProfile: (p: Partial<Profile>) => void;
  /** Roll rites over to today if the local day has changed. */
  beginDay: () => void;
  toggleRite: (id: RiteId) => void;
  /** Seal today: +laurels, once per day. No-op unless all rites are done. */
  sealDay: () => void;
  addMessage: (m: ChatMessage, mode?: ChatMode) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

const initial = {
  coach: null,
  goal: null,
  experience: null,
  profile: {},
  equipment: null,
  days: null,
  wantNutrition: true,
  wantInjury: false,
  personality: null,
  onboarded: false,
  targetDate: null,
  streak: 0,
  rites: { ...EMPTY_RITES },
  ritesDate: null,
  sealedDate: null,
  laurels: 0,
  coachVideoUrl: null,
  messages: [],
  nutritionMessages: [],
};

export const useFit = create<FitState>()(
  persist(
    (setState, getState) => ({
      ...initial,
      set: (key, value) => setState({ [key]: value } as Partial<FitState>),
      setProfile: (p) =>
        setState((s) => ({ profile: { ...s.profile, ...p } })),
      beginDay: () => {
        const today = localDay();
        if (getState().ritesDate !== today) {
          setState({ rites: { ...EMPTY_RITES }, ritesDate: today });
        }
      },
      toggleRite: (id) =>
        setState((s) => {
          const today = localDay();
          const base = s.ritesDate === today ? s.rites : { ...EMPTY_RITES };
          return { rites: { ...base, [id]: !base[id] }, ritesDate: today };
        }),
      sealDay: () => {
        const s = getState();
        const today = localDay();
        const allDone =
          s.ritesDate === today && Object.values(s.rites).every(Boolean);
        if (!allDone || s.sealedDate === today) return;
        setState({ sealedDate: today, laurels: s.laurels + SEAL_LAURELS });
      },
      addMessage: (m, mode = "coach") =>
        setState((s) =>
          mode === "nutrition"
            ? { nutritionMessages: [...s.nutritionMessages, m] }
            : { messages: [...s.messages, m] }
        ),
      completeOnboarding: () => setState({ onboarded: true, streak: 1 }),
      reset: () => setState({ ...initial }),
    }),
    { name: "fitnext-store" }
  )
);
