"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from "lucide-react";

interface Step5Props {
  restaurantId: string;
  onComplete: (xp: number) => void;
}

export function Step5Meta({ restaurantId, onComplete }: Step5Props) {
  const { toast } = useToast();
  const [guideOpen, setGuideOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; productCount?: number; metaUser?: string; error?: string } | null>(null);
  const [form, setForm] = useState({
    accessToken: "",
    phoneNumberId: "",
    wabaId: "",
    catalogId: "",
  });

  const handleConnect = async () => {
    if (!form.accessToken || !form.phoneNumberId || !form.wabaId || !form.catalogId) {
      toast({ title: "All four fields are required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/meta/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, error: data.error });
        return;
      }
      setResult({ success: true, productCount: data.productCount, metaUser: data.metaUser });
    } catch (err) {
      setResult({ success: false, error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const GUIDE_STEPS = [
    { icon: "1️⃣", text: "Go to business.facebook.com → Create or select your Business" },
    { icon: "2️⃣", text: "Go to WhatsApp → API Setup → Create App" },
    { icon: "3️⃣", text: "Add a phone number and verify it" },
    { icon: "4️⃣", text: "Create a Commerce Catalog and link it to your WhatsApp account" },
    { icon: "5️⃣", text: "Generate a System User permanent access token (Admin permissions)" },
    { icon: "6️⃣", text: "Copy the four values into the fields below" },
  ];

  return (
    <div className="space-y-6 animate-slide-in-right">
      <div className="text-center space-y-2">
        <div className="text-4xl">📱</div>
        <h2 className="text-2xl font-bold text-brand-green">Connect your WhatsApp</h2>
        <p className="text-muted-foreground">We use Meta's official WhatsApp API to set up your ordering catalogue.</p>
        <p className="text-xs text-muted-foreground">⏱ Takes about 5 minutes</p>
      </div>

      {/* Collapsible guide */}
      <div className="rounded-xl border bg-blue-50 border-blue-200 overflow-hidden">
        <button
          onClick={() => setGuideOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-blue-800 font-medium tap-target"
        >
          <span>ℹ️ How does this work?</span>
          {guideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {guideOpen && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-sm text-blue-700">
              You'll need a Meta Business account with WhatsApp Business API (Cloud API) enabled.
              Follow these steps — it takes about 5 minutes:
            </p>
            {GUIDE_STEPS.map((step) => (
              <div key={step.icon} className="flex gap-3 text-sm text-blue-800">
                <span className="shrink-0">{step.icon}</span>
                <span>{step.text}</span>
              </div>
            ))}
            <a
              href="https://business.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-blue-600 underline mt-1"
            >
              Open Meta Business Manager →
            </a>
          </div>
        )}
      </div>

      {/* Credentials form */}
      <div className="space-y-4">
        <div>
          <Label>Meta Access Token *</Label>
          <Input
            type="password"
            value={form.accessToken}
            onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
            placeholder="EAAxxxxxxxx..."
            className="mt-1 font-mono text-sm"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground mt-1">Permanent system user token from Meta Business Manager</p>
        </div>
        <div>
          <Label>Phone Number ID *</Label>
          <Input
            value={form.phoneNumberId}
            onChange={(e) => setForm((f) => ({ ...f, phoneNumberId: e.target.value }))}
            placeholder="12345678901234"
            className="mt-1 font-mono"
          />
        </div>
        <div>
          <Label>WhatsApp Business Account ID (WABA ID) *</Label>
          <Input
            value={form.wabaId}
            onChange={(e) => setForm((f) => ({ ...f, wabaId: e.target.value }))}
            placeholder="98765432109876"
            className="mt-1 font-mono"
          />
        </div>
        <div>
          <Label>Commerce Catalog ID *</Label>
          <Input
            value={form.catalogId}
            onChange={(e) => setForm((f) => ({ ...f, catalogId: e.target.value }))}
            placeholder="11122233344455"
            className="mt-1 font-mono"
          />
        </div>
      </div>

      {/* Result banner */}
      {result && (
        <div className={`rounded-xl p-4 flex gap-3 ${result.success ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div>
            {result.success ? (
              <>
                <p className="font-semibold text-emerald-800">✅ WhatsApp connected!</p>
                <p className="text-sm text-emerald-700">{result.productCount} items added to your catalogue. Connected as: {result.metaUser}</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-red-800">Connection failed</p>
                <p className="text-sm text-red-700">{result.error}</p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {!result?.success ? (
          <Button size="lg" className="w-full" onClick={handleConnect} disabled={loading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting & uploading catalogue...</>
            ) : (
              "Connect WhatsApp →"
            )}
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={() => onComplete(200)}>
            Continue — Set up bot →
          </Button>
        )}
      </div>
    </div>
  );
}
