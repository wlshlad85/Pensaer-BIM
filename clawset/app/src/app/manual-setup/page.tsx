"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Shield, Sparkles, Wrench, Clock, MessageSquare, CheckCircle2 } from "lucide-react";

/* ─── Constants ─── */
const PINK = "#ff2d87";
const CYAN = "#00e5ff";
const PURPLE = "#b44dff";
const VOID = "#0a0a0f";
const MIST = "#a0a0b8";
const CLOUD = "#e0e0ec";
const WHITE = "#f5f5ff";

export default function ManualSetupPage() {
  return (
    <div className="min-h-screen" style={{ background: VOID }}>
      {/* Header */}
      <header className="px-6 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm transition-colors duration-200"
          style={{ color: MIST }}
          onMouseEnter={(e) => { e.currentTarget.style.color = WHITE; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = MIST; }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </header>

      {/* Main Content */}
      <main className="px-6 py-12 max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
            style={{
              color: CYAN,
              background: "rgba(0,229,255,0.08)",
              border: "1px solid rgba(0,229,255,0.2)",
            }}
          >
            <Sparkles className="w-4 h-4" />
            Beta Program — Limited Spots
          </div>

          <h1
            className="text-4xl md:text-5xl font-bold leading-tight mb-4"
            style={{ color: WHITE }}
          >
            Free Expert Setup
          </h1>

          <p
            className="text-lg max-w-xl mx-auto leading-relaxed"
            style={{ color: MIST }}
          >
            Get your OpenClaw agent set up by someone who&apos;s done it 50+ times.
            <br />
            <strong style={{ color: CLOUD }}>First 5 beta testers — completely free.</strong>
          </p>
        </div>

        {/* What You Get */}
        <div
          className="rounded-2xl p-8 mb-8"
          style={{
            background: "rgba(17,17,24,0.8)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h2 className="text-xl font-semibold mb-6" style={{ color: WHITE }}>
            What You Get
          </h2>

          <div className="grid gap-4">
            {[
              {
                icon: Clock,
                title: "30-45 Minute Video Call",
                desc: "Live screen-share session where I walk you through every step",
              },
              {
                icon: Shield,
                title: "Security Baseline",
                desc: "Sandboxing, API key encryption, allowlists — done right from day one",
              },
              {
                icon: Sparkles,
                title: "Personalised Configuration",
                desc: "Tools, channels, and personality configured for YOUR workflow",
              },
              {
                icon: MessageSquare,
                title: "1 Week Follow-Up Support",
                desc: "If something breaks or you get stuck, I'm on call to help",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(0,229,255,0.1)" }}
                >
                  <item.icon className="w-5 h-5" style={{ color: CYAN }} />
                </div>
                <div>
                  <h3 className="font-medium" style={{ color: CLOUD }}>
                    {item.title}
                  </h3>
                  <p className="text-sm" style={{ color: MIST }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What I Ask */}
        <div
          className="rounded-2xl p-8 mb-8"
          style={{
            background: "rgba(17,17,24,0.8)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h2 className="text-xl font-semibold mb-6" style={{ color: WHITE }}>
            What I Ask in Return
          </h2>

          <div className="space-y-3">
            {[
              "Honest feedback — tell me what was confusing or could be better",
              "A testimonial (written or video) if you're happy with the result",
              "Permission to screen-record the session (for my notes, kept private)",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  style={{ color: "#10B981" }}
                />
                <p style={{ color: CLOUD }}>{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Calendly Embed Placeholder */}
        <div
          className="rounded-2xl p-8 mb-8 text-center"
          style={{
            background: `linear-gradient(135deg, rgba(255,45,135,0.1), rgba(180,77,255,0.1))`,
            border: "1px solid rgba(180,77,255,0.2)",
          }}
        >
          <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: PINK }} />
          
          <h2 className="text-2xl font-bold mb-2" style={{ color: WHITE }}>
            Book Your Free Setup
          </h2>
          
          <p className="mb-6" style={{ color: MIST }}>
            Pick a time that works for you. Sessions are 45 minutes.
          </p>

          {/* CALENDLY EMBED GOES HERE */}
          {/* 
            To add Calendly:
            1. Get your Calendly embed code from calendly.com
            2. Replace this placeholder with:
               <div 
                 className="calendly-inline-widget" 
                 data-url="https://calendly.com/YOUR-USERNAME/openclaw-setup"
                 style={{ minWidth: '320px', height: '630px' }}
               />
            3. Add Calendly script to layout.tsx:
               <script src="https://assets.calendly.com/assets/external/widget.js" async />
          */}
          <div
            className="rounded-lg p-12 flex flex-col items-center justify-center"
            style={{ 
              background: "rgba(0,0,0,0.3)",
              border: "2px dashed rgba(255,255,255,0.1)",
              minHeight: "300px"
            }}
          >
            <Wrench className="w-8 h-8 mb-4" style={{ color: MIST }} />
            <p className="text-sm font-mono" style={{ color: MIST }}>
              [Calendly Widget Placeholder]
            </p>
            <p className="text-xs mt-2" style={{ color: MIST }}>
              Insert Calendly embed code here
            </p>
          </div>

          <p className="text-sm mt-6" style={{ color: MIST }}>
            Only <strong style={{ color: PINK }}>5 spots</strong> available for free beta.
            <br />
            After that, this becomes a £249 service.
          </p>
        </div>

        {/* Testimonials Placeholder */}
        <div
          className="rounded-2xl p-8 mb-8"
          style={{
            background: "rgba(17,17,24,0.8)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h2 className="text-xl font-semibold mb-6 text-center" style={{ color: WHITE }}>
            What Beta Testers Say
          </h2>

          <div
            className="rounded-lg p-8 text-center"
            style={{ 
              background: "rgba(0,0,0,0.2)",
              border: "1px dashed rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-sm italic" style={{ color: MIST }}>
              Testimonials will appear here after our first beta sessions.
            </p>
            <p className="text-xs mt-2" style={{ color: MIST }}>
              Be one of the first 5 to get featured!
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div
          className="rounded-2xl p-8 mb-8"
          style={{
            background: "rgba(17,17,24,0.8)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h2 className="text-xl font-semibold mb-6" style={{ color: WHITE }}>
            Questions
          </h2>

          <div className="space-y-6">
            {[
              {
                q: "Do I need to have OpenClaw installed already?",
                a: "Nope. We can start from scratch. If you've tried and it's half-broken, even better — I'll fix it.",
              },
              {
                q: "What if I don't have API keys yet?",
                a: "We'll set them up together. I'll walk you through getting Anthropic or OpenAI keys.",
              },
              {
                q: "Will you see my API keys?",
                a: "No. You paste them into your own terminal. I guide you but never see your keys.",
              },
              {
                q: "I'm on Windows. Does it work?",
                a: "Yes. We'll set up WSL2 + systemd if needed. Takes an extra 10 minutes.",
              },
              {
                q: "What's the catch?",
                a: "There isn't one. I'm doing customer discovery before launching a paid product. You get free setup, I get feedback. Win-win.",
              },
            ].map((faq, i) => (
              <div key={i}>
                <h3 className="font-medium mb-1" style={{ color: CLOUD }}>
                  {faq.q}
                </h3>
                <p className="text-sm" style={{ color: MIST }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: MIST }}>
            Questions? Email{" "}
            <a
              href="mailto:hello@clawhatch.com"
              className="underline transition-colors"
              style={{ color: CYAN }}
            >
              hello@clawhatch.com
            </a>
          </p>
          <Link
            href="/"
            className="text-sm transition-colors"
            style={{ color: MIST }}
          >
            ← Back to main site
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="px-6 py-8 text-center"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-sm" style={{ color: MIST }}>
          Clawhatch — Your OpenClaw agent, set up safely and built for you.
        </p>
      </footer>
    </div>
  );
}
