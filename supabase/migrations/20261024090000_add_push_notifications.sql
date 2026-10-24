-- Daily study reminders sent as web push notifications to learners who opt in.
-- Additive: one new table and four columns with safe defaults.
--
-- ROLLBACK:
--   drop table public.push_subscriptions;
--   alter table public.users drop column push_enabled, drop column push_hour,
--     drop column push_timezone, drop column push_last_sent_on;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_owns_row" on public.push_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- push_hour is the learner's LOCAL hour (0-23); push_timezone is their IANA zone.
alter table public.users
  add column if not exists push_enabled boolean not null default false,
  add column if not exists push_hour smallint not null default 14 check (push_hour between 0 and 23),
  add column if not exists push_timezone text not null default 'Africa/Johannesburg',
  add column if not exists push_last_sent_on date;
