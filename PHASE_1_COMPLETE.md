# PHASE 1 COMPLETE

**Date:** 2026-06-24
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase · Stripe · Meta Cloud API · MSG91 · Anthropic Claude

---

## Files Delivered

### Project Config
| File | Purpose |
|------|---------|
| `package.json` | All dependencies |
| `tsconfig.json` | TypeScript config |
| `tailwind.config.ts` | Design tokens, custom animations |
| `next.config.mjs` | Next.js config |
| `postcss.config.js` | Tailwind PostCSS |
| `.env.example` | All env vars with descriptions |
| `.gitignore` | Standard Next.js gitignore |
| `.eslintrc.json` | ESLint config |
| `README.md` | Setup and architecture guide |

### Types
| File | Purpose |
|------|---------|
| `types/database.ts` | Full Supabase database type definitions |

### App Shell
| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout + 36blocks auth note |
| `app/globals.css` | CSS variables, Tailwind base |
| `app/page.tsx` | Root redirect (login → onboarding → dashboard) |

### Auth Pages
| File | Purpose |
|------|---------|
| `app/(auth)/login/page.tsx` | Login (dummy + 36blocks stub) |
| `app/(auth)/signup/page.tsx` | Signup (36blocks stub) |

### Onboarding
| File | Purpose |
|------|---------|
| `app/onboarding/page.tsx` | 8-step wizard controller |
| `components/onboarding/ProgressBar.tsx` | Step progress bar |
| `components/onboarding/XPCounter.tsx` | Animated XP counter |
| `components/onboarding/StepDots.tsx` | Step indicator dots |
| `components/onboarding/steps/Step1Basics.tsx` | Restaurant basics + logo |
| `components/onboarding/steps/Step2Upload.tsx` | Menu upload + AI extraction |
| `components/onboarding/steps/Step3ReviewMenu.tsx` | Review + edit extracted menu |
| `components/onboarding/steps/Step4Tax.tsx` | Tax + delivery pricing setup |
| `components/onboarding/steps/Step5Meta.tsx` | Meta WhatsApp connection |
| `components/onboarding/steps/Step6MSG91.tsx` | MSG91 bot setup (auto + manual fallback) |
| `components/onboarding/steps/Step7Subscribe.tsx` | Stripe subscription selection |
| `components/onboarding/steps/Step8Celebrate.tsx` | Celebration + QR code |

### Dashboard
| File | Purpose |
|------|---------|
| `app/dashboard/page.tsx` | Dashboard shell + tab navigation |
| `components/dashboard/AnalyticsTab.tsx` | Analytics home (KPIs + charts) |
| `components/dashboard/OrdersTab.tsx` | Orders list + status management |
| `components/dashboard/CatalogueTab.tsx` | Catalogue edit + Meta sync + bot prompt |
| `components/dashboard/RidersTab.tsx` | Rider management |
| `components/dashboard/DiscountsTab.tsx` | Time-based discount editor |
| `components/dashboard/SettingsTab.tsx` | Profile, Meta, MSG91, Stripe, QR |
| `components/dashboard/charts/OrdersOverTime.tsx` | Line chart with metric toggle |
| `components/dashboard/charts/RetentionChart.tsx` | New vs returning bar chart |
| `components/dashboard/charts/OrderTypePie.tsx` | Delivery/takeaway/dine-in donut |
| `components/dashboard/charts/TopItems.tsx` | Top 10 items horizontal bar |
| `components/dashboard/charts/PeakHoursHeatmap.tsx` | Day × hour heatmap |

### Tracking
| File | Purpose |
|------|---------|
| `app/track/[token]/page.tsx` | Public tracking page (server component) |
| `app/track/[token]/TrackingRealtimeWrapper.tsx` | Supabase Realtime client wrapper |
| `app/r/[slug]/page.tsx` | Public restaurant landing page |
| `components/tracking/TrackingMap.tsx` | Leaflet map (client-side, SSR-safe) |
| `components/tracking/StatusTimeline.tsx` | Order status timeline |
| `components/tracking/OrderSummaryCard.tsx` | Order items summary (no prices) |

### UI Components
| File | Purpose |
|------|---------|
| `components/ui/button.tsx` | Button with variants |
| `components/ui/input.tsx` | Input with brand styling |
| `components/ui/label.tsx` | Label (Radix) |
| `components/ui/card.tsx` | Card primitives |
| `components/ui/badge.tsx` | Badge with variants |
| `components/ui/toast.tsx` | Toast (Radix) |
| `components/ui/toaster.tsx` | Toast container |
| `components/ui/use-toast.ts` | Toast hook |

### Lib
| File | Purpose |
|------|---------|
| `lib/crypto.ts` | AES-256-GCM encrypt/decrypt + hashPhone |
| `lib/utils.ts` | cn(), formatAED(), formatDate(), slugify() |
| `lib/auth/session.ts` | JWT session create/read/update/destroy |
| `lib/supabase/server.ts` | Server + admin Supabase clients |
| `lib/supabase/browser.ts` | Browser Supabase client (singleton) |
| `lib/audit.ts` | writeAuditLog() + requestMeta() |
| `lib/tracking/token.ts` | signTrackingToken() + verifyTrackingToken() |
| `lib/meta/client.ts` | MetaClient — full Meta Cloud API v19.0 wrapper |
| `lib/msg91/client.ts` | MSG91Client — bot registration with graceful fallback |
| `lib/msg91/prompt.ts` | generateBotPrompt() |
| `lib/ai/extract.ts` | extractMenuFromFile() + extractMenuFromText() |
| `lib/stripe/index.ts` | Stripe client + checkout + portal helpers |

### API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/callback` | GET + POST | 36blocks callback / dummy login |
| `/api/auth/logout` | POST | Destroy session |
| `/api/menu/extract` | POST | AI menu extraction |
| `/api/meta/connect` | POST | Validate Meta credentials + create catalogue |
| `/api/meta/catalogue/sync` | POST | Full bidirectional Meta sync |
| `/api/meta/catalogue/item` | POST | Upsert / delete / toggle single item |
| `/api/msg91/setup` | POST | Validate key + register bot (auto/manual) |
| `/api/orders/dispatch` | POST | Dispatch rider + create tracking session |
| `/api/orders/status` | POST | Update order status |
| `/api/stripe/create-checkout` | POST | Create Stripe Checkout session |
| `/api/stripe/portal` | POST | Create Stripe billing portal session |
| `/api/webhooks/stripe` | POST | Stripe event handler |
| `/api/webhooks/msg91/location` | POST | Rider location update webhook |
| `/api/onboarding/state` | GET | Load current onboarding state |
| `/api/onboarding/advance` | POST | Advance step + award XP |
| `/api/onboarding/step1` | POST | Save restaurant basics |
| `/api/onboarding/step3` | POST | Save full menu to DB |
| `/api/onboarding/step3/save` | POST | Auto-save draft |
| `/api/onboarding/step4` | POST | Save tax + delivery pricing |
| `/api/onboarding/save-progress` | POST | Mark progress saved |
| `/api/dashboard/me` | GET | Session + restaurant check |
| `/api/dashboard/analytics` | GET | Aggregated analytics (server-only) |
| `/api/dashboard/orders` | GET | Orders list with filter |
| `/api/dashboard/catalogue` | GET | Full catalogue + bot prompt |
| `/api/dashboard/riders` | GET + POST | Rider list + create |
| `/api/dashboard/riders/[id]` | PATCH | Toggle rider active |
| `/api/dashboard/settings` | GET + PATCH | Restaurant settings |
| `/api/dashboard/price-variants` | GET | Price variants for discount selector |
| `/api/dashboard/discounts` | GET + POST | Discount list + create |
| `/api/dashboard/discounts/[id]` | DELETE | Delete discount |

### Database
| File | Purpose |
|------|---------|
| `supabase/migrations/001_initial_schema.sql` | Full schema: 11 tables, RLS policies, indexes, triggers |

### Docs
| File | Purpose |
|------|---------|
| `docs/ARCHITECTURE.md` | System design and key decisions |
| `docs/ENV_VARS.md` | All env vars reference |
| `docs/DEPLOYMENT.md` | Step-by-step deployment guide |
| `docs/SECURITY.md` | Security model documentation |
| `docs/GO_LIVE_CHECKLIST.md` | Pre-launch and post-launch checklist |
| `docs/PHASE2_ROADMAP.md` | Phase 2 features |

---

## Environment Variables Required

```
NEXT_PUBLIC_APP_URL
SESSION_SECRET
TRACKING_SECRET
DB_ENCRYPTION_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_36BLOCKS_APP_ID
DUMMY_AUTH_ENABLED
NEXT_PUBLIC_DUMMY_AUTH_ENABLED
ANTHROPIC_API_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_MONTHLY_PRICE_ID
STRIPE_ANNUAL_PRICE_ID
META_APP_SECRET
MSG91_PLATFORM_API_KEY (optional)
```

---

## Post-Phase-1 Manual Steps

1. **Supabase Realtime** — In Supabase dashboard → Database → Replication → add `rider_tracking_sessions` to `supabase_realtime` publication (cannot be done via SQL migration)
2. **Stripe products** — Create monthly (AED 149) and annual (AED 1,490) products and copy price IDs to env
3. **Stripe webhook** — Register endpoint `https://YOUR_DOMAIN/api/webhooks/stripe` and copy signing secret
4. **36blocks embed** — Add JS script to `app/layout.tsx` when received, set `DUMMY_AUTH_ENABLED=false`
5. **Public food placeholder** — Add `public/placeholder-food.jpg` (600×600px JPEG)
6. **`npx supabase gen types`** — Regenerate `types/database.ts` from your live Supabase project for full type accuracy

---

**Ready for Phase 2 confirmation.**
