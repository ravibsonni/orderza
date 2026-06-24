"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-brand-green flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl font-black text-white tracking-tight">Orderza</div>
          <p className="text-brand-green-light/80 text-sm">From menu to WhatsApp orders — in minutes.</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-5">
          <div>
            <h1 className="text-xl font-bold text-brand-green">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Set up your restaurant in under 10 minutes.
            </p>
          </div>
          {/* 
           * 36BLOCKS SIGNUP WIDGET
           * When 36blocks is live, place their signup embed widget here.
           * It will redirect to /api/auth/callback upon completion.
           */}
          <div id="blocks36-signup-widget">
            <Link href="/login">
              <Button size="lg" className="w-full">Continue with prototype login →</Button>
            </Link>
          </div>
        </div>
        <p className="text-center text-xs text-brand-green-light/60">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-amber hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
