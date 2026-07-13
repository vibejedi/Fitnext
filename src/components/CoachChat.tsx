"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Mic, MicOff, Send, Volume2, VolumeX } from "lucide-react";
import { useFit, localDay, type ChatMode, type NutritionMode } from "@/lib/store";
import { coachById } from "@/lib/coaches";
import { pushProfile, saveMessage } from "@/lib/sync";
import { NUTRITION_TARGETS } from "@/lib/rites";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const NUTRITION_GREETING = [
  "🥗 I'm your FitNext nutritionist. My job: get you results without miserable dieting.",
  "",
  "I'll take you through 4 quick sections, one at a time, then build your full plan — calories, macros, a 7-day meal plan around foods you actually like, snack swaps, and more.",
  "",
  "Section 1 — your stats:",
  "• Age",
  "• Biological sex",
  "• Height",
  "• Current weight",
  "• Goal weight (or the look/feel you're after)",
  "• How fast — steady and sustainable, or as fast as possible?",
].join("\n");

const TRACKER_GREETING = [
  "🥗 Tracker mode — I count, you eat.",
  "",
  "Log meals from the dashboard (+ LOG A MEAL: top-view photo, close-up, and a short description) and I'll keep your daily calories and macros. You can also just tell me what you ate here.",
  "",
  "Heads up: estimates are eyeballed from your photos — close enough to steer the day, not lab numbers. Want the full nutritionist (custom meal plan) later? Just say the word.",
].join("\n");

const nutritionGreeting = (m: NutritionMode) =>
  m === "tracker" ? TRACKER_GREETING : NUTRITION_GREETING;

const coachGreeting = (name: string) =>
  `I'm Coach ${name}. Tell me how today went, or ask me anything — workouts, macros, recovery. You can talk to me by tapping the mic.`;

/** Athlete's local date as YYYY-MM-DD (for lift-log dating). */
const localDate = () => new Date().toLocaleDateString("en-CA");

export function CoachChat() {
  const fit = useFit();
  const coach = coachById(fit.coach);
  const [mode, setMode] = useState<ChatMode>("coach");
  const [input, setInput] = useState("");
  // Which thread has a request in flight (one at a time, but replies land
  // in the thread they were sent from even if the user switches tabs).
  const [busyMode, setBusyMode] = useState<ChatMode | null>(null);
  const [draft, setDraft] = useState("");           // streaming reply so far
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const [sendTick, setSendTick] = useState(0);      // gold ring pulse per send
  const recRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busyRef = useRef(false);
  const pendingRef = useRef<{ prompt: string; mode: ChatMode } | null>(null);

  const thread = mode === "nutrition" ? fit.nutritionMessages : fit.messages;

  // greeting on first open of each sub-area (fresh state read, so React
  // StrictMode's double effect run can't add it twice). The nutrition
  // greeting waits until the user picks full vs tracker (chooser below).
  useEffect(() => {
    const s = useFit.getState();
    if (mode === "coach" && s.messages.length === 0 && coach) {
      s.addMessage({ role: "assistant", content: coachGreeting(coach.name), ts: Date.now() }, "coach");
    }
    if (mode === "nutrition" && s.nutritionMessages.length === 0 && s.nutritionMode) {
      s.addMessage({ role: "assistant", content: nutritionGreeting(s.nutritionMode), ts: Date.now() }, "nutrition");
    }
  }, [mode, coach, fit.nutritionMode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread.length, busyMode, draft, errorMsg, mode]);

  // "Speak with Coach" on the dashboard focuses the oracle's ear
  useEffect(() => {
    const h = () => inputRef.current?.focus();
    window.addEventListener("coach-focus", h);
    return () => window.removeEventListener("coach-focus", h);
  }, []);

  const send = async (text: string, m: ChatMode = mode) => {
    const content = text.trim();
    if (!content || busyRef.current) return;
    setInput("");
    setErrorMsg(null);
    const userMsg = { role: "user" as const, content, ts: Date.now() };
    fit.addMessage(userMsg, m);
    void saveMessage("user", content, m);
    busyRef.current = true;
    setBusyMode(m);
    setDraft("");
    let acc = "";
    try {
      // read fresh state so the just-added message is included
      const s = useFit.getState();
      const history = m === "nutrition" ? s.nutritionMessages : s.messages;
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: m,
          messages: history.map((x) => ({ role: x.role, content: x.content })),
          context: {
            coach: s.coach, personality: s.personality, goal: s.goal,
            experience: s.experience, profile: s.profile, equipment: s.equipment,
            days: s.days, wantNutrition: s.wantNutrition, wantInjury: s.wantInjury,
            nutritionMode: s.nutritionMode,
            targets: NUTRITION_TARGETS,
            todayMeals: s.meals
              .filter((x) => x.day === localDay())
              .map((x) => ({ name: x.name, kcal: x.kcal, p: x.p, c: x.c, f: x.f })),
            clientDate: localDate(),
          },
        }),
      });
      if (!res.ok || !res.body) {
        setErrorMsg(
          res.status === 502
            ? "Your coach is unreachable right now — try again in a moment."
            : "Something went wrong sending that — try again."
        );
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      // stream the reply token-by-token into the draft bubble
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setDraft(acc);
      }
      acc += decoder.decode();
      const reply = acc.trim() || "Sorry, I glitched. Try again.";
      fit.addMessage({ role: "assistant", content: reply, ts: Date.now() }, m);
      void saveMessage("assistant", reply, m);
      if (speak && typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
      }
    } catch {
      // Don't persist errors into the thread — the chat history is the
      // coach's lift log, so only real coaching belongs there.
      if (acc.trim()) {
        fit.addMessage({ role: "assistant", content: acc.trim(), ts: Date.now() }, m);
        void saveMessage("assistant", acc.trim(), m);
      }
      setErrorMsg("Network error — check your connection and try again.");
    } finally {
      setDraft("");
      busyRef.current = false;
      setBusyMode(null);
    }
  };

  // let dashboard buttons push a prompt into the chat (optionally targeting
  // a sub-area); queued rather than dropped if a request is in flight
  const sendRef = useRef<(t: string, m?: ChatMode) => void>(() => {});
  sendRef.current = send;
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<string | { prompt: string; mode?: ChatMode }>).detail;
      if (d == null) return;
      const prompt = typeof d === "string" ? d : d.prompt;
      if (!prompt) return;
      let m: ChatMode = typeof d === "string" ? "coach" : (d.mode ?? "coach");
      const s = useFit.getState();
      if (m === "nutrition" && !s.wantNutrition) m = "coach";
      // seed the greeting before the prompt so the intro isn't skipped
      // (a dashboard prompt implies the full nutritionist when unchosen)
      if (m === "nutrition" && s.nutritionMessages.length === 0) {
        s.addMessage(
          { role: "assistant", content: nutritionGreeting(s.nutritionMode ?? "full"), ts: Date.now() },
          "nutrition"
        );
      }
      setMode(m);
      if (busyRef.current) {
        pendingRef.current = { prompt, mode: m };
        return;
      }
      sendRef.current(prompt, m);
    };
    window.addEventListener("coach-ask", h);
    return () => window.removeEventListener("coach-ask", h);
  }, []);

  // flush a queued dashboard prompt once the in-flight request settles
  useEffect(() => {
    if (busyMode === null && pendingRef.current) {
      const p = pendingRef.current;
      pendingRef.current = null;
      sendRef.current(p.prompt, p.mode);
    }
  }, [busyMode]);

  const toggleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input isn't supported in this browser. Try Chrome.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setInput(transcript);
    };
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  const submit = (text: string) => {
    setSendTick((t) => t + 1);
    send(text);
  };

  const busyHere = busyMode === mode;

  return (
    <div className="panel flex h-full flex-col overflow-hidden">
      {/* header — the oracle */}
      <div className="flex items-center gap-[11px] border-b border-line px-4 py-3">
        {coach && (
          <div
            className="relative h-11 w-[38px] shrink-0 overflow-hidden border border-line-strong bg-[#0b0f0e]"
            style={{ borderRadius: "38px 38px 3px 3px" }}
          >
            <Image src={coach.image} alt={coach.name} fill className="object-cover" sizes="38px" />
          </div>
        )}
        <div className="flex-1">
          <p className="font-display text-sm font-bold tracking-[0.04em] leading-none">
            Coach {coach?.name ?? "FitNext"}
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.24em] text-gold">
            The Oracle · {mode === "nutrition" ? "Nutrition" : coach?.route ?? "Fitness"}
          </p>
        </div>
        <button
          onClick={() => setSpeak((s) => !s)}
          title={speak ? "Mute voice" : "Speak replies"}
          className={cn("p-1.5", speak ? "text-gold" : "text-sec hover:text-ink")}
        >
          {speak ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      {/* sub-areas — engraved underline tabs */}
      <div className="flex gap-[22px] border-b border-line px-4">
        <Tab active={mode === "coach"} onClick={() => setMode("coach")} label="Coach" />
        <Tab
          active={mode === "nutrition"}
          disabled={!fit.wantNutrition}
          onClick={() => setMode("nutrition")}
          label="Nutrition"
          title={fit.wantNutrition ? undefined : "Enable the nutrition add-on in onboarding"}
        />
        <Tab disabled dimmed label="Therapy · Soon" title="Physical therapy coach — coming soon" />
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {mode === "nutrition" && !fit.nutritionMode && thread.length === 0 && (
          <NutritionChooser
            onPick={(m) => {
              const s = useFit.getState();
              s.set("nutritionMode", m);
              void pushProfile(useFit.getState());
            }}
          />
        )}
        {thread.map((m, i) => <Bubble key={i} role={m.role}>{m.content}</Bubble>)}
        {busyHere && (
          <Bubble role="assistant" muted={!draft}>
            {draft || (
              <span className="animate-pulse-glow">
                {mode === "nutrition" ? "The nutritionist is thinking…" : "The oracle is thinking…"}
              </span>
            )}
          </Bubble>
        )}
        {errorMsg && !busyMode && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-[2px_14px_14px_14px] border border-clay/40 bg-panel px-3.5 py-2.5 text-[13px] leading-[1.55] text-clay">
              {errorMsg}
            </div>
          </div>
        )}
      </div>

      {/* input bar */}
      <div className="flex items-end gap-2 border-t border-line px-3.5 py-2.5">
        <button
          onClick={toggleMic}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition active:translate-y-px",
            listening
              ? "animate-pulse-glow border-gold bg-gold text-ivory"
              : "border-line-strong bg-panel text-gold active:bg-pressed"
          )}
          title="Voice input"
        >
          {listening ? <MicOff size={17} /> : <Mic size={17} />}
        </button>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); }
          }}
          rows={1}
          placeholder="Speak to the oracle…"
          className="max-h-32 flex-1 resize-none rounded-[4px] border border-line bg-panel-alt px-3 py-3 text-[13px] text-ink outline-none placeholder:text-faint focus:border-line-strong"
        />
        <button
          onClick={() => submit(input)}
          disabled={!input.trim() || busyMode !== null}
          style={sendTick ? { animation: `${sendTick % 2 ? "ringA" : "ringB"} 0.6s ease` } : undefined}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] bg-gold text-ivory active:translate-y-px disabled:opacity-40"
          title="Send"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

function NutritionChooser({ onPick }: { onPick: (m: NutritionMode) => void }) {
  return (
    <div className="flex flex-col gap-2.5 py-2">
      <p className="text-center font-mono text-[9px] uppercase tracking-[0.28em] text-gold">
        Choose your nutritionist
      </p>
      <button
        onClick={() => onPick("full")}
        className="panel chisel-press px-4 py-3.5 text-left"
      >
        <span className="block font-display text-[13px] font-bold uppercase tracking-[0.12em]">
          Full Nutritionist
        </span>
        <span className="mt-1 block text-[11px] leading-relaxed text-sec">
          A quick interview, then a custom meal-prep plan built around foods you actually like — plus tracking.
        </span>
      </button>
      <button
        onClick={() => onPick("tracker")}
        className="panel chisel-press px-4 py-3.5 text-left"
      >
        <span className="block font-display text-[13px] font-bold uppercase tracking-[0.12em]">
          Tracker Only
        </span>
        <span className="mt-1 block text-[11px] leading-relaxed text-sec">
          No meal plans — just count calories &amp; macros from the meals you log. Switch to the full nutritionist anytime.
        </span>
      </button>
      <p className="text-center text-[9px] text-faint">
        Either way, logged-meal macros are eyeball estimates from your photos
      </p>
    </div>
  );
}

function Bubble({ role, muted, children }: {
  role: "user" | "assistant";
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap px-3.5 py-2.5 text-[13px] leading-[1.55]",
          role === "user"
            ? "rounded-[14px_2px_14px_14px] bg-gold text-ivory"
            : "rounded-[2px_14px_14px_14px] border border-line bg-panel shadow-[0_2px_6px_-4px_rgba(70,58,30,0.35)]",
          role === "assistant" && (muted ? "text-faint" : "text-ink")
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Tab({ active, disabled, dimmed, onClick, label, title }: {
  active?: boolean;
  disabled?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  label: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "-mb-px pb-2 pt-2.5 text-[10px] uppercase tracking-[0.2em] transition-colors",
        active
          ? "border-b-2 border-gold font-semibold text-ink"
          : "border-b-2 border-transparent text-faint",
        !active && !disabled && "hover:text-ink",
        dimmed && "opacity-55",
        disabled && "cursor-not-allowed"
      )}
    >
      {label}
    </button>
  );
}
