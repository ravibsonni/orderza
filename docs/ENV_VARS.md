# Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes | Full URL including protocol, no trailing slash |
| `SESSION_SECRET` | Yes | 64 hex chars — signs session JWTs |
| `TRACKING_SECRET` | Yes | 64 hex chars — signs tracking JWTs |
| `DB_ENCRYPTION_KEY` | Yes | 64 hex chars — AES-256-GCM key |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server only) |
| `NEXT_PUBLIC_36BLOCKS_APP_ID` | Yes* | 36blocks app ID (*dummy mode: not needed) |
| `DUMMY_AUTH_ENABLED` | Yes | `true` for prototype, `false` in production |
| `NEXT_PUBLIC_DUMMY_AUTH_ENABLED` | Yes | Same flag exposed to browser |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for menu extraction |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `STRIPE_MONTHLY_PRICE_ID` | Yes | Price ID for AED 149/month plan |
| `STRIPE_ANNUAL_PRICE_ID` | Yes | Price ID for AED 1,490/year plan |
| `META_APP_SECRET` | Yes | Meta app secret for webhook signature verification |
| `MSG91_PLATFORM_API_KEY` | No | Orderza platform MSG91 key for system notifications |

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
