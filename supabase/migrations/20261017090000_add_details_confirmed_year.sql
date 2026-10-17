-- Records the academic year in which a learner last confirmed their grade / level,
-- so the SSP can ask again at the start of each new year (a Grade 12 learner may
-- now be a first-year student, which changes which calculator they get).
-- Additive and safe on a live table. The app works without it (it remembers the
-- confirmation on the device instead), so it can be applied before or after the code ships.
--
-- NOT applied automatically. Run it yourself (Supabase SQL editor or `supabase db push`).
--
-- ROLLBACK:
--   alter table public.users drop column details_confirmed_year;

alter table public.users
  add column if not exists details_confirmed_year integer;
