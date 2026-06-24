"use client";
import { Check } from "lucide-react";

interface StepDotsProps {
  totalSteps: number;
  currentStep: number;
  completedSteps: number[];
}

export function StepDots({ totalSteps, currentStep, completedSteps }: StepDotsProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = completedSteps.includes(step);
        const isCurrent = step === currentStep;

        return (
          <div
            key={step}
            className={`
              flex items-center justify-center rounded-full transition-all duration-300
              ${isCompleted
                ? "w-6 h-6 bg-brand-green text-white"
                : isCurrent
                ? "w-6 h-6 bg-brand-green/20 border-2 border-brand-green animate-pulse-dot"
                : "w-4 h-4 bg-secondary border border-border"
              }
            `}
          >
            {isCompleted && <Check className="w-3 h-3" />}
            {isCurrent && (
              <span className="text-[10px] font-bold text-brand-green">{step}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
