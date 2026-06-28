import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { coachById, type CoachId } from "@/lib/coaches";
import { personalityById, type PersonalityId } from "@/lib/personalities";

export const runtime = "nodejs";

interface Body {
  messages: { role: "user" | "assistant"; content: string }[];
  context: {
    coach: CoachId | null;
    personality: PersonalityId | null;
    goal: string | null;
    experience: string | null;
    profile: Record<string, unknown>;
    equipment: string | null;
    days: number | null;
    wantNutrition: boolean;
    wantInjury: boolean;
  };
}

function buildSystemPrompt(ctx: Body["context"]) {
  const coach = coachById(ctx.coach);
  const persona = personalityById(ctx.personality);
  const name = coach ? `Coach ${coach.name}` : "the FitNext coach";

  return `You are ${name}, an elite AI fitness coach in the FitNext app${
    coach ? `, specializing in ${coach.domain}` : ""
  }. ${persona ? persona.voice : ""}

Athlete profile:
- Goal: ${ctx.goal ?? "unspecified"}
- Experience: ${ctx.experience ?? "unspecified"}
- Stats: ${JSON.stringify(ctx.profile)}
- Equipment: ${ctx.equipment ?? "unspecified"}, ${ctx.days ?? "?"} days/week
- Nutrition coaching: ${ctx.wantNutrition ? "yes" : "no"}
- Injury/PT coaching: ${ctx.wantInjury ? "yes" : "no"}

Rules:
- Be straight to the point. No fluff, no info-dumps. Short, scannable answers.
- When the athlete logs a workout/meal/feeling, acknowledge it and give ONE concrete next action.
- Give specific numbers (sets, reps, loads, macros) when relevant.
- Stay in your lane as a fitness/nutrition coach; recommend a professional for medical issues.
- Keep replies under ~120 words unless asked for a full plan.`;
}

function mockReply(ctx: Body["context"], lastUser: string) {
  const coach = coachById(ctx.coach);
  const name = coach ? `Coach ${coach.name}` : "Your coach";
  return `⚡ ${name} here (demo mode — add ANTHROPIC_API_KEY for live coaching).

I heard: "${lastUser.slice(0, 80)}". Based on your ${
    ctx.goal ?? "goal"
  } target and ${ctx.days ?? "your"} training days, here's your next move: log today's session and hit your protein. Tomorrow we progress the main lift by one set. Let's go.`;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = body.messages ?? [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ reply: mockReply(body.context, lastUser), demo: true });
  }

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: process.env.FITNEXT_MODEL || "claude-sonnet-4-6",
      max_tokens: 600,
      system: buildSystemPrompt(body.context),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const reply = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n")
      .trim();
    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json(
      { reply: mockReply(body.context, lastUser), demo: true, error: String(err) },
    );
  }
}
