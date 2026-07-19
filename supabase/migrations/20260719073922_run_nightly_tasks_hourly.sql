-- The nightly-tasks function is now safe to call repeatedly: it only ever
-- fills gaps (a same-day plan with zero rows, or tomorrow's auto-generated
-- rows), it never touches a day that already has any rows. Running it
-- hourly instead of once at midnight means a single missed or failed
-- invocation gets caught and corrected within the hour, well before a
-- learner would notice, rather than leaving that day blank for good.
select cron.unschedule('nightly-tasks-midnight');

select cron.schedule(
  'nightly-tasks-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://lblhhrymlgdvbqlidthw.supabase.co/functions/v1/nightly-tasks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_S7YAtAebpNGmqFEO5M6o4Q_4TPu0fCF',
      'Authorization', 'Bearer sb_publishable_S7YAtAebpNGmqFEO5M6o4Q_4TPu0fCF'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
