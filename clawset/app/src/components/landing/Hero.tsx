"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center px-6 pt-32 pb-20 text-center">
      {/* Glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-red/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-red/20 bg-brand-red/5 text-brand-red text-sm font-mono">
          <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
          v1.0 — Now Available
        </div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
          Hatch Your AI Assistant
          <br />
          <span className="text-brand-red">in Minutes</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Clawhatch walks you through every step — API keys, providers, channels,
          and deployment. Configure, generate, launch. No terminal wizardry required.
        </p>

        <div className="flex items-center justify-center gap-4 pt-4">
          <Link href="/wizard">
            <Button size="lg" className="bg-brand-red hover:bg-brand-red/90 text-white font-semibold px-8">
              Start Setup →
            </Button>
          </Link>
          <Link href="/troubleshooting">
            <Button size="lg" variant="outline" className="border-border hover:bg-surface">
              Troubleshooting
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground pt-2 font-mono">
          $ npx clawhatch init <span className="text-brand-teal">--guided</span>
        </p>
      </div>
    </section>
  );
}
