-- ============================================================
-- vastu@home — Plan Tier Hierarchy & Dynamic Signup Defaults
-- ============================================================

-- ── 1. Add hierarchy columns to plan_tiers ───────────────────────────────────

alter table plan_tiers
  add column if not exists sort_order   int     not null default 0,
  add column if not exists is_base_tier boolean not null default false;

-- Set default sort orders for existing tiers
update plan_tiers set sort_order = 0 where id = 'starter';
update plan_tiers set sort_order = 1 where id = 'professional';
update plan_tiers set sort_order = 2 where id = 'firm';

-- Mark starter as the default signup tier
update plan_tiers set is_base_tier = true where id = 'starter';


-- ── 2. Convert plan column from enum to text (supports custom tiers) ─────────
-- The plan_tier enum only allows 'starter','professional','firm'.
-- Custom tiers created via admin console would be rejected by the DB.

alter table subscriptions
  alter column plan type text using plan::text;

alter table subscriptions
  alter column plan set default 'starter';

alter table payment_transactions
  alter column plan type text using plan::text;


-- ── 3. Update handle_new_user trigger to read limits from plan_tiers ─────────
-- Old version hardcoded projects_limit=5, reports_limit=5 regardless of tier config.
-- New version reads from whichever tier has is_base_tier = true.

create or replace function handle_new_user()
returns trigger as $$
declare
  base_tier record;
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );

  -- Read limits from the base tier (fallback to 5/5 if none configured)
  select id, projects_limit, pdf_exports_limit
    into base_tier
    from public.plan_tiers
   where is_base_tier = true
   limit 1;

  insert into public.subscriptions (user_id, plan, projects_limit, reports_limit)
  values (
    new.id,
    coalesce(base_tier.id, 'starter'),
    coalesce(base_tier.projects_limit, 5),
    coalesce(base_tier.pdf_exports_limit, 5)
  );

  return new;
end;
$$ language plpgsql security definer;
