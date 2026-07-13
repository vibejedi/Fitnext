export type CoachId =
  | "prometheus"
  | "adonis"
  | "kratos"
  | "nike"
  | "atalanta"
  | "hermes";

export interface Coach {
  id: CoachId;
  name: string;        // "Prometheus"
  title: string;       // "The Pioneer"
  route: string;       // "Hybrid Fitness"
  tagline: string;     // one-liner, straight to the point
  domain: string;      // what they coach
  image: string;       // /brand/coach-*.png
  focuses: string[];   // what the training emphasizes
  muscles: string[];   // primary muscles & systems worked (incl. heart, lungs, fiber types)
}

export const COACHES: Coach[] = [
  {
    id: "prometheus",
    name: "Prometheus",
    title: "The Pioneer",
    route: "Hybrid Fitness",
    tagline: "Strength, conditioning, and stamina — the complete athlete.",
    domain: "blended strength + endurance training",
    image: "/brand/coach-prometheus.png",
    focuses: ["Strength + endurance in one plan", "Work capacity", "Conditioning"],
    muscles: ["Full body", "Heart", "Lungs", "Fast & slow-twitch fibers"],
  },
  {
    id: "adonis",
    name: "Adonis",
    title: "The Sculptor",
    route: "Bodybuilding",
    tagline: "Build the physique. Symmetry, size, definition.",
    domain: "hypertrophy and aesthetics",
    image: "/brand/coach-adonis.png",
    focuses: ["Hypertrophy — muscle size", "Symmetry & proportion", "Definition"],
    muscles: ["Chest", "Back & lats", "Shoulders", "Arms", "Quads", "Hamstrings & glutes", "Calves", "Fast-twitch fibers"],
  },
  {
    id: "kratos",
    name: "Kratos",
    title: "The Titan",
    route: "Powerlifting",
    tagline: "Raw strength. Squat, bench, deadlift — move the world.",
    domain: "maximal strength on the big three",
    image: "/brand/coach-kratos.png",
    focuses: ["Maximal strength", "Squat · Bench · Deadlift", "Power off the floor"],
    muscles: ["Posterior chain — glutes, hamstrings, erectors", "Quads", "Chest & triceps", "Lats & upper back", "Grip & forearms", "Fast-twitch fibers", "Central nervous system"],
  },
  {
    id: "nike",
    name: "Nike",
    title: "The Victor",
    route: "CrossFit",
    tagline: "Functional intensity. Compete with yesterday's you.",
    domain: "high-intensity functional conditioning",
    image: "/brand/coach-nike.png",
    focuses: ["Functional conditioning", "Power endurance", "Varied high intensity"],
    muscles: ["Full body", "Heart", "Lungs", "Core", "Fast & slow-twitch mix"],
  },
  {
    id: "atalanta",
    name: "Atalanta",
    title: "The Huntress",
    route: "Calisthenics",
    tagline: "Master your bodyweight. Control, balance, grace.",
    domain: "bodyweight skill and strength",
    image: "/brand/coach-atalanta.png",
    focuses: ["Bodyweight strength & skill", "Control & balance", "Mobility"],
    muscles: ["Core", "Lats & shoulders", "Arms & grip", "Stabilizers", "Tendons & joints", "Slow & fast-twitch control"],
  },
  {
    id: "hermes",
    name: "Hermes",
    title: "The Messenger",
    route: "Running",
    tagline: "Pace, distance, speed. Outrun your limits.",
    domain: "running and endurance",
    image: "/brand/coach-hermes.png",
    focuses: ["Aerobic endurance", "Pace & speed work", "Recovery"],
    muscles: ["Heart", "Lungs", "Slow-twitch fibers", "Calves & achilles", "Quads & hamstrings", "Hip flexors & glutes"],
  },
];

export const coachById = (id: CoachId | null | undefined) =>
  COACHES.find((c) => c.id === id);
