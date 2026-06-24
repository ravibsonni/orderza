"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { formatAED } from "@/lib/utils";

interface Discount {
  id: string;
  label: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  days_of_week: number[] | null;
  start_time: string | null;
  end_time: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  item_name?: string;
  price_label?: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DiscountsTab() {
  const { toast } = useToast();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [priceVariants, setPriceVariants] = useState<{ id: string; label: string; itemName: string; basePrice: number }[]>([]);
  const [form, setForm] = useState({
    priceVariantId: "",
    label: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: 10,
    daysOfWeek: [] as number[],
    startTime: "",
    endTime: "",
    validFrom: "",
    validUntil: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [discRes, priceRes] = await Promise.all([
      fetch("/api/dashboard/discounts"),
      fetch("/api/dashboard/price-variants"),
    ]);
    const [discData, priceData] = await Promise.all([discRes.json(), priceRes.json()]);
    setDiscounts(discData.discounts ?? []);
    setPriceVariants(priceData.variants ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day) ? f.daysOfWeek.filter((d) => d !== day) : [...f.daysOfWeek, day],
    }));
  };

  const handleSave = async () => {
    if (!form.priceVariantId) {
      toast({ title: "Select a menu item price variant", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Discount created!" });
      setShowAdd(false);
      fetchData();
    } catch (err) {
      toast({ title: "Failed to save discount", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/dashboard/discounts/${id}`, { method: "DELETE" });
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-green" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Time-Based Discounts</h3>
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Discount
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <h4 className="font-medium">New discount</h4>
          <div>
            <Label>Menu item price variant</Label>
            <select value={form.priceVariantId} onChange={(e) => setForm((f) => ({ ...f, priceVariantId: e.target.value }))} className="mt-1 w-full h-12 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select a price variant…</option>
              {priceVariants.map((v) => (
                <option key={v.id} value={v.id}>{v.itemName} — {v.label} ({formatAED(v.basePrice)})</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Discount label (optional)</Label>
            <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Happy Hour" className="mt-1" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>Type</Label>
              <select value={form.discountType} onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as "percentage" | "fixed" }))} className="mt-1 w-full h-12 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="percentage">Percentage %</option>
                <option value="fixed">Fixed AED</option>
              </select>
            </div>
            <div className="w-32">
              <Label>Value</Label>
              <Input type="number" value={form.discountValue} onChange={(e) => setForm((f) => ({ ...f, discountValue: Number(e.target.value) }))} className="mt-1" min={0} />
            </div>
          </div>
          <div>
            <Label>Days of week</Label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {DAY_NAMES.map((day, i) => (
                <button key={i} onClick={() => toggleDay(i)} className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${form.daysOfWeek.includes(i) ? "border-brand-green bg-brand-green text-white" : "border-border"}`}>{day}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start time</Label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>End time</Label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Valid from</Label>
              <Input type="date" value={form.validFrom} onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Valid until</Label>
              <Input type="date" value={form.validUntil} onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save discount"}</Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {discounts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No discounts yet. Add a time-based discount to boost sales during slow periods.</div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          {discounts.map((d) => (
            <div key={d.id} className="flex items-start gap-3 px-4 py-3 border-b last:border-b-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{d.label ?? `${d.discount_value}${d.discount_type === "percentage" ? "%" : " AED"} off`}</span>
                  <Badge variant={d.is_active ? "success" : "outline"}>{d.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {d.item_name && `${d.item_name} — ${d.price_label}`}
                  {d.days_of_week?.length ? ` · ${d.days_of_week.map((n) => DAY_NAMES[n]).join(", ")}` : ""}
                  {d.start_time && d.end_time ? ` · ${d.start_time}–${d.end_time}` : ""}
                </p>
              </div>
              <button onClick={() => handleDelete(d.id)} className="text-muted-foreground hover:text-destructive tap-target"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
