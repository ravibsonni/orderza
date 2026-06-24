# Orderza

**From menu upload to WhatsApp orders — in minutes.**

UAE restaurants sign up, upload their menu (AI extracts it), connect their WhatsApp via Meta Cloud API, set up an AI ordering bot via MSG91, subscribe, and go live — all in one gamified onboarding wizard.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/YOUR_ORG/orderza.git
cd orderza
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in all values in .env.local

# 3. Apply Supabase schema
# Option A (recommended) — connect the repo via the Supabase GitHub
#   integration so migrations in supabase/migrations/ apply automatically
#   on every push. See "Database migrations" below.
# Option B (manual) — Supabase dashboard → SQL editor → run each file in
#   supabase/migrations/ in order (001, then 002).

# 4. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database migrations

The database schema lives in [`supabase/migrations/`](supabase/migrations/) and is
managed by the Supabase CLI. The repo is CLI-ready (`supabase/config.toml` is
committed), so you have two ways to apply it:

**Automatic (GitHub integration) — no manual SQL.**
1. Push this repo to GitHub.
2. In the Supabase dashboard → **Project → Integrations → GitHub**, connect the
   repo, set the supabase directory to `supabase`, and pick your production
   branch.
3. Every push/merge runs new migrations against your project automatically, and
   each pull request gets an isolated preview database.

> The first migration is applied the same way (on first push), since the
> integration only automates changes made *after* it's connected.

**Manual / local (Supabase CLI):**
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push        # applies everything in supabase/migrations/
```

Realtime for `rider_tracking_sessions` is enabled by migration `002` — no
dashboard step required.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js Route Handlers (serverless) |
| Database | Supabase (PostgreSQL + RLS + Realtime) |
| Auth | 36blocks (dummy mode in prototype) |
| AI extraction | Anthropic Claude claude-sonnet-4-6 |
| WhatsApp Catalogue | Meta Cloud API (restaurant's own credentials) |
| WhatsApp Bot | MSG91 (restaurant's own key, graceful manual fallback) |
| Subscription billing | Stripe |
| Secret encryption | AES-256-GCM (Node.js crypto) |
| QR generation | qrcode npm |
| Live map | Leaflet + OpenStreetMap |
| Deployment | Vercel |

## Key Architecture Decisions

### Meta Cloud API is the source of truth for the catalogue
Every restaurant connects using **their own** Meta Business credentials. Orderza never holds a platform-level Meta token. Catalogue changes made in Orderza sync to Meta via `POST /api/meta/catalogue/sync`.

### MSG91 bot registration has graceful fallback
Orderza attempts to register the AI ordering bot via MSG91 API on Step 6. If the API is unavailable or returns non-2xx, the restaurant sees a "Copy Prompt" UI — they paste it manually into MSG91. The restaurant is **never blocked**.

### All third-party keys are AES-256-GCM encrypted at rest
`meta_access_token_enc` and `msg91_api_key_enc` are encrypted in the database. Decryption only happens in server Route Handlers. The decrypted value is **never returned to the browser**.

### Rider tracking is privacy-safe by design
Each customer gets a signed JWT that shows only their own order on the map. The rider never receives customer phone numbers, names, or addresses.

## Onboarding Steps

| Step | What happens | XP |
|------|-------------|-----|
| 1 | Restaurant basics + logo | +50 |
| 2 | Menu upload → AI extraction | +100 |
| 3 | Review & edit menu | +150 |
| 4 | Tax + delivery pricing | +75 |
| 5 | Connect Meta WhatsApp → create catalogue | +200 |
| 6 | Connect MSG91 → register bot (auto or manual) | +200 |
| 7 | Stripe subscription | +100 |
| 8 | Celebration + QR code | 🏆 |

## Directory Structure

See `/docs/ARCHITECTURE.md` for the full annotated tree.

## Deployment

See `/docs/DEPLOYMENT.md` for step-by-step Vercel + Supabase + Stripe setup.

## Environment Variables

See `.env.example` for all required variables with descriptions.

## Phase 2 Roadmap

See `/docs/PHASE2_ROADMAP.md`.
