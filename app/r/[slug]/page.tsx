import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("restaurants").select("name").eq("slug", slug).single();
  return {
    title: data?.name ? `Order from ${data.name} on WhatsApp` : "Order on WhatsApp",
  };
}

export default async function RestaurantLandingPage({ params }: Props) {
  const { slug } = await params;
  const admin = createSupabaseAdminClient();

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name, logo_url, cover_image_url, city, whatsapp_number, is_active")
    .eq("slug", slug)
    .single();

  if (!restaurant || !restaurant.is_active) notFound();

  const { data: categories } = await admin
    .from("menu_categories")
    .select(`id, name, menu_items(id, name, description, image_url, is_available, menu_item_prices(label, base_price, is_default, is_active))`)
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true)
    .order("display_order")
    .returns<
      {
        id: string;
        name: string;
        menu_items: {
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          is_available: boolean;
          menu_item_prices: { label: string; base_price: number; is_default: boolean; is_active: boolean }[];
        }[];
      }[]
    >();

  const phone = restaurant.whatsapp_number?.replace(/\D/g, "") ?? "";
  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(`Hi! I'd like to order from ${restaurant.name}`)}`;

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Cover */}
      {restaurant.cover_image_url && (
        <div className="h-40 sm:h-56 relative overflow-hidden">
          <img src={restaurant.cover_image_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-brand-green/40" />
        </div>
      )}

      {/* Restaurant header */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-start gap-4">
          {restaurant.logo_url && (
            <img src={restaurant.logo_url} alt={restaurant.name} className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg -mt-10 relative z-10" />
          )}
          <div className="pt-1">
            <h1 className="text-2xl font-bold text-brand-green">{restaurant.name}</h1>
            {restaurant.city && <p className="text-muted-foreground text-sm">{restaurant.city}, UAE</p>}
          </div>
        </div>

        {/* Order CTA */}
        <a href={waLink} target="_blank" rel="noopener noreferrer">
          <div className="w-full bg-[#25D366] text-white rounded-2xl p-4 flex items-center justify-center gap-3 shadow-lg text-lg font-bold">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.533 5.855L0 24l6.335-1.52A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.003-1.368l-.36-.214-3.727.977.997-3.645-.235-.374A9.817 9.817 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
            </svg>
            Order on WhatsApp
          </div>
        </a>

        {/* Menu preview */}
        {(categories ?? []).map((cat) => {
          const items = (cat.menu_items as { id: string; name: string; description: string | null; image_url: string | null; is_available: boolean; menu_item_prices: { label: string; base_price: number; is_default: boolean; is_active: boolean }[] }[]) ?? [];
          const availableItems = items.filter((i) => i.is_available);
          if (!availableItems.length) return null;
          return (
            <div key={cat.id}>
              <h2 className="font-bold text-lg text-brand-green border-b pb-2 mb-3">{cat.name}</h2>
              <div className="space-y-3">
                {availableItems.map((item) => {
                  const defaultPrice = item.menu_item_prices?.find((p) => p.is_default && p.is_active) ?? item.menu_item_prices?.[0];
                  return (
                    <div key={item.id} className="flex gap-3 rounded-xl border bg-card p-3">
                      {item.image_url && (
                        <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{item.name}</p>
                        {item.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
                        {defaultPrice && (
                          <p className="text-brand-green font-bold mt-1">
                            AED {Number(defaultPrice.base_price).toFixed(2)}
                            {item.menu_item_prices.filter((p) => p.is_active).length > 1 && (
                              <span className="text-xs font-normal text-muted-foreground ml-1">+</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <p className="text-center text-xs text-muted-foreground pb-4">
          Tap "Order on WhatsApp" above to place your order. Powered by Orderza.
        </p>
      </div>
    </div>
  );
}
