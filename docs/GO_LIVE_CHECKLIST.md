# Go-Live Checklist

## Services

| Service | Purpose | URL | Lead time |
|---------|---------|-----|-----------|
| GitHub | Repo | github.com | Instant |
| Vercel | Hosting | vercel.com | Instant |
| Supabase | DB + storage | supabase.com | Instant |
| Anthropic | AI extraction | console.anthropic.com | Instant |
| Stripe | Subscriptions | dashboard.stripe.com | 1–2 days KYC |
| Meta Business | WhatsApp Cloud API | business.facebook.com | 1–3 days (number verification) |
| 36blocks | Auth | 36blocks.com | Contact for JS script |

MSG91 is set up by each restaurant individually. No Orderza platform account needed.

## Pre-launch

- [ ] Supabase migration applied
- [ ] Realtime enabled for `rider_tracking_sessions`
- [ ] Stripe products created (monthly + annual), price IDs in env
- [ ] Stripe webhook registered + secret in env
- [ ] All env vars set in Vercel
- [ ] `DUMMY_AUTH_ENABLED=false`
- [ ] 36blocks script in `app/layout.tsx`
- [ ] Meta `APP_SECRET` set in env
- [ ] `NEXT_PUBLIC_APP_URL` set to production URL
- [ ] Full smoke test completed (see DEPLOYMENT.md)

## Post-launch monitoring

- Supabase dashboard → `audit_logs` for all restaurant actions
- Stripe dashboard → subscription events
- Vercel logs → Route Handler errors
- Supabase → `billing_events` for payment outcomes
