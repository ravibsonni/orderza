"use client";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Trash2, Check } from "lucide-react";
import type { ExtractedMenu, ExtractedMenuItem } from "@/lib/ai/extract";

interface Step3Props {
  restaurantId: string;
  extractedMenu: ExtractedMenu;
  onComplete: (xp: number) => void;
}

interface LocalItem extends ExtractedMenuItem {
  id: string;
  isAvailable: boolean;
  saving?: boolean;
  saved?: boolean;
}

export function Step3ReviewMenu({ restaurantId, extractedMenu, onComplete }: Step3Props) {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState(extractedMenu.categories[0] ?? "General");
  const [categories, setCategories] = useState<string[]>(
    extractedMenu.categories.length > 0 ? extractedMenu.categories : ["General"]
  );
  const [items, setItems] = useState<LocalItem[]>(
    extractedMenu.items.map((item, i) => ({
      ...item,
      id: `temp-${i}`,
      isAvailable: true,
      category: item.category || "General",
    }))
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [submitting, setSubmitting] = useState(false);

  // Auto-save debounce
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await fetch("/api/onboarding/step3/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categories, items }),
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("idle");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [dirty, categories, items]);

  const markDirty = () => setDirty((d) => !d || true);

  const categoryItems = items.filter((i) => i.category === activeCategory);

  const updateItem = (id: string, updates: Partial<LocalItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
    markDirty();
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    markDirty();
  };

  const addItem = () => {
    const newItem: LocalItem = {
      id: `new-${Date.now()}`,
      name: "",
      category: activeCategory,
      variants: [{ label: "Regular", price: 0 }],
      isAvailable: true,
    };
    setItems((prev) => [...prev, newItem]);
    markDirty();
  };

  const addCategory = () => {
    const name = window.prompt("Category name:");
    if (!name?.trim()) return;
    setCategories((prev) => [...prev, name.trim()]);
    setActiveCategory(name.trim());
    markDirty();
  };

  const updateVariant = (itemId: string, variantIdx: number, field: string, value: string | number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id !== itemId
          ? item
          : {
              ...item,
              variants: item.variants.map((v, i) =>
                i === variantIdx ? { ...v, [field]: field === "price" ? Number(value) : value } : v
              ),
            }
      )
    );
    markDirty();
  };

  const addVariant = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id !== itemId
          ? item
          : { ...item, variants: [...item.variants, { label: "", price: 0 }] }
      )
    );
    markDirty();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/step3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories, items }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onComplete(150);
    } catch (err) {
      toast({ title: "Couldn't save menu", description: String(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-in-right">
      <div className="text-center space-y-2">
        <div className="text-4xl">✏️</div>
        <h2 className="text-2xl font-bold text-brand-green">Does this look right?</h2>
        <p className="text-muted-foreground">Our AI extracted your menu. Review and adjust — you can always edit later.</p>
        <p className="text-xs text-muted-foreground">⏱ Takes about 5 minutes</p>
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>}
          {saveStatus === "saved" && <><Check className="w-3 h-3 text-emerald-500" /> <span className="text-emerald-600">Saved</span></>}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors tap-target ${
              activeCategory === cat
                ? "bg-brand-green text-white"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {cat} ({items.filter((i) => i.category === cat).length})
          </button>
        ))}
        <button
          onClick={addCategory}
          className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border border-dashed border-brand-green/40 text-brand-green hover:bg-brand-green/5 tap-target"
        >
          + Add category
        </button>
      </div>

      {/* Item cards */}
      <div className="space-y-4">
        {categoryItems.map((item) => (
          <div key={item.id} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-2">
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  placeholder="Item name (English)"
                  className="font-medium"
                />
                <Input
                  value={item.nameAr ?? ""}
                  onChange={(e) => updateItem(item.id, { nameAr: e.target.value })}
                  placeholder="اسم العنصر (Arabic)"
                  dir="rtl"
                />
                <Input
                  value={item.description ?? ""}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  placeholder="Description"
                  className="text-sm"
                />
              </div>
              <button
                onClick={() => deleteItem(item.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-2 tap-target"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Price variants */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Price variants</Label>
              {item.variants.map((variant, vi) => (
                <div key={vi} className="flex gap-2">
                  <Input
                    value={variant.label}
                    onChange={(e) => updateVariant(item.id, vi, "label", e.target.value)}
                    placeholder="Label (e.g. Regular)"
                    className="text-sm"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-sm text-muted-foreground">AED</span>
                    <Input
                      type="number"
                      value={variant.price}
                      onChange={(e) => updateVariant(item.id, vi, "price", e.target.value)}
                      className="w-24 text-sm"
                      min={0}
                      step={0.5}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => addVariant(item.id)}
                className="text-sm text-brand-green hover:underline"
              >
                + Add size or variant
              </button>
            </div>

            {/* Available toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateItem(item.id, { isAvailable: !item.isAvailable })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${item.isAvailable ? "bg-emerald-500" : "bg-secondary"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.isAvailable ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className="text-sm">{item.isAvailable ? "Available" : "Unavailable"}</span>
            </div>
          </div>
        ))}

        <button
          onClick={addItem}
          className="w-full py-3 border-2 border-dashed border-brand-green/30 rounded-xl text-brand-green text-sm font-medium hover:bg-brand-green/5 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-1" /> Add item to {activeCategory}
        </button>
      </div>

      <Button size="lg" className="w-full" onClick={handleSubmit} disabled={submitting}>
        {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving menu...</> : "Menu looks good — Continue →"}
      </Button>
    </div>
  );
}
