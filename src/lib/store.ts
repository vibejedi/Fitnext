"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CoachId } from "./coaches";
import type { PersonalityId } from "./personalities";

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
  wins: { id: string; label: string; done: boolean }[];
  messages: ChatMessage[];          // training coach thread
  nutritionMessages: ChatMessage[]; // nutrition coach thread

  // actions
  set: <K extends keyof FitState>(key: K, value: FitState[K]) => void;
  setProfile: (p: Partial<Profile>) => void;
  toggleWin: (id: string) => void;
  addMessage: (m: ChatMessage, mode?: ChatMode) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

const DEFAULT_WINS = [
  { id: "train", label: "Today's training", done: false },
  { id: "protein", label: "Hit protein target", done: false },
  { id: "steps", label: "10k steps", done: false },
  { id: "sleep", label: "7h+ sleep", done: false },
];

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
  wins: DEFAULT_WINS,
  messages: [],
  nutritionMessages: [],
};

export const useFit = create<FitState>()(
  persist(
    (setState) => ({
      ...initial,
      set: (key, value) => setState({ [key]: value } as Partial<FitState>),
      setProfile: (p) =>
        setState((s) => ({ profile: { ...s.profile, ...p } })),
      toggleWin: (id) =>
        setState((s) => ({
          wins: s.wins.map((w) =>
            w.id === id ? { ...w, done: !w.done } : w
          ),
        })),
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
