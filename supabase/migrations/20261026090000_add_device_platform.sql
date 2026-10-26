-- Records which kind of phone a learner last used the SSP on, so it shows next
-- to their name in the users table. Updated each time they open Today's Plan.
-- Additive and safe to run on a live table.
--
-- ROLLBACK:
--   alter table public.users drop column device_platform, drop column device_installed,
--     drop column device_seen_at;

alter table public.users
  add column if not exists device_platform text check (device_platform in ('android', 'ios', 'desktop', 'other')),
  add column if not exists device_installed boolean,
  add column if not exists device_seen_at timestamptz;
