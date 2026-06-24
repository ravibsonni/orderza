# Phase 2 Roadmap

## 1. WhatsApp Pay
End-user payment via Meta Pay / MSG91 payment messages, triggered at order confirmation. Requires Meta Pay enablement on the restaurant's WhatsApp Business account.

## 2. POS Integrations
Two-way sync with UAE-popular POS systems:
- **Foodics** — menu sync, order push, inventory deduction
- **POSRocket** — menu sync, order push
- **Lightspeed** — enterprise integration

## 3. Promotional Campaigns
WhatsApp broadcast messages to segmented past customers:
- Last-ordered-X-days-ago segments
- Top spenders
- Campaign scheduling
- Template message management via MSG91

## 4. Inventory / Raw Materials
Recipe tracking per menu item. When an order is placed, raw material quantities are automatically deducted. Low-stock alerts via WhatsApp to the restaurant owner.

## 5. Native Rider GPS App
Replace WhatsApp location sharing with a lightweight PWA for riders that:
- Sends GPS coordinates every 10 seconds
- Works offline (queues updates)
- Shows the rider's current delivery list
- Marks deliveries complete with one tap

## 6. Multi-Branch
One restaurant group, multiple locations:
- Branch selector in onboarding and dashboard
- Per-branch WhatsApp numbers and catalogues
- Consolidated analytics across all branches
- Branch-specific riders and menus

## 7. Deep Analytics
- Cohort analysis (monthly retention by acquisition month)
- Customer LTV calculation
- Menu item profitability (revenue − estimated cost)
- AI-powered insights: "Your Friday 7pm slot is your most profitable — consider running a Friday special"

## 8. Customer Loyalty
- Stamp card via WhatsApp (10 orders = free item)
- Tracked by `customer_phone_hash` for privacy
- Restaurant configures reward rules in dashboard

## Technical Debt to Address Before Phase 2
- Add proper 36blocks token validation (remove dummy mode)
- Add rate limiting on all public API routes
- Implement proper error monitoring (Sentry / Axiom)
- Add E2E tests (Playwright) for critical onboarding flow
- Add unit tests for crypto, audit, and token modules
