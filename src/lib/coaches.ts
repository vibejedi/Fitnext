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
  },
  {
    id: "adonis",
    name: "Adonis",
    title: "The Sculptor",
    route: "Bodybuilding",
    tagline: "Build the physique. Symmetry, size, definition.",
    domain: "hypertrophy and aesthetics",
    image: "/brand/coach-adonis.png",
  },
  {
    id: "kratos",
    name: "Kratos",
    title: "The Titan",
    route: "Powerlifting",
    tagline: "Raw strength. Squat, bench, deadlift — move the world.",
    domain: "maximal strength on the big three",
    image: "/brand/coach-kratos.png",
  },
  {
    id: "nike",
    name: "Nike",
    title: "The Victor",
    route: "CrossFit",
    tagline: "Functional intensity. Compete with yesterday's you.",
    domain: "high-intensity functional conditioning",
    image: "/brand/coach-nike.png",
  },
  {
    id: "atalanta",
    name: "Atalanta",
    title: "The Huntress",
    route: "Calisthenics",
    tagline: "Master your bodyweight. Control, balance, grace.",
    domain: "bodyweight skill and strength",
    image: "/brand/coach-atalanta.png",
  },
  {
    id: "hermes",
    name: "Hermes",
    title: "The Messenger",
    route: "Running",
    tagline: "Pace, distance, speed. Outrun your limits.",
    domain: "running and endurance",
    image: "/brand/coach-hermes.png",
  },
];

export const coachById = (id: CoachId | null | undefined) =>
  COACHES.find((c) => c.id === id);
