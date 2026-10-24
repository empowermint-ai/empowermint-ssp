-- Runs the daily reminder sender every hour. NOT a migration: it holds the app
-- address and the cron secret, so fill both in and run it once in the Supabase
-- SQL editor AFTER the app is deployed and VAPID_PRIVATE_KEY,
-- NEXT_PUBLIC_VAPID_PUBLIC_KEY and CRON_SECRET are set in Vercel.
--
-- To stop it:  select cron.unschedule('daily-push-hourly');

select cron.schedule(
  'daily-push-hourly',
  '5 * * * *',
  $$
  select net.http_get(
    url := 'https://empowermint-ssp.vercel.app/api/cron/daily-push',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  ) as request_id;
  $$
);
