"use client";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Download, Share2, Copy, Check, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Step8Props {
  restaurantId: string;
  restaurantName: string;
  whatsappNumber: string;
  totalXP: number;
}

export function Step8Celebrate({ restaurantId, restaurantName, whatsappNumber, totalXP }: Step8Props) {
  const { toast } = useToast();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [waLink, setWaLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [xpDisplay, setXpDisplay] = useState(0);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  useEffect(() => {
    // Confetti burst
    import("canvas-confetti").then(({ default: confetti }) => {
      const duration = 3000;
      const end = Date.now() + duration;
      const colors = ["#1B4332", "#EAB308", "#F59E0B", "#2D6A4F", "#FAFAF7"];

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    });

    // Animate XP counter
    const start = 0;
    const startTime = performance.now();
    const duration = 2000;
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setXpDisplay(Math.round(start + totalXP * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Generate QR code
    const phone = whatsappNumber.replace(/\D/g, "");
    const link = `https://wa.me/${phone}`;
    setWaLink(link);

    import("qrcode").then(({ default: QRCode }) => {
      QRCode.toDataURL(link, {
        width: 300,
        margin: 2,
        color: { dark: "#1B4332", light: "#FAFAF7" },
      }).then(setQrUrl);
    });
  }, [totalXP, whatsappNumber]);

  const handleDownloadQR = () => {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `${restaurantName.toLowerCase().replace(/\s+/g, "-")}-qr.png`;
    a.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Order from ${restaurantName} on WhatsApp`, url: waLink });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(waLink);
    setCopied(true);
    toast({ title: "WhatsApp link copied!", variant: "default" });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-8 animate-slide-in-right text-center">
      {/* Hidden canvas for confetti */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Trophy */}
      <div className="space-y-3">
        <div className="text-7xl animate-xp-pop">🏆</div>
        <h1 className="text-3xl font-bold text-brand-green">You're LIVE on WhatsApp! 🎉</h1>
        <p className="text-muted-foreground">
          {restaurantName} is now accepting WhatsApp orders around the clock.
        </p>
      </div>

      {/* XP summary */}
      <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-2xl p-6 space-y-2">
        <p className="text-muted-foreground text-sm">Total XP earned</p>
        <div className="text-5xl font-bold text-brand-gold tabular-nums">{xpDisplay.toLocaleString()}</div>
        <p className="text-brand-gold font-semibold">⭐ XP</p>
        <div className="mt-3 inline-flex items-center gap-2 bg-brand-gold/20 rounded-full px-4 py-2">
          <span className="text-xl">🏅</span>
          <span className="font-bold text-brand-gold text-sm">Badge unlocked: WhatsApp Restaurateur</span>
        </div>
      </div>

      {/* QR Code */}
      <div className="space-y-4">
        <h2 className="font-bold text-xl text-brand-green">Your ordering QR code</h2>
        <div className="flex justify-center">
          {qrUrl ? (
            <div className="rounded-2xl border-4 border-brand-green/20 p-3 bg-brand-cream shadow-lg">
              <img src={qrUrl} alt="WhatsApp QR Code" className="w-48 h-48" />
            </div>
          ) : (
            <div className="w-48 h-48 rounded-2xl bg-secondary animate-pulse" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Print this, stick it on your counter — customers scan to order instantly.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button variant="outline" onClick={handleDownloadQR} disabled={!qrUrl}>
            <Download className="w-4 h-4 mr-2" /> Download PNG
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
        </div>
      </div>

      {/* WhatsApp link */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="font-medium text-sm text-muted-foreground">Your WhatsApp ordering link</p>
        <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 min-w-0">
          <code className="text-sm flex-1 truncate text-brand-green">{waLink}</code>
          <button
            onClick={handleCopyLink}
            className="shrink-0 text-muted-foreground hover:text-brand-green transition-colors p-1"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <a href={waLink} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="w-full">Open in WhatsApp</Button>
        </a>
      </div>

      <Button size="lg" className="w-full" onClick={() => router.push("/dashboard")}>
        Go to my Dashboard <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
