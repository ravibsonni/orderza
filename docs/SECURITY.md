# Security Model

## Secrets

- All third-party API keys stored in DB are AES-256-GCM encrypted.
- Decryption happens only in server Route Handlers via `/lib/crypto.ts`.
- Decrypted values are never serialised or returned to the browser.
- `DB_ENCRYPTION_KEY`, `SESSION_SECRET`, and `TRACKING_SECRET` must be rotated if compromised.

## Authentication

- Sessions are HS256 JWTs in HTTP-only, Secure, SameSite=Lax cookies.
- Cookie max-age: 30 days.
- 36blocks handles identity verification; Orderza trusts the token after signature verification.

## Row Level Security

- All tables have RLS enabled.
- Restaurant rows are accessible only when `app.current_user_id` matches `auth_user_id`.
- `audit_logs` and `billing_events` have `DENY` policies — only service role can write.

## Rider tracking privacy

- Each customer's tracking token is a signed JWT with 4-hour expiry.
- Tokens are stored per-order in `customer_tokens` JSONB — one token per customer.
- The rider's message contains zero customer PII.
- Expired tokens return 404 with no explanation.

## Webhook verification

- Stripe webhooks verified with `stripe.webhooks.constructEvent`.
- MSG91 location webhooks verified with HMAC-SHA256 signature check.
- Meta webhook signatures verified with `META_APP_SECRET`.

## Input validation

- All monetary values are stored as `NUMERIC(10,2)` — no floating-point risk.
- File uploads are validated for type and size (20 MB max) before AI processing.
- Slugs are sanitised with `slugify()` before storage.
