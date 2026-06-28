export const GOALS = [
  { id: "fatloss", label: "Lose fat", hint: "Lean down, keep muscle" },
  { id: "muscle", label: "Build muscle", hint: "Add size & shape" },
  { id: "strength", label: "Get stronger", hint: "Move heavier loads" },
  { id: "endurance", label: "Boost endurance", hint: "Go longer, recover faster" },
  { id: "performance", label: "Athletic performance", hint: "Speed, power, agility" },
  { id: "health", label: "General health", hint: "Feel & move better" },
] as const;

export const EXPERIENCE = [
  { id: "newcomer", label: "Newcomer", hint: "0–1 yr training" },
  { id: "intermediate", label: "Intermediate", hint: "1–3 yrs, know the basics" },
  { id: "advanced", label: "Advanced", hint: "3+ yrs, dialed in" },
] as const;

export const SEX = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
] as const;

export const ACTIVITY = [
  { id: "sedentary", label: "Sedentary", hint: "Desk job, little movement" },
  { id: "light", label: "Lightly active", hint: "Some walking" },
  { id: "moderate", label: "Moderately active", hint: "On your feet often" },
  { id: "high", label: "Very active", hint: "Physical job / daily training" },
] as const;

export const EQUIPMENT = [
  { id: "full-gym", label: "Full gym" },
  { id: "home-basic", label: "Home — basics", hint: "Dumbbells, bands" },
  { id: "home-rack", label: "Home — rack & barbell" },
  { id: "bodyweight", label: "Bodyweight only" },
  { id: "outdoor", label: "Outdoors / track" },
] as const;

export const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export const TOTAL_STEPS = 7;
