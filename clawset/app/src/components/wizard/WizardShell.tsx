"use client";

import { ReactNode } from "react";
import { StepIndicator } from "./StepIndicator";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface WizardShellProps {
  currentStep: number;
  onNext?: () => void;
  onBack?: () => void;
  children: ReactNode;
}

export function WizardShell({ currentStep, onNext, onBack, children }: WizardShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-brand-red font-bold font-mono text-lg">
            🦞 Clawhatch
          </Link>
          <span className="text-xs font-mono text-muted-foreground">Setup Wizard</span>
        </div>
      </header>

      {/* Progress */}
      <div className="px-6 pt-8">
        <StepIndicator currentStep={currentStep} />
      </div>

      {/* Content */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-2xl mx-auto">{children}</div>
      </main>

      {/* Navigation */}
      <footer className="border-t border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={currentStep === 0}
            className="border-border"
          >
            ← Back
          </Button>
          <Button
            onClick={onNext}
            className="bg-brand-red hover:bg-brand-red/90 text-white"
          >
            {currentStep === 10 ? "Hatch! 🐣" : "Next →"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
