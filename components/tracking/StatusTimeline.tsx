"use client";

type Status = "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered";

interface Props { status: Status }

const STEPS: { key: Status; label: string; icon: string }[] = [
  { key: "confirmed", label: "Order confirmed", icon: "✅" },
  { key: "preparing", label: "Being prepared", icon: "👨‍🍳" },
  { key: "ready", label: "Ready for pickup", icon: "📦" },
  { key: "out_for_delivery", label: "On the way", icon: "🛵" },
  { key: "delivered", label: "Delivered!", icon: "🎉" },
];

const ORDER: Status[] = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"];

export function StatusTimeline({ status }: Props) {
  const currentIdx = ORDER.indexOf(status);

  return (
    <div className="space-y-3">
      {STEPS.map((step, i) => {
        const stepIdx = ORDER.indexOf(step.key);
        const isDone = stepIdx <= currentIdx;
        const isCurrent = stepIdx === currentIdx;

        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 transition-all ${isDone ? "bg-brand-green" : "bg-secondary"} ${isCurrent ? "ring-2 ring-brand-green ring-offset-2" : ""}`}>
              {isDone ? step.icon : <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
            </div>
            <div>
              <p className={`font-medium text-sm ${isDone ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
