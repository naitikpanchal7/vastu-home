-- ============================================================
-- vastu@home — Admin Role & Config Tables
-- ============================================================

-- ── 1. Add is_admin flag to profiles ─────────────────────────────────────────

alter table profiles add column if not exists is_admin boolean not null default false;

-- Admin RLS: admins can read all profiles via service role key (bypasses RLS)


-- ── 2. Plan Tiers Configuration ──────────────────────────────────────────────
-- Defines what each plan includes (separate from per-user subscriptions)

create table if not exists plan_tiers (
  id                        text        primary key, -- 'starter', 'professional', 'firm'
  name                      text        not null,
  description               text,
  price_monthly             numeric     not null default 0,
  price_yearly              numeric     not null default 0,
  projects_limit            int         not null default 5,    -- -1 = unlimited
  storage_limit_gb          numeric     not null default 1,
  ai_messages_limit         int         not null default 50,   -- -1 = unlimited
  pdf_exports_limit         int         not null default 5,    -- -1 = unlimited
  ai_chat_enabled           boolean     not null default true,
  pdf_export_enabled        boolean     not null default false,
  white_label_enabled       boolean     not null default false,
  priority_support          boolean     not null default false,
  is_active                 boolean     not null default true,
  razorpay_plan_id_monthly  text,
  razorpay_plan_id_yearly   text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table plan_tiers enable row level security;

create policy "plan_tiers: public read"
  on plan_tiers for select using (true);

create trigger plan_tiers_updated_at
  before update on plan_tiers
  for each row execute function update_updated_at();

-- Seed default tiers (insert or skip if already exists)
insert into plan_tiers (
  id, name, description,
  price_monthly, price_yearly,
  projects_limit, storage_limit_gb, ai_messages_limit, pdf_exports_limit,
  ai_chat_enabled, pdf_export_enabled, white_label_enabled, priority_support
) values
  (
    'starter', 'Starter', 'For independent Vastu consultants getting started',
    0, 0,
    5, 1, 50, 5,
    true, false, false, false
  ),
  (
    'professional', 'Professional', 'For active consultants with a growing client base',
    999, 9990,
    30, 10, 500, -1,
    true, true, false, true
  ),
  (
    'firm', 'Firm', 'For Vastu consulting firms and large practices',
    2999, 29990,
    -1, 50, -1, -1,
    true, true, true, true
  )
on conflict (id) do nothing;


-- ── 3. Promo Codes ────────────────────────────────────────────────────────────

create table if not exists promo_codes (
  id            uuid        primary key default gen_random_uuid(),
  code          text        not null unique,
  description   text,
  discount_pct  int         check (discount_pct >= 0 and discount_pct <= 100),
  applies_to    text,       -- plan tier id or null for all tiers
  max_uses      int,        -- null = unlimited
  uses_count    int         not null default 0,
  valid_from    timestamptz not null default now(),
  valid_until   timestamptz,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now()
);

alter table promo_codes enable row level security;

create policy "promo_codes: admin only via service role"
  on promo_codes for all using (false); -- only accessible via service role key


-- ── 4. AI Usage Logs ─────────────────────────────────────────────────────────

create table if not exists ai_usage_logs (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references profiles(id) on delete cascade,
  project_id      uuid        references projects(id) on delete set null,
  input_tokens    int         not null default 0,
  output_tokens   int         not null default 0,
  model           text        not null default 'claude-sonnet-4-20250514',
  created_at      timestamptz not null default now()
);

alter table ai_usage_logs enable row level security;

create policy "ai_usage_logs: insert own"
  on ai_usage_logs for insert with check (auth.uid() = user_id);

create policy "ai_usage_logs: select own"
  on ai_usage_logs for select using (auth.uid() = user_id);

create index if not exists ai_usage_user_idx on ai_usage_logs(user_id, created_at desc);
create index if not exists ai_usage_date_idx on ai_usage_logs(created_at desc);


-- ── 5. Admin Settings ─────────────────────────────────────────────────────────

create table if not exists admin_settings (
  key         text        primary key,
  value       jsonb       not null,
  updated_at  timestamptz not null default now()
);

alter table admin_settings enable row level security;

create policy "admin_settings: no direct access"
  on admin_settings for all using (false); -- only via service role key

-- Seed default settings
insert into admin_settings (key, value) values
  ('maintenance_mode',    'false'),
  ('maintenance_message', '"The platform is under scheduled maintenance. We will be back shortly."'),
  ('ai_daily_cap',        '1000'),
  ('ai_monthly_cap',      '20000')
on conflict (key) do nothing;

create trigger admin_settings_updated_at
  before update on admin_settings
  for each row execute function update_updated_at();
