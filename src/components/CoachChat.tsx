"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Apple, Dumbbell, HeartPulse, Mic, MicOff, Send, Volume2, VolumeX,
} from "lucide-react";
import { useFit, type ChatMode } from "@/lib/store";
import { coachById } from "@/lib/coaches";
import { saveMessage } from "@/lib/sync";
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
  const recRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const pendingRef = useRef<{ prompt: string; mode: ChatMode } | null>(null);

  const thread = mode === "nutrition" ? fit.nutritionMessages : fit.messages;

  // greeting on first open of each sub-area (fresh state read, so React
  // StrictMode's double effect run can't add it twice)
  useEffect(() => {
    const s = useFit.getState();
    if (mode === "coach" && s.messages.length === 0 && coach) {
      s.addMessage({ role: "assistant", content: coachGreeting(coach.name), ts: Date.now() }, "coach");
    }
    if (mode === "nutrition" && s.nutritionMessages.length === 0) {
      s.addMessage({ role: "assistant", content: NUTRITION_GREETING, ts: Date.now() }, "nutrition");
    }
  }, [mode, coach]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread.length, busyMode, draft, errorMsg, mode]);

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
      if (m === "nutrition" && s.nutritionMessages.length === 0) {
        s.addMessage({ role: "assistant", content: NUTRITION_GREETING, ts: Date.now() }, "nutrition");
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

  const busyHere = busyMode === mode;

  return (
    <div className="panel flex h-full flex-col overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        {mode === "nutrition" ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-green/40 bg-green/10 text-green">
            <Apple size={16} />
          </div>
        ) : (
          coach && (
            <div className="relative h-9 w-9 overflow-hidden rounded-full border border-green/40">
              <Image src={coach.image} alt={coach.name} fill className="object-cover" sizes="36px" />
            </div>
          )
        )}
        <div className="flex-1">
          <p className="font-display text-sm font-bold leading-none">
            {mode === "nutrition" ? "Nutrition Coach" : `Coach ${coach?.name ?? "FitNext"}`}
          </p>
          <p className="text-[0.65rem] text-muted">
            {mode === "nutrition" ? "Fuel & fat loss" : coach?.route ?? ""}
          </p>
        </div>
        <button onClick={() => setSpeak((s) => !s)}
          title={speak ? "Mute voice" : "Speak replies"}
          className={cn("rounded-md p-1.5", speak ? "text-green" : "text-muted hover:text-marble")}>
          {speak ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      {/* sub-areas */}
      <div className="flex gap-1 border-b border-line px-2 py-1.5">
        <Tab
          active={mode === "coach"}
          onClick={() => setMode("coach")}
          icon={<Dumbbell size={13} />}
          label="Coach"
        />
        <Tab
          active={mode === "nutrition"}
          disabled={!fit.wantNutrition}
          onClick={() => setMode("nutrition")}
          icon={<Apple size={13} />}
          label="Nutrition"
          title={fit.wantNutrition ? undefined : "Enable the nutrition add-on in onboarding"}
        />
        <Tab
          disabled
          icon={<HeartPulse size={13} />}
          label="Therapy"
          badge="Soon"
          title="Physical therapy coach — coming soon"
        />
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {thread.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm",
              m.role === "user"
                ? "bg-green text-stone-950"
                : "border border-line bg-stone-850 text-marble"
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {busyHere && (
          <div className="flex justify-start">
            <div className={cn(
              "max-w-[85%] whitespace-pre-wrap rounded-2xl border border-line bg-stone-850 px-3.5 py-2.5 text-sm",
              draft ? "text-marble" : "text-muted"
            )}>
              {draft || (
                <span className="animate-pulse-glow">
                  {mode === "nutrition" ? "Nutritionist is thinking…" : "Coach is thinking…"}
                </span>
              )}
            </div>
          </div>
        )}
        {errorMsg && !busyMode && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl border border-red-400/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
              {errorMsg}
            </div>
          </div>
        )}
      </div>

      {/* input */}
      <div className="border-t border-line p-3">
        <div className="flex items-end gap-2">
          <button onClick={toggleMic}
            className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition",
              listening ? "border-green bg-green text-stone-950 animate-pulse-glow" : "border-line text-marble hover:border-green/50")}
            title="Voice input">
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            rows={1}
            placeholder={
              mode === "nutrition"
                ? "Answer your nutritionist, or ask about food…"
                : "Log a set, ask for a plan, or talk…"
            }
            className="panel max-h-32 flex-1 resize-none bg-stone-850 px-3 py-2.5 text-sm outline-none focus:border-green/50"
          />
          <button onClick={() => send(input)} disabled={!input.trim() || busyMode !== null}
            className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-40"
            title="Send">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Tab({ active, disabled, onClick, icon, label, badge, title }: {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[0.7rem] font-medium uppercase tracking-wider transition",
        active ? "bg-green/15 text-green" : "text-muted hover:text-marble",
        disabled && "cursor-not-allowed opacity-40 hover:text-muted"
      )}
    >
      {icon} {label}
      {badge && (
        <span className="rounded border border-line px-1 text-[0.55rem] normal-case tracking-normal text-muted">
          {badge}
        </span>
      )}
    </button>
  );
}
