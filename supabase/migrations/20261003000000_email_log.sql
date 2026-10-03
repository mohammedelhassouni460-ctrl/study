-- Log of transactional emails, used to send each reminder / report at most once
-- per period (cron jobs can be retried or run twice). Server-only table.
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('study_reminder', 'weekly_report')),
  period_key text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, kind, period_key)
);

alter table public.email_log enable row level security;
-- No policy: only the service role (which bypasses RLS) can read or write it.
revoke all on public.email_log from anon, authenticated;
