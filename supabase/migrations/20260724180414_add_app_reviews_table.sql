-- Lets a student rate the SSP out of 5 stars with an optional comment,
-- prompted once they have some real usage (5 completed sessions).
-- review_prompt_dismissed_at lets a "not now" suppress the prompt for a
-- while instead of asking again on every visit.

create table if not exists public.app_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists app_reviews_user_id_idx on public.app_reviews(user_id);

alter table public.app_reviews enable row level security;

create policy "app_reviews_owns_row" on public.app_reviews
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.users
  add column if not exists review_prompt_dismissed_at timestamptz;
