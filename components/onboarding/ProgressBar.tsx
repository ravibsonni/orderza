"use client";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const STEP_LABELS = [
  "Restaurant basics",
  "Upload menu",
  "Review menu",
  "Pricing setup",
  "Connect WhatsApp",
  "Setup bot",
  "Subscribe",
  "Go live!",
];

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const pct = Math.round(((currentStep - 1) / totalSteps) * 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-brand-green">
          Step {currentStep} of {totalSteps} — {STEP_LABELS[currentStep - 1]}
        </span>
        <span className="text-sm text-muted-foreground">{pct}% complete</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-green transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
