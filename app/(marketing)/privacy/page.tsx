import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Politique de confidentialité" updated="2 octobre 2026">
      <section>
        <h2>1. Responsable du traitement</h2>
        <p>[Nom de la société éditrice, forme juridique, adresse, numéro d&apos;immatriculation, email de contact.]</p>
      </section>
      <section>
        <h2>2. Données collectées</h2>
        <ul>
          <li>Données de compte : adresse email, prénom, photo de profil (facultative).</li>
          <li>Données d&apos;études : niveau, objectif, matières, dates d&apos;examen, temps de révision souhaité.</li>
          <li>Contenus importés : documents de cours et contenus générés (fiches, flashcards, quiz, conversations).</li>
          <li>Données d&apos;usage : résultats aux quiz, révisions, consommation de crédits IA.</li>
          <li>Données de paiement : gérées exclusivement par Stripe ; StudyOS ne stocke aucun numéro de carte.</li>
        </ul>
      </section>
      <section>
        <h2>3. Finalités et bases légales</h2>
        <ul>
          <li>Fournir le service (exécution du contrat) : analyse des cours, génération de contenus, planning.</li>
          <li>Facturation de l&apos;abonnement Pro (exécution du contrat, obligations légales).</li>
          <li>Sécurité, prévention des abus et limitation de débit (intérêt légitime).</li>
          <li>Mesure d&apos;audience anonymisée, si activée (consentement).</li>
        </ul>
      </section>
      <section>
        <h2>4. Sous-traitants</h2>
        <p>
          Hébergement de l&apos;application (Vercel), base de données et stockage (Supabase), génération par IA
          (Anthropic), calcul d&apos;embeddings (Voyage AI ou OpenAI), paiement (Stripe), mesure d&apos;audience (PostHog,
          si activé). [Préciser les localisations et garanties de transfert hors UE.]
        </p>
        <p>
          Les extraits de cours transmis aux fournisseurs d&apos;IA servent uniquement à produire la réponse demandée et
          ne sont pas utilisés pour entraîner leurs modèles, conformément à leurs conditions commerciales.
        </p>
      </section>
      <section>
        <h2>5. Durée de conservation</h2>
        <p>
          Les données sont conservées tant que le compte est actif. La suppression du compte efface immédiatement les
          données et documents associés. [Préciser les durées de conservation des données de facturation.]
        </p>
      </section>
      <section>
        <h2>6. Tes droits</h2>
        <p>
          Tu disposes des droits d&apos;accès, de rectification, d&apos;effacement, de portabilité, de limitation et
          d&apos;opposition. L&apos;export de tes données et la suppression de ton compte sont disponibles directement
          dans Paramètres › Données & compte. Tu peux introduire une réclamation auprès de la CNIL.
        </p>
      </section>
    </LegalPage>
  );
}
