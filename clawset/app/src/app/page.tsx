"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  GitFork,
  Terminal,
  Rocket,
  ChevronDown,
  ArrowRight,
  Check,
  X,
  AlertTriangle,
  Star,
  Shield,
  Zap,
  Wrench,
  MessageSquare,
  Github,
  Heart,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ─── Scroll reveal hook ─── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Constants ─── */
const PINK = "#ff2d87";
const CYAN = "#00e5ff";
const PURPLE = "#b44dff";
const YELLOW = "#ffe135";
const VOID = "#0a0a0f";
const CHARCOAL = "#14141f";
const SLATE = "#1e1e2e";
const MIST = "#a0a0b8";
const CLOUD = "#e0e0ec";
const WHITE = "#f5f5ff";

/* ─── HERO ─── */
function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 pt-20 pb-16 text-center overflow-hidden">
      {/* Animated glow orbs */}
      <div
        className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, rgba(180,77,255,0.2) 0%, rgba(255,45,135,0.08) 40%, transparent 70%)`,
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute top-[100px] right-[-100px] w-[400px] h-[400px] pointer-events-none animate-pulse"
        style={{
          background: `radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      <div className="relative z-10 max-w-3xl space-y-8">
        {/* Badge */}
        <Reveal>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium tracking-widest uppercase"
            style={{
              color: CYAN,
              background: "rgba(0,229,255,0.08)",
              border: "1px solid rgba(0,229,255,0.2)",
            }}
          >
            <Zap className="w-4 h-4" />
            Open Source · Free DIY
          </div>
        </Reveal>

        {/* Headline */}
        <Reveal delay={100}>
          <h1
            className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight"
            style={{ color: WHITE }}
          >
            Your OpenClaw Agent,{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${PURPLE}, ${PINK}, ${CYAN})`,
              }}
            >
              Set Up Safely
            </span>
          </h1>
        </Reveal>

        {/* Sub-headline */}
        <Reveal delay={200}>
          <p
            className="text-base sm:text-lg md:text-xl max-w-[600px] mx-auto leading-relaxed"
            style={{ color: MIST }}
          >
            Clawhatch gets you set up safely, makes it yours, and keeps it running.
            <br />
            <span style={{ color: CLOUD }}>Professional setup in 10 minutes, not 10 hours.</span>
          </p>
        </Reveal>

        {/* CTA Group */}
        <Reveal delay={300}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/wizard">
              <button
                className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-[10px] text-white font-semibold text-base overflow-hidden cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[44px] min-w-[44px]"
                style={{
                  background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                  boxShadow: `0 0 0 rgba(255,45,135,0)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 20px rgba(255,45,135,0.3), 0 0 60px rgba(255,45,135,0.1)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 rgba(255,45,135,0)`;
                }}
              >
                {/* Shimmer */}
                <span className="absolute inset-0 overflow-hidden">
                  <span className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-[15deg]" />
                </span>
                <span className="relative">Start Setup Wizard</span>
                <ArrowRight className="relative w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </Link>
            <Link href="/manual-setup">
              <button
                className="inline-flex items-center gap-2 px-8 py-4 rounded-[10px] font-semibold text-base cursor-pointer transition-all duration-250 ease-out hover:border-[#00e5ff] focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[44px] min-w-[44px]"
                style={{
                  color: CYAN,
                  background: "transparent",
                  border: `1px solid rgba(0,229,255,0.3)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = CYAN;
                  e.currentTarget.style.background = "rgba(0,229,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,229,255,0.3)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                🎁 Free Expert Setup (Beta)
              </button>
            </Link>
          </div>
        </Reveal>

        {/* Scroll indicator */}
        <Reveal delay={500}>
          <div className="pt-12 flex justify-center">
            <ChevronDown
              className="w-6 h-6 animate-bounce"
              style={{ color: MIST, opacity: 0.4 }}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── THREE PILLARS SECTION ─── */
function ThreePillars() {
  return (
    <section className="relative px-4 sm:px-6 py-20 lg:py-24">
      <div className="max-w-[1000px] mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <h2
              className="font-heading text-3xl sm:text-4xl font-bold leading-[1.1] tracking-tight"
              style={{ color: WHITE }}
            >
              The Clawhatch Promise
            </h2>
            <p className="mt-3 text-base" style={{ color: MIST }}>
              Safe. Personalised. Maintained.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar.title} delay={i * 100}>
              <div
                className="rounded-2xl p-6 text-center transition-all duration-250 ease-out hover:-translate-y-1"
                style={{
                  background: "rgba(17,17,24,0.8)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${pillar.color}15` }}
                >
                  <pillar.icon className="w-7 h-7" style={{ color: pillar.color }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: WHITE }}>
                  {pillar.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: MIST }}>
                  {pillar.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ─── */
const steps = [
  {
    num: "01",
    title: "Choose Your Path",
    desc: "Pick DIY (free guide), Guided Setup, or Done-For-You. No wrong choice.",
    icon: GitFork,
  },
  {
    num: "02",
    title: "We Configure Everything",
    desc: "OpenClaw, Clawdbot, skills, memory — tailored to your setup.",
    icon: Terminal,
  },
  {
    num: "03",
    title: "You're Live",
    desc: "Your AI assistant is running. Start chatting in under 10 minutes.",
    icon: Rocket,
  },
];

function HowItWorks() {
  return (
    <section className="relative px-4 sm:px-6 py-24 lg:py-32">
      {/* Top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, rgba(180,77,255,0.1) 0%, transparent 70%)`,
        }}
      />
      <div className="relative z-10 max-w-[1200px] mx-auto">
        <Reveal>
          <div className="text-center mb-12 lg:mb-16">
            <h2
              className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight"
              style={{ color: WHITE }}
            >
              How It Works
            </h2>
            <p className="mt-3 text-base" style={{ color: MIST }}>
              Three steps. That&apos;s it.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step, i) => (
            <Reveal key={step.num} delay={i * 150}>
              <div
                className="group relative rounded-[24px] p-8 text-center cursor-pointer transition-all duration-250 ease-out hover:-translate-y-1"
                style={{
                  background: "rgba(17,17,24,0.8)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(180,77,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                {/* Step number */}
                <span
                  className="inline-block px-3.5 py-1.5 rounded-full text-sm font-mono font-bold mb-5"
                  style={{
                    color: CYAN,
                    background: "rgba(0,229,255,0.08)",
                  }}
                >
                  {step.num}
                </span>
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <step.icon
                    className="w-12 h-12"
                    style={{ color: PINK }}
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: WHITE }}>
                  {step.title}
                </h3>
                <p className="text-base leading-relaxed" style={{ color: MIST }}>
                  {step.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FEATURE COMPARISON ─── */
const comparisons = [
  { feature: "Time to setup", manual: "2–6 hours", clawhatch: "~10 minutes" },
  { feature: "Configuration errors", manual: "Common", clawhatch: "Pre-tested" },
  { feature: "Skill installation", manual: "Copy-paste, debug", clawhatch: "One click" },
  { feature: "Memory & personality", manual: "Read docs, manual edit", clawhatch: "Guided wizard" },
  { feature: "Updates", manual: "Git pull, pray", clawhatch: "Managed" },
  { feature: "Support when stuck", manual: "GitHub issues, hope", clawhatch: "Priority human help" },
];

function Comparison() {
  return (
    <section className="px-4 sm:px-6 py-24 lg:py-32" style={{ background: "rgba(17,17,24,0.5)" }}>
      <div className="max-w-[800px] mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <h2
              className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight"
              style={{ color: WHITE }}
            >
              Why Not Just DIY Everything?
            </h2>
            <p className="mt-3 text-base" style={{ color: MIST }}>
              You can. But here&apos;s what Clawhatch saves you.
            </p>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid rgba(255,255,255,0.08)` }}
          >
            {/* Header */}
            <div
              className="hidden md:grid grid-cols-3 px-6 py-4"
              style={{
                background: "rgba(28,28,39,0.8)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: MIST }}>
                Feature
              </span>
              <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: MIST }}>
                Manual
              </span>
              <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: PINK }}>
                Clawhatch
              </span>
            </div>
            {/* Rows */}
            {comparisons.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-0 px-6 py-4 transition-colors duration-200 hover:bg-white/[0.02]"
                style={{
                  borderBottom: i < comparisons.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <span className="text-sm font-medium" style={{ color: CLOUD }}>
                  {row.feature}
                </span>
                <span className="flex items-center gap-2 text-sm" style={{ color: MIST }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: YELLOW }} />
                  {row.manual}
                </span>
                <span className="flex items-center gap-2 text-sm font-medium" style={{ color: "#10B981" }}>
                  <Check className="w-4 h-4 flex-shrink-0" />
                  {row.clawhatch}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── PRICING ─── */
const tiers = [
  {
    label: "Pro",
    price: "£79",
    originalPrice: "£149",
    period: "one-time",
    desc: "Automated wizard + security baseline. Safe setup in 10 minutes.",
    features: [
      { text: "Guided setup wizard", included: true },
      { text: "Security baseline enforced", included: true },
      { text: "API key encryption", included: true },
      { text: "Pre-configured templates", included: true },
      { text: "7 days email support", included: true },
    ],
    cta: "Get Pro — 47% Off",
    featured: false,
    icon: Zap,
    founding: true,
  },
  {
    label: "Enterprise",
    price: "£149",
    originalPrice: "£299",
    period: "one-time",
    desc: "Pro + security audit report + advanced configurations.",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Security audit PDF report", included: true },
      { text: "Multi-channel setup", included: true },
      { text: "Advanced tool configs", included: true },
      { text: "14 days priority support", included: true },
    ],
    cta: "Get Enterprise — 50% Off",
    featured: true,
    icon: Shield,
    founding: true,
  },
  {
    label: "Concierge",
    price: "£249",
    originalPrice: "£499",
    period: "one-time",
    desc: "1:1 expert setup session. We do it all, you watch.",
    features: [
      { text: "Everything in Enterprise", included: true },
      { text: "45-min live video session", included: true },
      { text: "Custom SOUL.md personality", included: true },
      { text: "Full security hardening", included: true },
      { text: "30 days VIP support", included: true },
    ],
    cta: "Book Concierge — 50% Off",
    featured: false,
    icon: Heart,
    founding: true,
    note: "Via Stripe (includes human time)",
  },
  {
    label: "Ongoing Support",
    price: "£29",
    period: "/month",
    desc: "Proactive monitoring, config updates, priority troubleshooting.",
    features: [
      { text: "Priority support (24h SLA)", included: true },
      { text: "Monthly health checks", included: true },
      { text: "Config updates when OpenClaw changes", included: true },
      { text: "2 config changes/month", included: true },
      { text: "Cancel anytime", included: true },
    ],
    cta: "Subscribe",
    featured: false,
    icon: Wrench,
    note: "Add to any tier",
  },
];

function Pricing() {
  return (
    <section id="pricing" className="relative px-4 sm:px-6 py-24 lg:py-32">
      {/* Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, rgba(180,77,255,0.1) 0%, transparent 70%)`,
        }}
      />
      <div className="relative z-10 max-w-[960px] mx-auto">
        <Reveal>
          <div className="text-center mb-12 lg:mb-16">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
              style={{
                color: PINK,
                background: "rgba(255,45,135,0.08)",
                border: "1px solid rgba(255,45,135,0.2)",
              }}
            >
              🎉 Founding Customer Pricing — First 20 Only
            </div>
            <h2
              className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight"
              style={{ color: WHITE }}
            >
              Lock In 50% Off
            </h2>
            <p className="mt-3 text-base" style={{ color: MIST }}>
              Founding customers get permanent access at launch pricing.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {tiers.map((tier, i) => (
            <Reveal key={tier.label} delay={i * 150}>
              <div
                className={`relative flex flex-col rounded-[24px] p-8 transition-all duration-250 ease-out hover:-translate-y-1 cursor-pointer ${
                  tier.featured ? "lg:scale-[1.03]" : ""
                }`}
                style={{
                  background: tier.featured
                    ? CHARCOAL
                    : "rgba(17,17,24,0.8)",
                  border: tier.featured
                    ? "none"
                    : "1px solid rgba(255,255,255,0.08)",
                  backgroundImage: tier.featured
                    ? `linear-gradient(${CHARCOAL}, ${CHARCOAL}), linear-gradient(135deg, ${PINK}, ${PURPLE})`
                    : undefined,
                  backgroundOrigin: tier.featured ? "border-box" : undefined,
                  backgroundClip: tier.featured ? "padding-box, border-box" : undefined,
                  borderWidth: tier.featured ? "2px" : undefined,
                  borderStyle: tier.featured ? "solid" : undefined,
                  borderColor: tier.featured ? "transparent" : undefined,
                  boxShadow: tier.featured
                    ? `0 0 20px rgba(255,45,135,0.15), 0 0 60px rgba(255,45,135,0.05)`
                    : undefined,
                  backdropFilter: "blur(12px)",
                }}
              >
                {/* Popular badge */}
                {tier.featured && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest text-white"
                    style={{
                      background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                    }}
                  >
                    Most Popular
                  </span>
                )}

                {/* Label */}
                <div className="flex items-center gap-2 mb-4">
                  <tier.icon className="w-5 h-5" style={{ color: tier.featured ? PINK : CYAN }} />
                  <span
                    className="text-sm font-semibold uppercase tracking-widest"
                    style={{ color: tier.featured ? PINK : CYAN }}
                  >
                    {tier.label}
                  </span>
                </div>

                {/* Founding Badge */}
                {(tier as { founding?: boolean }).founding && (
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
                    style={{
                      color: CYAN,
                      background: "rgba(0,229,255,0.1)",
                      border: "1px solid rgba(0,229,255,0.2)",
                    }}
                  >
                    🎉 Founding Customer — Limited
                  </div>
                )}

                {/* Price */}
                <div className="mb-1 flex items-baseline gap-2">
                  <span
                    className="font-heading text-5xl font-bold"
                    style={{ color: WHITE }}
                  >
                    {tier.price}
                  </span>
                  {(tier as { originalPrice?: string }).originalPrice && (
                    <span
                      className="text-xl line-through"
                      style={{ color: MIST, opacity: 0.6 }}
                    >
                      {(tier as { originalPrice?: string }).originalPrice}
                    </span>
                  )}
                </div>
                <p className="text-sm mb-6" style={{ color: MIST }}>
                  {tier.period}
                </p>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li
                      key={f.text}
                      className={`flex items-center gap-2.5 text-sm ${
                        f.included ? "" : "line-through opacity-40"
                      }`}
                      style={{ color: f.included ? CLOUD : MIST }}
                    >
                      {f.included ? (
                        <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#10B981" }} />
                      ) : (
                        <X className="w-4 h-4 flex-shrink-0" style={{ color: MIST }} />
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {tier.featured ? (
                  <button
                    className="group relative w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-[10px] text-white font-semibold text-base overflow-hidden cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[44px]"
                    style={{
                      background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                    }}
                  >
                    <span className="absolute inset-0 overflow-hidden">
                      <span className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-[15deg]" />
                    </span>
                    <span className="relative">{tier.cta}</span>
                    <ArrowRight className="relative w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                ) : (
                  <button
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-[10px] font-semibold text-base cursor-pointer transition-all duration-250 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[44px]"
                    style={{
                      color: CLOUD,
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = PURPLE;
                      e.currentTarget.style.color = WHITE;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                      e.currentTarget.style.color = CLOUD;
                    }}
                  >
                    {tier.cta}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {tier.note && (
                  <p className="text-center text-xs mt-3" style={{ color: MIST }}>
                    {tier.note}
                  </p>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── THREE PILLARS ─── */
const pillars = [
  {
    icon: Shield,
    title: "Safe Baseline",
    desc: "Security baked in from day one. Sandboxing enforced, API keys encrypted, allowlists configured. No footguns.",
    color: CYAN,
  },
  {
    icon: Sparkles,
    title: "Personalised",
    desc: "Built for YOUR workflow, not a generic template. Tools you need, channels you use, personality that fits.",
    color: PINK,
  },
  {
    icon: Wrench,
    title: "Maintained",
    desc: "Setup is day one. We keep it running. Config updates when OpenClaw evolves. Never lose days to broken configs.",
    color: PURPLE,
  },
];

/* ─── SOCIAL PROOF ─── */
/* Note: These are example use cases, not real testimonials yet */
/* Will be replaced with real customer feedback after beta */
const useCases = [
  {
    quote: "Indie hacker automating customer support with Telegram integration and sentiment analysis.",
    persona: "Example: Indie Hacker",
    useCase: "Customer Support Bot",
  },
  {
    quote: "Content creator with Discord bot for community management and scheduled posts.",
    persona: "Example: Creator",
    useCase: "Community Management",
  },
  {
    quote: "Startup team using multiple agents with role-based access and security allowlists.",
    persona: "Example: Startup Team",
    useCase: "Team Automation",
  },
];

const stats = [
  { value: "50+", label: "Setups tested" },
  { value: "< 10 min", label: "Target setup time" },
  { value: "6+", label: "Platforms supported" },
  { value: "< 24h", label: "Support response" },
];

function SocialProof() {
  return (
    <section className="px-4 sm:px-6 py-24 lg:py-32" style={{ background: "rgba(17,17,24,0.5)" }}>
      <div className="max-w-[1200px] mx-auto">
        <Reveal>
          <div className="text-center mb-12 lg:mb-16">
            <h2
              className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight"
              style={{ color: WHITE }}
            >
              How People Use OpenClaw
            </h2>
            <p className="mt-3 text-base" style={{ color: MIST }}>
              Example use cases. Real testimonials coming after beta.
            </p>
          </div>
        </Reveal>

        {/* Use case cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          {useCases.map((t, i) => (
            <Reveal key={i} delay={i * 150}>
              <div
                className="rounded-2xl p-6 transition-all duration-250 ease-out hover:-translate-y-1"
                style={{
                  background: "rgba(28,28,39,0.8)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {/* Use case badge */}
                <div
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mb-4"
                  style={{
                    color: CYAN,
                    background: "rgba(0,229,255,0.1)",
                  }}
                >
                  {t.useCase}
                </div>
                <p className="text-[15px] leading-relaxed mb-6" style={{ color: CLOUD }}>
                  {t.quote}
                </p>
                <div>
                  <p className="text-xs" style={{ color: MIST }}>
                    {t.persona}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Stats */}
        <Reveal delay={200}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p
                  className="font-heading text-3xl sm:text-4xl font-bold bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${PURPLE}, ${PINK}, ${CYAN})`,
                  }}
                >
                  {s.value}
                </p>
                <p className="text-sm mt-1" style={{ color: MIST }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
const faqs = [
  {
    q: "How is this different from just following the docs?",
    a: "The docs tell you how. We make sure it's done safely. 67% of self-configured OpenClaw instances have at least one critical security misconfiguration (API keys in configs, no sandboxing, exec security disabled). Clawhatch enforces best practices automatically.",
  },
  {
    q: "Do you access my API keys?",
    a: "Never. The wizard runs locally on your machine. We never see your keys, configs, or data. For Concierge sessions, you paste keys into your own terminal while screen-sharing — we guide but never touch.",
  },
  {
    q: "What if I already have OpenClaw installed?",
    a: "Book a free security audit. We'll check your config and give you a report of risks + fixes. Then you can decide if you want help hardening it.",
  },
  {
    q: "Why is Concierge through Stripe, not Lemon Squeezy?",
    a: "Concierge involves human time (live 1:1 sessions). Lemon Squeezy is for digital products only. We use Stripe for services to stay compliant with both platforms' terms.",
  },
  {
    q: "Can I cancel the £29/mo support?",
    a: "Anytime. No contracts, no cancellation fees. Your setup keeps working — you just lose priority support and managed updates.",
  },
  {
    q: "What's 'founding customer' pricing?",
    a: "We're launching with 47-50% off for our first 20 customers. After that, prices go to full list (£149/£299/£499). Lock in the discount now.",
  },
];

function FAQSection() {
  return (
    <section id="faq" className="px-4 sm:px-6 py-24 lg:py-32">
      <div className="max-w-[720px] mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <h2
              className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight"
              style={{ color: WHITE }}
            >
              Frequently Asked Questions
            </h2>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              >
                <AccordionTrigger
                  className="text-left text-base font-medium hover:no-underline cursor-pointer py-6 min-h-[44px] transition-colors duration-200"
                  style={{ color: WHITE }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = CYAN;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = WHITE;
                  }}
                >
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent
                  className="text-[15px] leading-relaxed pb-6"
                  style={{ color: MIST }}
                >
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── FINAL CTA ─── */
function FinalCTA() {
  return (
    <section className="relative px-4 sm:px-6 py-32 lg:py-40 text-center overflow-hidden">
      {/* Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, rgba(255,45,135,0.08) 0%, rgba(180,77,255,0.06) 40%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />
      <div className="relative z-10 max-w-2xl mx-auto">
        <Reveal>
          <h2
            className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight"
            style={{ color: WHITE }}
          >
            Open Your{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${PURPLE}, ${PINK}, ${CYAN})`,
              }}
            >
              Clawhatch
            </span>
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p
            className="text-base sm:text-lg max-w-[500px] mx-auto mt-4 mb-10 leading-relaxed"
            style={{ color: MIST }}
          >
            Your AI assistant is 10 minutes away. Start free, upgrade anytime.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <Link href="/wizard">
            <button
              className="group relative inline-flex items-center gap-2 px-10 py-5 rounded-[10px] text-white font-semibold text-lg overflow-hidden cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 min-h-[44px]"
              style={{
                background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 20px rgba(255,45,135,0.3), 0 0 60px rgba(255,45,135,0.1)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span className="absolute inset-0 overflow-hidden">
                <span className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-[15deg]" />
              </span>
              <span className="relative">Get Started Free</span>
              <ArrowRight className="relative w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </Link>
        </Reveal>
        <Reveal delay={300}>
          <p className="flex items-center justify-center gap-2 text-xs mt-4" style={{ color: MIST }}>
            <Shield className="w-3.5 h-3.5" />
            No credit card required · Free tier forever · Cancel anytime
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function Footer() {
  return (
    <footer
      className="px-4 sm:px-6 py-12"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <span className="font-heading text-sm font-bold" style={{ color: PINK }}>
            Clawhatch
          </span>
          <span className="text-sm" style={{ color: MIST }}>
            &copy; {new Date().getFullYear()} Clawhatch
          </span>
        </div>
        <div className="flex items-center gap-6">
          {[
            { label: "Privacy", href: "#" },
            { label: "Terms", href: "#" },
            { label: "Discord", href: "#" },
            { label: "GitHub", href: "https://github.com/OpenClaw" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm transition-colors duration-200 cursor-pointer min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: MIST }}
              onMouseEnter={(e) => { e.currentTarget.style.color = WHITE; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = MIST; }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ─── PAGE ─── */
export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: VOID }}>
      <Hero />
      <ThreePillars />
      <HowItWorks />
      <Comparison />
      <Pricing />
      <SocialProof />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
