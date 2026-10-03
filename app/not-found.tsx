import Link from "next/link";
import type { Metadata } from "next";

import { LogoMark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="grid max-w-md justify-items-center gap-4 text-center">
        <LogoMark className="size-12 text-lg" />
        <p className="text-sm font-semibold text-primary">Erreur 404</p>
        <h1 className="text-3xl font-bold tracking-tight">Page introuvable</h1>
        <p className="text-muted-foreground">Cette page n&apos;existe pas ou a été déplacée.</p>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard">Mon tableau de bord</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Accueil</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
