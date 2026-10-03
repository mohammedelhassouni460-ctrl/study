import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BrainCircuitIcon,
  CalendarDaysIcon,
  FileTextIcon,
  GaugeIcon,
  LayersIcon,
  ListChecksIcon,
  MessageCircleQuestionIcon,
  NotebookTextIcon,
  ShieldCheckIcon,
  UploadIcon,
} from "lucide-react";

import { PricingPlans } from "@/components/billing/pricing-plans";
import { Faq, FAQ_ITEMS } from "@/components/marketing/faq";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getBillingState } from "@/lib/billing/access";
import { siteConfig } from "@/lib/public-env";

export const metadata: Metadata = {
  title: { absolute: "StudyOS AI — Tes cours. Ton plan. Ta réussite." },
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

const FEATURES = [
  { icon: NotebookTextIcon, title: "Fiches de révision", text: "Ultra courtes, standard ou détaillées : définitions, formules, exemples et pièges à éviter." },
  { icon: LayersIcon, title: "Flashcards intelligentes", text: "Répétition espacée : chaque carte revient au moment idéal pour être mémorisée durablement." },
  { icon: ListChecksIcon, title: "QCM corrigés", text: "Du niveau facile au mode examen, avec une explication pour chaque réponse." },
  { icon: MessageCircleQuestionIcon, title: "Chat avec tes cours", text: "Pose tes questions : StudyOS répond à partir de tes documents et cite ses sources." },
  { icon: CalendarDaysIcon, title: "Planning personnalisé", text: "Un programme jour par jour qui priorise tes examens proches et tes points faibles." },
  { icon: GaugeIcon, title: "Score de maîtrise", text: "Ta progression par concept, mise à jour après chaque quiz et chaque flashcard." },
];

const STEPS = [
  { icon: UploadIcon, title: "Importe tes cours", text: "PDF, Word ou texte : StudyOS les analyse et détecte les grands concepts." },
  { icon: BrainCircuitIcon, title: "Révise activement", text: "Fiches, flashcards et quiz sont générés à partir de ton propre contenu." },
  { icon: GaugeIcon, title: "Suis ta progression", text: "Ton plan s'adapte à tes résultats jusqu'au jour de l'examen." },
];

const BENEFITS = [
  { before: "Relire ses cours en boucle", after: "Des questions qui testent vraiment ta mémoire" },
  { before: "Ne pas savoir par où commencer", after: "Une session du jour prête en un clic" },
  { before: "Découvrir ses lacunes le jour J", after: "Tes concepts faibles identifiés à l'avance" },
];

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  const plan = user ? (await getBillingState(user.id)).plan : null;
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      {query.compte === "supprime" && (
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <Alert>
            <AlertDescription>Ton compte et toutes tes données ont été supprimés. À bientôt !</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(ellipse_at_top,var(--color-primary)/0.12,transparent_60%)]" />
        <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-6xl items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-2">
          <div className="grid gap-6 text-center lg:text-left">
            <p className="mx-auto inline-flex w-fit items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground lg:mx-0">
              <span className="size-1.5 rounded-full bg-success" /> Ton assistant de révision propulsé par l&apos;IA
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Tes cours. Ton plan.{" "}
              <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">Ta réussite.</span>
            </h1>
            <p className="text-lg text-pretty text-muted-foreground">
              Importe tes cours : StudyOS les transforme en fiches, flashcards, quiz et planning de révision
              personnalisé. Tu sais enfin quoi réviser, chaque jour, jusqu&apos;à l&apos;examen.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button asChild size="lg">
                <Link href={user ? "/dashboard" : "/signup"}>
                  {user ? "Ouvrir mon tableau de bord" : "Commencer gratuitement"} <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#comment-ca-marche">Voir comment ça marche</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Gratuit pour commencer · Sans carte bancaire</p>
          </div>
          <HeroPreview />
        </div>
      </section>

      {/* Benefits */}
      <section aria-labelledby="benefices" className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="benefices" className="text-center text-3xl font-bold tracking-tight">
            Réviser mieux, pas plus longtemps
          </h2>
          <ul className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
            {BENEFITS.map((b) => (
              <li key={b.before} className="rounded-xl border bg-card p-5">
                <p className="text-sm text-muted-foreground line-through decoration-destructive/60">{b.before}</p>
                <p className="mt-2 font-medium">{b.after}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section id="fonctionnalites" aria-labelledby="features-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="features-title" className="text-3xl font-bold tracking-tight">
            Tout ce qu&apos;il faut pour réussir tes examens
          </h2>
          <p className="mt-3 text-muted-foreground">Un seul outil, construit autour de ce qui marche vraiment : la révision active.</p>
        </div>
        <ul className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section id="comment-ca-marche" aria-labelledby="how-title" className="scroll-mt-20 border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 id="how-title" className="text-center text-3xl font-bold tracking-tight">
            Comment ça marche
          </h2>
          <ol className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="grid justify-items-center gap-3 text-center">
                <span className="relative grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg">
                  <step.icon className="size-6" aria-hidden />
                  <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border bg-background text-xs font-bold text-foreground">
                    {i + 1}
                  </span>
                </span>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="max-w-xs text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>

          {/* Demo */}
          <div className="mt-16 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <figure className="rounded-xl border bg-card p-5 text-sm">
              <figcaption className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <FileTextIcon className="size-4" aria-hidden /> Extrait de ton cours
              </figcaption>
              <p className="leading-relaxed">
                « L&apos;élasticité-prix de la demande mesure la sensibilité de la quantité demandée à une variation du prix.
                Elle se calcule comme le rapport entre la variation relative de la quantité et celle du prix. Lorsque |Ep|
                &gt; 1, la demande est dite élastique… »
              </p>
            </figure>
            <ArrowRightIcon className="mx-auto size-6 rotate-90 text-primary lg:rotate-0" aria-hidden />
            <figure className="rounded-xl border border-primary/40 bg-card p-5 text-sm shadow-lg shadow-primary/5">
              <figcaption className="mb-3 flex items-center gap-2 text-xs font-medium text-primary">
                <ListChecksIcon className="size-4" aria-hidden /> Question générée
              </figcaption>
              <p className="font-medium">Le prix augmente de 10 % et la demande baisse de 20 %. Quelle est l&apos;élasticité-prix ?</p>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {["-0,5", "-1", "-2", "2"].map((c) => (
                  <li key={c} className={c === "-2" ? "rounded-md border border-success/50 bg-success/10 px-3 py-1.5" : "rounded-md border px-3 py-1.5"}>
                    {c}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Ep = -20 % / 10 % = -2 : la demande est élastique.</p>
            </figure>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="tarifs" aria-labelledby="pricing-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <div className="mb-10 text-center">
          <h2 id="pricing-title" className="text-3xl font-bold tracking-tight">
            Gratuit pour commencer
          </h2>
          <p className="mt-3 text-muted-foreground">Passe à Pro quand tes examens approchent. Résiliable à tout moment.</p>
        </div>
        <PricingPlans currentPlan={plan} headingLevel="h3" />
      </section>

      {/* Trust + FAQ */}
      <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 border-t bg-muted/30">
        <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-6xl gap-10 px-4 py-20 lg:grid-cols-3">
          <div>
            <h2 id="faq-title" className="text-3xl font-bold tracking-tight">
              Questions fréquentes
            </h2>
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              Tes documents restent privés et ne servent jamais à entraîner un modèle d&apos;IA.
            </p>
          </div>
          <div className="lg:col-span-2">
            <Faq />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid justify-items-center gap-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 px-6 py-14 text-center text-white">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Ton prochain examen se prépare dès aujourd&apos;hui
          </h2>
          <p className="max-w-xl text-white/80">Importe ton premier cours et obtiens ta première fiche en moins de deux minutes.</p>
          <Button asChild size="lg" variant="secondary">
            <Link href={user ? "/dashboard" : "/signup"}>
              {user ? "Continuer mes révisions" : "Créer mon compte gratuit"} <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
