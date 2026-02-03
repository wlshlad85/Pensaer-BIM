"use client";

import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    q: "What API keys do I need?",
    a: "At minimum, you need an AI provider key (Anthropic, OpenAI, etc.) and a channel bot token (Discord, Telegram, etc.). The wizard will guide you through obtaining each one.",
  },
  {
    q: "Is my data sent anywhere?",
    a: "No. Clawhatch runs entirely in your browser and generates local configuration files. Your API keys and settings never leave your machine.",
  },
  {
    q: "Can I run Clawdbot without Docker?",
    a: "Yes! Clawdbot supports bare-metal Node.js installations. The wizard will detect your environment and provide appropriate instructions.",
  },
  {
    q: "How do I update Clawdbot after setup?",
    a: "If using Docker: `docker compose pull && docker compose up -d`. For bare metal: `git pull && npm install && npm run build`.",
  },
  {
    q: "What channels are supported?",
    a: "Discord, Telegram, WhatsApp (via WhatsApp Web), webchat, and more. Each channel has its own authentication flow covered in the wizard.",
  },
  {
    q: "Something broke during setup. What do I do?",
    a: "Check the browser console for errors. You can restart the wizard at any time — your progress is saved locally. For persistent issues, visit our GitHub Discussions.",
  },
  {
    q: "What's the difference between Free and Pro?",
    a: "Free gives you the full open-source Clawdbot. Pro adds pre-built Docker images, the automated wizard, and a 1-hour setup consultation. Support adds ongoing monthly assistance.",
  },
];

export default function TroubleshootingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-brand-red font-bold font-mono text-lg">
            🦞 Clawhatch
          </Link>
          <Link href="/wizard">
            <Button size="sm" className="bg-brand-red hover:bg-brand-red/90 text-white">
              Start Setup
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-2">Troubleshooting & FAQ</h1>
        <p className="text-muted-foreground mb-10">
          Common questions and fixes for setting up your AI assistant.
        </p>

        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border border-border rounded-lg bg-surface px-4">
              <AccordionTrigger className="text-left font-medium">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            Still stuck? Open an issue on GitHub or ask in Discord.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" className="border-border font-mono text-sm">
              GitHub Issues →
            </Button>
            <Button variant="outline" className="border-border font-mono text-sm">
              Discord Server →
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
