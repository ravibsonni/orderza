-- ============================================================
-- Orderza — 36Blocks auth fields
-- Migration: 003_blocks_auth_fields.sql
-- ============================================================
-- 36Blocks redirects to /api/auth/callback after login with a payload
-- containing a `user` and a `company`. We key each restaurant by the
-- 36Blocks user.id (stored in restaurants.auth_user_id — already unique)
-- and also record the company.id the user belongs to.
-- ============================================================

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS blocks_company_id TEXT;

CREATE INDEX IF NOT EXISTS idx_restaurants_blocks_company_id
  ON restaurants(blocks_company_id);

COMMENT ON COLUMN restaurants.auth_user_id IS
  '36Blocks user.id — primary login identity that links all restaurant + menu data';
COMMENT ON COLUMN restaurants.blocks_company_id IS
  '36Blocks company.id — the tenant/business the logged-in user belongs to';
