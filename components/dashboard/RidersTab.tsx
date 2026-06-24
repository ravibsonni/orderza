"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, UserCheck, UserX } from "lucide-react";

interface Rider {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  active_deliveries?: number;
}

export function RidersTab() {
  const { toast } = useToast();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "+971" });
  const [adding, setAdding] = useState(false);

  const fetchRiders = async () => {
    setLoading(true);
    const res = await fetch("/api/dashboard/riders");
    const data = await res.json();
    setRiders(data.riders ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRiders(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.phone.match(/^\+\d{7,15}$/)) {
      toast({ title: "Name and valid phone (E.164) required", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/dashboard/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: "Rider added!" });
      setForm({ name: "", phone: "+971" });
      setShowAdd(false);
      fetchRiders();
    } catch (err) {
      toast({ title: "Failed to add rider", description: String(err), variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (rider: Rider) => {
    await fetch(`/api/dashboard/riders/${rider.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !rider.is_active }),
    });
    fetchRiders();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-green" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Delivery Riders</h3>
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Rider
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h4 className="font-medium">Add new rider</h4>
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" placeholder="Rider name" />
          </div>
          <div>
            <Label>WhatsApp number</Label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="mt-1" placeholder="+971501234567" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add rider"}
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {riders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No riders yet. Add your first delivery rider above.</div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          {riders.map((rider) => (
            <div key={rider.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${rider.is_active ? "bg-brand-green" : "bg-muted-foreground"}`}>
                {rider.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{rider.name}</p>
                <p className="text-sm text-muted-foreground font-mono">{rider.phone}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {rider.active_deliveries ? (
                  <Badge variant="amber">{rider.active_deliveries} active</Badge>
                ) : null}
                <Badge variant={rider.is_active ? "success" : "outline"}>
                  {rider.is_active ? "Active" : "Inactive"}
                </Badge>
                <button onClick={() => toggleActive(rider)} className="text-muted-foreground hover:text-foreground tap-target">
                  {rider.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
