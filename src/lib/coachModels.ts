import type { CoachId } from "./coaches";

// Animated 3D stand-ins for the god cards. Kept separate from CoachStage so
// the card grid can check "has a model" without pulling three.js into the bundle.
export interface CoachModel {
  src: string;       // GLB under public/models
  clip?: number;     // animation index; omitted → longest clip wins
  yaw?: number;      // radians — angles the god on the pedestal
  timeScale?: number;
  poseAt?: number;   // 0..1 of clip duration — freeze frame for prefers-reduced-motion
}

export const COACH_MODELS: Partial<Record<CoachId, CoachModel>> = {
  adonis: { src: "/models/adonis_curl.glb", clip: 1, yaw: 0.35, poseAt: 0.5 },
  atalanta: { src: "/models/atalanta_pistol.glb", clip: 1, yaw: -0.3, poseAt: 0.45 },
  hermes: { src: "/models/hermes_run.glb", clip: 0, yaw: 0.45, timeScale: 0.9, poseAt: 0.25 },
};
