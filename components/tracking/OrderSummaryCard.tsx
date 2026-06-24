"use client";
import { formatAED } from "@/lib/utils";

interface OrderItem { name: string; quantity: number; price_label: string }

interface Props {
  orderNumber: string;
  restaurantName: string;
  restaurantLogoUrl: string | null;
  items: OrderItem[];
}

export function OrderSummaryCard({ orderNumber, restaurantName, restaurantLogoUrl, items }: Props) {
  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        {restaurantLogoUrl ? (
          <img src={restaurantLogoUrl} alt={restaurantName} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-brand-green/10 flex items-center justify-center text-2xl">🍽️</div>
        )}
        <div>
          <p className="font-bold text-brand-green">{restaurantName}</p>
          <p className="text-sm text-muted-foreground">Order #{orderNumber}</p>
        </div>
      </div>
      <div className="divide-y">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between py-2 text-sm">
            <span>{item.quantity}× {item.name}</span>
            <span className="text-muted-foreground">{item.price_label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
