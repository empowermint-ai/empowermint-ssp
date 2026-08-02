alter table public.users
  add column if not exists student_type text check (student_type in ('school', 'uni'));
