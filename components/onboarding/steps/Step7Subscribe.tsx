"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Check } from "lucide-react";

interface Step7Props {
  restaurantId: string;
  onComplete: (xp: number) => void;
}

const FEATURES = [
  "Unlimited orders",
  "WhatsApp catalogue",
  "AI ordering bot",
  "Live rider tracking",
  "Analytics dashboard",
];

export function Step7Subscribe({ restaurantId, onComplete }: Step7Props) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      toast({ title: "Checkout failed", description: String(err), variant: "destructive" });
      setLoading(false);
    }
  };

  const plans = [
    {
      key: "monthly" as const,
      name: "Monthly",
      price: "AED 149",
      period: "/month",
      note: null,
      recommended: false,
    },
    {
      key: "annual" as const,
      name: "Annual",
      price: "AED 1,490",
      period: "/year",
      note: "Save AED 298 — 2 months free!",
      recommended: true,
    },
  ];

  return (
    <div className="space-y-6 animate-slide-in-right">
      <div className="text-center space-y-2">
        <div className="text-4xl">🚀</div>
        <h2 className="text-2xl font-bold text-brand-green">Almost there! Choose your plan</h2>
        <p className="text-muted-foreground">Start taking WhatsApp orders today.</p>
        <p className="text-xs text-muted-foreground">⏱ Takes about 2 minutes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <button
            key={plan.key}
            onClick={() => setSelected(plan.key)}
            className={`relative rounded-2xl border-2 p-5 text-left transition-all ${
              selected === plan.key
                ? "border-brand-green bg-brand-green/5"
                : "border-border hover:border-brand-green/40"
            }`}
          >
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="gold" className="text-xs px-3 py-0.5 shadow-sm">⭐ RECOMMENDED</Badge>
              </div>
            )}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg">{plan.name}</span>
                {selected === plan.key && <Check className="w-5 h-5 text-brand-green" />}
              </div>
              <div className="text-2xl font-bold text-brand-green">
                {plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
              </div>
              {plan.note && <p className="text-sm text-brand-amber font-medium mt-1">{plan.note}</p>}
            </div>
            <ul className="space-y-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <div className="bg-secondary rounded-xl p-4 text-sm text-muted-foreground text-center">
        🔒 Secure payment via Stripe. Cancel anytime. No setup fees.
      </div>

      <Button size="lg" className="w-full" onClick={handleSubscribe} disabled={loading}>
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to Stripe...</>
        ) : (
          `Subscribe — ${selected === "annual" ? "AED 1,490/year" : "AED 149/month"} →`
        )}
      </Button>
    </div>
  );
}
