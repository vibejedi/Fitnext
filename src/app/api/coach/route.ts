import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { coachById, type CoachId } from "@/lib/coaches";
import { personalityById, type PersonalityId } from "@/lib/personalities";
import { TRAINING_PROTOCOL, NUTRITION_SYSTEM_PROMPT } from "@/lib/prompts";
import type { ChatMode } from "@/lib/store";

export const runtime = "nodejs";
// Replies stream, so the response starts immediately; the generous ceiling
// covers long nutrition-plan generations (platforms without Fluid compute
// clamp this to their own maximum).
export const maxDuration = 300;

interface Body {
  mode?: ChatMode;
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
    /** Athlete's local date (YYYY-MM-DD) so lift-log dates match their day. */
    clientDate?: string;
  };
}

const DEFAULT_CTX: Body["context"] = {
  coach: null, personality: null, goal: null, experience: null,
  profile: {}, equipment: null, days: null,
  wantNutrition: true, wantInjury: false,
};

function today(ctx: Body["context"]) {
  if (typeof ctx.clientDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ctx.clientDate)) {
    return ctx.clientDate;
  }
  return new Date().toISOString().slice(0, 10);
}

function athleteProfile(ctx: Body["context"]) {
  return `-------------------------------------
ATHLETE PROFILE
-------------------------------------

Training experience: ${ctx.experience ?? "—"}
Goal: ${ctx.goal ?? "—"}
Schedule: ${ctx.days ? `${ctx.days} days per week` : "—"}
Equipment access: ${ctx.equipment ?? "—"}
Injuries or limitations: ${
    ctx.wantInjury
      ? "athlete opted into injury/PT support — ask for specifics and programme around them"
      : "none reported"
  }
Stats: ${JSON.stringify(ctx.profile)}
Nutrition coaching add-on: ${ctx.wantNutrition ? "yes" : "no"}`;
}

function buildCoachSystemPrompt(ctx: Body["context"]) {
  const coach = coachById(ctx.coach);
  const persona = personalityById(ctx.personality);
  const name = coach ? `Coach ${coach.name}` : "the FitNext coach";

  const intro = `You are ${name}, an elite AI fitness coach in the FitNext app${
    coach ? `, specializing in ${coach.domain}` : ""
  }. ${persona ? persona.voice : ""}

Today's date: ${today(ctx)}`;

  return [intro, athleteProfile(ctx), TRAINING_PROTOCOL].join("\n\n");
}

function buildNutritionSystemPrompt(ctx: Body["context"]) {
  return `${NUTRITION_SYSTEM_PROMPT}

-------------------------------------
APP CONTEXT (FitNext)
-------------------------------------

Today's date: ${today(ctx)}

You are the Nutrition coach inside the FitNext app, replying in a plain-text
chat bubble. Format any tables as compact plain text, one item per line,
with pipes for columns. Keep the interview one section at a time as
instructed above — short messages, one section per turn.

Already known from the athlete's FitNext profile — confirm these instead of
asking blind, and only re-ask what is missing:
- Stats: ${JSON.stringify(ctx.profile)}
- Primary training goal: ${ctx.goal ?? "—"}
- Trains ${ctx.days ?? "—"} days/week (equipment: ${ctx.equipment ?? "—"})

If their primary goal is not fat loss (e.g. muscle gain), adapt the plan's
energy balance accordingly (e.g. a lean surplus instead of a deficit) while
keeping the same interview, structure and quality bar.`;
}

function mockCoachReply(ctx: Body["context"], lastUser: string) {
  const coach = coachById(ctx.coach);
  const name = coach ? `Coach ${coach.name}` : "Your coach";
  return `⚡ ${name} here (demo mode — add ANTHROPIC_API_KEY for live coaching).

I heard: "${lastUser.slice(0, 80)}". Based on your ${
    ctx.goal ?? "goal"
  } target and ${ctx.days ?? "your"} training days, here's your next move: log today's session and hit your protein. Tomorrow we progress the main lift by one set. Let's go.`;
}

function mockNutritionReply(lastUser: string) {
  return `🥗 Your nutritionist here (demo mode — add ANTHROPIC_API_KEY for live coaching).

I heard: "${lastUser.slice(0, 80)}". Once I'm live, I'll take you through 4 quick sections — stats, lifestyle, food preferences, snack habits — then build your full plan: calories, macros, a 7-day meal plan around foods you actually like, snack swaps, and evidence-backed supplements.`;
}

const text = (s: string) =>
  new Response(s, { headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Normalize untrusted input — never let a malformed body 500.
  const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
  const messages = rawMessages.filter(
    (m): m is Body["messages"][number] =>
      !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
  );
  const ctx: Body["context"] = {
    ...DEFAULT_CTX,
    ...(typeof body?.context === "object" && body.context !== null ? body.context : {}),
  };

  const mode: ChatMode = body?.mode === "nutrition" ? "nutrition" : "coach";
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  // The API requires the first message to be from the user — drop anything
  // before the first user turn (the client-side greeting), but fold the
  // dropped greeting into the system prompt so the model doesn't re-greet
  // or re-ask what the app already asked.
  const firstUser = messages.findIndex((m) => m.role === "user");
  const apiMessages = firstUser === -1 ? [] : messages.slice(firstUser);
  const droppedGreeting =
    firstUser > 0
      ? messages.slice(0, firstUser).filter((m) => m.role === "assistant")
          .map((m) => m.content).join("\n\n")
      : "";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return text(mode === "nutrition" ? mockNutritionReply(lastUser) : mockCoachReply(ctx, lastUser));
  }
  if (apiMessages.length === 0) {
    return NextResponse.json({ error: "no_user_message" }, { status: 400 });
  }

  let system =
    mode === "nutrition" ? buildNutritionSystemPrompt(ctx) : buildCoachSystemPrompt(ctx);
  if (droppedGreeting) {
    system += `\n\nThe app already displayed this opening message from you:\n"""\n${droppedGreeting}\n"""\nContinue the conversation from there — do not greet again or repeat it.`;
  }

  try {
    const client = new Anthropic({ apiKey });
    const msgStream = client.messages.stream({
      model: process.env.FITNEXT_MODEL || "claude-sonnet-4-6",
      // The nutrition plan (7-day meals, macros, supplements) is a long
      // single generation; training replies stay short but need room for
      // full-session tables. Streaming keeps both under HTTP timeouts.
      max_tokens: mode === "nutrition" ? 8000 : 3000,
      system,
      messages: apiMessages.map((m) => ({ role: m.role, content: m.content })),
    });

    // Pull the first event before committing to a streamed response —
    // connection/auth/billing errors throw here and get a clean 502
    // instead of an aborted stream.
    const iterator = msgStream[Symbol.asyncIterator]();
    const first = await iterator.next();

    const encoder = new TextEncoder();
    let emitted = false;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          let cur = first;
          while (!cur.done) {
            const event = cur.value;
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              emitted = true;
              controller.enqueue(encoder.encode(event.delta.text));
            }
            cur = await iterator.next();
          }
          const final = await msgStream.finalMessage();
          if (!emitted) {
            controller.enqueue(
              encoder.encode(
                "I can't help with that one — let's keep it to training, nutrition, and recovery."
              )
            );
          } else if (final.stop_reason === "max_tokens") {
            controller.enqueue(
              encoder.encode(
                '\n\n[Reply hit the length limit — say "continue" and I\'ll pick up where I left off.]'
              )
            );
          }
          controller.close();
        } catch (err) {
          console.error("[coach] stream error:", err);
          if (emitted) {
            // Partial reply already delivered — close it out with a note.
            controller.enqueue(
              encoder.encode("\n\n[Connection dropped mid-reply — ask me to continue.]")
            );
            controller.close();
          } else {
            controller.error(err);
          }
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[coach] request failed:", err);
    return NextResponse.json({ error: "coach_unavailable" }, { status: 502 });
  }
}
