/**
 * /app/(auth)/login/page.tsx
 *
 * ── 36BLOCKS AUTH INTEGRATION NOTE ──────────────────────────────────────
 * When 36blocks is live:
 *   1. Set DUMMY_AUTH_ENABLED=false in .env
 *   2. Add the 36blocks JS embed script to app/layout.tsx (see comment there)
 *   3. Replace the form below with the 36blocks login trigger
 *   4. After login, 36blocks redirects to /api/auth/callback with a JSON
 *      { user, company } payload (see the route handler for the shape)
 * ────────────────────────────────────────────────────────────────────────
 */

"use client";
import { useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    configuration?: unknown;
    initVerification?: (config: unknown) => void;
  }
}

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const isDummy = process.env.NEXT_PUBLIC_DUMMY_AUTH_ENABLED === "true";
  // 36Blocks / MSG91 proxy-auth widget reference id (public — safe in client).
  const referenceId =
    process.env.NEXT_PUBLIC_36BLOCKS_APP_ID || "117230c17829386726a457c304f7d8";

  const handleDummyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.redirected) {
        router.push(new URL(res.url).pathname + new URL(res.url).search);
      } else if (!res.ok) {
        throw new Error("Login failed");
      } else {
        // Follow the redirect from our JSON response
        const data = await res.json().catch(() => ({}));
        router.push(data.redirect ?? "/onboarding");
      }
    } catch (err) {
      toast({ title: "Login failed", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-green flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / wordmark */}
        <div className="text-center space-y-2">
          <div className="text-5xl font-black text-white tracking-tight">Orderza</div>
          <p className="text-brand-green-light/80 text-sm">From menu to WhatsApp orders — in minutes.</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-5">
          <div>
            <h1 className="text-xl font-bold text-brand-green">Welcome back 👋</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isDummy
                ? "Prototype mode — enter any email to continue."
                : "Sign in to your restaurant dashboard."}
            </p>
          </div>

          {isDummy ? (
            <form onSubmit={handleDummyLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@restaurant.ae"
                  className="mt-1"
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</> : "Sign in →"}
              </Button>
            </form>
          ) : (
            /* ── 36blocks / MSG91 proxy-auth widget ──
               On success MSG91 redirects the browser to the redirect URL
               configured in the 36blocks panel (/authenticate), which decrypts
               the payload and starts the session. */
            <div className="py-4">
              <div id={referenceId} className="min-h-[120px]" />
              <Script id="blocks36-config" strategy="afterInteractive">
                {`window.configuration = {
                    referenceId: ${JSON.stringify(referenceId)},
                    type: 'authorization',
                    success: function (data) { console.log('36blocks success', data); },
                    failure: function (error) { console.log('36blocks failure', error); },
                  };`}
              </Script>
              <Script
                src="https://proxy.msg91.com/assets/proxy-auth/proxy-auth.js"
                strategy="afterInteractive"
                onLoad={() => window.initVerification?.(window.configuration)}
              />
            </div>
          )}
        </div>

        <p className="text-center text-xs text-brand-green-light/60">
          New restaurant?{" "}
          <a href="/signup" className="text-brand-amber hover:underline">Create your account →</a>
        </p>
      </div>
    </div>
  );
}
