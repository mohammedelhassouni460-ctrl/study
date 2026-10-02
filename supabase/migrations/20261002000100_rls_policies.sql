-- Row Level Security: a user can only ever see and change their own rows.
-- `(select auth.uid())` is evaluated once per statement (faster than auth.uid()).

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.topics enable row level security;
alter table public.summaries enable row level security;
alter table public.flashcards enable row level security;
alter table public.flashcard_reviews enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.chat_messages enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_sessions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.ai_usage enable row level security;

-- profiles: keyed by id (= auth.users.id). Inserted by the signup trigger.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Full CRUD on own rows for every user-owned content table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'subjects', 'documents', 'document_chunks', 'topics', 'summaries',
    'flashcards', 'flashcard_reviews', 'quizzes', 'quiz_questions',
    'quiz_attempts', 'quiz_answers', 'chat_messages', 'study_plans', 'study_sessions'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
      t || '_delete_own', t);
  end loop;
end;
$$;

-- Billing and usage are read-only for users: only the server (service role,
-- which bypasses RLS) may write them, so nobody can grant themselves Pro or
-- erase their AI consumption.
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));

-- Users must not be able to change billing-related columns through the API.
revoke insert, update, delete on public.subscriptions from anon, authenticated;
revoke insert, update, delete on public.ai_usage from anon, authenticated;

-- Anonymous visitors have no access to any application table.
do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;
