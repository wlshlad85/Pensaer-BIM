"use client";

const STEPS = [
  "Welcome",
  "OS",
  "Channels",
  "Model",
  "Persona",
  "API Keys",
  "Security",
  "Workspace",
  "Config",
  "Download",
  "Success",
];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Progress bar */}
      <div className="relative h-1 bg-muted rounded-full mb-6 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-red to-brand-purple rounded-full transition-all duration-500"
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step labels */}
      <div className="hidden md:flex justify-between text-xs font-mono">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={`flex flex-col items-center gap-1.5 transition-colors ${
              i <= currentStep ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                i < currentStep
                  ? "bg-brand-red border-brand-red text-white"
                  : i === currentStep
                  ? "border-brand-red text-brand-red"
                  : "border-muted-foreground/30"
              }`}
            >
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span className="hidden lg:block">{step}</span>
          </div>
        ))}
      </div>

      {/* Mobile: show current step */}
      <div className="md:hidden text-center font-mono text-sm text-muted-foreground">
        Step {currentStep + 1} of {STEPS.length}:{" "}
        <span className="text-foreground">{STEPS[currentStep]}</span>
      </div>
    </div>
  );
}
