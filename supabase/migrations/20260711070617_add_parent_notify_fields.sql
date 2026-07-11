-- Separate, explicitly-verified parent contact for weekly progress summaries.
-- Distinct from users.parent_email (which mirrors the account's own login/
-- confirmation email set at registration) since that address may not
-- actually belong to a parent.

alter table public.users
  add column parent_notify_email text,
  add column parent_notify_token text,
  add column parent_notify_confirmed_at timestamptz;

create unique index if not exists users_parent_notify_token_idx
  on public.users(parent_notify_token)
  where parent_notify_token is not null;
