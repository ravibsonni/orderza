# Deployment Guide

## Prerequisites

- Vercel account
- Supabase project
- Stripe account (KYC takes 1–2 days)
- Meta Business account with WhatsApp Cloud API (1–3 days for number verification)
- 36blocks account (contact for JS embed script)

## Step-by-step

### 1. Supabase

1. Create project at supabase.com
2. SQL editor → paste `supabase/migrations/001_initial_schema.sql` → Run
3. Database → Replication → add `rider_tracking_sessions` to `supabase_realtime` publication
4. Copy: Project URL, anon key, service role key

### 2. Stripe

1. Create products in Stripe dashboard:
   - Monthly: AED 149/month recurring → copy Price ID
   - Annual: AED 1,490/year recurring → copy Price ID
2. Create webhook endpoint pointing to `https://YOUR_DOMAIN/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`
   - Copy signing secret

### 3. Vercel

1. Import GitHub repo
2. Add all environment variables from `.env.example`
3. Deploy
4. Note your production URL (e.g. `https://orderza.vercel.app`)
5. Set `NEXT_PUBLIC_APP_URL` to production URL
6. Update Stripe webhook URL to production

### 4. 36blocks

1. Contact 36blocks with your production URL
2. They provide a JS embed script and `NEXT_PUBLIC_36BLOCKS_APP_ID`
3. Add script to `app/layout.tsx` (see comment block there)
4. Set `DUMMY_AUTH_ENABLED=false` and `NEXT_PUBLIC_DUMMY_AUTH_ENABLED=false`

### 5. Smoke test

- [ ] Login as a new restaurant (dummy or 36blocks)
- [ ] Complete all 8 onboarding steps
- [ ] Verify catalogue appears in Meta dashboard
- [ ] Place a test order via WhatsApp
- [ ] Dispatch to rider → verify tracking link works
- [ ] Check audit_logs table has entries
