import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { personalityById } from "@/lib/personalities";
import type { BriefingContext } from "@/lib/briefing";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Morning briefing writer — one short, non-streamed generation per day per
 * athlete. Returns plain text in a strict three-line shape; the client
 * caches it in the store for the rest of the local day and falls back to
 * `localBriefing` when this route errors or no key is configured.
 */

const FORMAT_RULES = `Write the athlete's morning briefing. EXACTLY three lines, plain text, no markdown, no emoji, no greeting:
Yesterday: <what their logged records show — use the real numbers given; if nothing was logged, say so plainly, no guilt-tripping>
Today: <the planned session — name it and call out the one lift or effort that matters most>
One thing: <a single specific, doable nudge for today — never two>
Each line under 160 characters. Be concrete, never generic. Never invent data that isn't in the context.`;

export async function POST(req: NextRequest) {
  let ctx: BriefingContext;
  try {
    const body = (await req.json()) as { context?: BriefingContext };
    if (!body?.context || typeof body.context !== "object") throw new Error("bad");
    ctx = body.context;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Client renders its deterministic local briefing instead.
    return NextResponse.json({ error: "no_key" }, { status: 503 });
  }

  const persona = personalityById(ctx.personality);
  const system = `You are Coach ${ctx.coach}, the athlete's AI fitness coach in the FitNext app. ${persona?.voice ?? ""}

Today's date: ${ctx.day}

${FORMAT_RULES}`;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: process.env.FITNEXT_MODEL || "claude-sonnet-4-6",
      max_tokens: 300,
      system,
      messages: [
        {
          role: "user",
          content: `Athlete context (their real logged data):\n${JSON.stringify(ctx, null, 2)}`,
        },
      ],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!text) return NextResponse.json({ error: "empty" }, { status: 502 });
    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[briefing] request failed:", err);
    return NextResponse.json({ error: "briefing_unavailable" }, { status: 502 });
  }
}
