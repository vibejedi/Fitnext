"use client";

import type { ChatMode } from "./store";

/**
 * Cross-screen bridge to the coach chat. With the app split into module
 * screens, a "Begin" tap can happen on a screen where no chat is mounted —
 * the prompt is stashed and delivered once the Coach screen mounts.
 */

const PENDING_KEY = "fitnext-pending-ask";

/** How many CoachChat instances are currently mounted. */
export const chatPresence = { count: 0 };

export interface CoachAsk {
  prompt: string;
  mode?: ChatMode;
}

/** Fire a prompt at a mounted chat. Returns false when no chat is live —
 *  the prompt is stashed and the caller should navigate to /coach. */
export function askCoach(prompt: string, mode: ChatMode = "coach"): boolean {
  if (chatPresence.count > 0) {
    window.dispatchEvent(new CustomEvent("coach-ask", { detail: { prompt, mode } }));
    return true;
  }
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ prompt, mode }));
  } catch {
    // storage full/blocked — the prompt is simply dropped
  }
  return false;
}

/** Consume the stashed prompt (called by CoachChat on mount). */
export function takePendingAsk(): CoachAsk | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_KEY);
    const parsed = JSON.parse(raw) as CoachAsk;
    return parsed && typeof parsed.prompt === "string" && parsed.prompt ? parsed : null;
  } catch {
    return null;
  }
}
