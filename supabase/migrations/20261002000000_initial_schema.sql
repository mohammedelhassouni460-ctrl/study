-- StudyOS AI — initial schema
-- Every table holding user data carries a user_id referencing auth.users and is
-- protected by Row Level Security (auth.uid() = user_id). Composite foreign keys
-- (child.parent_id, child.user_id) -> parent(id, user_id) guarantee at the
-- database level that a row can only reference parents owned by the same user.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 80),
  avatar_url text,
  education_level text check (
    education_level in ('lycee', 'bts', 'licence', 'master', 'ecole', 'autre')
  ),
  goal text check (goal in ('understand', 'memorize', 'exams', 'organize')),
  language text not null default 'fr',
  timezone text not null default 'Europe/Paris',
  next_exam_date date,
  daily_study_minutes integer not null default 45 check (daily_study_minutes between 10 and 480),
  notification_preferences jsonb not null default '{"email_reminders": true, "weekly_report": true, "product_updates": false}'::jsonb,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------------

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  color text not null default 'indigo',
  exam_date date,
  target_grade numeric(4, 2) check (target_grade between 0 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index subjects_user_id_idx on public.subjects (user_id, created_at desc);
create trigger subjects_updated_at before update on public.subjects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null,
  name text not null check (char_length(name) between 1 and 255),
  file_path text not null unique,
  file_type text not null check (file_type in ('pdf', 'docx', 'txt')),
  file_size bigint not null check (file_size > 0),
  status text not null default 'uploading'
    check (status in ('uploading', 'processing', 'ready', 'failed')),
  error_message text,
  extracted_text text,
  page_count integer,
  chunk_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade
);

create index documents_subject_idx on public.documents (subject_id, created_at desc);
create index documents_user_idx on public.documents (user_id, created_at desc);
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- document_chunks (RAG)
-- ---------------------------------------------------------------------------

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null,
  subject_id uuid not null,
  content text not null,
  embedding extensions.vector(1024),
  fts tsvector generated always as (to_tsvector('french', content)) stored,
  chunk_index integer not null,
  token_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (document_id, user_id) references public.documents (id, user_id) on delete cascade,
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade,
  unique (document_id, chunk_index)
);

create index document_chunks_subject_idx on public.document_chunks (subject_id);
create index document_chunks_fts_idx on public.document_chunks using gin (fts);
create index document_chunks_embedding_idx on public.document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- topics (concepts extracted from documents, carry the mastery score)
-- ---------------------------------------------------------------------------

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  mastery_score integer not null default 0 check (mastery_score between 0 and 100),
  difficulty_score integer not null default 50 check (difficulty_score between 0 and 100),
  attempts_count integer not null default 0,
  correct_count integer not null default 0,
  last_studied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade
);

create unique index topics_subject_name_idx on public.topics (subject_id, lower(name));
create index topics_user_mastery_idx on public.topics (user_id, mastery_score);
create trigger topics_updated_at before update on public.topics
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- summaries (AI study sheets)
-- ---------------------------------------------------------------------------

create table public.summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null,
  document_id uuid,
  length text not null check (length in ('short', 'standard', 'detailed')),
  title text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade,
  foreign key (document_id, user_id) references public.documents (id, user_id)
    on delete set null (document_id)
);

create index summaries_subject_idx on public.summaries (subject_id, created_at desc);

-- ---------------------------------------------------------------------------
-- flashcards + reviews (spaced repetition)
-- ---------------------------------------------------------------------------

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null,
  topic_id uuid,
  document_id uuid,
  question text not null check (char_length(question) between 1 and 1000),
  answer text not null check (char_length(answer) between 1 and 3000),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  mastery_score integer not null default 0 check (mastery_score between 0 and 100),
  ease_factor numeric(4, 2) not null default 2.5,
  interval_days numeric(8, 2) not null default 0,
  review_count integer not null default 0,
  lapses integer not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade,
  foreign key (topic_id, user_id) references public.topics (id, user_id)
    on delete set null (topic_id),
  foreign key (document_id, user_id) references public.documents (id, user_id)
    on delete set null (document_id)
);

create index flashcards_due_idx on public.flashcards (user_id, next_review_at);
create index flashcards_subject_idx on public.flashcards (subject_id, next_review_at);

create table public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  flashcard_id uuid not null,
  rating text not null check (rating in ('again', 'hard', 'good', 'easy')),
  interval_days numeric(8, 2),
  reviewed_at timestamptz not null default now(),
  foreign key (flashcard_id, user_id) references public.flashcards (id, user_id) on delete cascade
);

create index flashcard_reviews_user_idx on public.flashcard_reviews (user_id, reviewed_at desc);

-- ---------------------------------------------------------------------------
-- quizzes
-- ---------------------------------------------------------------------------

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null,
  title text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard', 'exam')),
  question_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade
);

create index quizzes_subject_idx on public.quizzes (subject_id, created_at desc);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_id uuid not null,
  topic_id uuid,
  position integer not null,
  question text not null,
  choices jsonb not null check (jsonb_typeof(choices) = 'array'),
  correct_answer smallint not null check (correct_answer >= 0),
  explanation text not null default '',
  unique (id, user_id),
  foreign key (quiz_id, user_id) references public.quizzes (id, user_id) on delete cascade,
  foreign key (topic_id, user_id) references public.topics (id, user_id)
    on delete set null (topic_id)
);

create index quiz_questions_quiz_idx on public.quiz_questions (quiz_id, position);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_id uuid not null,
  score integer not null default 0,
  total integer not null default 0,
  percentage numeric(5, 2) not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, user_id),
  foreign key (quiz_id, user_id) references public.quizzes (id, user_id) on delete cascade
);

create index quiz_attempts_user_idx on public.quiz_attempts (user_id, completed_at desc);
create index quiz_attempts_quiz_idx on public.quiz_attempts (quiz_id);

create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid not null,
  question_id uuid not null,
  answer smallint,
  is_correct boolean not null,
  foreign key (attempt_id, user_id) references public.quiz_attempts (id, user_id) on delete cascade,
  foreign key (question_id, user_id) references public.quiz_questions (id, user_id) on delete cascade,
  unique (attempt_id, question_id)
);

-- ---------------------------------------------------------------------------
-- chat with documents
-- ---------------------------------------------------------------------------

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade
);

create index chat_messages_subject_idx on public.chat_messages (subject_id, created_at);

-- ---------------------------------------------------------------------------
-- study planning
-- ---------------------------------------------------------------------------

create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  daily_minutes integer not null,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  check (end_date >= start_date)
);

create index study_plans_user_idx on public.study_plans (user_id, created_at desc);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid,
  subject_id uuid not null,
  topic_id uuid,
  scheduled_date date not null,
  kind text not null check (kind in ('flashcards', 'review', 'quiz', 'exercise')),
  title text not null,
  duration_minutes integer not null check (duration_minutes between 1 and 480),
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  position integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (plan_id, user_id) references public.study_plans (id, user_id) on delete cascade,
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade,
  foreign key (topic_id, user_id) references public.topics (id, user_id)
    on delete set null (topic_id)
);

create index study_sessions_user_date_idx on public.study_sessions (user_id, scheduled_date);

-- ---------------------------------------------------------------------------
-- billing & usage (written by the server with the service role only)
-- ---------------------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  credits integer not null default 0 check (credits >= 0),
  tokens_input integer not null default 0,
  tokens_output integer not null default 0,
  model text,
  created_at timestamptz not null default now()
);

create index ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);
create index ai_usage_user_action_idx on public.ai_usage (user_id, action, created_at desc);
