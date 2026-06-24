/**
 * /types/database.ts
 * Supabase Database type definitions.
 * Regenerate with: npx supabase gen types typescript --project-id YOUR_ID > types/database.ts
 */

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          address: string | null;
          city: string | null;
          country: string | null;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          meta_access_token_enc: string | null;
          meta_phone_number_id: string | null;
          meta_waba_id: string | null;
          meta_catalog_id: string | null;
          meta_connected_at: string | null;
          msg91_api_key_enc: string | null;
          msg91_bot_id: string | null;
          msg91_bot_setup_method: string | null;
          msg91_bot_prompt: string | null;
          msg91_connected_at: string | null;
          whatsapp_number: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: string | null;
          plan_status: string | null;
          auth_user_id: string | null;
          onboarding_step: number;
          onboarding_xp: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["restaurants"]["Row"]> & { name: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["restaurants"]["Row"]>;
      };
      restaurant_tax_config: {
        Row: { id: string; restaurant_id: string; tax_name: string; tax_rate: number; is_inclusive: boolean; applies_to: string; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["restaurant_tax_config"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["restaurant_tax_config"]["Row"]>;
      };
      menu_categories: {
        Row: { id: string; restaurant_id: string; name: string; name_ar: string | null; display_order: number; is_active: boolean; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["menu_categories"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["menu_categories"]["Row"]>;
      };
      menu_items: {
        Row: { id: string; restaurant_id: string; category_id: string | null; name: string; name_ar: string | null; description: string | null; description_ar: string | null; image_url: string | null; meta_product_id: string | null; is_available: boolean; display_order: number; created_at: string; updated_at: string };
        Insert: Omit<Database["public"]["Tables"]["menu_items"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Row"]>;
      };
      menu_item_prices: {
        Row: { id: string; menu_item_id: string; label: string; base_price: number; delivery_price: number | null; takeaway_price: number | null; dine_in_price: number | null; tax_config_id: string | null; is_default: boolean; is_active: boolean; meta_variant_id: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["menu_item_prices"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["menu_item_prices"]["Row"]>;
      };
      menu_item_discounts: {
        Row: { id: string; menu_item_price_id: string; restaurant_id: string; label: string | null; discount_type: string; discount_value: number; days_of_week: number[] | null; start_time: string | null; end_time: string | null; valid_from: string | null; valid_until: string | null; is_active: boolean; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["menu_item_discounts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["menu_item_discounts"]["Row"]>;
      };
      delivery_riders: {
        Row: { id: string; restaurant_id: string; name: string; phone: string; is_active: boolean; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["delivery_riders"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["delivery_riders"]["Row"]>;
      };
      orders: {
        Row: { id: string; restaurant_id: string; order_number: string; customer_phone: string; customer_phone_hash: string; customer_name: string | null; order_type: string; delivery_address: string | null; rider_id: string | null; status: string; subtotal: number | null; tax_amount: number | null; delivery_fee: number | null; discount_amount: number | null; total: number | null; currency: string; whatsapp_message_id: string | null; notes: string | null; wa_payment_status: string; wa_payment_reference: string | null; created_at: string; updated_at: string };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
      };
      order_items: {
        Row: { id: string; order_id: string; menu_item_id: string | null; menu_item_price_id: string | null; item_name: string; price_label: string; unit_price: number; quantity: number; line_total: number; special_instructions: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["order_items"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["order_items"]["Row"]>;
      };
      rider_tracking_sessions: {
        Row: { id: string; rider_id: string | null; restaurant_id: string | null; order_ids: string[]; customer_tokens: Record<string, string>; last_lat: number | null; last_lng: number | null; last_location_at: string | null; status: string; started_at: string; completed_at: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["rider_tracking_sessions"]["Row"], "id" | "created_at" | "started_at">;
        Update: Partial<Database["public"]["Tables"]["rider_tracking_sessions"]["Row"]>;
      };
      audit_logs: {
        Row: { id: string; restaurant_id: string | null; actor_type: string; actor_id: string | null; action: string; entity_type: string | null; entity_id: string | null; old_value: Record<string, unknown> | null; new_value: Record<string, unknown> | null; ip_address: string | null; user_agent: string | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
      };
      billing_events: {
        Row: { id: string; restaurant_id: string | null; stripe_event_id: string | null; event_type: string | null; amount: number | null; currency: string | null; status: string | null; raw_event: Record<string, unknown> | null; created_at: string };
        Insert: Omit<Database["public"]["Tables"]["billing_events"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["billing_events"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      set_config: { Args: { setting_name: string; new_value: string; is_local: boolean }; Returns: void };
    };
    Enums: Record<string, never>;
  };
}
