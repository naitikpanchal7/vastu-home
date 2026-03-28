-- supabase/migrations/001_initial_schema.sql
-- vastu@home — Initial database schema
-- Run: npx supabase db push

-- ── Enable pgvector for RAG (Phase 2 knowledge base) ─────────────────────────
create extension if not exists vector;

-- ── Profiles (consultant accounts) ───────────────────────────────────────────
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null default '',
  email text unique not null,
  phone text,
  city text,
  years_experience int,
  specialization text,
  firm_name text,
  logo_url text,
  avatar_url text,
  report_accent_color text default '#c8af78',
  report_show_branding boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- ── Subscriptions ─────────────────────────────────────────────────────────────
create type plan_tier as enum ('starter', 'professional', 'firm');

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade unique,
  plan plan_tier default 'professional',
  projects_used int default 0,
  projects_limit int default 30,
  reports_used int default 0,
  reports_limit int default -1,  -- -1 = unlimited
  renews_at timestamptz,
  razorpay_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;
create policy "Users can view own subscription" on subscriptions for select using (auth.uid() = user_id);

-- ── Projects ──────────────────────────────────────────────────────────────────
create type project_status as enum ('draft', 'active', 'done');
create type property_type as enum ('Residential', 'Commercial', 'Industrial', 'Plot');

create table projects (
  id uuid primary key default gen_random_uuid(),
  consultant_id uuid references profiles(id) on delete cascade not null,

  -- Client info
  name text not null,
  client_name text not null default '',
  client_contact text,
  client_email text,
  property_address text,
  property_type property_type default 'Residential',
  area_sq_ft numeric,

  -- Status & notes
  status project_status default 'active',
  notes text,

  -- Canvas state (full JSON blob)
  canvas_state jsonb,

  -- Floor plan image (Supabase Storage)
  floor_plan_image_path text,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_opened_at timestamptz
);

alter table projects enable row level security;
create policy "Consultants can manage own projects" on projects
  for all using (auth.uid() = consultant_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger projects_updated_at before update on projects
  for each row execute function update_updated_at();

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

-- ── Chat History (per project) ─────────────────────────────────────────────
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text not null,
  cite text,
  created_at timestamptz default now()
);

alter table chat_messages enable row level security;
create policy "Consultants can manage own chats" on chat_messages
  for all using (
    auth.uid() = (select consultant_id from projects where id = project_id)
  );

-- ── Vastu Knowledge Base (Phase 2 — RAG) ─────────────────────────────────────
-- Used when OCR pipeline for Vishwakarma Prakash is implemented
create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source text not null,       -- 'vishwakarma_prakash' | 'mayamatam' | 'brihat_samhita' | 'curated'
  chapter text,
  content text not null,
  embedding vector(1536),     -- OpenAI/Anthropic embeddings dimension
  zone_tags text[],           -- e.g. ['NE', 'SW', 'N']
  topic_tags text[],          -- e.g. ['entrance', 'remedy', 'cut']
  created_at timestamptz default now()
);

create index knowledge_chunks_embedding_idx on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Phase 1: Seed with curated JSON knowledge (see docs/knowledge-base.md)
-- Phase 2: Full OCR pipeline (Google Cloud Vision → Claude → pgvector)

-- ── Storage buckets ────────────────────────────────────────────────────────────
-- Run separately in Supabase dashboard or via supabase CLI:
-- supabase storage create floor-plans
-- supabase storage create report-exports
-- supabase storage create logos
