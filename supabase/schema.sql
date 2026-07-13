-- ============================================================
--  FitNext — Supabase schema
--  Paste this into the Supabase SQL Editor and run it once.
-- ============================================================

-- ---------- profiles (one row per user: the 7-question calibration) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username       text,
  coach          text,
  goal           text,
  experience     text,
  age            int,
  weight_kg      numeric,
  height_cm      numeric,
  sex            text,
  activity       text,
  equipment      text,
  days           int,
  want_nutrition boolean default true,
  want_injury    boolean default false,
  personality    text,
  target_date    date,
  onboarded      boolean default false,
  streak         int default 0,
  updated_at     timestamptz default now()
);

-- migration for databases created before username auth existed
alter table public.profiles add column if not exists username text;
-- migration for the Sacred Marble update: Seal the Day + laurels
alter table public.profiles add column if not exists laurels int default 0;
alter table public.profiles add column if not exists sealed_date date;
-- migration for the nutritionist mode choice ('full' | 'tracker')
alter table public.profiles add column if not exists nutrition_mode text;
-- usernames are unique, case-insensitively
create unique index if not exists profiles_username_key
  on public.profiles (lower(username));

-- ---------- chat history ----------
create table if not exists public.chat_messages (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  mode       text not null default 'coach' check (mode in ('coach','nutrition','therapy')),
  created_at timestamptz default now()
);
create index if not exists chat_messages_user_idx on public.chat_messages (user_id, created_at);

-- migration for databases created before the chat sub-areas existed
alter table public.chat_messages add column if not exists mode text not null default 'coach';

-- ---------- workout logs ----------
create table if not exists public.workout_logs (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users on delete cascade,
  note      text,
  data      jsonb,
  logged_at timestamptz default now()
);

-- ---------- daily wins ----------
create table if not exists public.daily_wins (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  day     date default current_date,
  win_id  text not null,
  done    boolean default false,
  unique (user_id, day, win_id)
);

-- ---------- logged meals (macros are eyeball estimates from meal photos) ----------
create table if not exists public.meals (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users on delete cascade,
  day        date default current_date,
  name       text not null,
  description text,
  kcal       int,
  protein_g  int,
  carbs_g    int,
  fat_g      int,
  created_at timestamptz default now()
);
create index if not exists meals_user_day_idx on public.meals (user_id, day);

-- ---------- progress photos (metadata; file lives in Storage) ----------
create table if not exists public.progress_photos (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users on delete cascade,
  path     text not null,
  taken_at timestamptz default now()
);

-- ============================================================
--  Row-Level Security: each user can only touch their own rows
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.chat_messages   enable row level security;
alter table public.workout_logs    enable row level security;
alter table public.daily_wins      enable row level security;
alter table public.meals           enable row level security;
alter table public.progress_photos enable row level security;

-- profiles keyed by id = auth.uid()
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- the rest keyed by user_id = auth.uid()
do $$
declare t text;
begin
  foreach t in array array['chat_messages','workout_logs','daily_wins','meals','progress_photos']
  loop
    execute format('drop policy if exists "own rows" on public.%I;', t);
    execute format(
      'create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t
    );
  end loop;
end $$;

-- ============================================================
--  Auto-create a profile row when a user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username')
  on conflict (id) do update
    set username = coalesce(excluded.username, public.profiles.username);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  Storage bucket for progress photos (private, per-user folder)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('progress', 'progress', false)
on conflict (id) do nothing;

drop policy if exists "own photos read"   on storage.objects;
drop policy if exists "own photos write"  on storage.objects;
create policy "own photos read" on storage.objects
  for select using (bucket_id = 'progress' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own photos write" on storage.objects
  for insert with check (bucket_id = 'progress' and auth.uid()::text = (storage.foldername(name))[1]);
