-- Tracks whether a learner has given post-exam feedback for a specific exam
-- date, so the reflection prompt is only ever shown once per exam and does
-- not reappear after it has been answered.
alter table public.exam_dates
  add column if not exists reflected_at timestamptz null default null;
