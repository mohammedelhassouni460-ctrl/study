"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { SubjectForm } from "./subject-form";

export function CreateSubjectDialog({ label = "Nouvelle matière" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle matière</DialogTitle>
          <DialogDescription>Ajoute une matière, puis importe tes cours.</DialogDescription>
        </DialogHeader>
        <SubjectForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
