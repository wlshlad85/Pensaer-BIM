"use client";

import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    number: "01",
    title: "Configure",
    description:
      "Answer a few questions about your setup — API keys, preferred channels, and AI provider. The wizard handles the rest.",
    icon: "⚙️",
  },
  {
    number: "02",
    title: "Generate",
    description:
      "Clawhatch builds your workspace, config files, and deployment scripts tailored to your choices. One click.",
    icon: "🔧",
  },
  {
    number: "03",
    title: "Launch",
    description:
      "Deploy your AI assistant and start chatting. Discord, Telegram, WhatsApp — wherever you need it.",
    icon: "🚀",
  },
];

export function HowItWorks() {
  return (
    <section className="px-6 py-20 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-2">How It Works</h2>
      <p className="text-muted-foreground text-center mb-12">
        Three steps. Ten minutes. Zero guesswork.
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        {steps.map((step) => (
          <Card
            key={step.number}
            className="bg-surface border-border relative overflow-hidden group hover:border-brand-red/30 transition-colors"
          >
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{step.icon}</span>
                <span className="text-xs font-mono text-brand-red/60 uppercase tracking-widest">
                  Step {step.number}
                </span>
              </div>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </CardContent>
            {/* Subtle gradient accent */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-red/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </Card>
        ))}
      </div>
    </section>
  );
}
