-- Distinguishes plan rows the nightly job (or initial plan generation) created
-- from ones a learner added manually, so the nightly rebuild only clears and
-- replaces its own rows for a date instead of wiping manual additions too.
alter table public.daily_plans
  add column if not exists is_auto_generated boolean not null default false;
