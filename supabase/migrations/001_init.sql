-- BOXED initial schema. RLS is enabled on every public table.
-- Authorization reads profiles.is_pro, never user-editable JWT metadata.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  is_pro boolean not null default false,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username is null or username ~ '^[A-Za-z0-9_]{3,20}$'
  )
);

create table public.plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  anon_id text,
  sport text not null,
  puzzle_number integer not null check (puzzle_number > 0),
  guesses jsonb not null default '[]'::jsonb,
  solved boolean not null default false,
  score integer not null default 0 check (score >= 0 and score <= 6),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint plays_actor_present check (user_id is not null or anon_id is not null)
);

create unique index plays_user_sport_puzzle_key
  on public.plays (user_id, sport, puzzle_number)
  where user_id is not null;

create unique index plays_anon_sport_puzzle_key
  on public.plays (anon_id, sport, puzzle_number)
  where anon_id is not null;

create index plays_sport_puzzle_idx on public.plays (sport, puzzle_number);

create table public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sport text not null,
  current integer not null default 0 check (current >= 0),
  best integer not null default 0 check (best >= 0),
  last_played_puzzle integer,
  unique (user_id, sport)
);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 40),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null unique check (invite_code ~ '^[A-Z0-9]{6,10}$'),
  sports text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  tagline text,
  url text,
  sport text,
  puzzle_number integer,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.sponsor_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.plays enable row level security;
alter table public.streaks enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.sponsors enable row level security;
alter table public.sponsor_leads enable row level security;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create policy "profiles select own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles update own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function private.protect_profile_billing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
    new.is_pro := old.is_pro;
    new.stripe_customer_id := old.stripe_customer_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

revoke all on function private.protect_profile_billing() from public, anon, authenticated;

create trigger profiles_protect_billing
  before update on public.profiles
  for each row execute function private.protect_profile_billing();

create policy "plays select own"
  on public.plays for select
  to authenticated
  using (user_id = auth.uid());

create policy "streaks select own"
  on public.streaks for select
  to authenticated
  using (user_id = auth.uid());

create policy "leagues select for members"
  on public.leagues for select
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.league_members m
      where m.league_id = leagues.id and m.user_id = auth.uid()
    )
  );

create policy "pro owners insert leagues"
  on public.leagues for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_pro = true
    )
  );

create policy "owners update leagues"
  on public.leagues for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "members select league members"
  on public.league_members for select
  to authenticated
  using (
    exists (
      select 1 from public.league_members mine
      where mine.league_id = league_members.league_id and mine.user_id = auth.uid()
    )
  );

create policy "join a league yourself"
  on public.league_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "active sponsors are public"
  on public.sponsors for select
  to anon, authenticated
  using (active = true);

create policy "anyone can submit a sponsor lead"
  on public.sponsor_leads for insert
  to anon, authenticated
  with check (
    char_length(name) between 2 and 80
    and char_length(email) between 5 and 160
    and char_length(message) between 10 and 2000
  );

grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (username) on public.profiles to authenticated;
grant select on public.plays to authenticated;
grant select on public.streaks to authenticated;
grant select, insert, update on public.leagues to authenticated;
grant select, insert on public.league_members to authenticated;
grant select on public.sponsors to anon, authenticated;
grant insert on public.sponsor_leads to anon, authenticated;
