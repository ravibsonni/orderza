-- ============================================================
-- Orderza — Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================================
-- Encryption convention: columns marked "-- ENCRYPTED" store
-- iv_hex:authTag_hex:ciphertext_hex (AES-256-GCM via /lib/crypto.ts)
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- RESTAURANTS
-- ============================================================
CREATE TABLE restaurants (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL DEFAULT '',
  slug                      TEXT UNIQUE NOT NULL DEFAULT '',
  address                   TEXT,
  city                      TEXT,
  country                   TEXT DEFAULT 'UAE',
  phone                     TEXT,
  email                     TEXT,
  logo_url                  TEXT,
  cover_image_url           TEXT,

  -- Meta Cloud API (primary — catalogue + messaging)
  meta_access_token_enc     TEXT,                 -- ENCRYPTED
  meta_phone_number_id      TEXT,
  meta_waba_id              TEXT,
  meta_catalog_id           TEXT,
  meta_connected_at         TIMESTAMPTZ,

  -- MSG91 (bot + messaging fallback)
  msg91_api_key_enc         TEXT,                 -- ENCRYPTED
  msg91_bot_id              TEXT,
  msg91_bot_setup_method    TEXT DEFAULT 'pending',
  -- 'pending' | 'auto' | 'manual'
  msg91_bot_prompt          TEXT,
  msg91_connected_at        TIMESTAMPTZ,

  -- WhatsApp
  whatsapp_number           TEXT,                 -- E.164 format

  -- Stripe
  stripe_customer_id        TEXT,
  stripe_subscription_id    TEXT,
  plan                      TEXT,                 -- 'monthly' | 'annual'
  plan_status               TEXT,                 -- 'active' | 'trialing' | 'past_due' | 'canceled'

  -- 36blocks auth
  auth_user_id              TEXT UNIQUE,

  -- Onboarding gamification
  onboarding_step           INT DEFAULT 1,        -- 1–8
  onboarding_xp             INT DEFAULT 0,

  is_active                 BOOLEAN DEFAULT FALSE,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restaurants_auth_user_id ON restaurants(auth_user_id);
CREATE INDEX idx_restaurants_slug ON restaurants(slug);

-- ============================================================
-- TAX CONFIGURATION
-- ============================================================
CREATE TABLE restaurant_tax_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  tax_name        TEXT NOT NULL DEFAULT 'VAT',
  tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  is_inclusive    BOOLEAN NOT NULL DEFAULT FALSE,
  applies_to      TEXT DEFAULT 'all',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (restaurant_id)
);

-- ============================================================
-- MENU CATEGORIES
-- ============================================================
CREATE TABLE menu_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  display_order   INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (restaurant_id, name)
);

CREATE INDEX idx_menu_categories_restaurant ON menu_categories(restaurant_id);

-- ============================================================
-- MENU ITEMS
-- ============================================================
CREATE TABLE menu_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id         UUID REFERENCES menu_categories(id),
  name                TEXT NOT NULL,
  name_ar             TEXT,
  description         TEXT,
  description_ar      TEXT,
  image_url           TEXT,
  meta_product_id     TEXT,         -- product retailer_id in Meta catalog
  is_available        BOOLEAN DEFAULT TRUE,
  display_order       INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);

-- ============================================================
-- MENU ITEM PRICES — unlimited variants per item
-- ============================================================
CREATE TABLE menu_item_prices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id      UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  label             TEXT NOT NULL DEFAULT 'Regular',
  base_price        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  delivery_price    NUMERIC(10,2),
  takeaway_price    NUMERIC(10,2),
  dine_in_price     NUMERIC(10,2),
  tax_config_id     UUID REFERENCES restaurant_tax_config(id),
  is_default        BOOLEAN DEFAULT FALSE,
  is_active         BOOLEAN DEFAULT TRUE,
  meta_variant_id   TEXT,             -- Meta catalog variant / retailer_id
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_item_prices_item ON menu_item_prices(menu_item_id);

-- ============================================================
-- TIME-BASED DISCOUNTS
-- ============================================================
CREATE TABLE menu_item_discounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_price_id    UUID REFERENCES menu_item_prices(id) ON DELETE CASCADE,
  restaurant_id         UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  label                 TEXT,
  discount_type         TEXT NOT NULL,     -- 'percentage' | 'fixed'
  discount_value        NUMERIC(10,2) NOT NULL,
  days_of_week          INT[],             -- 0=Sun … 6=Sat
  start_time            TIME,
  end_time              TIME,
  valid_from            DATE,
  valid_until           DATE,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DELIVERY RIDERS
-- ============================================================
CREATE TABLE delivery_riders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,      -- WhatsApp E.164
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (phone)
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id         UUID REFERENCES restaurants(id),
  order_number          TEXT UNIQUE NOT NULL,
  customer_phone        TEXT NOT NULL,
  customer_phone_hash   TEXT NOT NULL,  -- SHA-256 of E.164, for analytics
  customer_name         TEXT,
  order_type            TEXT NOT NULL,  -- 'delivery' | 'takeaway' | 'dine_in'
  delivery_address      TEXT,
  rider_id              UUID REFERENCES delivery_riders(id),
  status                TEXT DEFAULT 'pending',
  -- 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
  subtotal              NUMERIC(10,2),
  tax_amount            NUMERIC(10,2),
  delivery_fee          NUMERIC(10,2),
  discount_amount       NUMERIC(10,2),
  total                 NUMERIC(10,2),
  currency              TEXT DEFAULT 'AED',
  whatsapp_message_id   TEXT,
  notes                 TEXT,
  -- Phase 2 scaffold (not used in prototype)
  wa_payment_status     TEXT DEFAULT 'unpaid',
  wa_payment_reference  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_phone_hash ON orders(customer_phone_hash);

-- ============================================================
-- ORDER LINE ITEMS
-- ============================================================
CREATE TABLE order_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id          UUID REFERENCES menu_items(id),
  menu_item_price_id    UUID REFERENCES menu_item_prices(id),
  item_name             TEXT NOT NULL,
  price_label           TEXT NOT NULL,
  unit_price            NUMERIC(10,2) NOT NULL,
  quantity              INT NOT NULL,
  line_total            NUMERIC(10,2) NOT NULL,
  special_instructions  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================================
-- RIDER TRACKING SESSIONS
-- ============================================================
CREATE TABLE rider_tracking_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id            UUID REFERENCES delivery_riders(id),
  restaurant_id       UUID REFERENCES restaurants(id),
  order_ids           UUID[] NOT NULL,
  customer_tokens     JSONB NOT NULL DEFAULT '{}',
  -- { orderId: signedJwt } — each customer gets their own private token
  last_lat            NUMERIC(10,7),
  last_lng            NUMERIC(10,7),
  last_location_at    TIMESTAMPTZ,
  status              TEXT DEFAULT 'active', -- 'active' | 'completed'
  started_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tracking_rider ON rider_tracking_sessions(rider_id);
CREATE INDEX idx_tracking_restaurant ON rider_tracking_sessions(restaurant_id);
CREATE INDEX idx_tracking_status ON rider_tracking_sessions(status);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID,               -- nullable for system actions
  actor_type      TEXT NOT NULL,      -- 'restaurant' | 'system' | 'webhook' | 'rider'
  actor_id        TEXT,
  action          TEXT NOT NULL,
  entity_type     TEXT,
  entity_id       TEXT,
  old_value       JSONB,
  new_value       JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_restaurant ON audit_logs(restaurant_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);

-- ============================================================
-- BILLING EVENTS
-- ============================================================
CREATE TABLE billing_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID REFERENCES restaurants(id),
  stripe_event_id TEXT UNIQUE,
  event_type      TEXT,
  amount          NUMERIC(10,2),
  currency        TEXT,
  status          TEXT,
  raw_event       JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_restaurant ON billing_events(restaurant_id);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tax_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Restaurant self-access via custom auth_user_id setting
CREATE POLICY "restaurant_self" ON restaurants
  USING (auth_user_id = current_setting('app.current_user_id', TRUE));

-- Child tables via restaurant ownership
CREATE POLICY "tax_via_restaurant" ON restaurant_tax_config
  USING (restaurant_id IN (
    SELECT id FROM restaurants
    WHERE auth_user_id = current_setting('app.current_user_id', TRUE)
  ));

CREATE POLICY "categories_via_restaurant" ON menu_categories
  USING (restaurant_id IN (
    SELECT id FROM restaurants
    WHERE auth_user_id = current_setting('app.current_user_id', TRUE)
  ));

CREATE POLICY "items_via_restaurant" ON menu_items
  USING (restaurant_id IN (
    SELECT id FROM restaurants
    WHERE auth_user_id = current_setting('app.current_user_id', TRUE)
  ));

CREATE POLICY "prices_via_item" ON menu_item_prices
  USING (menu_item_id IN (
    SELECT id FROM menu_items
    WHERE restaurant_id IN (
      SELECT id FROM restaurants
      WHERE auth_user_id = current_setting('app.current_user_id', TRUE)
    )
  ));

CREATE POLICY "discounts_via_restaurant" ON menu_item_discounts
  USING (restaurant_id IN (
    SELECT id FROM restaurants
    WHERE auth_user_id = current_setting('app.current_user_id', TRUE)
  ));

CREATE POLICY "riders_via_restaurant" ON delivery_riders
  USING (restaurant_id IN (
    SELECT id FROM restaurants
    WHERE auth_user_id = current_setting('app.current_user_id', TRUE)
  ));

CREATE POLICY "orders_via_restaurant" ON orders
  USING (restaurant_id IN (
    SELECT id FROM restaurants
    WHERE auth_user_id = current_setting('app.current_user_id', TRUE)
  ));

CREATE POLICY "order_items_via_restaurant" ON order_items
  USING (order_id IN (
    SELECT id FROM orders
    WHERE restaurant_id IN (
      SELECT id FROM restaurants
      WHERE auth_user_id = current_setting('app.current_user_id', TRUE)
    )
  ));

CREATE POLICY "tracking_via_restaurant" ON rider_tracking_sessions
  USING (restaurant_id IN (
    SELECT id FROM restaurants
    WHERE auth_user_id = current_setting('app.current_user_id', TRUE)
  ));

-- audit_logs and billing_events: service role only (deny all direct access)
CREATE POLICY "audit_deny_direct" ON audit_logs USING (FALSE);
CREATE POLICY "billing_deny_direct" ON billing_events USING (FALSE);

-- ============================================================
-- REALTIME — Enable for tracking sessions (rider location updates)
-- ============================================================
-- Run in Supabase dashboard → Database → Replication:
-- ALTER PUBLICATION supabase_realtime ADD TABLE rider_tracking_sessions;
-- (Cannot be done in SQL migration — do this manually after applying schema)

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
