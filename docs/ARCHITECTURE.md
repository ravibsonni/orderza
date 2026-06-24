# Architecture

## Request flow

```
Browser → Next.js Route Handler → lib/* → Supabase / Meta API / MSG91 / Stripe
```

All business logic lives in `/lib`. Route handlers are thin: authenticate → validate → call lib → audit log → respond.

## Auth model

Session is a signed HS256 JWT stored in an HTTP-only cookie `mc_session`. The payload contains `restaurantId`, `authUserId`, `email`, `onboardingStep`, `isActive`.

RLS uses `current_setting('app.current_user_id', TRUE)` which is set by the service-role client before any query that needs row-level filtering.

## Encryption

`/lib/crypto.ts` is the only file that calls Node.js `crypto`. Format: `iv_hex:authTag_hex:ciphertext_hex`. Key: 32-byte value from `DB_ENCRYPTION_KEY` env var.

## Meta Cloud API

Each restaurant brings their own Meta credentials. There is no platform-level Meta token. The `MetaClient` class in `/lib/meta/client.ts` wraps all Graph API v19.0 calls.

## MSG91 fallback

`/lib/msg91/client.ts` attempts bot registration. On any failure it returns `{ method: 'manual', prompt }` — the caller shows a copy-paste UI. No exception is propagated.

## Realtime (rider tracking)

Supabase Realtime broadcasts `rider_tracking_sessions` row updates. The tracking page subscribes via `createSupabaseBrowserClient()` and updates the Leaflet map on each location change.
