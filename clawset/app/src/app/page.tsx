"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  ArrowRight, Check, Shield, Zap, Wrench, 
  ChevronDown, Menu, X, Lock, FileCode, 
  MessageSquare, Star, Clock, Users
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   CLAWHATCH - SPECTACULAR BRUTALIST EDITION
   
   Raw, stark, aggressive. High contrast black/white with HOT PINK accent.
   Now with: animations, FAQ, testimonials, mobile nav, trust signals.
═══════════════════════════════════════════════════════════════════════════ */

const ACCENT = "#ff2d87";
const BLACK = "#000000";
const WHITE = "#ffffff";
const GRAY = "#666666";
const LIGHT_GRAY = "#f5f5f5";

// Animation hook for scroll-triggered reveals
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

// Animated section wrapper
function AnimatedSection({ 
  children, 
  className = "", 
  delay = 0,
  style = {}
}: { 
  children: React.ReactNode; 
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const { ref, isInView } = useInView();
  
  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: isInView ? 1 : 0,
        transform: isInView ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Typing animation for hero
function TypeWriter({ text, speed = 50 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="animate-pulse">|</span>}
    </span>
  );
}

// Counter animation
function Counter({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, isInView } = useInView();

  useEffect(() => {
    if (!isInView) return;
    
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function SpectacularBrutalistLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "What's OpenClaw?",
      a: "OpenClaw is an open-source AI assistant framework that connects to your messaging apps (WhatsApp, Telegram, Discord) and gives you a personal AI that can browse the web, run code, control your computer, and more. Clawhatch helps you set it up properly."
    },
    {
      q: "Why not just follow the docs?",
      a: "You can! But most people spend 2-6 hours debugging config issues, missing dependencies, and security misconfigurations. Clawhatch gets you a working, secure setup in 10 minutes. We've done hundreds of setups and know where people get stuck."
    },
    {
      q: "What do I actually get?",
      a: "A complete, tested configuration: openclaw.json (your main config), SOUL.md (your bot's personality), AGENTS.md (behavior rules), and a README with your specific setup notes. Plus a security checklist showing exactly what's locked down."
    },
    {
      q: "Is this official?",
      a: "Clawhatch is built by an active OpenClaw community member who runs their own setup daily. We're not affiliated with Anthropic or the core team, but we know the codebase inside out."
    },
    {
      q: "What if I already have OpenClaw installed?",
      a: "Great! We can audit your existing setup, fix security issues, optimize your config, and add new capabilities. The wizard works for fresh installs and upgrades."
    },
    {
      q: "How does support work?",
      a: "All support is async via Telegram or Discord. Pro tier gets 48-hour response, Enterprise gets 12-hour priority response. No scheduled calls — just message when you need help."
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: WHITE, color: BLACK }}>
      {/* NAV */}
      <nav
        className="sticky top-0 z-50 px-6 py-4"
        style={{ background: BLACK, borderBottom: `4px solid ${ACCENT}` }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-black uppercase tracking-tighter" style={{ color: WHITE }}>
            CLAWHATCH
          </Link>
          
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              href="/wizard" 
              className="text-sm font-bold uppercase transition-colors hover:opacity-80" 
              style={{ color: WHITE }}
            >
              Wizard
            </Link>
            <Link 
              href="/manual-setup" 
              className="text-sm font-bold uppercase transition-colors hover:opacity-80" 
              style={{ color: WHITE }}
            >
              Free Beta
            </Link>
            <Link 
              href="/troubleshooting" 
              className="text-sm font-bold uppercase transition-colors hover:opacity-80" 
              style={{ color: WHITE }}
            >
              Help
            </Link>
            <Link
              href="#pricing"
              className="px-4 py-2 text-sm font-black uppercase transition-all hover:scale-105"
              style={{ background: ACCENT, color: WHITE }}
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ color: WHITE }}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div 
            className="md:hidden absolute top-full left-0 right-0 py-4 px-6 space-y-4"
            style={{ background: BLACK, borderBottom: `4px solid ${ACCENT}` }}
          >
            <Link href="/wizard" className="block text-sm font-bold uppercase" style={{ color: WHITE }}>
              Wizard
            </Link>
            <Link href="/manual-setup" className="block text-sm font-bold uppercase" style={{ color: WHITE }}>
              Free Beta
            </Link>
            <Link href="/troubleshooting" className="block text-sm font-bold uppercase" style={{ color: WHITE }}>
              Help
            </Link>
            <Link
              href="#pricing"
              className="inline-block px-4 py-2 text-sm font-black uppercase"
              style={{ background: ACCENT, color: WHITE }}
            >
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="px-6 py-20 md:py-28 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <p
              className="text-sm font-bold uppercase tracking-[0.3em] mb-4"
              style={{ color: ACCENT }}
            >
              OpenClaw Setup Service
            </p>
          </AnimatedSection>
          
          <AnimatedSection delay={100}>
            <h1
              className="text-4xl sm:text-5xl md:text-7xl lg:text-[100px] font-black uppercase leading-[0.9] tracking-tighter mb-8"
              style={{ color: BLACK }}
            >
              YOUR AI.<br />
              SET UP<br />
              <span style={{ color: ACCENT }}>
                <TypeWriter text="SAFELY." speed={100} />
              </span>
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <p className="text-lg md:text-xl max-w-2xl mb-10" style={{ color: GRAY }}>
              Clawhatch gets you set up safely, makes it yours, and keeps it running.
              Professional setup in <strong>10 minutes</strong>, not 10 hours.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={300}>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/wizard"
                className="group inline-flex items-center gap-3 px-6 md:px-8 py-4 text-base md:text-lg font-black uppercase transition-all hover:gap-5"
                style={{ background: BLACK, color: WHITE, border: `4px solid ${BLACK}` }}
              >
                Start Wizard
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/manual-setup"
                className="inline-flex items-center gap-3 px-6 md:px-8 py-4 text-base md:text-lg font-black uppercase transition-all hover:bg-gray-100"
                style={{ background: WHITE, color: BLACK, border: `4px solid ${BLACK}` }}
              >
                Free Beta Setup
              </Link>
            </div>
          </AnimatedSection>

          {/* Trust badges */}
          <AnimatedSection delay={400}>
            <div className="flex flex-wrap items-center gap-6 mt-10 pt-8" style={{ borderTop: `2px solid ${LIGHT_GRAY}` }}>
              <div className="flex items-center gap-2 text-sm" style={{ color: GRAY }}>
                <Shield className="w-4 h-4" style={{ color: ACCENT }} />
                <span>Sandboxed by default</span>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: GRAY }}>
                <Lock className="w-4 h-4" style={{ color: ACCENT }} />
                <span>API keys encrypted</span>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: GRAY }}>
                <Clock className="w-4 h-4" style={{ color: ACCENT }} />
                <span>~10 min setup</span>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* STATS BAR */}
      <div style={{ background: BLACK, color: WHITE }}>
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl md:text-4xl font-black" style={{ color: ACCENT }}>
              <Counter end={50} suffix="+" />
            </div>
            <div className="text-xs md:text-sm uppercase tracking-wide" style={{ color: GRAY }}>Beta Setups</div>
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-black" style={{ color: ACCENT }}>
              <Counter end={10} />
            </div>
            <div className="text-xs md:text-sm uppercase tracking-wide" style={{ color: GRAY }}>Min Avg Setup</div>
          </div>
          <div>
            <div className="text-2xl md:text-4xl font-black" style={{ color: ACCENT }}>
              <Counter end={100} suffix="%" />
            </div>
            <div className="text-xs md:text-sm uppercase tracking-wide" style={{ color: GRAY }}>Success Rate</div>
          </div>
        </div>
      </div>

      {/* THREE PILLARS */}
      <section className="px-6 py-20" style={{ background: LIGHT_GRAY }}>
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-12">
              THE PROMISE
            </h2>
          </AnimatedSection>
          
          <div className="grid md:grid-cols-3 gap-0">
            {[
              { 
                icon: Shield, 
                title: "SAFE", 
                desc: "Security baked in from day one. Sandboxing enforced, API keys encrypted, tool access controlled.",
                detail: "We audit every config against our security checklist."
              },
              { 
                icon: Zap, 
                title: "PERSONAL", 
                desc: "Built for YOUR workflow. Tools you need, channels you use, personality that fits.",
                detail: "7 pre-built personalities or fully custom."
              },
              { 
                icon: Wrench, 
                title: "MAINTAINED", 
                desc: "Setup is day one. We keep it running. Never lose days to broken configs again.",
                detail: "Ongoing support plans available."
              },
            ].map((p, i) => (
              <AnimatedSection key={p.title} delay={i * 100}>
                <div
                  className="p-6 md:p-8 h-full transition-all hover:scale-[1.02]"
                  style={{
                    background: i === 1 ? BLACK : WHITE,
                    color: i === 1 ? WHITE : BLACK,
                    border: `4px solid ${BLACK}`,
                    marginLeft: i > 0 ? "-4px" : 0,
                    marginTop: i > 0 ? "-4px" : 0,
                  }}
                >
                  <p.icon className="w-10 h-10 mb-4" style={{ color: i === 1 ? ACCENT : BLACK }} />
                  <h3 className="text-xl md:text-2xl font-black uppercase mb-2">{p.title}</h3>
                  <p className="text-sm mb-3" style={{ color: i === 1 ? "#ccc" : GRAY }}>{p.desc}</p>
                  <p className="text-xs font-bold uppercase" style={{ color: ACCENT }}>{p.detail}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">
              WHAT YOU GET
            </h2>
            <p className="text-lg mb-12" style={{ color: GRAY }}>
              Four files. Fully configured. Ready to run.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: FileCode,
                file: "openclaw.json",
                desc: "Your main config — model, channels, tools, security policies. Pre-validated.",
              },
              {
                icon: MessageSquare,
                file: "SOUL.md",
                desc: "Your bot's personality — tone, boundaries, quirks. Makes it feel like yours.",
              },
              {
                icon: Users,
                file: "AGENTS.md",
                desc: "Behavior rules — how it handles groups, memory, proactive actions.",
              },
              {
                icon: Shield,
                file: "Security Checklist",
                desc: "PDF audit of your setup — what's locked down, what to watch.",
              },
            ].map((item, i) => (
              <AnimatedSection key={item.file} delay={i * 100}>
                <div
                  className="p-6 transition-all hover:translate-x-2"
                  style={{ border: `4px solid ${BLACK}`, background: WHITE }}
                >
                  <div className="flex items-start gap-4">
                    <item.icon className="w-8 h-8 flex-shrink-0" style={{ color: ACCENT }} />
                    <div>
                      <h3 className="font-black uppercase text-lg mb-1">{item.file}</h3>
                      <p className="text-sm" style={{ color: GRAY }}>{item.desc}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="px-6 py-20" style={{ background: BLACK, color: WHITE }}>
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-current" style={{ color: ACCENT }} />
              ))}
            </div>
            <blockquote className="text-xl md:text-2xl font-bold mb-6 leading-relaxed">
              "Got my OpenClaw running in one session. The security setup alone saved me hours of Googling. 
              <span style={{ color: ACCENT }}> Actually feels like MY assistant now.</span>"
            </blockquote>
            <div>
              <p className="font-black uppercase">Mxrius</p>
              <p className="text-sm" style={{ color: GRAY }}>Beta Tester • Windows 11 • Discord Setup</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-12">
              WHY NOT DIY?
            </h2>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <div style={{ border: `4px solid ${BLACK}` }}>
              <div className="grid grid-cols-3" style={{ background: BLACK, color: WHITE }}>
                <div className="p-3 md:p-4 font-black uppercase text-xs md:text-sm">Feature</div>
                <div className="p-3 md:p-4 font-black uppercase text-xs md:text-sm border-l-4" style={{ borderColor: ACCENT }}>Manual</div>
                <div className="p-3 md:p-4 font-black uppercase text-xs md:text-sm border-l-4" style={{ borderColor: ACCENT, background: ACCENT }}>Clawhatch</div>
              </div>
              {[
                ["Setup time", "2-6 hours", "~10 min"],
                ["Config errors", "Common", "Pre-tested"],
                ["Security audit", "DIY research", "Included"],
                ["Personality setup", "Write from scratch", "7 templates"],
                ["Support", "GitHub issues", "Human help"],
              ].map(([feature, manual, clawhatch], i) => (
                <div
                  key={feature}
                  className="grid grid-cols-3"
                  style={{ borderTop: `2px solid ${BLACK}` }}
                >
                  <div className="p-3 md:p-4 text-xs md:text-sm font-bold">{feature}</div>
                  <div className="p-3 md:p-4 text-xs md:text-sm border-l-4" style={{ borderColor: BLACK, color: GRAY }}>{manual}</div>
                  <div className="p-3 md:p-4 text-xs md:text-sm font-bold border-l-4" style={{ borderColor: BLACK, background: "#fff5f8" }}>{clawhatch}</div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20" style={{ background: LIGHT_GRAY }}>
        <div className="max-w-3xl mx-auto">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-12">
              FAQ
            </h2>
          </AnimatedSection>

          <div className="space-y-0">
            {faqs.map((faq, i) => (
              <AnimatedSection key={i} delay={i * 50}>
                <div style={{ border: `4px solid ${BLACK}`, marginTop: i > 0 ? "-4px" : 0 }}>
                  <button
                    className="w-full p-4 md:p-6 flex items-center justify-between text-left transition-colors"
                    style={{ background: openFaq === i ? BLACK : WHITE, color: openFaq === i ? WHITE : BLACK }}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="font-black uppercase text-sm md:text-base pr-4">{faq.q}</span>
                    <ChevronDown 
                      className="w-5 h-5 flex-shrink-0 transition-transform" 
                      style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0)" }}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="p-4 md:p-6 text-sm md:text-base" style={{ background: WHITE, borderTop: `2px solid ${BLACK}`, color: GRAY }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 py-20" style={{ background: BLACK, color: WHITE }}>
        <div className="max-w-5xl mx-auto">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">
              HONEST PRICING
            </h2>
            <p className="text-lg mb-12" style={{ color: GRAY }}>
              No live calls. No fluff. Just solid async support to get you set up safely.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-0">
            {[
              {
                name: "PRO",
                price: "£39",
                subtitle: "One-time",
                features: [
                  "Guided setup wizard",
                  "Security baseline config",
                  "API key encryption",
                  "Email support (48h)",
                  "Security checklist PDF",
                ],
                featured: false,
                href: "https://buy.stripe.com/eVq7sL4xP5BF34acLsb7y02",
              },
              {
                name: "ENTERPRISE",
                price: "£69",
                subtitle: "One-time",
                features: [
                  "Everything in Pro",
                  "Priority async support (12h)",
                  "Custom SOUL.md personality",
                  "Full security audit PDF",
                  "14 days priority support",
                ],
                featured: true,
                href: "https://buy.stripe.com/8x29ATe8p2pt34a5j0b7y01",
              },
            ].map((tier, i) => (
              <AnimatedSection key={tier.name} delay={i * 100}>
                <div
                  className="p-6 md:p-8 transition-all hover:scale-[1.02]"
                  style={{
                    background: tier.featured ? ACCENT : BLACK,
                    border: `4px solid ${tier.featured ? ACCENT : WHITE}`,
                    marginLeft: i > 0 ? "-4px" : 0,
                  }}
                >
                  <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: tier.featured ? BLACK : GRAY }}>
                    {tier.name}
                  </p>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl md:text-5xl font-black">{tier.price}</span>
                  </div>
                  <p className="text-sm mb-6" style={{ color: tier.featured ? BLACK : GRAY }}>{tier.subtitle}</p>
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={tier.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-3 font-black uppercase text-sm text-center transition-all hover:scale-105"
                    style={{
                      background: tier.featured ? BLACK : WHITE,
                      color: tier.featured ? WHITE : BLACK,
                    }}
                  >
                    Get {tier.name}
                  </a>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Monthly support */}
          <AnimatedSection delay={200}>
            <a
              href="https://buy.stripe.com/7sYbJ1ggx8NR7kq4eWb7y00"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:scale-[1.02]"
              style={{ border: `4px solid ${WHITE}`, display: "flex" }}
            >
              <div>
                <p className="font-black uppercase">ONGOING SUPPORT</p>
                <p className="text-sm" style={{ color: GRAY }}>Monthly health checks, priority support, config updates</p>
              </div>
              <div className="text-left md:text-right flex items-center gap-4">
                <div>
                  <span className="text-3xl font-black">£19</span>
                  <span className="text-sm">/mo</span>
                </div>
                <span className="text-sm font-bold uppercase" style={{ color: ACCENT }}>GET SUPPORT →</span>
              </div>
            </a>
          </AnimatedSection>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-20 md:py-28" style={{ background: ACCENT }}>
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter mb-6" style={{ color: BLACK }}>
              OPEN YOUR CLAWHATCH
            </h2>
            <p className="text-lg md:text-xl mb-8" style={{ color: BLACK }}>
              Your AI assistant is 10 minutes away.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/wizard"
                className="group inline-flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 text-lg md:text-xl font-black uppercase transition-all hover:scale-105"
                style={{ background: BLACK, color: WHITE }}
              >
                Start Free Wizard
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/manual-setup"
                className="inline-flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 text-lg md:text-xl font-black uppercase transition-all hover:bg-white/10"
                style={{ background: "transparent", color: BLACK, border: `4px solid ${BLACK}` }}
              >
                Get Beta Setup
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-8" style={{ background: BLACK, color: WHITE, borderTop: `4px solid ${ACCENT}` }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="font-black uppercase">CLAWHATCH © 2026</span>
            <div className="flex gap-6 text-sm">
              <a href="https://discord.com/invite/clawd" target="_blank" rel="noopener noreferrer" className="transition-colors hover:opacity-80" style={{ color: GRAY }}>
                Discord
              </a>
              <a href="#" className="transition-colors hover:opacity-80" style={{ color: GRAY }}>Privacy</a>
              <a href="#" className="transition-colors hover:opacity-80" style={{ color: GRAY }}>Terms</a>
            </div>
          </div>
          <p className="text-center mt-4 text-xs" style={{ color: GRAY }}>
            Built by an OpenClaw community member. Not affiliated with Anthropic.
          </p>
        </div>
      </footer>
    </div>
  );
}
