"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CoachId } from "./coaches";
import type { PersonalityId } from "./personalities";
import type { LaborId } from "./labors";
import { EMPTY_RITES, SEAL_LAURELS, type RiteId, type RiteOverrides } from "./rites";

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

/** How the user wants the nutritionist to behave:
 *  "full" = interview → custom meal-prep plan; "tracker" = calorie/macro
 *  tracking only. Null until they pick. */
export type NutritionMode = "full" | "tracker";

/** A logged meal. Macros/calories are EYEBALL ESTIMATES from the user's
 *  meal photos (top view + close-up) and short description — the user can
 *  adjust them on the review screen, but they are never lab measurements. */
export interface Meal {
  id: string;
  day: string; // YYYY-MM-DD local
  name: string;
  desc: string;
  kcal: number;
  p: number; // protein g
  c: number; // carbs g
  f: number; // fat g
  /** True once the athlete hand-adjusted the oracle's eyeball numbers. */
  edited?: boolean;
  ts: number;
}

/** One working set within a logged exercise. */
export interface WorkoutSet {
  reps: number;
  weight: number; // kg (0 = bodyweight / unweighted)
}

/** One exercise in a logged session: the lift and its sets. */
export interface WorkoutExercise {
  name: string;
  sets: WorkoutSet[];
}

/** A logged training session — the structured lift log (lift → reps →
 *  weight) that powers the History view and the coach's progression. */
export interface Workout {
  id: string;
  day: string; // YYYY-MM-DD local (session date)
  title: string;
  /** Which of the six Labors this session belongs to (powers the per-Labor
   *  record on the Train screen). Optional — old sessions are inferred. */
  labor?: LaborId;
  exercises: WorkoutExercise[];
  /** How the session felt — free text the coach reads verbatim. */
  feel: string;
  /** Session energy 1 (drained) → 5 (unstoppable); optional. */
  energy?: number;
  ts: number;
}

/** Which rites were completed on a past day (id → done). */
export type RiteDay = Partial<Record<RiteId, boolean>>;

/** A body-weight entry — one per local day (re-logging replaces it). */
export interface WeighIn {
  day: string; // YYYY-MM-DD local
  kg: number;
  ts: number;
}

/** The user's local date as YYYY-MM-DD. */
export const localDay = () => new Date().toLocaleDateString("en-CA");

/** YYYY-MM-DD local, one day before the given local day string. */
const dayBefore = (day: string) => {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA");
};

/** Streak shields ("Hermes' Pardon") — earned every 7 sealed days in a row,
 *  held up to this many. One shield forgives one missed day, so a single
 *  slip never burns the whole streak (loss-aversion without the anxiety). */
export const MAX_SHIELDS = 2;
export const SHIELD_EVERY = 7;

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
  /** Athlete-edited rite targets (id → target text); empty = defaults. */
  riteOverrides: RiteOverrides;
  /** Past days' rite completions, keyed by YYYY-MM-DD (today lives in
   *  `rites`). Feeds the History view + coach context; capped in the store. */
  riteHistory: Record<string, RiteDay>;
  /** Day sealed (ISO date) — sealing awards laurels toward the Hall of Honor. */
  sealedDate: string | null;
  laurels: number;
  /** Streak shields held (0–MAX_SHIELDS); one auto-forgives a missed day. */
  shields: number;
  /** Body-weight log, one entry per day, oldest first. */
  weighIns: WeighIn[];
  /** Hall of Honor enrollment: done once the athlete has created a verified
   *  account (username + password + email) via the Hall gate. */
  hallJoined: boolean;
  /** Optional Ethereum address rewards are sent to (0x…, 40 hex chars). */
  walletAddress: string | null;
  /** Current coach video (backend-rotated weekly/bi-weekly); null → still portrait. */
  coachVideoUrl: string | null;
  /** Cached morning briefing — regenerated once per local day. */
  briefing: { day: string; text: string } | null;
  /** Photo-logged meals (eyeball-estimated macros). Filtered by day in the UI. */
  meals: Meal[];
  /** Structured training sessions (lift → reps → weight), newest last. */
  workouts: Workout[];
  nutritionMode: NutritionMode | null;
  messages: ChatMessage[];          // training coach thread
  nutritionMessages: ChatMessage[]; // nutrition coach thread

  // actions
  set: <K extends keyof FitState>(key: K, value: FitState[K]) => void;
  setProfile: (p: Partial<Profile>) => void;
  /** Roll rites over to today if the local day has changed. */
  beginDay: () => void;
  toggleRite: (id: RiteId) => void;
  /** Edit a rite's target text ("" or whitespace resets to the default). */
  setRiteTarget: (id: RiteId, target: string) => void;
  /** Seal today: +laurels, once per day. No-op unless all rites are done. */
  sealDay: () => void;
  /** Log today's body weight (replaces today's earlier entry). */
  addWeighIn: (kg: number) => void;
  addMeal: (m: Meal) => void;
  addWorkout: (w: Workout) => void;
  deleteWorkout: (id: string) => void;
  /** Fold cloud-pulled history into the local store without clobbering
   *  today's live rites (best-effort merge by id/day). */
  absorbHistory: (h: {
    meals?: Meal[];
    workouts?: Workout[];
    riteHistory?: Record<string, RiteDay>;
  }) => void;
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
  riteOverrides: {} as RiteOverrides,
  riteHistory: {} as Record<string, RiteDay>,
  sealedDate: null,
  laurels: 0,
  shields: 0,
  weighIns: [] as WeighIn[],
  hallJoined: false,
  walletAddress: null,
  coachVideoUrl: null,
  briefing: null,
  meals: [],
  workouts: [],
  nutritionMode: null,
  messages: [],
  nutritionMessages: [],
};

/** Keep the rite-history map bounded (newest ~120 days). */
const capRiteHistory = (h: Record<string, RiteDay>): Record<string, RiteDay> => {
  const days = Object.keys(h).sort();
  if (days.length <= 120) return h;
  const keep = days.slice(days.length - 120);
  return Object.fromEntries(keep.map((d) => [d, h[d]]));
};

/** Fold cloud rows into local, day-scoped: cloud is authoritative for any
 *  day it covers (local rows on those days are dropped), while local-only
 *  days are preserved. Avoids duplicates from local-vs-cloud id schemes —
 *  the same reconciliation the dashboard already uses for today's meals. */
const replaceByDay = <T extends { day: string; ts: number }>(
  local: T[],
  cloud: T[],
  cap: number
): T[] => {
  if (cloud.length === 0) return local;
  const cloudDays = new Set(cloud.map((x) => x.day));
  const kept = local.filter((x) => !cloudDays.has(x.day));
  return [...kept, ...cloud].sort((x, y) => x.ts - y.ts).slice(-cap);
};

/** Union local + cloud by id, cloud winning on collision. Used for workouts:
 *  a pushed session shares one stable id across local & cloud (see sync's
 *  `cid`), so this de-dupes it, while a not-yet-synced local-only session
 *  (id absent from the cloud set) survives — unlike a day-scoped replace,
 *  which would drop it when the cloud already holds another session that day. */
const mergeById = <T extends { id: string; ts: number }>(
  local: T[],
  cloud: T[],
  cap: number
): T[] => {
  if (cloud.length === 0) return local;
  const by = new Map<string, T>();
  for (const x of local) by.set(x.id, x);
  for (const x of cloud) by.set(x.id, x); // cloud is authoritative on collision
  return [...by.values()].sort((x, y) => x.ts - y.ts).slice(-cap);
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
          const rites = { ...base, [id]: !base[id] };
          // Mirror today into the history map so the record survives the
          // daily rollover (and works in local-only mode without the cloud).
          return {
            rites,
            ritesDate: today,
            riteHistory: capRiteHistory({ ...s.riteHistory, [today]: rites }),
          };
        }),
      setRiteTarget: (id, target) =>
        setState((s) => {
          const next = { ...s.riteOverrides };
          const t = target.trim();
          if (t) next[id] = t;
          else delete next[id];
          return { riteOverrides: next };
        }),
      sealDay: () => {
        const s = getState();
        const today = localDay();
        const allDone =
          s.ritesDate === today && Object.values(s.rites).every(Boolean);
        if (!allDone || s.sealedDate === today) return;
        // Consecutive-day streak: sealed yesterday extends it; a single
        // missed day is forgiven by a shield; anything worse restarts at 1.
        const yesterday = dayBefore(today);
        let streak: number;
        let shields = s.shields;
        if (s.sealedDate === yesterday) {
          streak = s.streak + 1;
        } else if (s.sealedDate === dayBefore(yesterday) && shields > 0) {
          shields -= 1; // Hermes' Pardon — the missed day is forgiven
          streak = s.streak + 1;
        } else {
          streak = Math.max(1, s.sealedDate ? 1 : s.streak);
        }
        // Every 7 straight sealed days mints a shield (held up to the cap).
        if (streak > 0 && streak % SHIELD_EVERY === 0) {
          shields = Math.min(MAX_SHIELDS, shields + 1);
        }
        setState({
          sealedDate: today,
          laurels: s.laurels + SEAL_LAURELS,
          streak,
          shields,
        });
      },
      addWeighIn: (kg) =>
        setState((s) => {
          const today = localDay();
          const entry: WeighIn = { day: today, kg, ts: Date.now() };
          const rest = s.weighIns.filter((w) => w.day !== today);
          return {
            weighIns: [...rest, entry]
              .sort((a, b) => (a.day < b.day ? -1 : 1))
              .slice(-365),
            profile: { ...s.profile, weightKg: kg },
          };
        }),
      addMeal: (m) =>
        setState((s) => ({ meals: [...s.meals, m].slice(-400) })),
      addWorkout: (w) =>
        setState((s) => ({ workouts: [...s.workouts, w].slice(-200) })),
      deleteWorkout: (id) =>
        setState((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),
      absorbHistory: ({ meals, workouts, riteHistory }) =>
        setState((s) => {
          const today = localDay();
          // Cloud is source of truth for past days; keep today's live rites.
          const nextRiteHistory = capRiteHistory({
            ...s.riteHistory,
            ...(riteHistory ?? {}),
            ...(s.ritesDate === today ? { [today]: s.rites } : {}),
          });
          return {
            meals: meals ? replaceByDay(s.meals, meals, 400) : s.meals,
            workouts: workouts ? mergeById(s.workouts, workouts, 200) : s.workouts,
            riteHistory: nextRiteHistory,
          };
        }),
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
