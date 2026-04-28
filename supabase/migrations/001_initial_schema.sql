-- ============================================================
-- vastu@home — Complete Database Schema
-- ============================================================
-- Run: npx supabase db push
-- ============================================================


-- ── 1. EXTENSIONS ────────────────────────────────────────────────────────────

create extension if not exists vector;
create extension if not exists "uuid-ossp";


-- ── 2. ENUMS ─────────────────────────────────────────────────────────────────

create type plan_tier      as enum ('starter', 'professional', 'firm');
create type project_status as enum ('draft', 'active', 'done');
create type property_type  as enum ('Residential', 'Commercial', 'Industrial', 'Plot');
create type payment_status as enum ('captured', 'failed', 'refunded');
create type report_status  as enum ('draft', 'generating', 'generated', 'downloaded');


-- ── 3. SHARED FUNCTIONS ───────────────────────────────────────────────────────

-- Reusable updated_at trigger function
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Auto-create profile + starter subscription on new auth signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );

  insert into public.subscriptions (user_id, plan, projects_limit, reports_limit)
  values (new.id, 'starter', 5, 5);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ── 4. TABLES ─────────────────────────────────────────────────────────────────


-- ── profiles ─────────────────────────────────────────────────────────────────

create table profiles (
  id                    uuid        primary key references auth.users on delete cascade,
  full_name             text        not null default '',
  email                 text        not null unique,
  phone                 text,
  city                  text,
  years_experience      int,
  specialization        text,
  firm_name             text,
  logo_url              text,
  avatar_url            text,
  report_accent_color   text        not null default '#c8af78',
  report_show_branding  boolean     not null default true,
  onboarding_completed  boolean     not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: select own"
  on profiles for select using (auth.uid() = id);

create policy "profiles: insert own"
  on profiles for insert with check (auth.uid() = id);

create policy "profiles: update own"
  on profiles for update using (auth.uid() = id);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();


-- ── subscriptions ────────────────────────────────────────────────────────────

create table subscriptions (
  id                        uuid        primary key default gen_random_uuid(),
  user_id                   uuid        not null unique references profiles(id) on delete cascade,
  plan                      plan_tier   not null default 'starter',
  projects_used             int         not null default 0,
  projects_limit            int         not null default 5,
  reports_used              int         not null default 0,
  reports_limit             int         not null default 5,   -- -1 = unlimited
  renews_at                 timestamptz,
  razorpay_subscription_id  text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table subscriptions enable row level security;

create policy "subscriptions: select own"
  on subscriptions for select using (auth.uid() = user_id);

create policy "subscriptions: update own"
  on subscriptions for update using (auth.uid() = user_id);

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at();


-- ── payment_transactions ─────────────────────────────────────────────────────

create table payment_transactions (
  id                    uuid            primary key default gen_random_uuid(),
  user_id               uuid            not null references profiles(id) on delete cascade,
  razorpay_payment_id   text,
  razorpay_order_id     text,
  amount_paise          int             not null,
  currency              text            not null default 'INR',
  status                payment_status  not null,
  plan                  plan_tier       not null,
  created_at            timestamptz     not null default now()
);

alter table payment_transactions enable row level security;

create policy "payment_transactions: select own"
  on payment_transactions for select using (auth.uid() = user_id);

create policy "payment_transactions: insert own"
  on payment_transactions for insert with check (auth.uid() = user_id);


-- ── projects ─────────────────────────────────────────────────────────────────

create table projects (
  id                      uuid            primary key default gen_random_uuid(),
  consultant_id           uuid            not null references profiles(id) on delete cascade,
  name                    text            not null,
  client_name             text            not null default '',
  client_contact          text,
  client_email            text,
  property_address        text,
  property_type           property_type   not null default 'Residential',
  area_sq_ft              numeric,
  status                  project_status  not null default 'active',
  notes                   text,
  canvas_state            jsonb,
  floor_plan_image_path   text,
  deleted_at              timestamptz,
  created_at              timestamptz     not null default now(),
  updated_at              timestamptz     not null default now(),
  last_opened_at          timestamptz
);

alter table projects enable row level security;

create policy "projects: all own, exclude soft-deleted"
  on projects for all using (
    auth.uid() = consultant_id
    and deleted_at is null
  );

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();


-- ── floors ───────────────────────────────────────────────────────────────────

create table floors (
  id                      uuid        primary key default gen_random_uuid(),
  project_id              uuid        not null references projects(id) on delete cascade,
  name                    text        not null default 'Ground Floor',
  "order"                 int         not null default 0,
  canvas_state            jsonb,
  floor_plan_image_path   text,
  notes                   text,
  zoom_level              numeric     not null default 1,
  pan_x                   numeric     not null default 0,
  pan_y                   numeric     not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table floors enable row level security;

create policy "floors: all via project ownership"
  on floors for all using (
    auth.uid() = (select consultant_id from projects where id = project_id)
  );

create trigger floors_updated_at
  before update on floors
  for each row execute function update_updated_at();


-- ── project_analysis_snapshots ───────────────────────────────────────────────

create table project_analysis_snapshots (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        not null references projects(id) on delete cascade,
  floor_id        uuid        references floors(id) on delete set null,
  north_deg       numeric     not null,
  total_area_sq_ft numeric,
  overall_score   int         check (overall_score >= 0 and overall_score <= 100),
  zone_analysis   jsonb       not null,
  cuts_count      int         not null default 0,
  calculated_at   timestamptz not null,
  created_at      timestamptz not null default now()
);

alter table project_analysis_snapshots enable row level security;

create policy "snapshots: all via project ownership"
  on project_analysis_snapshots for all using (
    auth.uid() = (select consultant_id from projects where id = project_id)
  );


-- ── chat_messages ─────────────────────────────────────────────────────────────

create table chat_messages (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references projects(id) on delete cascade,
  role        text        not null check (role in ('user', 'assistant')),
  content     text        not null,
  cite        text,
  created_at  timestamptz not null default now()
);

alter table chat_messages enable row level security;

create policy "chat_messages: all via project ownership"
  on chat_messages for all using (
    auth.uid() = (select consultant_id from projects where id = project_id)
  );


-- ── reports ──────────────────────────────────────────────────────────────────

create table reports (
  id                uuid          primary key default gen_random_uuid(),
  project_id        uuid          not null references projects(id) on delete cascade,
  consultant_id     uuid          not null references profiles(id) on delete cascade,
  report_name       text          not null,
  preset            text          not null default 'consultant-standard',
  floor_selections  jsonb         not null default '[]',
  status            report_status not null default 'draft',
  pdf_storage_path  text,
  deleted_at        timestamptz,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);

alter table reports enable row level security;

create policy "reports: all own, exclude soft-deleted"
  on reports for all using (
    auth.uid() = consultant_id
    and deleted_at is null
  );

create trigger reports_updated_at
  before update on reports
  for each row execute function update_updated_at();


-- ── report_attachments ───────────────────────────────────────────────────────

create table report_attachments (
  id            uuid        primary key default gen_random_uuid(),
  report_id     uuid        not null references reports(id) on delete cascade,
  name          text        not null,
  mime_type     text        not null,
  size_bytes    int         not null,
  position      text        not null check (position in ('after-intro', 'before-summary')),
  storage_path  text        not null,
  created_at    timestamptz not null default now()
);

alter table report_attachments enable row level security;

create policy "report_attachments: all via report ownership"
  on report_attachments for all using (
    auth.uid() = (select consultant_id from reports where id = report_id)
  );


-- ── report_shares ────────────────────────────────────────────────────────────

create table report_shares (
  id              uuid        primary key default gen_random_uuid(),
  report_id       uuid        not null references reports(id) on delete cascade,
  consultant_id   uuid        not null references profiles(id) on delete cascade,
  token           text        not null unique,
  expires_at      timestamptz,
  password_hash   text,
  view_count      int         not null default 0,
  last_viewed_at  timestamptz,
  created_at      timestamptz not null default now()
);

alter table report_shares enable row level security;

create policy "report_shares: consultant manages own"
  on report_shares for all using (auth.uid() = consultant_id);

create policy "report_shares: public read by token"
  on report_shares for select using (true);


-- ── activity_logs ────────────────────────────────────────────────────────────

create table activity_logs (
  id              uuid        primary key default gen_random_uuid(),
  consultant_id   uuid        not null references profiles(id) on delete cascade,
  project_id      uuid        references projects(id) on delete set null,
  action          text        not null,
  label           text        not null,
  created_at      timestamptz not null default now()
);

alter table activity_logs enable row level security;

create policy "activity_logs: select own"
  on activity_logs for select using (auth.uid() = consultant_id);

create policy "activity_logs: insert own"
  on activity_logs for insert with check (auth.uid() = consultant_id);


-- ── knowledge_chunks ─────────────────────────────────────────────────────────

create table knowledge_chunks (
  id          uuid        primary key default gen_random_uuid(),
  source      text        not null,
  chapter     text,
  content     text        not null,
  embedding   vector(1536),
  zone_tags   text[],
  topic_tags  text[],
  created_at  timestamptz not null default now()
);

alter table knowledge_chunks enable row level security;

create policy "knowledge_chunks: public read"
  on knowledge_chunks for select using (true);


-- ── 5. INDEXES ───────────────────────────────────────────────────────────────

-- projects
create index projects_consultant_id_idx   on projects(consultant_id);
create index projects_status_idx          on projects(status);
create index projects_updated_at_idx      on projects(updated_at desc);
create index projects_active_idx          on projects(consultant_id) where deleted_at is null;

-- floors
create index floors_project_id_idx        on floors(project_id);
create index floors_order_idx             on floors(project_id, "order");

-- project_analysis_snapshots
create index snapshots_project_id_idx     on project_analysis_snapshots(project_id);
create index snapshots_floor_id_idx       on project_analysis_snapshots(floor_id);

-- chat_messages
create index chat_project_id_idx          on chat_messages(project_id, created_at);

-- reports
create index reports_project_id_idx       on reports(project_id);
create index reports_consultant_id_idx    on reports(consultant_id);
create index reports_active_idx           on reports(consultant_id) where deleted_at is null;

-- report_shares
create index report_shares_token_idx      on report_shares(token);
create index report_shares_report_id_idx  on report_shares(report_id);

-- activity_logs
create index activity_consultant_idx      on activity_logs(consultant_id, created_at desc);

-- payment_transactions
create index payments_user_id_idx         on payment_transactions(user_id);

-- knowledge_chunks (IVFFlat for cosine similarity search)
create index knowledge_chunks_embedding_idx on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);


-- ── 6. STORAGE BUCKETS ───────────────────────────────────────────────────────

insert into storage.buckets (id, name, public) values
  ('floor-plans',         'floor-plans',         false),
  ('report-exports',      'report-exports',       false),
  ('report-attachments',  'report-attachments',   false),
  ('logos',               'logos',                true),
  ('avatars',             'avatars',              true);


-- ── 7. STORAGE RLS POLICIES ──────────────────────────────────────────────────
-- Path convention for private buckets: {bucket}/{user_id}/{...rest}
-- logos and avatars are public so no read restriction needed

-- floor-plans
create policy "floor-plans: insert own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'floor-plans'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "floor-plans: select own folder"
  on storage.objects for select
  using (
    bucket_id = 'floor-plans'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "floor-plans: update own folder"
  on storage.objects for update
  using (
    bucket_id = 'floor-plans'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "floor-plans: delete own folder"
  on storage.objects for delete
  using (
    bucket_id = 'floor-plans'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- report-exports
create policy "report-exports: insert own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'report-exports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "report-exports: select own folder"
  on storage.objects for select
  using (
    bucket_id = 'report-exports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "report-exports: update own folder"
  on storage.objects for update
  using (
    bucket_id = 'report-exports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "report-exports: delete own folder"
  on storage.objects for delete
  using (
    bucket_id = 'report-exports'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- report-attachments
create policy "report-attachments: insert own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'report-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "report-attachments: select own folder"
  on storage.objects for select
  using (
    bucket_id = 'report-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "report-attachments: update own folder"
  on storage.objects for update
  using (
    bucket_id = 'report-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "report-attachments: delete own folder"
  on storage.objects for delete
  using (
    bucket_id = 'report-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- logos (public bucket — write restricted to own folder)
create policy "logos: insert own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "logos: update own folder"
  on storage.objects for update
  using (
    bucket_id = 'logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "logos: delete own folder"
  on storage.objects for delete
  using (
    bucket_id = 'logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- avatars (public bucket — write restricted to own folder)
create policy "avatars: insert own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars: update own folder"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars: delete own folder"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
