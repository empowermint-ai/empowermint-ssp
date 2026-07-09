-- Schedule the nightly-tasks Edge Function to run once a day via pg_cron + pg_net.
-- NOTE: scheduled for 00:00 UTC. Adjust the cron expression below if you need
-- midnight in a specific local timezone instead.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'nightly-tasks-midnight',
  '0 0 * * *',
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
