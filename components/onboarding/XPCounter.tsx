"use client";
import { useEffect, useState } from "react";

interface XPCounterProps {
  xp: number;
  newXP?: number;
  label?: string;
}

export function XPCounter({ xp, newXP, label }: XPCounterProps) {
  const [displayed, setDisplayed] = useState(xp - (newXP ?? 0));
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!newXP) return;
    setAnimating(true);
    const start = xp - newXP;
    const end = xp;
    const duration = 1200;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
      else setAnimating(false);
    }

    requestAnimationFrame(tick);
  }, [xp, newXP]);

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 bg-brand-gold/10 border border-brand-gold/30 rounded-full px-3 py-1 ${animating ? "animate-xp-pop" : ""}`}>
        <span className="text-brand-gold text-lg">⭐</span>
        <span className="font-bold text-brand-gold tabular-nums">{displayed.toLocaleString()} XP</span>
      </div>
      {newXP && animating && (
        <span className="text-brand-gold font-bold text-sm animate-count-up">+{newXP} XP</span>
      )}
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}
