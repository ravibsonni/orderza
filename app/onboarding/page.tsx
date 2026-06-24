"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { XPCounter } from "@/components/onboarding/XPCounter";
import { StepDots } from "@/components/onboarding/StepDots";
import { Step1Basics } from "@/components/onboarding/steps/Step1Basics";
import { Step2Upload } from "@/components/onboarding/steps/Step2Upload";
import { Step3ReviewMenu } from "@/components/onboarding/steps/Step3ReviewMenu";
import { Step4Tax } from "@/components/onboarding/steps/Step4Tax";
import { Step5Meta } from "@/components/onboarding/steps/Step5Meta";
import { Step6MSG91 } from "@/components/onboarding/steps/Step6MSG91";
import { Step7Subscribe } from "@/components/onboarding/steps/Step7Subscribe";
import { Step8Celebrate } from "@/components/onboarding/steps/Step8Celebrate";
import type { ExtractedMenu } from "@/lib/ai/extract";
import { Loader2 } from "lucide-react";

interface OnboardingState {
  restaurantId: string;
  authUserId: string;
  email: string;
  restaurantName: string;
  whatsappNumber: string;
  currentStep: number;
  xp: number;
  completedSteps: number[];
  extractedMenu: ExtractedMenu | null;
}

const XP_PER_STEP: Record<number, number> = { 1: 50, 2: 100, 3: 150, 4: 75, 5: 200, 6: 200, 7: 100, 8: 0 };
const TOTAL_STEPS = 8;

export default function OnboardingPage() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [newXP, setNewXP] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/onboarding/state")
      .then((r) => r.json())
      .then((data) => {
        if (data.redirect) {
          router.push(data.redirect);
          return;
        }
        setState({
          restaurantId: data.restaurantId,
          authUserId: data.authUserId,
          email: data.email ?? "",
          restaurantName: data.restaurantName ?? "",
          whatsappNumber: data.whatsappNumber ?? "",
          currentStep: data.currentStep ?? 1,
          xp: data.xp ?? 0,
          completedSteps: data.completedSteps ?? [],
          extractedMenu: null,
        });
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleStepComplete = async (step: number, xpEarned: number, extras?: Partial<OnboardingState>) => {
    const nextStep = step + 1;
    setNewXP(xpEarned);

    // Persist step completion
    await fetch("/api/onboarding/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: nextStep, xpEarned }),
    });

    setState((prev) =>
      prev
        ? {
            ...prev,
            currentStep: Math.min(nextStep, TOTAL_STEPS),
            xp: prev.xp + xpEarned,
            completedSteps: [...prev.completedSteps, step],
            ...extras,
          }
        : prev
    );

    if (nextStep > TOTAL_STEPS) {
      router.push("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
      </div>
    );
  }

  if (!state) return null;

  const { currentStep, xp, completedSteps, restaurantId, email, restaurantName, whatsappNumber, extractedMenu } = state;

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-brand-green font-black text-xl">Orderza</span>
            <XPCounter xp={xp} newXP={newXP} />
          </div>
          <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />
          <div className="flex items-center justify-between">
            <StepDots totalSteps={TOTAL_STEPS} currentStep={currentStep} completedSteps={completedSteps} />
            <button
              onClick={async () => {
                await fetch("/api/onboarding/save-progress", { method: "POST" });
              }}
              className="text-xs text-muted-foreground hover:text-brand-green transition-colors"
            >
              Save & continue later
            </button>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {currentStep === 1 && (
          <Step1Basics
            email={email}
            restaurantId={restaurantId}
            onComplete={(xpEarned) => handleStepComplete(1, xpEarned)}
          />
        )}
        {currentStep === 2 && (
          <Step2Upload
            restaurantId={restaurantId}
            restaurantName={restaurantName}
            onComplete={(xpEarned, menu) =>
              handleStepComplete(2, xpEarned, { extractedMenu: menu })
            }
          />
        )}
        {currentStep === 3 && (
          <Step3ReviewMenu
            restaurantId={restaurantId}
            extractedMenu={extractedMenu ?? { categories: [], items: [], confidence: "low" }}
            onComplete={(xpEarned) => handleStepComplete(3, xpEarned)}
          />
        )}
        {currentStep === 4 && (
          <Step4Tax
            restaurantId={restaurantId}
            onComplete={(xpEarned) => handleStepComplete(4, xpEarned)}
          />
        )}
        {currentStep === 5 && (
          <Step5Meta
            restaurantId={restaurantId}
            onComplete={(xpEarned) => handleStepComplete(5, xpEarned)}
          />
        )}
        {currentStep === 6 && (
          <Step6MSG91
            restaurantId={restaurantId}
            onComplete={(xpEarned) => handleStepComplete(6, xpEarned)}
          />
        )}
        {currentStep === 7 && (
          <Step7Subscribe
            restaurantId={restaurantId}
            onComplete={(xpEarned) => handleStepComplete(7, xpEarned)}
          />
        )}
        {currentStep === 8 && (
          <Step8Celebrate
            restaurantId={restaurantId}
            restaurantName={restaurantName}
            whatsappNumber={whatsappNumber}
            totalXP={xp}
          />
        )}
      </div>
    </div>
  );
}
