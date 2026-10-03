import { AlertTriangleIcon } from "lucide-react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : {updated}</p>
      <div role="note" className="mt-6 flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <AlertTriangleIcon className="size-5 shrink-0 text-warning" aria-hidden />
        <p>
          <strong>Document modèle, à vérifier juridiquement.</strong> Ce texte est un point de départ : il doit être
          relu et complété (identité de l&apos;éditeur, hébergeur, sous-traitants, durées de conservation) par un
          professionnel du droit avant la mise en production.
        </p>
      </div>
      <div className="mt-10 grid gap-8 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted-foreground [&_section]:grid [&_section]:gap-3 [&_ul]:grid [&_ul]:gap-1 [&_ul]:text-muted-foreground">
        {children}
      </div>
    </article>
  );
}
