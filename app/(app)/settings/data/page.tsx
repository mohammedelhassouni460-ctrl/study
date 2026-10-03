import type { Metadata } from "next";
import { DownloadIcon } from "lucide-react";

import { DeleteAccount } from "@/components/settings/delete-account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Données & compte" };

export default function DataSettingsPage() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Exporter mes données</CardTitle>
          <CardDescription>
            Télécharge toutes tes données (profil, matières, fiches, flashcards, quiz, conversations, planning) au format JSON.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/api/account/export" download>
              <DownloadIcon /> Télécharger mes données
            </a>
          </Button>
        </CardContent>
      </Card>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Zone de danger</CardTitle>
          <CardDescription>La suppression du compte efface définitivement toutes tes données et tes documents.</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccount />
        </CardContent>
      </Card>
    </>
  );
}
