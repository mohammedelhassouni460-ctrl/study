import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Conditions générales d'utilisation" updated="2 octobre 2026">
      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes conditions encadrent l&apos;utilisation de StudyOS AI, un service en ligne d&apos;aide à la
          révision qui génère des fiches, flashcards, quiz, réponses et plannings à partir des documents fournis par
          l&apos;utilisateur.
        </p>
      </section>
      <section>
        <h2>2. Compte</h2>
        <p>
          L&apos;utilisateur est responsable de la confidentialité de ses identifiants. Le service est réservé aux
          personnes âgées d&apos;au moins 15 ans ou disposant de l&apos;accord de leur représentant légal.
        </p>
      </section>
      <section>
        <h2>3. Contenus de l&apos;utilisateur</h2>
        <p>
          L&apos;utilisateur garantit disposer des droits nécessaires sur les documents qu&apos;il importe. Il reste
          propriétaire de ses contenus ; StudyOS ne les utilise que pour fournir le service.
        </p>
      </section>
      <section>
        <h2>4. Contenus générés par l&apos;IA</h2>
        <p>
          Les contenus générés peuvent comporter des erreurs. Ils constituent une aide à la révision et ne remplacent
          ni les cours ni les enseignants. L&apos;utilisateur reste seul juge de leur exactitude.
        </p>
      </section>
      <section>
        <h2>5. Offres, crédits et abonnement</h2>
        <ul>
          <li>Le plan Gratuit est soumis aux limites décrites sur la page Tarifs.</li>
          <li>Le plan Pro est un abonnement mensuel ou annuel, renouvelé automatiquement et résiliable à tout moment depuis les paramètres ; l&apos;accès est maintenu jusqu&apos;à la fin de la période payée.</li>
          <li>Les crédits IA sont renouvelés chaque mois et ne sont pas reportables.</li>
          <li>[Préciser le droit de rétractation applicable et ses modalités.]</li>
        </ul>
      </section>
      <section>
        <h2>6. Usage acceptable</h2>
        <p>
          Il est interdit d&apos;utiliser le service pour contourner ses limites techniques, importer des contenus
          illicites ou porter atteinte à sa sécurité. Tout manquement peut entraîner la suspension du compte.
        </p>
      </section>
      <section>
        <h2>7. Responsabilité et droit applicable</h2>
        <p>[Clauses de limitation de responsabilité, droit applicable et juridiction compétente à compléter.]</p>
      </section>
    </LegalPage>
  );
}
