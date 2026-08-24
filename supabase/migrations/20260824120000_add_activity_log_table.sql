-- Generic append-only activity feed for learner-facing features that need
-- lightweight event tracking without a dedicated table per feature (starts
-- with the exam timer's started/completed/feedback events). Shape mirrors
-- app_reviews: one row per event, arbitrary shape captured in metadata.

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.users(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_learner_id_idx on public.activity_log(learner_id);

alter table public.activity_log enable row level security;

create policy "activity_log_owns_row" on public.activity_log
  for all
  using (learner_id = auth.uid())
  with check (learner_id = auth.uid());
