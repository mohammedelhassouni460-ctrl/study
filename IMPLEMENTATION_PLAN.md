# StudyOS AI — Plan d'implémentation

Ce document décrit l'architecture, les étapes de construction et les décisions techniques de StudyOS AI.
Il est mis à jour à chaque phase (voir « Journal des décisions » en bas).

## 1. Vue d'ensemble

StudyOS transforme les cours d'un étudiant (PDF, DOCX, TXT) en système de révision personnalisé :

```text
DOCUMENTS → EXTRACTION → CHUNKS + EMBEDDINGS → TOPICS
        → RÉSUMÉS / FLASHCARDS / QCM → RÉSULTATS → MAÎTRISE (0-100)
        → PLANNING PERSONNALISÉ → NOUVELLES RÉVISIONS
```

## 2. Stack

| Domaine | Choix |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19, TypeScript strict |
| UI | Tailwind CSS v4, composants shadcn/ui (Radix), lucide-react, next-themes, sonner |
| Formulaires / validation | React Hook Form + Zod 4 (validation serveur systématique) |
| Base de données | Supabase Postgres + pgvector, RLS sur toutes les tables |
| Auth | Supabase Auth (email/mot de passe + Google OAuth) via `@supabase/ssr` |
| Stockage | Supabase Storage, bucket privé `documents`, bucket `avatars` |
| IA (génération) | Anthropic Messages API, sorties structurées (`output_config.format`) validées par Zod |
| Embeddings | Voyage AI (`voyage-3.5`, 1024 dim.) ou OpenAI (`text-embedding-3-small`, 1024 dim.) — repli plein-texte Postgres sans clé |
| Paiement | Stripe Checkout + Billing + Customer Portal + webhooks signés |
| Analytics | Abstraction `track()` → PostHog (API HTTP), no-op sans clé |
| Rate limiting | Abstraction : Upstash Redis (REST) si configuré, sinon mémoire |
| Tests | Vitest (unitaires), Playwright (E2E) |
| Hébergement | Vercel |

## 3. Architecture des dossiers

```text
app/
  (marketing)/        landing, pricing, privacy, terms, cookies
  (auth)/             login, signup, forgot-password, reset-password
  auth/               callback OAuth, confirmation email, signout
  (app)/              zone privée (layout avec sidebar)
    dashboard/ onboarding/ subjects/[id]/{documents,summary,flashcards,quiz,chat}
    planner/ settings/{profile,billing,notifications,data}
  api/                route handlers (documents, ai, quiz, flashcards, study-plan, stripe, account)
components/
  ui/                 primitives shadcn
  marketing/ app/ dashboard/ subjects/ documents/ flashcards/ quiz/ chat/ planner/ settings/
lib/
  ai/                 client Anthropic, prompts, schémas, générateurs
  auth/               helpers session (requireUser…)
  billing/            plans, limites, crédits, accès
  documents/          validation fichiers, extraction, chunking, pipeline
  embeddings/         providers d'embeddings
  learning/           mastery, répétition espacée, scoring quiz, planner, session du jour
  stripe/             client Stripe, synchronisation abonnements
  supabase/           clients serveur / navigateur / admin, proxy
  validations/        schémas Zod partagés
  analytics/ rate-limit/ http/ (erreurs API)
types/                types partagés + types `Database` Supabase
supabase/migrations/  schéma SQL, RLS, storage, fonctions
supabase/seed.sql     données de démonstration (Microéconomie)
tests/unit/ tests/e2e/
```

Principes : UI (components) ≠ logique métier (`lib/learning`, `lib/billing`) ≠ accès BDD (`lib/data/*`)
≠ IA (`lib/ai`) ≠ auth (`lib/auth`) ≠ paiement (`lib/stripe`). Les fonctions métier sont pures et testées.

## 4. Base de données

Tables (toutes avec `user_id` + RLS `auth.uid() = user_id`) :

`profiles`, `subjects`, `documents`, `document_chunks` (embedding `vector(1024)` + `tsvector`),
`topics`, `summaries`, `flashcards`, `flashcard_reviews`, `quizzes`, `quiz_questions`,
`quiz_attempts`, `quiz_answers`, `chat_messages`, `study_plans`, `study_sessions`,
`subscriptions`, `ai_usage`.

- `subscriptions` et `ai_usage` : lecture seule pour l'utilisateur, écriture uniquement côté serveur
  (service role) — l'utilisateur ne peut pas s'offrir Pro ni effacer sa consommation.
- `quiz_questions.correct_answer` n'est jamais envoyé au navigateur avant la soumission
  (le serveur sélectionne explicitement les colonnes).
- Fonctions SQL : `match_document_chunks` (similarité cosinus), `search_document_chunks` (plein-texte),
  `handle_new_user` (trigger création profil).
- Storage : bucket privé `documents`, chemin `{user_id}/{subject_id}/{uuid}.{ext}`, policies par dossier.

## 5. Routes

Publiques : `/`, `/pricing`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms`, `/cookies`.
Privées (protégées par `proxy.ts` + vérification serveur) : `/onboarding`, `/dashboard`, `/subjects`,
`/subjects/[id]` (+ `documents`, `summary`, `flashcards`, `quiz`, `quiz/[quizId]`, `chat`), `/planner`,
`/settings/{profile,billing,notifications,data}`.

## 6. API

| Méthode | Route | Rôle |
| --- | --- | --- |
| POST | `/api/documents/upload` | Valide métadonnées + quotas, crée la ligne, renvoie une URL d'upload signée |
| POST | `/api/documents/process` | Télécharge, vérifie le type réel (magic bytes), extrait, découpe, embeddings, topics |
| POST | `/api/ai/summary` | Fiche (ultra courte / standard / détaillée) |
| POST | `/api/ai/flashcards` | 10/20/30/50 flashcards |
| POST | `/api/ai/quiz` | QCM 5/10/20/30, difficulté easy/medium/hard/exam |
| POST | `/api/ai/chat` | RAG en streaming avec sources |
| POST | `/api/flashcards/review` | Répétition espacée + maîtrise |
| POST | `/api/quiz/submit` | Correction serveur, tentative, maîtrise des topics |
| POST | `/api/study-plan/generate` | Planning de révision |
| POST | `/api/stripe/checkout` · `/api/stripe/portal` · `/api/stripe/webhook` | Abonnements |
| GET | `/api/account/export` | Export JSON des données |

Les mutations simples (matières, profil, onboarding, sessions du planning) passent par des Server Actions.

## 7. Sécurité

- Validation Zod côté serveur sur chaque entrée ; auth vérifiée côté serveur (`supabase.auth.getUser()`).
- RLS sur toutes les tables ; service role uniquement dans `lib/supabase/admin.ts` (`server-only`).
- Upload : liste blanche d'extensions/MIME, taille max (15 Mo), vérification des magic bytes au traitement.
- Rate limiting sur les endpoints IA et le traitement des documents.
- Crédits IA réservés atomiquement avant chaque appel, remboursés en cas d'échec (`ai_usage`).
- Webhook Stripe : signature vérifiée, Stripe = source de vérité (jamais le redirect).
- Erreurs : messages compréhensibles, jamais de stack trace (`error.tsx`, `lib/http/errors.ts`).
- En-têtes de sécurité dans `next.config.ts`.

## 8. Moteurs métier (purs, testés)

- `calculateMasteryScore()` — moyenne mobile pondérée par la difficulté et l'historique.
- `scheduleNextReview()` — répétition espacée (À revoir 1 j, Difficile 2 j, Correct 5 j, Facile 10 j, × facteur de croissance).
- `scoreQuiz()` — correction et agrégation par topic.
- `generateStudyPlan()` — répartit topics faibles / flashcards dues / examens proches sur les jours restants.
- `buildDailySession()` — « Que dois-je réviser aujourd'hui ? ».
- `checkCredits()` / plans & limites — gating Free/Pro.

## 9. Tests

Unitaires (Vitest) : maîtrise, répétition espacée, scoring quiz, crédits, accès abonnement, schémas Zod,
chunking, planner. E2E (Playwright) : signup, création de matière, upload de document, parcours quiz
(nécessitent un Supabase local : `npx supabase start`).

## 10. Phases

1. Initialisation Next.js, Tailwind, shadcn, architecture
2. Supabase : schéma SQL, migrations, RLS, auth
3. Layout application, dashboard, onboarding, matières
4. Upload de documents, Storage, extraction PDF/DOCX/TXT
5. Couche IA, résumés, sorties structurées
6. Flashcards, répétition espacée
7. Quiz, scoring, moteur de maîtrise
8. Chat RAG
9. Planner
10. Stripe, abonnements, feature gating
11. Settings, analytics, rate limiting, sécurité
12. Tests, SEO, performance, accessibilité, README

## 11. Journal des décisions

- **Next.js 16** : `middleware.ts` est renommé `proxy.ts` (runtime Node) ; `params`/`cookies()` sont asynchrones.
- **shadcn/ui** : le registre `ui.shadcn.com` n'était pas joignable depuis l'environnement de build, les
  composants ont été écrits à la main au format shadcn (Radix + CVA), identiques à ceux du CLI.
- **Upload direct vers Storage via URL signée** : évite la limite de 4,5 Mo des fonctions Vercel ; le serveur
  valide les métadonnées avant, puis le contenu réel (magic bytes) au traitement.
- **Embeddings** : Anthropic ne fournit pas d'embeddings ; Voyage AI (recommandé par Anthropic) par défaut,
  OpenAI en alternative, repli sur la recherche plein-texte Postgres si aucune clé n'est fournie, pour que
  le chat reste fonctionnel.
- **Modèle IA** : `claude-opus-5-5` par défaut, configurable via `ANTHROPIC_MODEL` (ex. `claude-sonnet-5-5`
  pour réduire les coûts). Fallback serveur Anthropic activé (`fallbacks: "default"`) en cas de refus.
- **Crédits** : réservation atomique AVANT l'appel IA (fonction SQL `reserve_ai_credits` avec verrou
  consultatif par utilisateur, aucune course possible), puis complétion avec les tokens consommés après
  succès, ou suppression de la réservation (remboursement) en cas d'échec.
- **Réponses des quiz** : RLS autorise un utilisateur à lire ses propres lignes, ce qui aurait exposé
  `quiz_questions.correct_answer` via l'API REST. Les colonnes `correct_answer` et `explanation` sont donc
  retirées du rôle `authenticated` (privilèges par colonne) ; les questions sont écrites et corrigées côté
  serveur (service role, toujours filtré par `user_id`), et la correction n'est affichée qu'après une
  tentative terminée.
- **Mode examen** : coûte 25 crédits et compte dans la limite de 3 quiz/semaine du plan Gratuit.
- **Langue** : interface en français ; code et identifiants en anglais.
