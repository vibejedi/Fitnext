"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Mic, MicOff, Send, Volume2, VolumeX } from "lucide-react";
import { useFit } from "@/lib/store";
import { coachById } from "@/lib/coaches";
import { saveMessage } from "@/lib/sync";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function CoachChat() {
  const fit = useFit();
  const coach = coachById(fit.coach);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const recRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // greeting on first mount
  useEffect(() => {
    if (fit.messages.length === 0 && coach) {
      fit.addMessage({
        role: "assistant",
        content: `I'm Coach ${coach.name}. Tell me how today went, or ask me anything — workouts, macros, recovery. You can talk to me by tapping the mic.`,
        ts: Date.now(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [fit.messages.length, busy]);

  // let dashboard buttons push a prompt into the chat
  const sendRef = useRef<(t: string) => void>(() => {});
  useEffect(() => {
    const h = (e: Event) => sendRef.current((e as CustomEvent<string>).detail);
    window.addEventListener("coach-ask", h);
    return () => window.removeEventListener("coach-ask", h);
  }, []);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");
    const userMsg = { role: "user" as const, content, ts: Date.now() };
    fit.addMessage(userMsg);
    void saveMessage("user", content);
    setBusy(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...fit.messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          context: {
            coach: fit.coach, personality: fit.personality, goal: fit.goal,
            experience: fit.experience, profile: fit.profile, equipment: fit.equipment,
            days: fit.days, wantNutrition: fit.wantNutrition, wantInjury: fit.wantInjury,
          },
        }),
      });
      const data = await res.json();
      const reply = data.reply ?? "Sorry, I glitched. Try again.";
      fit.addMessage({ role: "assistant", content: reply, ts: Date.now() });
      void saveMessage("assistant", reply);
      if (speak && typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
      }
    } catch {
      fit.addMessage({ role: "assistant", content: "Network error — check your connection.", ts: Date.now() });
    } finally {
      setBusy(false);
    }
  };

  sendRef.current = send;

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

  return (
    <div className="panel flex h-full flex-col overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        {coach && (
          <div className="relative h-9 w-9 overflow-hidden rounded-full border border-green/40">
            <Image src={coach.image} alt={coach.name} fill className="object-cover" sizes="36px" />
          </div>
        )}
        <div className="flex-1">
          <p className="font-display text-sm font-bold leading-none">
            Coach {coach?.name ?? "FitNext"}
          </p>
          <p className="text-[0.65rem] text-muted">{coach?.route ?? ""}</p>
        </div>
        <button onClick={() => setSpeak((s) => !s)}
          title={speak ? "Mute voice" : "Speak replies"}
          className={cn("rounded-md p-1.5", speak ? "text-green" : "text-muted hover:text-marble")}>
          {speak ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {fit.messages.map((m, i) => (
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
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-line bg-stone-850 px-3.5 py-2.5 text-sm text-muted">
              <span className="animate-pulse-glow">Coach is thinking…</span>
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
            placeholder="Log a set, ask for a plan, or talk…"
            className="panel max-h-32 flex-1 resize-none bg-stone-850 px-3 py-2.5 text-sm outline-none focus:border-green/50"
          />
          <button onClick={() => send(input)} disabled={!input.trim() || busy}
            className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-40"
            title="Send">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
