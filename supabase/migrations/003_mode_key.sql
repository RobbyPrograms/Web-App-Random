-- One play per filter (mode) per puzzle day. `sport` stays the puzzle's sport.
alter table public.plays add column if not exists mode_key text;

update public.plays set mode_key = sport where mode_key is null;

alter table public.plays alter column mode_key set default 'nba';
alter table public.plays alter column mode_key set not null;

drop index if exists plays_user_sport_puzzle_key;
drop index if exists plays_anon_sport_puzzle_key;

create unique index if not exists plays_user_mode_puzzle_key
  on public.plays (user_id, mode_key, puzzle_number)
  where user_id is not null;

create unique index if not exists plays_anon_mode_puzzle_key
  on public.plays (anon_id, mode_key, puzzle_number)
  where anon_id is not null;

create or replace view public.sport_stats as
select
  sport,
  count(*) filter (where completed_at is not null) as played,
  count(*) filter (where solved) as wins
from public.plays
group by sport;

grant select on public.sport_stats to authenticated;
