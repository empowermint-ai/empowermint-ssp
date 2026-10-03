-- Lets a learner's chosen app language follow them to a new phone.
-- Additive and safe to run on a live table: existing rows get 'en'.
-- The app works without this column (it falls back to the NEXT_LOCALE cookie),
-- so it can be applied before or after the code ships.
--
-- NOT applied automatically. Run it yourself (Supabase SQL editor or
-- `supabase db push`) when you are ready.
--
-- ROLLBACK:
--   alter table public.users drop column preferred_language;

alter table public.users
  add column if not exists preferred_language text not null default 'en';
