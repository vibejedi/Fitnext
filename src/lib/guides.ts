/** Movement Guides — 5–10s vertical video shorts showing how each movement
 *  is done, grouped by bodypart. The backend convention is one folder per
 *  bodypart: /guides/<bodypart>/<movement>.mp4 (+ .jpg thumbnail). Files
 *  that aren't uploaded yet fall back to the bronze placeholder card. */

export interface Guide {
  name: string;
  part: string;
  dur: string; // "0:08"
}

export const GUIDE_LIBRARY: { part: string; moves: { name: string; dur: string }[] }[] = [
  {
    part: "Chest",
    moves: [
      { name: "Bench Press", dur: "0:08" },
      { name: "Incline DB Press", dur: "0:07" },
      { name: "Push-Up", dur: "0:06" },
    ],
  },
  {
    part: "Back",
    moves: [
      { name: "Deadlift", dur: "0:09" },
      { name: "Pull-Up", dur: "0:06" },
      { name: "Barbell Row", dur: "0:08" },
    ],
  },
  {
    part: "Legs",
    moves: [
      { name: "Back Squat", dur: "0:09" },
      { name: "Walking Lunge", dur: "0:08" },
      { name: "Romanian Deadlift", dur: "0:08" },
    ],
  },
  {
    part: "Shoulders",
    moves: [
      { name: "Overhead Press", dur: "0:07" },
      { name: "Lateral Raise", dur: "0:06" },
    ],
  },
  {
    part: "Core",
    moves: [
      { name: "Plank", dur: "0:05" },
      { name: "Hanging Leg Raise", dur: "0:06" },
    ],
  },
];

/** Today's session movements — the backend will feed these from the coach's
 *  plan; only those movements' shorts appear in the collapsed panel. */
export const TODAY_GUIDES: Guide[] = [
  { name: "Back Squat", dur: "0:09", part: "Legs" },
  { name: "Romanian Deadlift", dur: "0:08", part: "Legs" },
  { name: "Barbell Row", dur: "0:08", part: "Back" },
  { name: "Plank", dur: "0:05", part: "Core" },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const guideVideoSrc = (g: Guide) => `/guides/${slug(g.part)}/${slug(g.name)}.mp4`;

export const allGuides = (): Guide[] =>
  GUIDE_LIBRARY.flatMap(({ part, moves }) => moves.map((m) => ({ ...m, part })));

export const filterGuides = (guides: Guide[], query: string): Guide[] => {
  const q = query.trim().toLowerCase();
  if (!q) return guides;
  return guides.filter(
    (g) => g.name.toLowerCase().includes(q) || g.part.toLowerCase().includes(q)
  );
};
