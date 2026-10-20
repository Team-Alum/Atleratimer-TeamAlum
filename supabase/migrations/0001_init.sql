-- Atlera Timer — initial Supabase schema
-- Run this in the Supabase SQL editor (or `supabase db push`).

-- ---------------------------------------------------------------------------
-- Profiles (auto-created on signup)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Focus sessions (one row per completed timer session)
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id text primary key, -- client-generated id, guarantees idempotent sync
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  type text not null check (type in ('focus', 'short_break', 'long_break')),
  start_time text, -- "HH:MM" local start time, display only
  duration_minutes integer not null check (duration_minutes > 0),
  completed boolean not null default true,
  session_date date not null, -- local calendar day of the session
  started_at timestamptz not null, -- epoch-ms start, used for ordering
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_date_idx
  on public.sessions (user_id, session_date desc);

-- ---------------------------------------------------------------------------
-- Row Level Security — users can only ever touch their own rows
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "sessions_select_own" on public.sessions
  for select using (auth.uid() = user_id);

create policy "sessions_insert_own" on public.sessions
  for insert with check (auth.uid() = user_id);

create policy "sessions_update_own" on public.sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sessions_delete_own" on public.sessions
  for delete using (auth.uid() = user_id);
