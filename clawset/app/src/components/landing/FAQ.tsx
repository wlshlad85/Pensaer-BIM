"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is Clawhatch?",
    a: "Clawhatch is the setup wizard for OpenClaw — the open-source AI assistant framework. It walks you through configuration, generates your workspace, and gets you running in minutes instead of hours.",
  },
  {
    q: "Do I need to pay to use Clawdbot?",
    a: "No. Clawdbot is fully open-source and free. The Free tier gives you complete documentation to set everything up yourself. The Pro tier ($39 one-time) automates the process and includes a pre-configured workspace. The Support tier ($19/mo) adds ongoing help.",
  },
  {
    q: "What API keys do I need?",
    a: "At minimum, you'll need an API key from an AI provider (Anthropic, OpenAI, etc.) and credentials for your chosen chat platform (Discord bot token, Telegram bot token, etc.). The wizard guides you through obtaining each one.",
  },
  {
    q: "Can I self-host everything?",
    a: "Absolutely. OpenClaw is designed for self-hosting. You can run it on any machine — a home server, VPS, or even a Raspberry Pi. The wizard generates Docker configs if you want containerized deployment.",
  },
  {
    q: "What channels are supported?",
    a: "Discord, Telegram, WhatsApp, Slack, and more. You can run multiple channels simultaneously from a single Clawdbot instance.",
  },
  {
    q: "What's the difference between Pro and Support?",
    a: "Pro is a one-time purchase that gives you automated setup scripts, a pre-built workspace, and initial support to get running. Support is a monthly subscription for ongoing help — configuration reviews, troubleshooting, priority feature requests, and monthly check-ins.",
  },
  {
    q: "Can I upgrade from Free to Pro later?",
    a: "Yes. You can start with the Free tier and upgrade anytime. Your existing configuration will be preserved.",
  },
];

export function FAQ() {
  return (
    <section className="px-6 py-20 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-2">
        Frequently Asked Questions
      </h2>
      <p className="text-muted-foreground text-center mb-12">
        Everything you need to know before getting started.
      </p>

      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-border">
            <AccordionTrigger className="text-left text-base hover:no-underline hover:text-brand-red transition-colors">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
