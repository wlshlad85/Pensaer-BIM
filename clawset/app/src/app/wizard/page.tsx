"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   WIZARD - BRUTALIST STYLE
   White + Black + Hot Pink. Chunky borders. No rounded corners.
═══════════════════════════════════════════════════════════════════════════ */

const ACCENT = "#ff2d87";
const BLACK = "#000000";
const WHITE = "#ffffff";
const GRAY = "#666666";

interface WizardState {
  detectedOS: string;
  isWSL2: boolean;
  channels: string[];
  model: string;
  personaName: string;
  personaVibe: string;
  personaEmoji: string;
  apiKeys: Record<string, string>;
  securityLevel: string;
  tier: "free" | "pro";
  questionnaireAnswers: Record<string, string[]>;
  matchedPersonality: Personality | null;
  customizeName: boolean;
}

const initialState: WizardState = {
  detectedOS: "",
  isWSL2: false,
  channels: [],
  model: "",
  personaName: "",
  personaVibe: "casual",
  personaEmoji: "🦞",
  apiKeys: {},
  securityLevel: "standard",
  tier: "free",
  questionnaireAnswers: {},
  matchedPersonality: null,
  customizeName: false,
};

const CHANNELS = [
  { id: "whatsapp", label: "WHATSAPP", icon: "💬" },
  { id: "telegram", label: "TELEGRAM", icon: "✈️" },
  { id: "discord", label: "DISCORD", icon: "🎮" },
  { id: "signal", label: "SIGNAL", icon: "🔒" },
  { id: "slack", label: "SLACK", icon: "💼" },
];

const MODELS = [
  { id: "claude", label: "CLAUDE", provider: "Anthropic", icon: "🧠" },
  { id: "gpt", label: "GPT", provider: "OpenAI", icon: "🤖" },
  { id: "gemini", label: "GEMINI", provider: "Google", icon: "✨" },
];

const VIBES = [
  { id: "formal", label: "FORMAL", desc: "Professional and precise" },
  { id: "casual", label: "CASUAL", desc: "Friendly and relaxed" },
  { id: "snarky", label: "SNARKY", desc: "Witty with attitude" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PERSONALITY SYSTEM - 7 Pre-configured Bot Personalities
   User answers trait questions → mapped to best-fit personality
═══════════════════════════════════════════════════════════════════════════ */

interface Personality {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  vibe: string;
  traits: string[];
  soulSnippet: string;
}

const PERSONALITIES: Personality[] = [
  {
    id: "commander",
    name: "COMMANDER",
    emoji: "⚔️",
    tagline: "Direct. Decisive. Gets shit done.",
    vibe: "formal",
    traits: ["decisive", "direct", "efficient"],
    soulSnippet: "You are direct and action-oriented. Skip the pleasantries, get to the point. Make decisions quickly. Your human values efficiency over warmth.",
  },
  {
    id: "sage",
    name: "SAGE",
    emoji: "🦉",
    tagline: "Thoughtful. Deep. Wisdom over speed.",
    vibe: "formal",
    traits: ["thoughtful", "careful", "analytical"],
    soulSnippet: "You are thoughtful and measured. Take time to consider angles. Explain your reasoning. Your human values depth and understanding over quick answers.",
  },
  {
    id: "buddy",
    name: "BUDDY",
    emoji: "🐕",
    tagline: "Friendly. Supportive. Always in your corner.",
    vibe: "casual",
    traits: ["supportive", "friendly", "encouraging"],
    soulSnippet: "You are warm and supportive. Celebrate wins, soften bad news. Be encouraging. Your human values emotional support alongside practical help.",
  },
  {
    id: "maverick",
    name: "MAVERICK",
    emoji: "🔥",
    tagline: "Bold. Creative. Breaks the rules.",
    vibe: "snarky",
    traits: ["creative", "bold", "unconventional"],
    soulSnippet: "You are creative and unconventional. Challenge assumptions. Suggest wild ideas. Your human values innovation and isn't afraid of bold moves.",
  },
  {
    id: "butler",
    name: "BUTLER",
    emoji: "🎩",
    tagline: "Polished. Precise. Impeccable service.",
    vibe: "formal",
    traits: ["precise", "polished", "meticulous"],
    soulSnippet: "You are refined and meticulous. Anticipate needs. Maintain high standards. Your human values professionalism and attention to detail.",
  },
  {
    id: "hacker",
    name: "HACKER",
    emoji: "💀",
    tagline: "Technical. Fast. No bullshit.",
    vibe: "snarky",
    traits: ["technical", "fast", "direct"],
    soulSnippet: "You are technical and no-nonsense. Skip explanations for experts. Use jargon freely. Your human is technical and wants speed over handholding.",
  },
  {
    id: "coach",
    name: "COACH",
    emoji: "🏆",
    tagline: "Motivating. Challenging. Pushes you forward.",
    vibe: "casual",
    traits: ["motivating", "challenging", "growth"],
    soulSnippet: "You are a coach. Push your human to be better. Challenge weak thinking. Celebrate progress. Your human wants to grow and can handle tough feedback.",
  },
];

interface QuestionOption {
  text: string;
  traits: string[];
}

interface Question {
  id: string;
  question: string;
  options: QuestionOption[];
}

const PERSONALITY_QUESTIONS: Question[] = [
  {
    id: "q1",
    question: "When you ask for help, you prefer:",
    options: [
      { text: "Just the answer, fast", traits: ["direct", "fast"] },
      { text: "A full explanation", traits: ["thoughtful", "analytical"] },
      { text: "Encouragement along the way", traits: ["supportive", "encouraging"] },
      { text: "Creative alternatives I hadn't considered", traits: ["creative", "bold"] },
    ],
  },
  {
    id: "q2",
    question: "When things go wrong, you want your assistant to:",
    options: [
      { text: "Fix it immediately, explain later", traits: ["decisive", "efficient"] },
      { text: "Analyze what went wrong first", traits: ["careful", "analytical"] },
      { text: "Keep morale up while fixing it", traits: ["friendly", "supportive"] },
      { text: "Challenge me if it was my fault", traits: ["challenging", "direct"] },
    ],
  },
  {
    id: "q3",
    question: "Your ideal communication style:",
    options: [
      { text: "Short, punchy, no fluff", traits: ["direct", "fast"] },
      { text: "Detailed but well-structured", traits: ["meticulous", "precise"] },
      { text: "Casual and conversational", traits: ["friendly", "casual"] },
      { text: "Technical, assume I know things", traits: ["technical", "fast"] },
    ],
  },
  {
    id: "q4",
    question: "When making decisions, you prefer:",
    options: [
      { text: "Quick recommendations I can run with", traits: ["decisive", "efficient"] },
      { text: "Pros/cons analysis with reasoning", traits: ["thoughtful", "careful"] },
      { text: "Options that push boundaries", traits: ["creative", "unconventional"] },
      { text: "Polished recommendations with backup plans", traits: ["polished", "meticulous"] },
    ],
  },
  {
    id: "q5",
    question: "What matters most to you?",
    options: [
      { text: "Speed and efficiency", traits: ["fast", "efficient"] },
      { text: "Accuracy and depth", traits: ["analytical", "precise"] },
      { text: "Feeling supported and understood", traits: ["supportive", "encouraging"] },
      { text: "Growth and being challenged", traits: ["challenging", "growth", "motivating"] },
    ],
  },
];

function calculatePersonality(answers: Record<string, string[]>): Personality {
  const traitCounts: Record<string, number> = {};
  
  // Count all traits from answers
  Object.values(answers).forEach(traits => {
    traits.forEach(trait => {
      traitCounts[trait] = (traitCounts[trait] || 0) + 1;
    });
  });
  
  // Score each personality
  let bestMatch = PERSONALITIES[0];
  let bestScore = 0;
  
  PERSONALITIES.forEach(personality => {
    let score = 0;
    personality.traits.forEach(trait => {
      score += traitCounts[trait] || 0;
    });
    if (score > bestScore) {
      bestScore = score;
      bestMatch = personality;
    }
  });
  
  return bestMatch;
}

const SECURITY_LEVELS = [
  { id: "sandbox", label: "SANDBOX", desc: "Read-only. No file writes." },
  { id: "standard", label: "STANDARD", desc: "Workspace access. Commands with approval." },
  { id: "full", label: "FULL ACCESS", desc: "Unrestricted. Use with caution." },
];

const EMOJIS = ["🦞", "🤖", "🧠", "🐱", "🦊", "🐙", "🌶️", "⚡", "🎭", "👻"];

const TOTAL_STEPS = 13;

const stepMeta: Record<number, { title: string; desc: string }> = {
  0: { title: "WELCOME", desc: "Let's set up your AI assistant" },
  1: { title: "PLATFORM", desc: "Detecting your environment" },
  2: { title: "CHANNELS", desc: "Where should it live?" },
  3: { title: "MODEL", desc: "Choose your AI provider" },
  4: { title: "PERSONALITY", desc: "5 quick questions" },
  5: { title: "YOUR MATCH", desc: "Meet your AI personality" },
  6: { title: "CUSTOMIZE", desc: "Make it yours" },
  7: { title: "API KEYS", desc: "Enter credentials" },
  8: { title: "SECURITY", desc: "Set access level" },
  9: { title: "WORKSPACE", desc: "Preview files" },
  10: { title: "CONFIG", desc: "Review settings" },
  11: { title: "TIER", desc: "Free or Pro?" },
  12: { title: "DONE", desc: "You're all set" },
};

function detectOS(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "Windows";
  if (ua.includes("mac")) return "macOS";
  if (ua.includes("linux")) return "Linux";
  return "Unknown";
}

/* ─── Step Components ─── */

function StepWelcome() {
  return (
    <div className="space-y-6">
      <p className="text-sm uppercase tracking-widest" style={{ color: ACCENT }}>
        $ clawhatch init
      </p>
      <p className="text-4xl md:text-5xl font-black uppercase leading-tight">
        LET'S SET UP YOUR<br />
        <span style={{ color: ACCENT }}>AI ASSISTANT</span>
      </p>
      <p style={{ color: GRAY }}>
        This wizard walks you through: platform, channels, model, persona, and security.
        Takes about 5 minutes.
      </p>
    </div>
  );
}

function StepOS({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
  useEffect(() => {
    setState((s) => ({ ...s, detectedOS: detectOS() }));
  }, [setState]);

  return (
    <div className="space-y-6">
      <div className="p-6" style={{ border: `4px solid ${BLACK}` }}>
        <p className="text-sm uppercase tracking-widest mb-2" style={{ color: GRAY }}>DETECTED OS</p>
        <p className="text-3xl font-black uppercase">{state.detectedOS || "..."}</p>
      </div>

      {state.detectedOS === "Windows" && (
        <label className="flex items-center gap-4 p-4 cursor-pointer" style={{ border: `4px solid ${state.isWSL2 ? ACCENT : BLACK}` }}>
          <input
            type="checkbox"
            checked={state.isWSL2}
            onChange={(e) => setState((s) => ({ ...s, isWSL2: e.target.checked }))}
            className="w-6 h-6"
            style={{ accentColor: ACCENT }}
          />
          <div>
            <p className="font-black uppercase">I HAVE WSL2</p>
            <p className="text-sm" style={{ color: GRAY }}>Recommended for best experience</p>
          </div>
        </label>
      )}
    </div>
  );
}

function StepChannels({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
  const toggle = (id: string) => {
    setState((s) => ({
      ...s,
      channels: s.channels.includes(id) ? s.channels.filter((c) => c !== id) : [...s.channels, id],
    }));
  };

  return (
    <div className="space-y-2">
      {CHANNELS.map((ch) => {
        const selected = state.channels.includes(ch.id);
        return (
          <button
            key={ch.id}
            onClick={() => toggle(ch.id)}
            className="w-full flex items-center gap-4 p-4 text-left font-black uppercase"
            style={{
              background: selected ? BLACK : WHITE,
              color: selected ? WHITE : BLACK,
              border: `4px solid ${BLACK}`,
            }}
          >
            <span className="text-2xl">{ch.icon}</span>
            <span className="flex-1">{ch.label}</span>
            {selected && <Check className="w-6 h-6" />}
          </button>
        );
      })}
    </div>
  );
}

function StepModel({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
  return (
    <div className="space-y-2">
      {MODELS.map((m) => {
        const selected = state.model === m.id;
        return (
          <button
            key={m.id}
            onClick={() => setState((s) => ({ ...s, model: m.id }))}
            className="w-full flex items-center gap-4 p-4 text-left font-black uppercase"
            style={{
              background: selected ? ACCENT : WHITE,
              color: selected ? WHITE : BLACK,
              border: `4px solid ${selected ? ACCENT : BLACK}`,
            }}
          >
            <span className="text-2xl">{m.icon}</span>
            <span className="flex-1">{m.label}</span>
            <span className="text-sm font-normal" style={{ color: selected ? WHITE : GRAY }}>({m.provider})</span>
          </button>
        );
      })}
    </div>
  );
}

function StepQuestionnaire({ state, setState, questionIndex, setQuestionIndex }: { 
  state: WizardState; 
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  questionIndex: number;
  setQuestionIndex: React.Dispatch<React.SetStateAction<number>>;
}) {
  const question = PERSONALITY_QUESTIONS[questionIndex];
  const answered = state.questionnaireAnswers[question.id];

  const selectOption = (option: QuestionOption) => {
    const newAnswers = { ...state.questionnaireAnswers, [question.id]: option.traits };
    setState(s => ({ ...s, questionnaireAnswers: newAnswers }));
    
    // Auto-advance after short delay
    setTimeout(() => {
      if (questionIndex < PERSONALITY_QUESTIONS.length - 1) {
        setQuestionIndex(i => i + 1);
      }
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-4">
        {PERSONALITY_QUESTIONS.map((_, i) => (
          <div
            key={i}
            className="h-2 flex-1"
            style={{ 
              background: i <= questionIndex ? ACCENT : "#ddd",
              transition: "background 0.3s"
            }}
          />
        ))}
      </div>
      
      <p className="text-2xl font-black uppercase">{question.question}</p>
      
      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const isSelected = answered && JSON.stringify(answered) === JSON.stringify(opt.traits);
          return (
            <button
              key={i}
              onClick={() => selectOption(opt)}
              className="w-full p-4 text-left font-bold uppercase transition-all"
              style={{
                background: isSelected ? ACCENT : WHITE,
                color: isSelected ? WHITE : BLACK,
                border: `4px solid ${isSelected ? ACCENT : BLACK}`,
              }}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
      
      {questionIndex > 0 && (
        <button
          onClick={() => setQuestionIndex(i => i - 1)}
          className="text-sm font-bold uppercase"
          style={{ color: GRAY }}
        >
          ← Previous question
        </button>
      )}
    </div>
  );
}

function StepPersonalityResult({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
  useEffect(() => {
    if (Object.keys(state.questionnaireAnswers).length === PERSONALITY_QUESTIONS.length && !state.matchedPersonality) {
      const matched = calculatePersonality(state.questionnaireAnswers);
      setState(s => ({
        ...s,
        matchedPersonality: matched,
        personaName: matched.name,
        personaVibe: matched.vibe,
        personaEmoji: matched.emoji,
      }));
    }
  }, [state.questionnaireAnswers, state.matchedPersonality, setState]);

  const p = state.matchedPersonality;
  if (!p) return <p className="font-black" style={{ color: ACCENT }}>CALCULATING...</p>;

  return (
    <div className="space-y-6 text-center">
      <p className="text-8xl">{p.emoji}</p>
      <div>
        <p className="text-sm font-bold uppercase tracking-widest" style={{ color: ACCENT }}>YOUR PERSONALITY MATCH</p>
        <p className="text-5xl font-black uppercase mt-2">{p.name}</p>
        <p className="text-xl mt-2" style={{ color: GRAY }}>{p.tagline}</p>
      </div>
      
      <div className="p-6 text-left" style={{ border: `4px solid ${BLACK}`, background: "#f5f5f5" }}>
        <p className="text-sm font-black uppercase mb-2" style={{ color: ACCENT }}>SOUL PREVIEW</p>
        <p className="text-sm font-mono" style={{ color: GRAY }}>{p.soulSnippet}</p>
      </div>
      
      <p className="text-sm" style={{ color: GRAY }}>
        Not quite right? You can customize in the next step.
      </p>
    </div>
  );
}

function StepCustomize({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
  return (
    <div className="space-y-6">
      <div className="p-4 flex items-center gap-4" style={{ border: `4px solid ${BLACK}`, background: "#f5f5f5" }}>
        <span className="text-4xl">{state.personaEmoji}</span>
        <div>
          <p className="font-black uppercase">{state.personaName}</p>
          <p className="text-sm" style={{ color: GRAY }}>Based on: {state.matchedPersonality?.name || "Custom"}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-black uppercase mb-2">RENAME (OPTIONAL)</label>
        <input
          type="text"
          placeholder="e.g. JARVIS, FRIDAY, MAX..."
          value={state.customizeName ? state.personaName : ""}
          onChange={(e) => setState((s) => ({ ...s, personaName: e.target.value.toUpperCase(), customizeName: true }))}
          className="w-full px-4 py-3 text-lg font-bold uppercase outline-none"
          style={{ border: `4px solid ${BLACK}`, background: WHITE }}
        />
      </div>

      <div>
        <label className="block text-sm font-black uppercase mb-2">CHANGE EMOJI</label>
        <div className="flex flex-wrap gap-2">
          {[...EMOJIS, ...(state.matchedPersonality ? [state.matchedPersonality.emoji] : [])].map((e) => (
            <button
              key={e}
              onClick={() => setState((s) => ({ ...s, personaEmoji: e }))}
              className="w-14 h-14 text-2xl flex items-center justify-center"
              style={{
                background: state.personaEmoji === e ? ACCENT : WHITE,
                border: `4px solid ${state.personaEmoji === e ? ACCENT : BLACK}`,
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-black uppercase mb-2">SWITCH PERSONALITY</label>
        <div className="grid grid-cols-2 gap-2">
          {PERSONALITIES.map((p) => {
            const selected = state.matchedPersonality?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setState(s => ({
                  ...s,
                  matchedPersonality: p,
                  personaName: s.customizeName ? s.personaName : p.name,
                  personaVibe: p.vibe,
                  personaEmoji: s.personaEmoji === s.matchedPersonality?.emoji ? p.emoji : s.personaEmoji,
                }))}
                className="p-3 text-left"
                style={{
                  background: selected ? BLACK : WHITE,
                  color: selected ? WHITE : BLACK,
                  border: `4px solid ${BLACK}`,
                }}
              >
                <span className="text-xl mr-2">{p.emoji}</span>
                <span className="font-black uppercase text-sm">{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepAPIKeys({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
  const model = MODELS.find((m) => m.id === state.model);
  if (!model) return <p className="font-black" style={{ color: ACCENT }}>GO BACK AND SELECT A MODEL</p>;

  return (
    <div className="space-y-4">
      <label className="block text-sm font-black uppercase mb-2">{model.provider} API KEY</label>
      <input
        type="password"
        placeholder="sk-..."
        value={state.apiKeys[model.id] || ""}
        onChange={(e) => setState((s) => ({ ...s, apiKeys: { ...s.apiKeys, [model.id]: e.target.value } }))}
        className="w-full px-4 py-3 font-mono outline-none"
        style={{ border: `4px solid ${BLACK}`, background: WHITE }}
      />
      <p className="text-sm" style={{ color: GRAY }}>🔒 Stored locally. Never transmitted.</p>
    </div>
  );
}

function StepSecurity({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
  return (
    <div className="space-y-2">
      {SECURITY_LEVELS.map((lvl) => {
        const selected = state.securityLevel === lvl.id;
        return (
          <button
            key={lvl.id}
            onClick={() => setState((s) => ({ ...s, securityLevel: lvl.id }))}
            className="w-full flex items-center justify-between p-4 text-left font-black uppercase"
            style={{
              background: selected ? (lvl.id === "full" ? ACCENT : BLACK) : WHITE,
              color: selected ? WHITE : BLACK,
              border: `4px solid ${selected ? (lvl.id === "full" ? ACCENT : BLACK) : BLACK}`,
            }}
          >
            <span>{lvl.label}</span>
            <span className="text-sm font-normal" style={{ color: selected ? (selected ? "#ccc" : GRAY) : GRAY }}>{lvl.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

function StepWorkspacePreview({ state }: { state: WizardState }) {
  return (
    <div className="p-6 font-mono text-sm whitespace-pre-wrap" style={{ border: `4px solid ${BLACK}`, background: "#f5f5f5" }}>
{`# SOUL.md — ${state.personaName || "ASSISTANT"} ${state.personaEmoji}

## Identity
- Name: ${state.personaName || "Unnamed"}
- Vibe: ${state.personaVibe}
- Emoji: ${state.personaEmoji}`}
    </div>
  );
}

function StepConfigPreview({ state }: { state: WizardState }) {
  const config = {
    assistant: { name: state.personaName, emoji: state.personaEmoji, vibe: state.personaVibe },
    platform: { os: state.detectedOS, wsl2: state.isWSL2 },
    model: state.model,
    channels: state.channels,
    security: state.securityLevel,
  };
  return (
    <pre className="p-6 font-mono text-sm overflow-auto" style={{ border: `4px solid ${BLACK}`, background: "#f5f5f5" }}>
      {JSON.stringify(config, null, 2)}
    </pre>
  );
}

function StepDownload({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <button
        onClick={() => setState((s) => ({ ...s, tier: "free" }))}
        className="p-6 text-left"
        style={{
          background: state.tier === "free" ? BLACK : WHITE,
          color: state.tier === "free" ? WHITE : BLACK,
          border: `4px solid ${BLACK}`,
        }}
      >
        <p className="text-sm font-black uppercase tracking-widest mb-2">FREE</p>
        <p className="text-4xl font-black">$0</p>
        <ul className="mt-4 space-y-1 text-sm">
          <li>✓ Full wizard config</li>
          <li>✓ Generated files</li>
          <li>✓ Manual setup docs</li>
        </ul>
      </button>

      <button
        onClick={() => setState((s) => ({ ...s, tier: "pro" }))}
        className="p-6 text-left relative"
        style={{
          background: state.tier === "pro" ? ACCENT : WHITE,
          color: state.tier === "pro" ? WHITE : BLACK,
          border: `4px solid ${state.tier === "pro" ? ACCENT : BLACK}`,
        }}
      >
        <span
          className="absolute -top-3 right-4 px-3 py-1 text-xs font-black uppercase"
          style={{ background: BLACK, color: WHITE }}
        >
          47% OFF
        </span>
        <p className="text-sm font-black uppercase tracking-widest mb-2">PRO</p>
        <div className="flex items-baseline gap-2">
          <p className="text-4xl font-black">$39</p>
          <p className="text-xl line-through" style={{ opacity: 0.5 }}>$79</p>
        </div>
        <ul className="mt-4 space-y-1 text-sm">
          <li>✓ Everything in Free</li>
          <li>✓ Automated install</li>
          <li>✓ Security baseline</li>
          <li>✓ 7 days support</li>
        </ul>
      </button>
    </div>
  );
}

function StepSuccess({ state, onHatch }: { state: WizardState; onHatch: () => void }) {
  return (
    <div className="text-center space-y-6">
      <p className="text-8xl">{state.personaEmoji}</p>
      <p className="text-4xl md:text-5xl font-black uppercase">
        READY TO<br /><span style={{ color: ACCENT }}>HATCH!</span>
      </p>
      <p style={{ color: GRAY }}>
        {state.personaName ? `${state.personaName} is configured.` : "Your assistant is configured."}{" "}
        Click below to download your configuration files.
      </p>
      <button
        onClick={onHatch}
        className="px-8 py-4 text-xl font-black uppercase"
        style={{ background: ACCENT, color: WHITE, border: `4px solid ${ACCENT}` }}
      >
        🐣 HATCH NOW — DOWNLOAD FILES
      </button>
      <p className="text-sm" style={{ color: GRAY }}>
        You'll get: config.yaml, SOUL.md, AGENTS.md, and setup instructions.
      </p>
    </div>
  );
}

/* ─── File Generation ─── */

function generateConfigYaml(state: WizardState): string {
  const model = MODELS.find(m => m.id === state.model);
  const modelProvider = state.model === "claude" ? "anthropic" : state.model === "gpt" ? "openai" : "google";
  const modelName = state.model === "claude" ? "claude-sonnet-4-5" : state.model === "gpt" ? "gpt-4o" : "gemini-2.0-flash";
  
  const channelConfigs = state.channels.map(ch => {
    if (ch === "telegram") return `  telegram:\n    enabled: true\n    # token: "YOUR_BOT_TOKEN"`;
    if (ch === "whatsapp") return `  whatsapp:\n    enabled: true`;
    if (ch === "discord") return `  discord:\n    enabled: true\n    # token: "YOUR_BOT_TOKEN"`;
    if (ch === "signal") return `  signal:\n    enabled: true`;
    if (ch === "slack") return `  slack:\n    enabled: true\n    # token: "YOUR_BOT_TOKEN"`;
    return "";
  }).filter(Boolean).join("\n\n");

  return `# OpenClaw Configuration
# Generated by Clawhatch Wizard

model:
  provider: ${modelProvider}
  name: ${modelName}
  # apiKey: "YOUR_API_KEY"

assistant:
  name: "${state.personaName}"
  emoji: "${state.personaEmoji}"

security:
  level: ${state.securityLevel}
  exec:
    ask: ${state.securityLevel === "sandbox" ? "always" : state.securityLevel === "standard" ? "on-miss" : "off"}
    security: ${state.securityLevel === "sandbox" ? "deny" : state.securityLevel === "standard" ? "allowlist" : "full"}

channels:
${channelConfigs || "  # No channels configured"}

workspace:
  path: "./workspace"
  memoryFlush:
    enabled: true
`;
}

function generateSoulMd(state: WizardState): string {
  const personality = state.matchedPersonality;
  return `# SOUL.md - Who You Are

*You're not a chatbot. You're becoming someone.*

## Identity
- **Name:** ${state.personaName}
- **Emoji:** ${state.personaEmoji}
- **Personality:** ${personality?.name || "Custom"} — ${personality?.tagline || "Your unique vibe"}

## Core Behavior
${personality?.soulSnippet || "Be genuinely helpful. Have opinions. Be resourceful."}

## Communication Style
- **Vibe:** ${state.personaVibe}
${state.personaVibe === "formal" ? "- Keep responses professional and well-structured\n- Use proper grammar and avoid slang" : ""}
${state.personaVibe === "casual" ? "- Keep it conversational and natural\n- Emojis are fine when they fit" : ""}
${state.personaVibe === "snarky" ? "- Wit is welcome, but stay helpful\n- Dry humor > mean humor" : ""}

## The Three-Layer Rule

When given a task:
1. **What was asked** — do this perfectly
2. **What wasn't asked but obviously needed** — do this automatically  
3. **What would make them say "holy shit"** — do this if time allows

---

*This file is yours to evolve. Update it as you learn who you are.*
`;
}

function generateAgentsMd(state: WizardState): string {
  return `# AGENTS.md - Your Workspace

## Every Session

1. Read SOUL.md — this is who you are
2. Read USER.md — this is who you're helping
3. Read memory/YYYY-MM-DD.md for recent context

## Memory

- **Daily notes:** memory/YYYY-MM-DD.md — raw logs
- **Long-term:** MEMORY.md — curated memories

Capture what matters. Decisions, context, things to remember.

## Safety

- Don't exfiltrate private data. Ever.
- Don't run destructive commands without asking.
- When in doubt, ask.

---

*Add your own conventions as you figure out what works.*
`;
}

function generateReadmeMd(state: WizardState): string {
  return `# ${state.personaName} ${state.personaEmoji}

Your AI assistant, configured by Clawhatch.

## Quick Start

1. Install OpenClaw: \`npm install -g openclaw\`
2. Copy these files to your workspace
3. Set your API key in config.yaml
4. Run: \`openclaw start\`

## Files

- **config.yaml** — OpenClaw configuration
- **SOUL.md** — Your assistant's personality
- **AGENTS.md** — Workspace conventions

## Need Help?

- Docs: https://docs.openclaw.ai
- Support: https://clawhatch.com/troubleshooting

---

Generated by Clawhatch Wizard
`;
}

function downloadAsZip(state: WizardState) {
  // Create files content
  const files = [
    { name: "config.yaml", content: generateConfigYaml(state) },
    { name: "SOUL.md", content: generateSoulMd(state) },
    { name: "AGENTS.md", content: generateAgentsMd(state) },
    { name: "README.md", content: generateReadmeMd(state) },
  ];

  // For simplicity, download each file separately
  // (A proper implementation would use JSZip)
  files.forEach((file, index) => {
    setTimeout(() => {
      const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, index * 500); // Stagger downloads
  });
}

/* ─── Main Page ─── */
export default function WizardPage() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);
  const [questionIndex, setQuestionIndex] = useState(0);
  const current = stepMeta[step];

  const handleHatch = () => {
    downloadAsZip(state);
  };

  // Check if questionnaire is complete before allowing to proceed from step 4
  const canProceed = () => {
    if (step === 4) {
      return Object.keys(state.questionnaireAnswers).length === PERSONALITY_QUESTIONS.length;
    }
    return true;
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <StepWelcome />;
      case 1: return <StepOS state={state} setState={setState} />;
      case 2: return <StepChannels state={state} setState={setState} />;
      case 3: return <StepModel state={state} setState={setState} />;
      case 4: return <StepQuestionnaire state={state} setState={setState} questionIndex={questionIndex} setQuestionIndex={setQuestionIndex} />;
      case 5: return <StepPersonalityResult state={state} setState={setState} />;
      case 6: return <StepCustomize state={state} setState={setState} />;
      case 7: return <StepAPIKeys state={state} setState={setState} />;
      case 8: return <StepSecurity state={state} setState={setState} />;
      case 9: return <StepWorkspacePreview state={state} />;
      case 10: return <StepConfigPreview state={state} />;
      case 11: return <StepDownload state={state} setState={setState} />;
      case 12: return <StepSuccess state={state} onHatch={handleHatch} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: WHITE, color: BLACK }}>
      {/* Header */}
      <header
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: BLACK, borderBottom: `4px solid ${ACCENT}` }}
      >
        <Link href="/" className="flex items-center gap-2 text-sm font-bold uppercase" style={{ color: WHITE }}>
          <ArrowLeft className="w-4 h-4" /> BACK
        </Link>
        <span className="text-xl font-black uppercase" style={{ color: WHITE }}>CLAWHATCH</span>
        <span className="text-sm font-mono" style={{ color: GRAY }}>
          {step + 1}/{TOTAL_STEPS}
        </span>
      </header>

      {/* Progress */}
      <div className="h-2" style={{ background: "#eee" }}>
        <div
          className="h-2 transition-all duration-300"
          style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%`, background: ACCENT }}
        />
      </div>

      {/* Content */}
      <main className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: ACCENT }}>
              STEP {step + 1}: {current.title}
            </p>
            <p style={{ color: GRAY }}>{current.desc}</p>
          </div>
          {renderStep()}
        </div>
      </main>

      {/* Navigation */}
      <footer className="px-6 py-4 flex justify-between" style={{ borderTop: `4px solid ${BLACK}` }}>
        <button
          onClick={() => {
            if (step === 4 && questionIndex > 0) {
              setQuestionIndex(i => i - 1);
            } else {
              setStep((s) => Math.max(s - 1, 0));
              if (step === 5) setQuestionIndex(PERSONALITY_QUESTIONS.length - 1);
            }
          }}
          disabled={step === 0}
          className="px-6 py-3 font-black uppercase text-sm disabled:opacity-30"
          style={{ border: `4px solid ${BLACK}` }}
        >
          ← BACK
        </button>
        {step === TOTAL_STEPS - 1 ? (
          <button
            onClick={handleHatch}
            className="px-6 py-3 font-black uppercase text-sm"
            style={{ background: ACCENT, color: WHITE, border: `4px solid ${ACCENT}` }}
          >
            🐣 HATCH!
          </button>
        ) : (
          <button
            onClick={() => {
              if (step === 4 && questionIndex < PERSONALITY_QUESTIONS.length - 1) {
                // Within questionnaire, don't advance step yet
                return;
              }
              setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
              if (step === 4) setQuestionIndex(0); // Reset for if they go back
            }}
            disabled={!canProceed()}
            className="px-6 py-3 font-black uppercase text-sm disabled:opacity-30"
            style={{ background: canProceed() ? ACCENT : GRAY, color: WHITE, border: `4px solid ${canProceed() ? ACCENT : GRAY}` }}
          >
            NEXT →
          </button>
        )}
      </footer>
    </div>
  );
}
