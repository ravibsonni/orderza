"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Eye, EyeOff, Download, Copy, Check, ExternalLink } from "lucide-react";

interface Settings {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  logo_url: string | null;
  whatsapp_number: string | null;
  meta_phone_number_id: string | null;
  meta_waba_id: string | null;
  meta_connected_at: string | null;
  msg91_connected_at: string | null;
  msg91_bot_setup_method: string | null;
  msg91_bot_prompt: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
  plan_status: string | null;
  slug: string;
}

export function SettingsTab() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/settings")
      .then((r) => r.json())
      .then((d) => { setSettings(d.settings); setLoading(false); });

    // Generate QR
    if (settings?.whatsapp_number) {
      const phone = settings.whatsapp_number.replace(/\D/g, "");
      import("qrcode").then(({ default: QRCode }) => {
        QRCode.toDataURL(`https://wa.me/${phone}`, { width: 200, color: { dark: "#1B4332", light: "#FAFAF7" } }).then(setQrUrl);
      });
    }
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: settings.name, phone: settings.phone, address: settings.address, city: settings.city }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Settings saved!" });
    } catch (err) {
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!settings?.msg91_bot_prompt) return;
    await navigator.clipboard.writeText(settings.msg91_bot_prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleManageBilling = async () => {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const handleDownloadQR = () => {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `${settings?.slug ?? "orderza"}-qr.png`;
    a.click();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-green" /></div>;
  if (!settings) return null;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-secondary">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );

  return (
    <div className="space-y-4 max-w-2xl">
      <Section title="Restaurant Profile">
        <div>
          <Label>Restaurant name</Label>
          <Input value={settings.name} onChange={(e) => setSettings((s) => s && { ...s, name: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={settings.phone ?? ""} onChange={(e) => setSettings((s) => s && { ...s, phone: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label>Address</Label>
          <Input value={settings.address ?? ""} onChange={(e) => setSettings((s) => s && { ...s, address: e.target.value })} className="mt-1" />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save changes"}
        </Button>
      </Section>

      <Section title="Meta (WhatsApp) Connection">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone Number ID</span>
            <span className="font-mono">{settings.meta_phone_number_id ?? "Not connected"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">WABA ID</span>
            <span className="font-mono">{settings.meta_waba_id ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Access Token</span>
            <span className="font-mono text-muted-foreground">••••••••</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={settings.meta_connected_at ? "success" : "outline"}>
              {settings.meta_connected_at ? "Connected" : "Not connected"}
            </Badge>
          </div>
        </div>
      </Section>

      <Section title="MSG91 Bot">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">API Key</span>
            <span className="font-mono text-muted-foreground">••••••••</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Bot setup</span>
            <Badge variant={settings.msg91_bot_setup_method === "auto" ? "success" : "warning"}>
              {settings.msg91_bot_setup_method === "auto" ? "Auto ✅" : "Manual ⚠️"}
            </Badge>
          </div>
        </div>
        {settings.msg91_bot_prompt && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowPrompt((v) => !v)}>
                {showPrompt ? <><EyeOff className="w-3 h-3 mr-1.5" /> Hide</> : <><Eye className="w-3 h-3 mr-1.5" /> View Prompt</>}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCopyPrompt}>
                {copiedPrompt ? <><Check className="w-3 h-3 mr-1.5" /> Copied!</> : <><Copy className="w-3 h-3 mr-1.5" /> Copy Prompt</>}
              </Button>
            </div>
            {showPrompt && (
              <pre className="rounded-lg border p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto bg-secondary text-muted-foreground">
                {settings.msg91_bot_prompt}
              </pre>
            )}
          </div>
        )}
      </Section>

      <Section title="Billing">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium capitalize">{settings.plan ?? "No plan"}</p>
            <Badge variant={settings.plan_status === "active" ? "success" : "warning"} className="mt-1">
              {settings.plan_status ?? "Unknown"}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={handleManageBilling}>
            <ExternalLink className="w-3 h-3 mr-1.5" /> Manage billing
          </Button>
        </div>
      </Section>

      <Section title="QR Code">
        <div className="flex flex-col items-center gap-3">
          {qrUrl ? (
            <img src={qrUrl} alt="QR Code" className="w-40 h-40 rounded-xl border-4 border-brand-green/20" />
          ) : (
            <div className="w-40 h-40 rounded-xl bg-secondary animate-pulse" />
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadQR} disabled={!qrUrl}>
              <Download className="w-3 h-3 mr-1.5" /> Download
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
