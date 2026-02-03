"use client";

import { useState, useEffect } from "react";
import { WizardShell } from "@/components/wizard/WizardShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/* ── Types ── */

interface WizardState {
  // OS Detection
  detectedOS: string;
  isWSL2: boolean;
  // Channels
  channels: string[];
  // Model
  model: string;
  // Persona
  personaName: string;
  personaVibe: string;
  personaEmoji: string;
  // API Keys
  apiKeys: Record<string, string>;
  // Security
  securityLevel: string;
  // Payment
  tier: "free" | "pro";
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
};

const CHANNELS = [
  { id: "whatsapp", label: "WhatsApp", icon: "💬" },
  { id: "telegram", label: "Telegram", icon: "✈️" },
  { id: "discord", label: "Discord", icon: "🎮" },
  { id: "signal", label: "Signal", icon: "🔒" },
  { id: "slack", label: "Slack", icon: "💼" },
];

const MODELS = [
  { id: "claude", label: "Claude", provider: "Anthropic", icon: "🧠", keyPrefix: "sk-ant-" },
  { id: "gpt", label: "GPT", provider: "OpenAI", icon: "🤖", keyPrefix: "sk-" },
  { id: "gemini", label: "Gemini", provider: "Google", icon: "✨", keyPrefix: "AI..." },
];

const VIBES = [
  { id: "formal", label: "Formal", desc: "Professional and precise", emoji: "🎩" },
  { id: "casual", label: "Casual", desc: "Friendly and relaxed", emoji: "😎" },
  { id: "snarky", label: "Snarky", desc: "Witty with attitude", emoji: "😏" },
];

const SECURITY_LEVELS = [
  {
    id: "sandbox",
    label: "Sandbox",
    desc: "Read-only access. No file writes, no commands.",
    icon: "🔒",
    color: "text-green-400",
  },
  {
    id: "standard",
    label: "Standard",
    desc: "File access within workspace. Commands with approval.",
    icon: "🛡️",
    color: "text-yellow-400",
  },
  {
    id: "full",
    label: "Full Access",
    desc: "Unrestricted file and command access. Use with caution.",
    icon: "⚡",
    color: "text-red-400",
  },
];

/* ── Helper: detect OS from user agent ── */
function detectOS(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "Windows";
  if (ua.includes("mac")) return "macOS";
  if (ua.includes("linux")) return "Linux";
  return "Unknown";
}

/* ── Step Components ── */

function StepWelcome() {
  return (
    <div className="space-y-4 font-mono text-sm">
      <div className="bg-background rounded-lg p-6 border border-border">
        <p className="text-muted-foreground">$ clawhatch init</p>
        <p className="text-brand-teal">→ Scanning environment...</p>
        <p className="text-brand-teal">→ Ready to configure.</p>
        <div className="mt-4 space-y-2 text-foreground">
          <p className="text-lg font-bold">Let&apos;s set up your AI assistant 🦞</p>
          <p className="text-muted-foreground text-xs">
            This wizard will walk you through everything: platform, channels, model,
            persona, and security. Takes about 5 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepOS({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  useEffect(() => {
    const os = detectOS();
    setState((s) => ({ ...s, detectedOS: os }));
  }, [setState]);

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-lg p-6 border border-border font-mono text-sm">
        <p className="text-muted-foreground">$ uname -s</p>
        <p className="text-brand-teal text-lg">
          → Detected: <span className="text-foreground font-bold">{state.detectedOS || "..."}</span>
        </p>
      </div>

      {state.detectedOS === "Windows" && (
        <div className="bg-background rounded-lg p-4 border border-border space-y-3">
          <Label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={state.isWSL2}
              onChange={(e) => setState((s) => ({ ...s, isWSL2: e.target.checked }))}
              className="w-4 h-4 rounded accent-brand-red"
            />
            <span className="font-mono text-sm">I have WSL2 installed</span>
          </Label>
          <p className="text-xs text-muted-foreground font-mono">
            WSL2 is recommended for the best experience on Windows. Docker Desktop uses it too.
          </p>
          {!state.isWSL2 && (
            <p className="text-xs text-yellow-400 font-mono">
              ⚠️ Without WSL2, some features may require workarounds.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StepChannels({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  const toggle = (id: string) => {
    setState((s) => ({
      ...s,
      channels: s.channels.includes(id)
        ? s.channels.filter((c) => c !== id)
        : [...s.channels, id],
    }));
  };

  return (
    <div className="grid gap-3">
      {CHANNELS.map((ch) => {
        const selected = state.channels.includes(ch.id);
        return (
          <button
            key={ch.id}
            onClick={() => toggle(ch.id)}
            className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-all font-mono text-sm ${
              selected
                ? "border-brand-red bg-brand-red/10 text-foreground"
                : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50"
            }`}
          >
            <span className="text-2xl">{ch.icon}</span>
            <span className="flex-1 font-bold">{ch.label}</span>
            {selected && <Badge className="bg-brand-red text-white">Selected</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function StepModel({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  return (
    <div className="grid gap-3">
      {MODELS.map((m) => {
        const selected = state.model === m.id;
        return (
          <button
            key={m.id}
            onClick={() => setState((s) => ({ ...s, model: m.id }))}
            className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-all font-mono text-sm ${
              selected
                ? "border-brand-red bg-brand-red/10 text-foreground"
                : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50"
            }`}
          >
            <span className="text-2xl">{m.icon}</span>
            <div className="flex-1">
              <span className="font-bold">{m.label}</span>
              <span className="text-xs text-muted-foreground ml-2">({m.provider})</span>
            </div>
            {selected && <Badge className="bg-brand-red text-white">Selected</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function StepPersona({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  const EMOJIS = ["🦞", "🤖", "🧠", "🐱", "🦊", "🐙", "🌶️", "⚡", "🎭", "👻"];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="persona-name" className="font-mono">
          Assistant Name
        </Label>
        <Input
          id="persona-name"
          placeholder="e.g. Clawd, Jarvis, Friday..."
          value={state.personaName}
          onChange={(e) => setState((s) => ({ ...s, personaName: e.target.value }))}
          className="font-mono bg-background"
        />
      </div>

      <div className="space-y-2">
        <Label className="font-mono">Vibe</Label>
        <div className="grid gap-2">
          {VIBES.map((v) => {
            const selected = state.personaVibe === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setState((s) => ({ ...s, personaVibe: v.id }))}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all text-sm ${
                  selected
                    ? "border-brand-red bg-brand-red/10"
                    : "border-border bg-background hover:border-muted-foreground/50"
                }`}
              >
                <span className="text-lg">{v.emoji}</span>
                <div>
                  <span className="font-mono font-bold">{v.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{v.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-mono">Pick an Emoji</Label>
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setState((s) => ({ ...s, personaEmoji: e }))}
              className={`w-10 h-10 rounded-lg border text-lg flex items-center justify-center transition-all ${
                state.personaEmoji === e
                  ? "border-brand-red bg-brand-red/10 scale-110"
                  : "border-border bg-background hover:border-muted-foreground/50"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepAPIKeys({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  const selectedModel = MODELS.find((m) => m.id === state.model);

  if (!selectedModel) {
    return (
      <div className="bg-background rounded-lg p-6 border border-border text-center text-muted-foreground font-mono text-sm">
        <p>⚠️ Go back and select a model first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="api-key" className="font-mono">
          {selectedModel.provider} API Key
        </Label>
        <Input
          id="api-key"
          type="password"
          placeholder={selectedModel.keyPrefix}
          value={state.apiKeys[selectedModel.id] || ""}
          onChange={(e) =>
            setState((s) => ({
              ...s,
              apiKeys: { ...s.apiKeys, [selectedModel.id]: e.target.value },
            }))
          }
          className="font-mono bg-background"
        />
      </div>
      <p className="text-xs text-muted-foreground font-mono">
        🔒 Stored locally in your .env file. Never transmitted to our servers.
      </p>
    </div>
  );
}

function StepSecurity({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  return (
    <div className="grid gap-3">
      {SECURITY_LEVELS.map((lvl) => {
        const selected = state.securityLevel === lvl.id;
        return (
          <button
            key={lvl.id}
            onClick={() => setState((s) => ({ ...s, securityLevel: lvl.id }))}
            className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-all text-sm ${
              selected
                ? "border-brand-red bg-brand-red/10"
                : "border-border bg-background hover:border-muted-foreground/50"
            }`}
          >
            <span className="text-2xl">{lvl.icon}</span>
            <div className="flex-1">
              <div className="font-mono font-bold">
                {lvl.label}{" "}
                <span className={`text-xs ${lvl.color}`}>{lvl.id.toUpperCase()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{lvl.desc}</p>
            </div>
            {selected && <Badge className="bg-brand-red text-white">Selected</Badge>}
          </button>
        );
      })}
    </div>
  );
}

function StepWorkspacePreview({ state }: { state: WizardState }) {
  const soulMd = `# SOUL.md — ${state.personaName || "Assistant"} ${state.personaEmoji}

## Identity
- **Name:** ${state.personaName || "Unnamed"}
- **Vibe:** ${state.personaVibe}
- **Emoji:** ${state.personaEmoji}

## Personality
${
  state.personaVibe === "formal"
    ? "You are professional, precise, and courteous."
    : state.personaVibe === "snarky"
    ? "You are witty, sharp, and not afraid to roast."
    : "You are friendly, approachable, and relaxed."
}

## Model
- Provider: ${MODELS.find((m) => m.id === state.model)?.provider || "Not selected"}
- Model: ${state.model || "Not selected"}
`;

  const userMd = `# USER.md

## Platform
- OS: ${state.detectedOS}
${state.detectedOS === "Windows" ? `- WSL2: ${state.isWSL2 ? "Yes" : "No"}` : ""}

## Channels
${state.channels.length ? state.channels.map((c) => `- ${c}`).join("\n") : "- None selected"}

## Security
- Level: ${state.securityLevel}
`;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="font-mono text-xs text-muted-foreground">SOUL.md</p>
        <pre className="bg-background rounded-lg p-4 border border-border font-mono text-xs text-foreground whitespace-pre-wrap overflow-auto max-h-48">
          {soulMd}
        </pre>
      </div>
      <Separator />
      <div className="space-y-1">
        <p className="font-mono text-xs text-muted-foreground">USER.md</p>
        <pre className="bg-background rounded-lg p-4 border border-border font-mono text-xs text-foreground whitespace-pre-wrap overflow-auto max-h-48">
          {userMd}
        </pre>
      </div>
    </div>
  );
}

function StepConfigPreview({ state }: { state: WizardState }) {
  const config = {
    assistant: {
      name: state.personaName || "assistant",
      emoji: state.personaEmoji,
      vibe: state.personaVibe,
    },
    platform: {
      os: state.detectedOS,
      wsl2: state.isWSL2,
    },
    model: {
      provider: MODELS.find((m) => m.id === state.model)?.provider || null,
      id: state.model || null,
    },
    channels: state.channels,
    security: state.securityLevel,
  };

  return (
    <div className="space-y-2">
      <p className="font-mono text-xs text-muted-foreground">clawhatch.config.json</p>
      <pre className="bg-background rounded-lg p-4 border border-border font-mono text-xs text-brand-teal whitespace-pre-wrap overflow-auto max-h-64">
        {JSON.stringify(config, null, 2)}
      </pre>
    </div>
  );
}

function StepDownload({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Free */}
      <button
        onClick={() => setState((s) => ({ ...s, tier: "free" }))}
        className={`p-6 rounded-lg border text-left transition-all ${
          state.tier === "free"
            ? "border-brand-red bg-brand-red/10"
            : "border-border bg-background hover:border-muted-foreground/50"
        }`}
      >
        <p className="text-lg font-bold font-mono">Free</p>
        <p className="text-2xl font-bold mt-1">$0</p>
        <Separator className="my-3" />
        <ul className="space-y-1 text-xs text-muted-foreground font-mono">
          <li>✅ Full wizard config</li>
          <li>✅ Generated SOUL.md & USER.md</li>
          <li>✅ Manual setup documentation</li>
          <li>❌ No automated install script</li>
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full border-border font-mono"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          Download Docs 📄
        </Button>
      </button>

      {/* Pro */}
      <button
        onClick={() => setState((s) => ({ ...s, tier: "pro" }))}
        className={`p-6 rounded-lg border text-left transition-all relative ${
          state.tier === "pro"
            ? "border-brand-red bg-brand-red/10"
            : "border-border bg-background hover:border-muted-foreground/50"
        }`}
      >
        <Badge className="absolute -top-2 right-3 bg-brand-purple text-white text-[10px]">
          RECOMMENDED
        </Badge>
        <p className="text-lg font-bold font-mono">Pro</p>
        <p className="text-2xl font-bold mt-1">$39</p>
        <Separator className="my-3" />
        <ul className="space-y-1 text-xs text-muted-foreground font-mono">
          <li>✅ Everything in Free</li>
          <li>✅ Automated install script</li>
          <li>✅ One-command deployment</li>
          <li>✅ Priority support</li>
        </ul>
        <Button
          size="sm"
          className="mt-4 w-full bg-brand-red hover:bg-brand-red/90 text-white font-mono"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          Get Pro ⚡
        </Button>
      </button>
    </div>
  );
}

function StepSuccess({ state }: { state: WizardState }) {
  return (
    <div className="text-center space-y-6 py-4">
      <div className="text-6xl">{state.personaEmoji}</div>
      <h2 className="text-3xl font-bold font-mono">
        Your assistant is ready to hatch! 🐣
      </h2>
      <p className="text-muted-foreground font-mono text-sm max-w-md mx-auto">
        {state.personaName
          ? `${state.personaName} is configured and waiting.`
          : "Your assistant is configured and waiting."}{" "}
        {state.tier === "pro"
          ? "Run the install script to deploy."
          : "Follow the manual setup docs to get started."}
      </p>
      <div className="bg-background rounded-lg p-4 border border-border font-mono text-sm inline-block">
        <p className="text-muted-foreground">$</p>
        <p className="text-brand-teal">
          {state.tier === "pro" ? "bash clawhatch-install.sh" : "cat SETUP.md"}
        </p>
      </div>
    </div>
  );
}

/* ── Step metadata ── */

const stepMeta: Record<number, { title: string; description: string }> = {
  0: { title: "Welcome to Clawhatch", description: "Let's set up your AI assistant" },
  1: { title: "OS Detection", description: "Auto-detecting your platform" },
  2: { title: "Channels", description: "Where should your assistant live?" },
  3: { title: "Model Selection", description: "Choose your AI model provider" },
  4: { title: "Persona Quiz", description: "Give your assistant some personality" },
  5: { title: "API Keys", description: "Enter your provider credentials" },
  6: { title: "Security Level", description: "How much access should your assistant have?" },
  7: { title: "Workspace Preview", description: "Preview your generated workspace files" },
  8: { title: "Config Preview", description: "Review your generated configuration" },
  9: { title: "Download", description: "Choose your setup path" },
  10: { title: "Success!", description: "You're all set" },
};

const TOTAL_STEPS = 11;

/* ── Main Page ── */

export default function WizardPage() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);

  const current = stepMeta[step];

  const renderStep = () => {
    switch (step) {
      case 0: return <StepWelcome />;
      case 1: return <StepOS state={state} setState={setState} />;
      case 2: return <StepChannels state={state} setState={setState} />;
      case 3: return <StepModel state={state} setState={setState} />;
      case 4: return <StepPersona state={state} setState={setState} />;
      case 5: return <StepAPIKeys state={state} setState={setState} />;
      case 6: return <StepSecurity state={state} setState={setState} />;
      case 7: return <StepWorkspacePreview state={state} />;
      case 8: return <StepConfigPreview state={state} />;
      case 9: return <StepDownload state={state} setState={setState} />;
      case 10: return <StepSuccess state={state} />;
      default: return null;
    }
  };

  return (
    <WizardShell
      currentStep={step}
      onNext={() => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))}
      onBack={() => setStep((s) => Math.max(s - 1, 0))}
    >
      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle className="text-2xl">{current.title}</CardTitle>
          <CardDescription>{current.description}</CardDescription>
        </CardHeader>
        <CardContent>{renderStep()}</CardContent>
      </Card>
    </WizardShell>
  );
}
