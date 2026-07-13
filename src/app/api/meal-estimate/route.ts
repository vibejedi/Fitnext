import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Eyeball-estimates a meal's calories/macros from the user's photos
 * (top view + close-up) and short description, via Claude vision.
 * The result is always an ESTIMATE — the UI must present it as such.
 */

const ALLOWED_MEDIA = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type MediaType = (typeof ALLOWED_MEDIA)[number];

interface Body {
  description?: unknown;
  images?: { mediaType?: unknown; data?: unknown }[];
}

export interface MealEstimate {
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  note: string;
}

const SYSTEM = `You are the FitNext nutritionist's meal estimator. The user
sends photos of a single meal (photo 1 = top view, photo 2 = close-up when
present) plus a short description. Eyeball the portion sizes from the photos,
lean on the description for ingredients you can't see, and estimate the
meal's calories and macros.

Rules:
- This is an eyeball estimate. Round kcal to the nearest 10, macros to the
  nearest 5g. When unsure between two portion sizes, pick the larger.
- "name": a short title for the meal (max 5 words, no punctuation flourishes).
- "note": one short sentence on what drove the estimate or its biggest
  uncertainty (e.g. "Assumed ~1 cup rice; sauce calories are a guess.").
- If the photos clearly do not show food, set every number to 0 and explain
  in "note".

Respond with ONLY this JSON, no markdown fences, no extra text:
{"name": string, "kcal": number, "protein_g": number, "carbs_g": number, "fat_g": number, "note": string}`;

function mockEstimate(description: string): MealEstimate {
  return {
    name: description.slice(0, 40) || "Logged meal",
    kcal: 520,
    protein_g: 35,
    carbs_g: 45,
    fat_g: 20,
    note: "Demo mode — add ANTHROPIC_API_KEY for real photo estimates.",
  };
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const description =
    typeof body.description === "string" ? body.description.trim().slice(0, 500) : "";
  if (!description) {
    return NextResponse.json(
      { error: "A short description of the meal is required." },
      { status: 400 }
    );
  }

  const rawImages = Array.isArray(body.images) ? body.images.slice(0, 2) : [];
  const images = rawImages.filter(
    (i): i is { mediaType: MediaType; data: string } =>
      !!i &&
      typeof i.data === "string" &&
      i.data.length > 0 &&
      i.data.length < 7_000_000 && // ~5MB decoded
      ALLOWED_MEDIA.includes(i.mediaType as MediaType)
  );
  if (images.length === 0) {
    return NextResponse.json(
      { error: "At least one meal photo is required." },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json(mockEstimate(description));

  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: process.env.FITNEXT_MODEL || "claude-sonnet-4-6",
      max_tokens: 400,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            ...images.map((img, i) => [
              { type: "text" as const, text: i === 0 ? "Photo 1 — top view:" : "Photo 2 — close-up:" },
              {
                type: "image" as const,
                source: { type: "base64" as const, media_type: img.mediaType, data: img.data },
              },
            ]).flat(),
            { type: "text" as const, text: `Description: ${description}` },
          ],
        },
      ],
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    // tolerate stray prose/fences around the JSON
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no JSON in estimate reply");
    const parsed = JSON.parse(match[0]) as Partial<MealEstimate>;
    const num = (v: unknown) =>
      typeof v === "number" && isFinite(v) ? Math.max(0, Math.round(v)) : 0;
    const estimate: MealEstimate = {
      name: typeof parsed.name === "string" && parsed.name.trim()
        ? parsed.name.trim().slice(0, 60)
        : description.slice(0, 40),
      kcal: num(parsed.kcal),
      protein_g: num(parsed.protein_g),
      carbs_g: num(parsed.carbs_g),
      fat_g: num(parsed.fat_g),
      note: typeof parsed.note === "string" ? parsed.note.slice(0, 200) : "",
    };
    return NextResponse.json(estimate);
  } catch (err) {
    console.error("[meal-estimate] failed:", err);
    return NextResponse.json(
      { error: "The oracle couldn't read that meal — try clearer photos." },
      { status: 502 }
    );
  }
}
