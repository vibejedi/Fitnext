import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3123";
const OUT = process.argv[2] ?? "./shots";
mkdirSync(OUT, { recursive: true });

const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString("en-CA"); };
const ts = (n, h) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 12, 0, 0); return d.getTime(); };

const state = {
  coach: "kratos", goal: "strength", experience: "intermediate",
  profile: { age: 32, weightKg: 84, heightCm: 181, sex: "male", activity: "moderate" },
  equipment: "full_gym", days: 4, wantNutrition: true, wantInjury: true,
  personality: "drill", onboarded: true, targetDate: null,
  streak: 12, laurels: 450, sealedDate: null, hallJoined: false, walletAddress: null,
  rites: { calories: true, macros: false, steps: true, relax: false, mobility: false },
  ritesDate: day(0), riteOverrides: {}, riteHistory: {},
  coachVideoUrl: null, nutritionMode: "tracker",
  meals: [],
  workouts: [
    { id: "w1", day: day(1), title: "Push Day", labor: "push",
      exercises: [{ name: "Barbell Bench Press", sets: [{ reps: 5, weight: 100 }, { reps: 4, weight: 102.5 }] }],
      feel: "Solid.", energy: 4, ts: ts(1, 18) },
    { id: "w2", day: day(4), title: "Push B", labor: "push",
      exercises: [{ name: "Incline Dumbbell Press", sets: [{ reps: 10, weight: 32 }] }],
      feel: "", energy: 3, ts: ts(4, 18) },
  ],
  messages: [], nutritionMessages: [],
};

const clickByText = async (page, text) => {
  const ok = await page.evaluate((t) => {
    const els = [...document.querySelectorAll("button, a, label")];
    const el = els.find((e) => e.textContent.trim().toUpperCase().includes(t.toUpperCase()));
    if (el) { el.click(); return true; }
    return false;
  }, text);
  if (!ok) console.log("MISS:", text);
  return ok;
};

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: "new",
  args: ["--no-first-run", "--disable-gpu"],
});
const page = await browser.newPage();
await page.evaluateOnNewDocument((s) => {
  localStorage.setItem("fitnext-store", JSON.stringify({ state: s, version: 0 }));
}, state);
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

// 1. dashboard — issues badge should be gone
await page.goto(BASE + "/dashboard", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: `${OUT}/fix-dashboard.png` });

// 2. rites edit mode
await clickByText(page, "EDIT");
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: `${OUT}/fix-rites-edit.png`, fullPage: true });

// 3. train — open Push labor sheet
await page.goto(BASE + "/train", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
await clickByText(page, "Push");
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: `${OUT}/fix-labor-sheet.png` });

// 4. progress — open hall enrollment
await page.goto(BASE + "/progress", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
await clickByText(page, "ENTER THE HALL");
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: `${OUT}/fix-hall-sheet.png`, fullPage: true });

// 5. log-workout dialog with labor chips
await page.goto(BASE + "/train", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 800));
await clickByText(page, "LOG SESSION");
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: `${OUT}/fix-log-workout.png` });

await browser.close();
console.log("done");
