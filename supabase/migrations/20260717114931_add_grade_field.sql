-- Optional grade at registration, mainly for data gathering - left nullable
-- since non-school (e.g. university) learners have no grade to report.
alter table public.users
  add column if not exists grade text;
