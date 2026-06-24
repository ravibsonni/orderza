"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface Step4Props {
  restaurantId: string;
  onComplete: (xp: number) => void;
}

export function Step4Tax({ restaurantId, onComplete }: Step4Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    hasTax: true,
    taxName: "VAT",
    taxRate: 5,
    taxInclusive: false,
    hasDeliveryFee: false,
    deliveryFee: 0,
    hasDeliveryMarkup: false,
    deliveryMarkupType: "percentage" as "percentage" | "fixed",
    deliveryMarkupValue: 15,
  });

  const previewDeliveryPrice = (basePrice: number = 25) => {
    if (!form.hasDeliveryMarkup) return basePrice;
    if (form.deliveryMarkupType === "percentage") {
      return basePrice * (1 + form.deliveryMarkupValue / 100);
    }
    return basePrice + form.deliveryMarkupValue;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/step4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onComplete(75);
    } catch (err) {
      toast({ title: "Couldn't save pricing config", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const ToggleCard = ({
    id, label, hint, checked, onChange, children,
  }: {
    id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode;
  }) => (
    <div className={`rounded-xl border-2 transition-colors p-4 space-y-3 ${checked ? "border-brand-green bg-brand-green/5" : "border-border"}`}>
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
        <div
          onClick={() => onChange(!checked)}
          className={`mt-0.5 relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-brand-green" : "bg-secondary"}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
        </div>
        <div>
          <p className="font-medium">{label}</p>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>
      </label>
      {checked && children}
    </div>
  );

  return (
    <div className="space-y-6 animate-slide-in-right">
      <div className="text-center space-y-2">
        <div className="text-4xl">💰</div>
        <h2 className="text-2xl font-bold text-brand-green">How does your pricing work?</h2>
        <p className="text-muted-foreground">We'll apply this to all your menu prices automatically.</p>
        <p className="text-xs text-muted-foreground">⏱ Takes about 2 minutes</p>
      </div>

      <div className="space-y-4">
        <ToggleCard
          id="has-tax"
          label="Do you charge VAT or other taxes?"
          hint="UAE standard is 5% VAT"
          checked={form.hasTax}
          onChange={(v) => setForm((f) => ({ ...f, hasTax: v }))}
        >
          <div className="space-y-3 pt-1">
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Tax name</Label>
                <Input value={form.taxName} onChange={(e) => setForm((f) => ({ ...f, taxName: e.target.value }))} className="mt-1" />
              </div>
              <div className="w-28">
                <Label>Rate %</Label>
                <Input type="number" value={form.taxRate} onChange={(e) => setForm((f) => ({ ...f, taxRate: Number(e.target.value) }))} className="mt-1" min={0} max={100} step={0.5} />
              </div>
            </div>
            <div className="flex gap-2">
              {(["Inclusive", "Exclusive"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setForm((f) => ({ ...f, taxInclusive: type === "Inclusive" }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                    (type === "Inclusive") === form.taxInclusive
                      ? "border-brand-green bg-brand-green text-white"
                      : "border-border"
                  }`}
                >
                  {type}
                  <p className="text-xs font-normal opacity-75">
                    {type === "Inclusive" ? "Price includes tax" : "Tax added on top"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </ToggleCard>

        <ToggleCard
          id="has-delivery-fee"
          label="Do you charge a delivery fee?"
          checked={form.hasDeliveryFee}
          onChange={(v) => setForm((f) => ({ ...f, hasDeliveryFee: v }))}
        >
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-muted-foreground">AED</span>
            <Input
              type="number"
              value={form.deliveryFee}
              onChange={(e) => setForm((f) => ({ ...f, deliveryFee: Number(e.target.value) }))}
              className="w-32"
              min={0}
              step={0.5}
            />
          </div>
        </ToggleCard>

        <ToggleCard
          id="has-markup"
          label="Do you add a markup for delivery orders?"
          hint="Charge slightly more for delivery vs. dine-in"
          checked={form.hasDeliveryMarkup}
          onChange={(v) => setForm((f) => ({ ...f, hasDeliveryMarkup: v }))}
        >
          <div className="space-y-3 pt-1">
            <div className="flex gap-2">
              {(["percentage", "fixed"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setForm((f) => ({ ...f, deliveryMarkupType: type }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                    form.deliveryMarkupType === type ? "border-brand-green bg-brand-green text-white" : "border-border"
                  }`}
                >
                  {type === "percentage" ? "Percentage %" : "Fixed AED"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={form.deliveryMarkupValue}
                onChange={(e) => setForm((f) => ({ ...f, deliveryMarkupValue: Number(e.target.value) }))}
                className="w-32"
                min={0}
                step={form.deliveryMarkupType === "percentage" ? 1 : 0.5}
              />
              <span className="text-sm text-muted-foreground">{form.deliveryMarkupType === "percentage" ? "%" : "AED"}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <span className="text-amber-800">Preview: </span>
              <span className="text-amber-900">Your AED 25.00 item becomes <strong>AED {previewDeliveryPrice(25).toFixed(2)}</strong> for delivery</span>
            </div>
          </div>
        </ToggleCard>
      </div>

      <Button size="lg" className="w-full" onClick={handleSubmit} disabled={loading}>
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Pricing set — Connect WhatsApp →"}
      </Button>
    </div>
  );
}
