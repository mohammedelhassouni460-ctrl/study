"use client";

import { useEffect } from "react";
import { RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Friendly error screen: never shows the stack trace, only the digest for support. */
export function ErrorView({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="grid min-h-[50vh] place-items-center px-4">
      <div className="grid max-w-md justify-items-center gap-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Oups, quelque chose s&apos;est mal passé</h1>
        <p className="text-muted-foreground">
          Une erreur inattendue est survenue. Réessaie : si le problème persiste, contacte le support
          {error.digest ? ` en indiquant le code ${error.digest}` : ""}.
        </p>
        <Button onClick={reset}>
          <RotateCcwIcon /> Réessayer
        </Button>
      </div>
    </div>
  );
}
