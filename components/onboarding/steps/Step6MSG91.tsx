"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle, Copy, Check, ExternalLink } from "lucide-react";

interface Step6Props {
  restaurantId: string;
  onComplete: (xp: number) => void;
}

export function Step6MSG91({ restaurantId, onComplete }: Step6Props) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [setupResult, setSetupResult] = useState<{
    method: "auto" | "manual";
    prompt?: string;
    botId?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [botConfirmed, setBotConfirmed] = useState(false);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast({ title: "API key is required", variant: "destructive" });
      return;
    }
    setConnectLoading(true);
    try {
      const res = await fetch("/api/msg91/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConnected(true);
      setSetupResult({ method: data.method, prompt: data.prompt, botId: data.botId });
    } catch (err) {
      toast({ title: "Connection failed", description: String(err), variant: "destructive" });
    } finally {
      setConnectLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!setupResult?.prompt) return;
    await navigator.clipboard.writeText(setupResult.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleComplete = () => onComplete(200);

  return (
    <div className="space-y-6 animate-slide-in-right">
      <div className="text-center space-y-2">
        <div className="text-4xl">🤖</div>
        <h2 className="text-2xl font-bold text-brand-green">Set up your ordering bot</h2>
        <p className="text-muted-foreground">The bot handles conversations and orders on WhatsApp 24/7.</p>
        <p className="text-xs text-muted-foreground">⏱ Takes about 3 minutes</p>
      </div>

      {/* Part A — MSG91 Connection */}
      <div className={`rounded-xl border-2 p-4 space-y-3 transition-colors ${connected ? "border-emerald-300 bg-emerald-50" : "border-border"}`}>
        <div className="flex items-center gap-2">
          {connected && <CheckCircle className="w-5 h-5 text-emerald-600" />}
          <h3 className="font-semibold">Part A — Connect MSG91</h3>
        </div>

        {!connected ? (
          <>
            <p className="text-sm text-muted-foreground">
              Don't have MSG91?{" "}
              <a href="https://msg91.com" target="_blank" rel="noopener noreferrer" className="text-brand-green underline inline-flex items-center gap-1">
                Sign up at msg91.com <ExternalLink className="w-3 h-3" />
              </a>
              , enable WhatsApp Business API, and copy your API key.
            </p>
            <div>
              <Label>MSG91 API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your MSG91 authkey"
                className="mt-1 font-mono text-sm"
                autoComplete="off"
              />
            </div>
            <Button className="w-full" onClick={handleConnect} disabled={connectLoading}>
              {connectLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting & setting up bot...</>
              ) : (
                "Connect MSG91"
              )}
            </Button>
          </>
        ) : (
          <p className="text-sm text-emerald-700">✅ MSG91 connected successfully.</p>
        )}
      </div>

      {/* Part B — Bot setup result */}
      {setupResult && (
        <div className="space-y-4">
          {setupResult.method === "auto" ? (
            <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-emerald-800">✅ Bot configured automatically!</h3>
              </div>
              <p className="text-sm text-emerald-700 mt-1">
                Your AI ordering bot has been registered with MSG91. Bot ID: <code className="font-mono">{setupResult.botId}</code>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-4">
              <div>
                <h3 className="font-semibold text-amber-800">📋 Your Bot Prompt is Ready</h3>
                <p className="text-sm text-amber-700 mt-1">
                  MSG91 doesn't support automatic bot setup via API yet. Here's what to do:
                </p>
              </div>

              <ol className="space-y-2 text-sm text-amber-800">
                <li className="flex gap-2"><span className="font-bold">1.</span> Log in to your MSG91 dashboard</li>
                <li className="flex gap-2"><span className="font-bold">2.</span> Go to WhatsApp → Bots → Create New Bot</li>
                <li className="flex gap-2"><span className="font-bold">3.</span> Paste the prompt below</li>
              </ol>

              <div>
                <div className="rounded-lg border bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b bg-secondary">
                    <span className="text-xs font-medium text-muted-foreground">Your Bot Prompt</span>
                    <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 gap-1.5">
                      {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </Button>
                  </div>
                  <pre className="p-3 text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto font-mono leading-relaxed">
                    {setupResult.prompt}
                  </pre>
                </div>
              </div>

              <Button className="w-full" size="lg" variant="outline" onClick={handleCopy}>
                {copied ? <><Check className="w-4 h-4 mr-2" /> Copied to clipboard!</> : <><Copy className="w-4 h-4 mr-2" /> Copy prompt to clipboard</>}
              </Button>

              <div className="border-t border-amber-200 pt-3">
                <p className="text-sm text-amber-700 mb-2">Once pasted in MSG91, come back and click below:</p>
                <Button
                  className="w-full"
                  variant={botConfirmed ? "default" : "outline"}
                  onClick={() => setBotConfirmed(true)}
                >
                  {botConfirmed ? <><Check className="w-4 h-4 mr-2" /> Bot setup confirmed!</> : "✅ I've set up the bot — Continue"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Continue button */}
      {setupResult && (setupResult.method === "auto" || botConfirmed) && (
        <Button size="lg" className="w-full" onClick={handleComplete}>
          Continue — Choose your plan →
        </Button>
      )}
    </div>
  );
}
