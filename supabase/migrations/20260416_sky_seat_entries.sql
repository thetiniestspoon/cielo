-- PersonalOS Sky — sky-seat journal persistence.
-- Stores observer-seat ritual entries that are currently written to the
-- local vault via the dev middleware. With this table applied, a prod
-- build can persist entries to Supabase instead.
--
-- NEEDS-USER: apply this to whichever project you choose (likely a
-- personal project rather than Family Core). Run via:
--   npx supabase db query --linked < this file
-- after `supabase link --project-ref <ref>`.

create table if not exists public.sky_seat_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Text of the observer-seat prompt answer. One line by convention.
  text text not null check (char_length(text) between 1 and 500),
  -- Which view the user was entering when this was logged.
  view text not null check (view in ('stars', 'both', 'weather'))
);

create index if not exists sky_seat_entries_user_created_idx
  on public.sky_seat_entries (user_id, created_at desc);

alter table public.sky_seat_entries enable row level security;

-- Users only see their own entries.
create policy "own entries read"
  on public.sky_seat_entries for select
  using (auth.uid() = user_id);

create policy "own entries insert"
  on public.sky_seat_entries for insert
  with check (auth.uid() = user_id);

create policy "own entries delete"
  on public.sky_seat_entries for delete
  using (auth.uid() = user_id);

-- Intentionally no update policy — entries are append-only observer notes.
