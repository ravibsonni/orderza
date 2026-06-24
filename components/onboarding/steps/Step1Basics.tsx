"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload, Store } from "lucide-react";
import { slugify } from "@/lib/utils";

interface Step1Props {
  email: string;
  restaurantId: string;
  onComplete: (xp: number) => void;
}

const UAE_CITIES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"];

export function Step1Basics({ email, restaurantId, onComplete }: Step1Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    whatsappNumber: "+971",
    address: "",
    city: "Dubai",
    email,
    slug: "",
  });

  const handleNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, slug: slugify(name) }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Restaurant name is required", variant: "destructive" });
      return;
    }
    if (!form.whatsappNumber.match(/^\+\d{7,15}$/)) {
      toast({ title: "Enter a valid WhatsApp number in E.164 format (e.g. +971501234567)", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const res = await fetch("/api/onboarding/step1", {
        method: "POST",
        body: JSON.stringify({ ...form }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onComplete(50);
    } catch (err) {
      toast({ title: "Couldn't save. Please try again.", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-slide-in-right">
      <div className="text-center space-y-2">
        <div className="text-4xl">🍽️</div>
        <h2 className="text-2xl font-bold text-brand-green">Let's set the stage</h2>
        <p className="text-muted-foreground">Tell us about your restaurant — this appears on your WhatsApp ordering page.</p>
        <p className="text-xs text-muted-foreground">⏱ Takes about 2 minutes</p>
      </div>

      {/* Logo Upload */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="w-24 h-24 rounded-full object-cover border-4 border-brand-green/20" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-secondary border-2 border-dashed border-brand-green/30 flex items-center justify-center">
              <Store className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <label className="absolute bottom-0 right-0 bg-brand-green text-white rounded-full p-1.5 cursor-pointer tap-target flex items-center justify-center">
            <Upload className="w-4 h-4" />
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </label>
        </div>
        <p className="text-sm text-muted-foreground">Upload your logo</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Restaurant name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Al Baik Dubai"
            className="mt-1 text-lg"
            required
          />
        </div>

        <div>
          <Label htmlFor="slug">Your ordering URL</Label>
          <div className="flex items-center mt-1 rounded-md border border-input overflow-hidden">
            <span className="px-3 py-3 bg-secondary text-muted-foreground text-sm whitespace-nowrap">orderza.app/r/</span>
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
              className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="whatsapp">WhatsApp ordering number * 🇦🇪</Label>
          <Input
            id="whatsapp"
            value={form.whatsappNumber}
            onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
            placeholder="+971501234567"
            className="mt-1"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">Include country code, e.g. +971501234567</p>
        </div>

        <div>
          <Label htmlFor="city">City</Label>
          <select
            id="city"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            className="mt-1 flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {UAE_CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Street, building, area"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="email">Your email</Label>
          <Input id="email" value={form.email} disabled className="mt-1 bg-secondary" />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Continue — Set up my menu →"}
      </Button>
    </form>
  );
}
