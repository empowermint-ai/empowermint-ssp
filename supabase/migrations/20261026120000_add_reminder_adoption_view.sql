-- One-glance count of how many learners have daily reminders on, split by phone type.
-- Open "reminder_adoption" in the Supabase Table Editor. Counts only - no names.
-- Test accounts (@ssp-test.local) are left out. Not readable through the app's public API.
--
-- ROLLBACK:  drop view public.reminder_adoption;

create or replace view public.reminder_adoption
with (security_invoker = true) as
with learners as (
  select
    coalesce(u.device_platform, 'not yet recorded') as device,
    u.push_enabled
  from public.users u
  join auth.users a on a.id = u.id
  where a.email not like '%@ssp-test.local'
),
by_device as (
  select device, count(*) as learners, count(*) filter (where push_enabled) as reminders_on
  from learners group by device
),
everyone as (
  select 'ALL LEARNERS'::text as device, count(*) as learners, count(*) filter (where push_enabled) as reminders_on
  from learners
)
select device, learners, reminders_on,
       round(100.0 * reminders_on / nullif(learners, 0), 1) as percent_on
from (
  select 0 as sort, * from everyone
  union all
  select 1 as sort, * from by_device
) t
order by sort, learners desc;

revoke all on public.reminder_adoption from anon, authenticated;
