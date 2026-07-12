-- Support multiple exam dates per subject across the year, and let subjects
-- whose exams have all passed drop out of planning until a new date is added.

create table if not exists public.exam_dates (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  exam_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists exam_dates_subject_id_idx on public.exam_dates(subject_id);
create index if not exists exam_dates_exam_date_idx on public.exam_dates(exam_date);

alter table public.exam_dates enable row level security;

create policy "exam_dates_owns_row" on public.exam_dates
  for all
  using (subject_id in (select id from public.subjects where user_id = auth.uid()))
  with check (subject_id in (select id from public.subjects where user_id = auth.uid()));

-- Carry forward any exam date already set on a subject, then retire that column.
insert into public.exam_dates (subject_id, exam_date)
select id, exam_date from public.subjects where exam_date is not null;

drop index if exists subjects_exam_date_idx;
alter table public.subjects drop column if exists exam_date;
