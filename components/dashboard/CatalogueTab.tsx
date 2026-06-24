"use client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Edit2, Copy, Check, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { formatAED } from "@/lib/utils";

interface Price {
  id: string;
  label: string;
  base_price: number;
  delivery_price: number | null;
  takeaway_price: number | null;
  dine_in_price: number | null;
  is_active: boolean;
  is_default: boolean;
  meta_variant_id: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  image_url: string | null;
  is_available: boolean;
  category_id: string;
  menu_item_prices: Price[];
}

interface Category {
  id: string;
  name: string;
  items: MenuItem[];
}

export function CatalogueTab() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [botPrompt, setBotPrompt] = useState<string | null>(null);
  const [botMethod, setBotMethod] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const fetchCatalogue = useCallback(async () => {
    const res = await fetch("/api/dashboard/catalogue");
    const data = await res.json();
    setCategories(data.categories ?? []);
    setLoading(false);
    setLastSynced(data.lastSynced ?? null);
    setBotPrompt(data.botPrompt ?? null);
    setBotMethod(data.botMethod ?? null);
  }, []);

  useEffect(() => { fetchCatalogue(); }, [fetchCatalogue]);

  const handleToggleAvailability = async (item: MenuItem) => {
    setToggleLoading(item.id);
    try {
      const res = await fetch("/api/meta/catalogue/item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuItemId: item.id, action: "toggle_availability", isAvailable: !item.is_available }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetchCatalogue();
    } catch (err) {
      toast({ title: "Toggle failed", description: String(err), variant: "destructive" });
    } finally {
      setToggleLoading(null);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch("/api/meta/catalogue/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: `Synced: ${data.created} created, ${data.updated} updated, ${data.deleted} deleted` });
      setLastSynced(new Date().toISOString());
    } catch (err) {
      toast({ title: "Sync failed", description: String(err), variant: "destructive" });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!botPrompt) return;
    await navigator.clipboard.writeText(botPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-green" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncLoading}>
          {syncLoading ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Syncing...</> : <><RefreshCw className="w-3 h-3 mr-1.5" /> Sync to WhatsApp</>}
        </Button>
        {lastSynced && <span className="text-xs text-muted-foreground">Last synced: {new Date(lastSynced).toLocaleTimeString()}</span>}
      </div>

      {/* Categories */}
      {categories.map((cat) => (
        <div key={cat.id} className="rounded-xl border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-secondary">
            <h3 className="font-semibold">{cat.name} <span className="text-muted-foreground font-normal text-sm">({cat.items.length} items)</span></h3>
          </div>
          <div className="divide-y">
            {cat.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-secondary shrink-0 flex items-center justify-center text-xl">🍽️</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.menu_item_prices.filter((p) => p.is_active).map((p) =>
                      `${p.label} — ${formatAED(p.base_price)}`
                    ).join(" / ")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {toggleLoading === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brand-green" />
                  ) : (
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.is_available ? "bg-emerald-500" : "bg-secondary border border-border"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${item.is_available ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  )}
                  <Badge variant={item.is_available ? "success" : "outline"} className="text-xs hidden sm:flex">
                    {item.is_available ? "Available" : "Unavailable"}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => setEditingItem(item)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 border-t">
            <button className="text-sm text-brand-green hover:underline">
              <Plus className="w-3 h-3 inline mr-1" /> Add item to {cat.name}
            </button>
          </div>
        </div>
      ))}

      {/* Bot prompt card */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <button onClick={() => setPromptOpen((v) => !v)} className="w-full flex items-center justify-between tap-target">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <span className="font-semibold">WhatsApp Bot Prompt</span>
            <Badge variant={botMethod === "auto" ? "success" : "warning"}>
              {botMethod === "auto" ? "Auto ✅" : "Manual ⚠️"}
            </Badge>
          </div>
          {promptOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {promptOpen && botPrompt && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              If you update your menu significantly, re-generate and re-paste your bot prompt in MSG91.
            </p>
            <div className="rounded-lg border overflow-hidden">
              <pre className="p-3 text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto font-mono leading-relaxed bg-secondary">{botPrompt}</pre>
            </div>
            <Button size="sm" variant="outline" onClick={handleCopyPrompt}>
              {copiedPrompt ? <><Check className="w-3 h-3 mr-1.5" /> Copied!</> : <><Copy className="w-3 h-3 mr-1.5" /> Copy Prompt</>}
            </Button>
          </div>
        )}
      </div>

      {/* Edit item drawer — simplified inline form */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setEditingItem(null)} />
          <div className="w-full max-w-md bg-card border-l shadow-xl overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Edit item</h3>
              <button onClick={() => setEditingItem(null)} className="tap-target text-muted-foreground">✕</button>
            </div>
            <div>
              <Label>Name (English)</Label>
              <Input value={editingItem.name} onChange={(e) => setEditingItem((i) => i && { ...i, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Name (Arabic)</Label>
              <Input value={editingItem.name_ar ?? ""} onChange={(e) => setEditingItem((i) => i && { ...i, name_ar: e.target.value })} dir="rtl" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={editingItem.description ?? ""} onChange={(e) => setEditingItem((i) => i && { ...i, description: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="mb-2 block">Price Variants</Label>
              <div className="space-y-2">
                {editingItem.menu_item_prices.filter((p) => p.is_active).map((price) => (
                  <div key={price.id} className="grid grid-cols-2 gap-2">
                    <Input value={price.label} readOnly className="bg-secondary text-sm" />
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">AED</span>
                      <Input type="number" defaultValue={price.base_price} className="text-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={async () => {
                try {
                  const res = await fetch("/api/meta/catalogue/item", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ menuItemId: editingItem.id, action: "upsert", ...editingItem, prices: editingItem.menu_item_prices }),
                  });
                  if (!res.ok) throw new Error((await res.json()).error);
                  const result = await res.json();
                  toast({ title: result.metaSyncError ? "Saved locally — WhatsApp sync failed" : "✅ Updated on WhatsApp catalogue", variant: result.metaSyncError ? "destructive" : "default" });
                  fetchCatalogue();
                  setEditingItem(null);
                } catch (err) {
                  toast({ title: "Save failed", description: String(err), variant: "destructive" });
                }
              }}>Save changes</Button>
              <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
