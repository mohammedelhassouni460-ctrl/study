-- ---------------------------------------------------------------------------
-- RAG retrieval. SECURITY INVOKER: RLS still applies, a user only searches
-- their own chunks.
-- ---------------------------------------------------------------------------

create or replace function public.match_document_chunks(
  query_embedding extensions.vector(1024),
  p_subject_id uuid,
  match_count integer default 6,
  min_similarity double precision default 0.25
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  chunk_index integer,
  metadata jsonb,
  similarity double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.document_id,
    c.content,
    c.chunk_index,
    c.metadata,
    1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.document_chunks c
  where c.subject_id = p_subject_id
    and c.embedding is not null
    and 1 - (c.embedding operator(extensions.<=>) query_embedding) >= min_similarity
  order by c.embedding operator(extensions.<=>) query_embedding
  limit least(match_count, 20);
$$;

-- Full-text fallback used when no embeddings provider is configured.
create or replace function public.search_document_chunks(
  query_text text,
  p_subject_id uuid,
  match_count integer default 6
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  chunk_index integer,
  metadata jsonb,
  similarity double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    -- OR the words together so a natural-language question still matches.
    select to_tsquery(
      'french',
      coalesce(
        nullif(
          array_to_string(
            array(
              select distinct lexeme
              from unnest(to_tsvector('french', query_text)) as t(lexeme, positions, weights)
            ),
            ' | '
          ),
          ''
        ),
        'zzzznomatch'
      )
    ) as query
  )
  select
    c.id,
    c.document_id,
    c.content,
    c.chunk_index,
    c.metadata,
    ts_rank_cd(c.fts, q.query)::double precision as similarity
  from public.document_chunks c, q
  where c.subject_id = p_subject_id
    and c.fts @@ q.query
  order by similarity desc
  limit least(match_count, 20);
$$;

-- ---------------------------------------------------------------------------
-- AI credits. Credits are reserved atomically BEFORE the AI call (a per-user
-- advisory lock prevents two concurrent requests from both passing the quota
-- check), then the row is completed with token counts after success, or
-- deleted (refund) on failure. Callable by the service role only.
-- ---------------------------------------------------------------------------

create or replace function public.reserve_ai_credits(
  p_user_id uuid,
  p_action text,
  p_credits integer,
  p_limit integer,
  p_since timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
  usage_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 42));

  select coalesce(sum(credits), 0) into used
  from public.ai_usage
  where user_id = p_user_id and created_at >= p_since;

  if used + p_credits > p_limit then
    return null;
  end if;

  insert into public.ai_usage (user_id, action, credits)
  values (p_user_id, p_action, p_credits)
  returning id into usage_id;

  return usage_id;
end;
$$;

revoke all on function public.reserve_ai_credits(uuid, text, integer, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.reserve_ai_credits(uuid, text, integer, integer, timestamptz)
  to service_role;

-- Sum of credits consumed since a date, for the current user (RLS applies).
create or replace function public.credits_used_since(p_since timestamptz)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(credits), 0)::integer
  from public.ai_usage
  where user_id = (select auth.uid()) and created_at >= p_since;
$$;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

-- Private bucket for course documents. Objects live under {user_id}/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  15728640,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket for avatars (images only, 2 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "documents_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "documents_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
