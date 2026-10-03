-- =============================================================================
-- StudyOS AI: demo data (LOCAL DEVELOPMENT ONLY, loaded by `supabase db reset`).
-- Demo account: demo@studyos.local / demo-studyos-2026
-- Never run this file against a production database.
-- =============================================================================

do $$
declare
  demo_id constant uuid := '00000000-0000-4000-8000-000000000001';
  subject_id constant uuid := '00000000-0000-4000-8000-000000000101';
  doc_id constant uuid := '00000000-0000-4000-8000-000000000201';
  quiz_id constant uuid := '00000000-0000-4000-8000-000000000301';
  attempt_id constant uuid := '00000000-0000-4000-8000-000000000401';
  t_offre uuid := gen_random_uuid();
  t_elast uuid := gen_random_uuid();
  t_ext uuid := gen_random_uuid();
  t_cpp uuid := gen_random_uuid();
  t_mono uuid := gen_random_uuid();
  q1 uuid := gen_random_uuid();
  q2 uuid := gen_random_uuid();
  q3 uuid := gen_random_uuid();
  q4 uuid := gen_random_uuid();
  q5 uuid := gen_random_uuid();
begin
  -- Auth user (the on_auth_user_created trigger creates the profile).
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', demo_id, 'authenticated', 'authenticated',
    'demo@studyos.local', extensions.crypt('demo-studyos-2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Camille"}', now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (demo_id::text, demo_id, jsonb_build_object('sub', demo_id::text, 'email', 'demo@studyos.local', 'email_verified', true),
          'email', now(), now(), now());

  update public.profiles set
    full_name = 'Camille',
    education_level = 'licence',
    goal = 'exams',
    next_exam_date = current_date + 21,
    daily_study_minutes = 45,
    onboarded_at = now()
  where id = demo_id;

  insert into public.subjects (id, user_id, name, description, color, exam_date, target_grade)
  values (subject_id, demo_id, 'Microéconomie', 'L2 Économie, semestre 3', 'indigo', current_date + 21, 15);

  insert into public.topics (id, user_id, subject_id, name, description, mastery_score, attempts_count, correct_count, last_studied_at) values
    (t_offre, demo_id, subject_id, 'Offre et demande', 'Formation du prix d''équilibre sur un marché.', 78, 9, 7, now() - interval '2 days'),
    (t_elast, demo_id, subject_id, 'Élasticité', 'Sensibilité de la demande au prix et au revenu.', 42, 7, 3, now() - interval '1 day'),
    (t_ext, demo_id, subject_id, 'Externalités', 'Effets d''une activité sur des tiers, hors marché.', 28, 4, 1, now() - interval '3 days'),
    (t_cpp, demo_id, subject_id, 'Concurrence parfaite', 'Marché atomistique, prix donné, profit nul à long terme.', 61, 5, 3, now() - interval '4 days'),
    (t_mono, demo_id, subject_id, 'Monopole', 'Un seul vendeur : Rm = Cm, prix au-dessus du coût marginal.', 0, 0, 0, null);

  -- A processed course (no storage file: it can't be downloaded, but chat and generation work on its chunks).
  insert into public.documents (id, user_id, subject_id, name, file_path, file_type, file_size, status, chunk_count, extracted_text)
  values (doc_id, demo_id, subject_id, 'Chapitre 2 - Marchés et élasticités.txt',
          demo_id || '/' || subject_id || '/seed-chapitre-2.txt', 'txt', 4200, 'ready', 4, null);

  insert into public.document_chunks (user_id, document_id, subject_id, chunk_index, token_count, content) values
    (demo_id, doc_id, subject_id, 0, 120,
     'Offre et demande. La demande d''un bien diminue quand son prix augmente (loi de la demande), tandis que l''offre augmente avec le prix. Le prix d''équilibre est atteint lorsque la quantité offerte est égale à la quantité demandée. Un choc de demande positif déplace la courbe de demande vers la droite et augmente le prix et la quantité d''équilibre.'),
    (demo_id, doc_id, subject_id, 1, 130,
     'Élasticité. L''élasticité-prix de la demande mesure la variation relative de la quantité demandée suite à une variation relative du prix : Ep = (% variation de la quantité) / (% variation du prix). Si |Ep| > 1 la demande est élastique, si |Ep| < 1 elle est inélastique. L''élasticité-revenu mesure la réaction de la demande à une variation du revenu : un bien normal a une élasticité-revenu positive, un bien inférieur une élasticité négative.'),
    (demo_id, doc_id, subject_id, 2, 120,
     'Externalités. Une externalité est l''effet d''une activité économique sur des tiers qui n''est pas pris en compte par le marché. La pollution est une externalité négative ; la recherche ou la vaccination produisent des externalités positives. L''État peut corriger une externalité négative par une taxe pigouvienne égale au coût marginal externe, ou par un marché de droits à polluer. Selon le théorème de Coase, une négociation privée peut aboutir à une solution efficace si les coûts de transaction sont faibles.'),
    (demo_id, doc_id, subject_id, 3, 130,
     'Concurrence parfaite et monopole. En concurrence parfaite, les entreprises sont preneuses de prix et produisent la quantité telle que le prix égale le coût marginal ; à long terme, le profit économique est nul. Le monopole est le seul offreur : il choisit la quantité qui égalise recette marginale et coût marginal (Rm = Cm) et fixe un prix supérieur au coût marginal, ce qui crée une perte sèche pour la collectivité.');

  insert into public.summaries (user_id, subject_id, document_id, length, title, content)
  values (demo_id, subject_id, doc_id, 'standard', 'Marchés, élasticités et externalités', jsonb_build_object(
    'title', 'Marchés, élasticités et externalités',
    'overview', 'Ce chapitre explique comment le prix d''équilibre se forme, comment mesurer la sensibilité de la demande, et pourquoi le marché échoue en présence d''externalités ou de monopole.',
    'keyConcepts', jsonb_build_array(
      jsonb_build_object('name', 'Équilibre de marché', 'explanation', 'Le prix pour lequel quantité offerte et quantité demandée sont égales.'),
      jsonb_build_object('name', 'Élasticité-prix', 'explanation', 'Mesure de la réaction de la demande à une variation du prix.'),
      jsonb_build_object('name', 'Externalité', 'explanation', 'Effet sur des tiers non pris en compte par les prix.')),
    'definitions', jsonb_build_array(
      jsonb_build_object('term', 'Taxe pigouvienne', 'definition', 'Taxe égale au coût marginal externe, qui fait payer la pollution au pollueur.'),
      jsonb_build_object('term', 'Perte sèche', 'definition', 'Surplus collectif perdu par rapport à l''équilibre concurrentiel.')),
    'formulas', jsonb_build_array(
      jsonb_build_object('name', 'Élasticité-prix', 'formula', 'Ep = (% variation quantité) / (% variation prix)', 'interpretation', '|Ep| > 1 : demande élastique.'),
      jsonb_build_object('name', 'Monopole', 'formula', 'Rm = Cm', 'interpretation', 'Condition de maximisation du profit du monopole.')),
    'importantPoints', jsonb_build_array(
      'En concurrence parfaite, le prix est égal au coût marginal.',
      'Le monopole produit moins et vend plus cher qu''en concurrence.',
      'Théorème de Coase : négociation efficace si coûts de transaction faibles.'),
    'examples', jsonb_build_array(
      jsonb_build_object('title', 'Calcul d''élasticité', 'content', 'Prix +10 %, quantité -20 % : Ep = -2, la demande est élastique.'))));

  insert into public.flashcards (user_id, subject_id, document_id, topic_id, question, answer, difficulty, next_review_at, review_count, interval_days) values
    (demo_id, subject_id, doc_id, t_offre, 'Comment se forme le prix d''équilibre ?', 'Au point où la quantité offerte est égale à la quantité demandée.', 'easy', now() - interval '1 hour', 2, 5),
    (demo_id, subject_id, doc_id, t_elast, 'Quelle est la formule de l''élasticité-prix de la demande ?', 'Ep = (% variation de la quantité demandée) / (% variation du prix).', 'medium', now() - interval '1 hour', 1, 2),
    (demo_id, subject_id, doc_id, t_elast, 'Que signifie |Ep| > 1 ?', 'La demande est élastique : elle réagit plus que proportionnellement au prix.', 'easy', now() - interval '1 hour', 0, 0),
    (demo_id, subject_id, doc_id, t_elast, 'Quel est le signe de l''élasticité-revenu d''un bien inférieur ?', 'Négatif : la demande baisse quand le revenu augmente.', 'medium', now() + interval '2 days', 1, 2),
    (demo_id, subject_id, doc_id, t_ext, 'Qu''est-ce qu''une externalité négative ?', 'Un coût imposé à des tiers par une activité, sans compensation par le marché (ex. pollution).', 'easy', now() - interval '1 hour', 1, 1),
    (demo_id, subject_id, doc_id, t_ext, 'Qu''est-ce qu''une taxe pigouvienne ?', 'Une taxe égale au coût marginal externe, qui internalise l''externalité.', 'medium', now() - interval '1 hour', 0, 0),
    (demo_id, subject_id, doc_id, t_ext, 'Qu''énonce le théorème de Coase ?', 'Si les coûts de transaction sont faibles, une négociation privée mène à une allocation efficace, quelle que soit l''attribution des droits.', 'hard', now() + interval '1 day', 1, 1),
    (demo_id, subject_id, doc_id, t_cpp, 'Quelle est la règle de production en concurrence parfaite ?', 'Produire jusqu''à ce que le prix égale le coût marginal (P = Cm).', 'medium', now() + interval '4 days', 2, 5),
    (demo_id, subject_id, doc_id, t_mono, 'Quelle condition maximise le profit d''un monopole ?', 'Recette marginale = coût marginal (Rm = Cm).', 'medium', now() - interval '1 hour', 0, 0),
    (demo_id, subject_id, doc_id, t_mono, 'Pourquoi le monopole crée-t-il une perte sèche ?', 'Il produit moins et vend plus cher qu''en concurrence : des échanges mutuellement avantageux n''ont pas lieu.', 'hard', now() - interval '1 hour', 0, 0);

  insert into public.quizzes (id, user_id, subject_id, title, difficulty, question_count, created_at)
  values (quiz_id, demo_id, subject_id, 'QCM : élasticité et externalités', 'medium', 5, now() - interval '1 day');

  insert into public.quiz_questions (id, user_id, quiz_id, topic_id, position, question, choices, correct_answer, explanation) values
    (q1, demo_id, quiz_id, t_elast, 0, 'Le prix augmente de 10 % et la demande baisse de 20 %. Quelle est l''élasticité-prix ?',
     '["-0,5", "-1", "-2", "2"]', 2, 'Ep = -20 / 10 = -2 : la demande est élastique.'),
    (q2, demo_id, quiz_id, t_elast, 1, 'Un bien dont la demande baisse quand le revenu augmente est un bien…',
     '["normal", "inférieur", "de luxe", "complémentaire"]', 1, 'Élasticité-revenu négative : bien inférieur.'),
    (q3, demo_id, quiz_id, t_ext, 2, 'Quel instrument corrige une externalité négative en faisant payer le pollueur ?',
     '["Une subvention", "Un prix plafond", "Une taxe pigouvienne", "Un quota d''importation"]', 2, 'La taxe pigouvienne égale le coût marginal externe.'),
    (q4, demo_id, quiz_id, t_ext, 3, 'La vaccination est un exemple…',
     '["d''externalité négative", "d''externalité positive", "de bien inférieur", "de monopole naturel"]', 1, 'Se vacciner protège aussi les autres : externalité positive.'),
    (q5, demo_id, quiz_id, t_offre, 4, 'Un choc de demande positif entraîne…',
     '["une baisse du prix d''équilibre", "une hausse du prix et de la quantité", "une baisse de la quantité", "aucun effet"]', 1, 'La courbe de demande se déplace vers la droite.');

  insert into public.quiz_attempts (id, user_id, quiz_id, score, total, percentage, started_at, completed_at)
  values (attempt_id, demo_id, quiz_id, 3, 5, 60, now() - interval '1 day' - interval '8 minutes', now() - interval '1 day');

  insert into public.quiz_answers (user_id, attempt_id, question_id, answer, is_correct) values
    (demo_id, attempt_id, q1, 2, true),
    (demo_id, attempt_id, q2, 0, false),
    (demo_id, attempt_id, q3, 2, true),
    (demo_id, attempt_id, q4, 0, false),
    (demo_id, attempt_id, q5, 1, true);

  insert into public.flashcard_reviews (user_id, flashcard_id, rating, interval_days, reviewed_at)
  select demo_id, id, 'good', 5, now() - interval '2 days' from public.flashcards where user_id = demo_id and review_count > 0;
end;
$$;
