# Astraa Vastu — Pre-Launch Handoff

## App State
- Next.js 15, React 19, Supabase, Anthropic AI, Zustand
- Auth: Supabase (email + Google OAuth) — fully working
- Billing: `/pricing`, `/settings/billing`, `/api/billing/status`, `/api/tiers` all built
- `plan_tiers` table already has `razorpay_plan_id_monthly` + `razorpay_plan_id_yearly` columns
- CSP in `next.config.ts` already whitelists Razorpay domains
- Logo: decided (on `logo-for-app` branch)

## Founder Context
- Solo founder, 15 years old
- Razorpay KYC must be under parent's name (their PAN + bank account), business name: Astraa Vastu
- No GST needed yet (zero revenue, under ₹20L threshold)
- Feedback emails: use Resend → receive in personal Gmail (no reply needed from app)

## Security Audit Findings
- Rate limiting exists on: projects, reports, floors — but MISSING on `/api/projects/[id]/chat` (urgent — Anthropic costs) and `/api/billing/checkout`
- Message payload size cap missing on chat route
- In-memory rate limiter (not Redis) — fine for now

## Pre-Launch Checklist

### 🔴 Critical
- [ ] Razorpay KYC (parent's PAN + bank, business: Astraa Vastu)
- [ ] `npm install razorpay` + add `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` to env
- [ ] Create plans in Razorpay dashboard → save IDs to `plan_tiers` table
- [ ] Build `POST /api/billing/checkout`
- [ ] Build `POST /api/billing/webhook` (verifies signature, activates subscription in DB)
- [ ] Wire upgrade modal in `/pricing` to launch Razorpay checkout
- [ ] Rate limit `/api/billing/checkout`
- [ ] Privacy Policy page (`/privacy`)
- [ ] Terms & Conditions page (`/terms`)
- [ ] Refund & Cancellation Policy page (`/refund`)
- [ ] Add all three policy links to footer

### 🟠 Security & Auth
- [ ] Rate limit `/api/projects/[id]/chat`
- [ ] Message payload size cap on chat route
- [ ] Forgot password page (`/auth/forgot-password`) — Supabase `resetPasswordForEmail()` + reset UI
- [ ] Email verify landing page (`/auth/verify-email`)

### 🟡 Product
- [ ] Feedback button (floating/sidebar) → Resend → Gmail
- [ ] `not-found.tsx` branded 404 page
- [ ] `error.tsx` global error boundary
- [ ] Payment confirmation email via Resend (fires on Razorpay webhook)
- [ ] Pricing link in nav + footer

### 🟢 Polish (post-launch)
- [ ] `robots.txt` + `sitemap.xml`
- [ ] `og:image` for link previews
- [ ] Sentry for error visibility

## Key Files
- `src/app/pricing/page.tsx` — upgrade modal (needs Razorpay checkout wired)
- `src/app/api/billing/status/route.ts` — billing status endpoint
- `src/app/api/projects/[id]/chat/route.ts` — needs rate limiting
- `src/lib/rateLimit.ts` — rate limiter utility
- `src/app/page.tsx` — landing page (footer needs policy links + pricing link)
- `next.config.ts` — CSP already Razorpay-ready
