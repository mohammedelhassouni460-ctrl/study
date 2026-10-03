import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Politique cookies",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage title="Politique cookies" updated="2 octobre 2026">
      <section>
        <h2>Cookies strictement nécessaires</h2>
        <p>
          StudyOS utilise des cookies de session (préfixe <code>sb-</code>) pour te garder connecté de façon sécurisée.
          Ils sont indispensables au fonctionnement du service et ne nécessitent pas de consentement.
        </p>
      </section>
      <section>
        <h2>Préférences</h2>
        <p>Ton choix de thème (clair ou sombre) est enregistré dans le stockage local de ton navigateur.</p>
      </section>
      <section>
        <h2>Mesure d&apos;audience</h2>
        <p>
          Si la mesure d&apos;audience est activée, les événements sont envoyés depuis nos serveurs, sans cookie
          publicitaire. [Mettre en place un recueil du consentement si des traceurs non exemptés sont ajoutés.]
        </p>
      </section>
      <section>
        <h2>Paiement</h2>
        <p>Lors du paiement, tu es redirigé vers Stripe, qui dépose ses propres cookies nécessaires à la prévention de la fraude.</p>
      </section>
    </LegalPage>
  );
}
