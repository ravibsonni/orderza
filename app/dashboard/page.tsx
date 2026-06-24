"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalyticsTab } from "@/components/dashboard/AnalyticsTab";
import { OrdersTab } from "@/components/dashboard/OrdersTab";
import { CatalogueTab } from "@/components/dashboard/CatalogueTab";
import { RidersTab } from "@/components/dashboard/RidersTab";
import { DiscountsTab } from "@/components/dashboard/DiscountsTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import { Loader2, BarChart2, ShoppingBag, UtensilsCrossed, Bike, Tag, Settings } from "lucide-react";

type Tab = "analytics" | "orders" | "catalogue" | "riders" | "discounts" | "settings";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "analytics", label: "Analytics", icon: <BarChart2 className="w-4 h-4" /> },
  { key: "orders", label: "Orders", icon: <ShoppingBag className="w-4 h-4" /> },
  { key: "catalogue", label: "Catalogue", icon: <UtensilsCrossed className="w-4 h-4" /> },
  { key: "riders", label: "Riders", icon: <Bike className="w-4 h-4" /> },
  { key: "discounts", label: "Discounts", icon: <Tag className="w-4 h-4" /> },
  { key: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
];

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("analytics");
  const [restaurantName, setRestaurantName] = useState("My Restaurant");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.redirect) { router.push(data.redirect); return; }
        setRestaurantName(data.restaurantName ?? "My Restaurant");
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>;
  }

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      {/* Top nav */}
      <header className="bg-brand-green text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-black text-xl">Orderza</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70 hidden sm:block">{restaurantName}</span>
            <button onClick={handleLogout} className="text-xs text-white/60 hover:text-white transition-colors tap-target px-2">Sign out</button>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="bg-white border-b sticky top-14 z-10">
        <div className="max-w-6xl mx-auto px-2 flex overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors tap-target ${
                activeTab === tab.key
                  ? "border-brand-green text-brand-green"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "orders" && <OrdersTab />}
        {activeTab === "catalogue" && <CatalogueTab />}
        {activeTab === "riders" && <RidersTab />}
        {activeTab === "discounts" && <DiscountsTab />}
        {activeTab === "settings" && <SettingsTab />}
      </main>
    </div>
  );
}
