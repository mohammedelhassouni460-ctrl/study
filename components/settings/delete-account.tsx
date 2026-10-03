"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccountAction } from "@/lib/actions/settings";
import { DELETE_CONFIRMATION } from "@/lib/validations/settings";

export function DeleteAccount() {
  const [confirmation, setConfirmation] = useState("");
  const [pending, start] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Supprimer mon compte</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer définitivement ton compte ?</AlertDialogTitle>
          <AlertDialogDescription>
            Tous tes cours, fiches, flashcards, quiz et ton planning seront effacés. Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="delete-confirmation">
            Tape <strong>{DELETE_CONFIRMATION}</strong> pour confirmer
          </Label>
          <Input id="delete-confirmation" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending || confirmation !== DELETE_CONFIRMATION}
            onClick={() =>
              start(async () => {
                const result = await deleteAccountAction({ confirmation });
                if (result && !result.ok) toast.error(result.error);
              })
            }
          >
            Supprimer définitivement
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
