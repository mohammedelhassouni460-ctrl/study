import Link from "next/link";
import { MenuIcon } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getCurrentUser } from "@/lib/auth/session";

const LINKS = [
  { href: "/#fonctionnalites", label: "Fonctionnalités" },
  { href: "/#comment-ca-marche", label: "Comment ça marche" },
  { href: "/pricing", label: "Tarifs" },
  { href: "/#faq", label: "FAQ" },
];

export async function Navbar() {
  const user = await getCurrentUser();
  const actions = user ? (
    <Button asChild size="sm">
      <Link href="/dashboard">Mon tableau de bord</Link>
    </Button>
  ) : (
    <>
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">Connexion</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/signup">Commencer gratuitement</Link>
      </Button>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden md:block">
          <ul className="flex gap-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {actions}
        </div>
        <div className="ml-auto flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-6">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav aria-label="Navigation mobile" className="mt-6 grid gap-1">
                {LINKS.map((l) => (
                  <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 hover:bg-accent">
                    {l.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 grid gap-2">{actions}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
