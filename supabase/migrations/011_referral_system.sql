-- ============================================================
-- vastu@home — Referral & Promo Code System
-- ============================================================

-- ── 1. Extend promo_codes with referral fields ────────────────────────────────

alter table promo_codes
  add column if not exists commission_pct    int  not null default 10 check (commission_pct >= 0 and commission_pct <= 100),
  add column if not exists razorpay_offer_id text;


-- ── 2. Track which promo code a subscriber used ───────────────────────────────

alter table subscriptions
  add column if not exists applied_promo_code text;


-- ── 3. Track promo usage on payment transactions ──────────────────────────────

alter table payment_transactions
  add column if not exists promo_code_id   uuid references promo_codes(id) on delete set null,
  add column if not exists commission_paise int;


-- ── 4. Referral conversions — one row per paid signup via promo code ──────────

create table if not exists referral_conversions (
  id                  uuid        primary key default gen_random_uuid(),
  promo_code_id       uuid        not null references promo_codes(id) on delete cascade,
  subscriber_user_id  uuid        not null references profiles(id) on delete cascade,
  razorpay_payment_id text,
  amount_paise        int         not null default 0,
  commission_paise    int         not null default 0,
  status              text        not null default 'pending', -- pending | paid | failed
  created_at          timestamptz not null default now()
);

alter table referral_conversions enable row level security;

create policy "referral_conversions: admin only via service role"
  on referral_conversions for all using (false);

create index if not exists referral_conversions_promo_idx on referral_conversions(promo_code_id);


-- ── 5. Helper RPC to safely increment uses_count ─────────────────────────────

create or replace function increment_promo_uses(promo_id uuid)
returns void
language sql
security definer
as $$
  update promo_codes set uses_count = uses_count + 1 where id = promo_id;
$$;
