-- Lets a learner note the specific topic they are studying within a session
-- and tick it off separately from the session itself (which is marked done
-- via the timer). Both default to empty/unset so existing rows are unaffected.
alter table public.daily_plans
  add column if not exists topic text,
  add column if not exists topic_completed boolean not null default false;
