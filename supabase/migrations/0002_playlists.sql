-- Atlera Timer — playlists schema (run after 0001_init.sql)

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  youtube_video_id text not null check (char_length(youtube_video_id) between 6 and 20),
  title text not null default 'Untitled',
  channel_name text,
  thumbnail_url text,
  position integer not null check (position >= 0),
  added_at timestamptz not null default now(),
  unique (playlist_id, youtube_video_id)
);

create index if not exists playlists_user_idx on public.playlists (user_id);
create index if not exists playlist_tracks_playlist_idx on public.playlist_tracks (playlist_id, position);

-- Keep updated_at honest
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists playlists_touch on public.playlists;
create trigger playlists_touch
  before update on public.playlists
  for each row execute function public.touch_updated_at();

-- Row Level Security: playlist access follows playlist ownership
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;

create policy "playlists_select_own" on public.playlists
  for select using (auth.uid() = user_id);
create policy "playlists_insert_own" on public.playlists
  for insert with check (auth.uid() = user_id);
create policy "playlists_update_own" on public.playlists
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "playlists_delete_own" on public.playlists
  for delete using (auth.uid() = user_id);

create policy "playlist_tracks_select_own" on public.playlist_tracks
  for select using (exists (
    select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()));
create policy "playlist_tracks_insert_own" on public.playlist_tracks
  for insert with check (exists (
    select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()));
create policy "playlist_tracks_update_own" on public.playlist_tracks
  for update using (exists (
    select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()))
  with check (exists (
    select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()));
create policy "playlist_tracks_delete_own" on public.playlist_tracks
  for delete using (exists (
    select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()));
