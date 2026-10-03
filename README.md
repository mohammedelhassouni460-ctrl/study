# StudyOS AI

**Tes cours. Ton plan. Ta réussite.**

StudyOS AI est un SaaS de révision pour étudiants. L'étudiant importe ses cours (PDF, DOCX, TXT) et
StudyOS les transforme en fiches de révision, flashcards à répétition espacée, QCM corrigés, chat
avec le cours (avec sources) et planning de révision personnalisé. Un score de maîtrise par concept
évolue après chaque quiz et chaque flashcard.

> Plan d'architecture détaillé et journal des décisions : [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Stack](#stack)
3. [Démarrage rapide (local)](#démarrage-rapide-local)
4. [Configurer les services externes](#configurer-les-services-externes)
5. [Scripts](#scripts)
6. [Tests](#tests)
7. [Architecture](#architecture)
8. [Sécurité](#sécurité)
9. [Plans, crédits et limites](#plans-crédits-et-limites)
10. [Déploiement sur Vercel](#déploiement-sur-vercel)
11. [Limites connues et prochaines étapes](#limites-connues-et-prochaines-étapes)
12. [Dépannage](#dépannage)

---

## Fonctionnalités

| Domaine | Ce qui est livré |
| --- | --- |
| Compte | Inscription email/mot de passe, Google OAuth, mot de passe oublié, déconnexion, routes protégées |
| Onboarding | 5 étapes : prénom, niveau, objectif, date d'examen, première matière |
| Matières | Création, modification, suppression, couleur, date d'examen, note cible |
| Documents | Upload direct vers Supabase Storage (URL signée), PDF/DOCX/TXT ≤ 15 Mo, vérification du vrai type de fichier, extraction, découpage en chunks, embeddings, détection des concepts |
| Fiches | Ultra courte / standard / détaillée : vue d'ensemble, concepts, définitions, formules, points importants, exemples |
| Flashcards | Génération 10/20/30/50, révision avec retournement (Espace) et notation 1-4 (😵 😐 🙂 🔥), répétition espacée |
| Quiz | QCM 5/10/20/30, facile/moyen/difficile/examen, correction côté serveur, note /20, explications, concepts faibles |
| Maîtrise | Score 0-100 par concept, mis à jour après chaque réponse (pondéré par la difficulté) |
| Chat | « Ask StudyOS » : RAG en streaming sur les documents de la matière, sources citées [1], [2]… |
| Planning | Planning jour par jour (7/14/30 jours) priorisant examens proches et concepts faibles ; marquer fait, reporter, déplacer |
| Tableau de bord | Session du jour, examen à venir, progression, flashcards dues, série, XP, quiz récents, statistiques (Pro) |
| Paiement | Stripe Checkout, Customer Portal, webhooks signés, plans Gratuit / Pro (mensuel ou annuel) |
| Paramètres | Profil + photo, abonnement et crédits, notifications, export JSON (RGPD), suppression du compte |
| Marketing | Landing page, page Tarifs, FAQ, pages légales (modèles), sitemap, robots, image Open Graph |

---

## Stack

- **Next.js 16** (App Router, Turbopack, `proxy.ts`), **React 19**, **TypeScript strict**
- **Tailwind CSS v4** + composants **shadcn/ui** (Radix), lucide-react, next-themes (mode sombre), sonner
- **Supabase** : Postgres + **pgvector**, Auth, Storage, **RLS sur toutes les tables**
- **Anthropic** (Claude) avec sorties structurées validées par **Zod**
- **Voyage AI** ou **OpenAI** pour les embeddings (facultatif : repli plein-texte Postgres)
- **Stripe** (Checkout, Billing, Customer Portal, webhooks)
- React Hook Form + Zod, Upstash Redis (rate limiting, facultatif), PostHog (analytics, facultatif)
- **Vitest** (unitaires + intégration RLS), **Playwright** (E2E)

---

## Démarrage rapide (local)

### Prérequis

- Node.js ≥ 20 et npm
- Docker (pour Supabase en local)

### Installation

```bash
npm install
cp .env.example .env.local
npm run db:start          # démarre Supabase en local (Postgres, Auth, Storage)
```

`npm run db:start` affiche l'`API URL`, l'`anon key` et la `service_role key` : copie-les dans
`.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
Les migrations et les données de démo sont appliquées automatiquement. Pour repartir de zéro :

```bash
npm run db:reset          # ré-applique migrations + supabase/seed.sql
```

Puis :

```bash
npm run dev               # http://localhost:3000
```

### Compte de démonstration

Le seed crée un compte prêt à l'emploi avec la matière **Microéconomie** (concepts Offre et demande,
Élasticité, Externalités, Concurrence parfaite, Monopole), un document analysé, une fiche, 10 flashcards,
un quiz déjà tenté et des scores de maîtrise variés :

| Email | Mot de passe |
| --- | --- |
| `demo@studyos.local` | `demo-studyos-2026` |

> Le seed est réservé au développement local : ne l'exécute jamais sur une base de production.

### Sans clé API

L'application fonctionne sans aucune clé externe pour tout ce qui n'est pas IA ou paiement (auth,
matières, upload, extraction, planning, flashcards, quiz existants). Les actions IA affichent alors
« L'IA n'est pas encore configurée sur ce serveur », et le bouton Pro « Le paiement n'est pas encore
configuré ». Ajoute les clés ci-dessous au fur et à mesure.

---

## Configurer les services externes

Toutes les variables sont documentées dans [`.env.example`](./.env.example). Ne commite jamais
`.env.local` ni aucune vraie clé.

### 1. Supabase (cloud)

1. Crée un projet sur [supabase.com](https://supabase.com).
2. **Project Settings › API** : copie `Project URL`, `anon public` et `service_role` dans les variables
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Applique le schéma :
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-du-projet>
   npx supabase db push        # applique supabase/migrations/* (sans le seed)
   ```
4. **Authentication › URL Configuration** : `Site URL` = ton URL publique, et ajoute
   `https://ton-domaine/auth/callback` et `https://ton-domaine/auth/confirm` aux Redirect URLs.
5. **Authentication › Providers › Google** (facultatif) : renseigne le Client ID / Secret Google
   (console Google Cloud, URI de redirection `https://<ref>.supabase.co/auth/v1/callback`).
6. Les buckets `documents` (privé) et `avatars` (public) et leurs policies sont créés par les migrations.

### 2. Anthropic (IA)

1. Crée une clé sur [console.anthropic.com](https://console.anthropic.com/settings/keys).
2. Renseigne `ANTHROPIC_API_KEY`.
3. `ANTHROPIC_MODEL` vaut `claude-opus-5-5` par défaut (meilleure qualité). Pour réduire les coûts,
   utilise par exemple `claude-sonnet-5-5`.

Les générations utilisent les sorties structurées (`output_config.format`) : la réponse du modèle est
contrainte par un schéma JSON dérivé des schémas Zod, puis revalidée par Zod avant d'être enregistrée.

### 3. Embeddings (facultatif, recommandé)

Anthropic ne fournit pas de modèle d'embeddings. Sans clé, le chat retrouve les passages par recherche
plein-texte Postgres (français). Pour une recherche sémantique :

- **Voyage AI** (recommandé) : `VOYAGE_API_KEY` ([dash.voyageai.com](https://dash.voyageai.com/)), modèle `voyage-3.5` en 1024 dimensions ;
- ou **OpenAI** : `OPENAI_API_KEY`, modèle `text-embedding-3-small` réduit à 1024 dimensions.

Les documents importés avant l'ajout de la clé restent consultables par recherche plein-texte ;
ré-importe-les pour bénéficier de la recherche sémantique.

### 4. Stripe (abonnement Pro)

1. [Dashboard Stripe](https://dashboard.stripe.com/test/products) (mode test) : crée un produit
   **StudyOS Pro** avec deux prix récurrents : **9,99 € / mois** et **79,99 € / an**.
2. Copie les identifiants `price_…` dans `STRIPE_PRICE_PRO_MONTHLY` et `STRIPE_PRICE_PRO_YEARLY`.
3. Copie la clé secrète `sk_test_…` dans `STRIPE_SECRET_KEY`.
4. **Settings › Billing › Customer portal** : active le portail (changement de carte, résiliation, factures).
5. Webhook :
   - en local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`, puis copie le `whsec_…` affiché dans `STRIPE_WEBHOOK_SECRET` ;
   - en production : **Developers › Webhooks › Add endpoint** `https://ton-domaine/api/stripe/webhook` avec les événements
     `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`.
6. Carte de test : `4242 4242 4242 4242`, date future, CVC quelconque.

Le plan Pro n'est **jamais** accordé par la redirection de succès : seul le webhook signé met à jour la
table `subscriptions` (Stripe est la source de vérité).

### 5. Rate limiting et analytics (facultatif)

- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` : limites partagées entre instances (sinon en mémoire).
- `NEXT_PUBLIC_POSTHOG_KEY` : envoie les événements produit (`user_signed_up`, `document_uploaded`,
  `summary_generated`, `quiz_completed`, `checkout_started`, `subscription_started`…) côté serveur.

---

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Génère les types de routes Next.js puis `tsc --noEmit` |
| `npm test` | Tests unitaires (Vitest) |
| `npm run test:integration` | Tests d'isolation RLS contre le Supabase local |
| `npm run test:e2e` | Tests E2E Playwright |
| `npm run check` | lint + typecheck + tests unitaires |
| `npm run db:start` / `db:reset` | Supabase local / réinitialisation avec seed |
| `npm run db:types` | Régénère `types/database.ts` depuis le schéma local |
| `npm run format` | Prettier |

---

## Tests

```bash
npm test                    # 65 tests unitaires : maîtrise, répétition espacée, scoring, planner,
                            # plans et crédits, chunking, validation des fichiers, Stripe, sorties IA
npm run test:integration    # 8 tests RLS : isolation entre utilisateurs, storage, réponses cachées,
                            # tables de facturation en lecture seule
npm run test:e2e            # 20 tests E2E (desktop + mobile pour le smoke test)
```

Les tests E2E nécessitent le Supabase local (`npm run db:start`). **Ils ne demandent aucune vraie clé** :
Playwright démarre un faux serveur Anthropic/Voyage (`tests/mocks/ai-mock-server.mjs`) qui parle le même
protocole de streaming que l'API, et signe lui-même les webhooks Stripe avec un secret de test. Ils
couvrent : inscription → onboarding → matière → upload PDF/TXT → fiche → flashcards et révision → quiz et
score → maîtrise → chat sourcé → planning → Pro via webhook → paramètres, export et suppression du compte,
limites du plan Gratuit, pages publiques, en-têtes de sécurité et absence de défilement horizontal sur mobile.

Si Chromium est déjà installé ailleurs : `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/chemin/vers/chromium npm run test:e2e`.

---

## Architecture

```text
app/
  (marketing)/   landing, pricing, privacy, terms, cookies
  (auth)/        login, signup, forgot-password, reset-password
  (app)/         dashboard, subjects/[id]/{documents,summary,flashcards,quiz,chat}, planner, settings/*
  auth/          callback OAuth et confirmation email
  onboarding/
  api/           documents, ai (summary, flashcards, quiz, chat), flashcards/review, quiz/submit,
                 study-plan/generate, stripe (checkout, portal, webhook), account/export
components/      ui (shadcn) + composants par domaine
lib/
  ai/            client Anthropic, prompts, schémas Zod, générateurs, crédits
  billing/       plans, limites, coûts IA, état d'abonnement
  learning/      moteurs purs et testés : maîtrise, répétition espacée, scoring, planner, statistiques
  documents/     validation, extraction (unpdf, mammoth), chunking, pipeline, concepts
  chat/          recherche RAG (vectorielle ou plein-texte)
  stripe/        client et synchronisation des abonnements
  supabase/      clients serveur / navigateur / admin (service role, serveur uniquement), proxy
  actions/       Server Actions (matières, planning, paramètres…)
  validations/   schémas Zod partagés client/serveur
supabase/
  migrations/    schéma, RLS, fonctions SQL, storage
  seed.sql       données de démonstration
tests/           unit/, integration/, e2e/, fixtures/, mocks/
```

Flux d'un document : le navigateur demande une URL d'upload signée (métadonnées et quotas vérifiés),
envoie le fichier directement à Supabase Storage, puis `POST /api/documents/process` télécharge le
fichier, vérifie ses magic bytes, extrait le texte, le découpe (~1000 tokens, chevauchement 100), calcule
les embeddings, enregistre les chunks et détecte les concepts.

---

## Sécurité

- **RLS** sur toutes les tables : chaque requête est limitée à `auth.uid() = user_id`, y compris les
  fonctions de recherche RAG (SECURITY INVOKER). Des clés étrangères composites `(id, user_id)`
  empêchent de rattacher une ligne à la matière d'un autre utilisateur.
- `subscriptions` et `ai_usage` sont en **lecture seule** pour les utilisateurs : seul le serveur
  (service role) les écrit.
- Les colonnes `quiz_questions.correct_answer` et `explanation` sont **retirées du rôle utilisateur** :
  la correction se fait côté serveur et n'est affichée qu'après la soumission.
- La **service role key** n'est utilisée que dans `lib/supabase/admin.ts` (`server-only`), jamais dans
  le navigateur.
- Validation **Zod** de toutes les entrées côté serveur ; authentification vérifiée côté serveur.
- Upload : liste blanche d'extensions et de types MIME, 15 Mo max, vérification du contenu réel.
- Crédits IA **réservés atomiquement** avant chaque appel (verrou par utilisateur), remboursés en cas d'échec.
- **Rate limiting** sur l'IA, l'upload, le traitement, les quiz, les révisions et la facturation.
- Le contenu des cours est encadré comme donnée non fiable dans les prompts (protection contre
  l'injection de prompt).
- En-têtes : Content-Security-Policy, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy. Erreurs affichées sans stack trace.

---

## Plans, crédits et limites

Tout est centralisé dans [`lib/billing/plans.ts`](./lib/billing/plans.ts).

| | Gratuit | Pro (9,99 €/mois ou 79,99 €/an) |
| --- | --- | --- |
| Crédits IA / mois | 100 | 5 000 |
| Matières | 2 | illimitées |
| Documents / mois | 5 | 200 |
| Flashcards | 30 au total | illimitées |
| Quiz | 3 / semaine | illimités |
| Messages de chat | 20 / jour | 500 / jour |
| Statistiques de progression | non | oui |

Coût en crédits : fiche 10, flashcards 10, quiz 10, mode examen 25, message de chat 1, planning 0.

---

## Déploiement sur Vercel

1. Pousse le dépôt sur GitHub et importe-le dans [Vercel](https://vercel.com/new).
2. Ajoute toutes les variables de `.env.example` dans **Settings › Environment Variables**
   (avec `NEXT_PUBLIC_APP_URL` = l'URL de production).
3. Déploie, puis configure l'URL du webhook Stripe et les Redirect URLs Supabase (voir plus haut).
4. Le traitement des documents et la génération IA déclarent `maxDuration` (jusqu'à 300 s) :
   vérifie que ton offre Vercel l'autorise.

---

## Limites connues et prochaines étapes

- Les **PDF scannés** (images sans couche texte) ne sont pas lus : un OCR serait nécessaire.
- Le traitement d'un document se fait dans la requête (jusqu'à 5 min) ; pour de très gros volumes, une
  file de tâches (Supabase Queues, Inngest…) serait préférable.
- Les **emails** de rappel et le bilan hebdomadaire sont paramétrables mais pas encore envoyés
  (brancher un service type Resend + une tâche planifiée).
- Les **pages légales** sont des modèles marqués « à vérifier juridiquement ».
- La répétition espacée est un SM-2 simplifié ; elle peut être remplacée par FSRS derrière la même
  signature `scheduleNextReview()`.

---

## Dépannage

| Symptôme | Solution |
| --- | --- |
| « Configuration invalide ou manquante » | Une variable Supabase manque dans `.env.local` |
| « L'IA n'est pas encore configurée » | Ajoute `ANTHROPIC_API_KEY` puis redémarre `npm run dev` |
| Le plan reste Gratuit après paiement | Le webhook n'arrive pas : vérifie `stripe listen` / l'endpoint et `STRIPE_WEBHOOK_SECRET` |
| Upload refusé | Format non pris en charge, fichier > 15 Mo ou quota mensuel atteint |
| Document en échec « aucun texte » | PDF scanné : exporte-le en PDF texte ou en DOCX |
| Erreur Docker au `db:start` | Docker doit être démarré ; `npx supabase stop` puis `npm run db:start` |
