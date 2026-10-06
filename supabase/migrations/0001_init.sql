-- ════════════════════════════════════════════════════════════════════
-- Honey Studio — Phase 2 initial schema
-- Postgres + Supabase Auth + Row Level Security.
-- Every user-owned table is readable/writable ONLY by its owner.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── enums ───────────────────────────────────────────────────────────
do $$ begin
  create type companion_gender as enum ('girlfriend', 'boyfriend');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_role as enum ('user', 'companion', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_status as enum ('sent', 'delivered', 'seen');
exception when duplicate_object then null; end $$;

do $$ begin
  create type call_initiator as enum ('user', 'companion');
exception when duplicate_object then null; end $$;

do $$ begin
  create type call_status as enum ('declined', 'completed', 'missed', 'active');
exception when duplicate_object then null; end $$;

-- ── profiles ────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text,
  preferred_gender  companion_gender,
  age_confirmed_at  timestamptz,
  blocked_companions text[] not null default '{}',
  created_at        timestamptz not null default now()
);

alter table public.profiles
  add column if not exists blocked_companions text[] not null default '{}';

alter table public.profiles enable row level security;

drop policy if exists "profiles: self select" on public.profiles;
create policy "profiles: self select" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: self insert" on public.profiles;
create policy "profiles: self insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles: self delete" on public.profiles;
create policy "profiles: self delete" on public.profiles
  for delete using (auth.uid() = id);

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── companions (shared catalogue, seeded) ───────────────────────────
create table if not exists public.companions (
  id                 text primary key,
  name               text not null,
  age                int  not null check (age >= 18),
  gender             companion_gender not null,
  city               text not null,
  country            text not null,
  country_flag       text not null,
  timezone           text not null,
  tagline            text not null default '',
  bio                text not null,
  tags               text[] not null default '{}',
  interests          text[] not null default '{}',
  favourite_food     text not null default '',
  languages          text[] not null default '{}',
  slang              text[] not null default '{}',
  signature_phrases  text[] not null default '{}',
  emoji_rate         real not null default 0.4 check (emoji_rate >= 0 and emoji_rate <= 1),
  lowercase          boolean not null default true,
  typing_wpm         int not null default 45,
  voice_id           text not null default '',
  accent             text not null default '#F2A30A',
  avatar_from        text not null default '#FFD470',
  avatar_to          text not null default '#F98FA6',
  wake_hour          int not null default 8,
  sleep_hour         int not null default 1,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);

alter table public.companions enable row level security;

drop policy if exists "companions: authenticated read" on public.companions;
create policy "companions: authenticated read" on public.companions
  for select to authenticated using (is_active);

-- (writes are service-role only — the seed script)

-- ── conversations ───────────────────────────────────────────────────
create table if not exists public.conversations (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  companion_id           text not null references public.companions(id) on delete cascade,
  relationship_stage     int  not null default 1 check (relationship_stage between 1 and 4),
  summary                text,
  message_count          int  not null default 0,
  days_chatted           int  not null default 1,
  last_summarised_count  int  not null default 0,
  last_message_at        timestamptz,
  created_at             timestamptz not null default now(),
  unique (user_id, companion_id)
);

create index if not exists conversations_user_last_msg_idx
  on public.conversations (user_id, last_message_at desc nulls last);

alter table public.conversations enable row level security;

drop policy if exists "conversations: owner all" on public.conversations;
create policy "conversations: owner all" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── messages ────────────────────────────────────────────────────────
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  role             message_role not null,
  content          text not null,
  reaction         text,
  status           message_status not null default 'sent',
  meta             jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "messages: owner all" on public.messages;
create policy "messages: owner all" on public.messages
  for all using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

-- Keep conversations.message_count / last_message_at in sync.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.conversations
     set message_count   = message_count + 1,
         last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_insert on public.messages;
create trigger on_message_insert
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- ── memories ────────────────────────────────────────────────────────
create table if not exists public.memories (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  fact             text not null,
  created_at       timestamptz not null default now()
);

create index if not exists memories_conversation_created_idx
  on public.memories (conversation_id, created_at);

alter table public.memories enable row level security;

drop policy if exists "memories: owner all" on public.memories;
create policy "memories: owner all" on public.memories
  for all using (
    exists (
      select 1 from public.conversations c
      where c.id = memories.conversation_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.conversations c
      where c.id = memories.conversation_id and c.user_id = auth.uid()
    )
  );

-- ── call_sessions ───────────────────────────────────────────────────
create table if not exists public.call_sessions (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  initiated_by      call_initiator not null,
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  duration_seconds  int,
  status            call_status not null default 'active'
);

create index if not exists call_sessions_conversation_created_idx
  on public.call_sessions (conversation_id, started_at desc);

alter table public.call_sessions enable row level security;

drop policy if exists "call_sessions: owner all" on public.call_sessions;
create policy "call_sessions: owner all" on public.call_sessions
  for all using (
    exists (
      select 1 from public.conversations c
      where c.id = call_sessions.conversation_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.conversations c
      where c.id = call_sessions.conversation_id and c.user_id = auth.uid()
    )
  );

-- ── safety_events (no message text stored) ──────────────────────────
create table if not exists public.safety_events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  conversation_id  uuid references public.conversations(id) on delete set null,
  kind             text not null,
  created_at       timestamptz not null default now()
);

create index if not exists safety_events_user_created_idx
  on public.safety_events (user_id, created_at desc);

alter table public.safety_events enable row level security;

drop policy if exists "safety_events: owner insert" on public.safety_events;
create policy "safety_events: owner insert" on public.safety_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "safety_events: owner select" on public.safety_events;
create policy "safety_events: owner select" on public.safety_events
  for select using (auth.uid() = user_id);

drop policy if exists "safety_events: owner delete" on public.safety_events;
create policy "safety_events: owner delete" on public.safety_events
  for delete using (auth.uid() = user_id);

-- ── usage_events (token/cost monitoring) ────────────────────────────
create table if not exists public.usage_events (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  conversation_id        uuid references public.conversations(id) on delete set null,
  model                  text not null,
  input_tokens           int not null default 0,
  output_tokens          int not null default 0,
  cache_read_tokens      int not null default 0,
  cache_creation_tokens  int not null default 0,
  latency_ms             int not null default 0,
  created_at             timestamptz not null default now()
);

create index if not exists usage_events_user_created_idx
  on public.usage_events (user_id, created_at desc);

alter table public.usage_events enable row level security;

drop policy if exists "usage_events: owner insert" on public.usage_events;
create policy "usage_events: owner insert" on public.usage_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "usage_events: owner select" on public.usage_events;
create policy "usage_events: owner select" on public.usage_events
  for select using (auth.uid() = user_id);

-- ── reports ─────────────────────────────────────────────────────────
create table if not exists public.reports (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  conversation_id  uuid references public.conversations(id) on delete set null,
  category         text not null default 'other',
  reason           text not null,
  created_at       timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "reports: owner insert" on public.reports;
create policy "reports: owner insert" on public.reports
  for insert with check (auth.uid() = user_id);

drop policy if exists "reports: owner select" on public.reports;
create policy "reports: owner select" on public.reports
  for select using (auth.uid() = user_id);

drop policy if exists "reports: owner delete" on public.reports;
create policy "reports: owner delete" on public.reports
  for delete using (auth.uid() = user_id);
