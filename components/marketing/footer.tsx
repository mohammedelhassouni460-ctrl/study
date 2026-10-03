import Link from "next/link";

import { Logo } from "@/components/shared/logo";

const COLUMNS = [
  {
    title: "Produit",
    links: [
      { href: "/#fonctionnalites", label: "Fonctionnalités" },
      { href: "/pricing", label: "Tarifs" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Compte",
    links: [
      { href: "/signup", label: "Créer un compte" },
      { href: "/login", label: "Connexion" },
    ],
  },
  {
    title: "Légal",
    links: [
      { href: "/privacy", label: "Confidentialité" },
      { href: "/terms", label: "Conditions d'utilisation" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid content-start gap-3">
          <Logo />
          <p className="text-sm text-muted-foreground">Tes cours. Ton plan. Ta réussite.</p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 text-sm font-semibold">{col.title}</h2>
            <ul className="grid gap-2 text-sm text-muted-foreground">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} StudyOS AI. Tous droits réservés.
      </p>
    </footer>
  );
}
