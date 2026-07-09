-- Core schema: users, subjects, daily_plans + RLS

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  mobile_number text not null unique,
  parent_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  subject_name text not null check (char_length(subject_name) <= 60),
  is_custom boolean not null default false,
  confidence_score integer check (confidence_score between 1 and 5),
  exam_date date,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  plan_date date not null,
  session_order integer not null,
  suggested_start_time time,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists subjects_user_id_idx on public.subjects(user_id);
create index if not exists subjects_archived_at_idx on public.subjects(archived_at);
create index if not exists subjects_exam_date_idx on public.subjects(exam_date);
create index if not exists daily_plans_user_id_idx on public.daily_plans(user_id);
create index if not exists daily_plans_plan_date_idx on public.daily_plans(plan_date);
create index if not exists daily_plans_subject_id_idx on public.daily_plans(subject_id);

-- Row Level Security

alter table public.users enable row level security;
alter table public.subjects enable row level security;
alter table public.daily_plans enable row level security;

create policy "users_owns_row" on public.users
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "subjects_owns_row" on public.subjects
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "daily_plans_owns_row" on public.daily_plans
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
