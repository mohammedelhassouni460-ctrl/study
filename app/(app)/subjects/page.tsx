import type { Metadata } from "next";
import { BookOpenIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { CreateSubjectDialog } from "@/components/subjects/create-subject-dialog";
import { SubjectCard } from "@/components/subjects/subject-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getBillingState } from "@/lib/billing/access";
import { listSubjectOverviews } from "@/lib/data/subjects";

export const metadata: Metadata = { title: "Matières" };

export default async function SubjectsPage() {
  const { user } = await requireOnboardedUser();
  const [subjects, billing] = await Promise.all([listSubjectOverviews(), getBillingState(user.id)]);
  const max = billing.limits.maxSubjects;
  const atLimit = max !== null && subjects.length >= max;

  return (
    <>
      <PageHeader
        title="Matières"
        description="Chaque matière regroupe tes cours, fiches, flashcards et quiz."
        actions={!atLimit && <CreateSubjectDialog />}
      />
      {atLimit && (
        <Alert variant="info" className="mb-6">
          <AlertDescription className="text-accent-foreground">
            Le plan Gratuit est limité à {max} matières.{" "}
            <a href="/settings/billing" className="font-medium underline">
              Passe à Pro
            </a>{" "}
            pour en ajouter d&apos;autres.
          </AlertDescription>
        </Alert>
      )}
      {subjects.length === 0 ? (
        <EmptyState
          icon={BookOpenIcon}
          title="Aucune matière pour l'instant"
          description="Crée ta première matière puis importe tes PDF : StudyOS génère fiches, flashcards et quiz."
          action={<CreateSubjectDialog label="Créer ma première matière" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}
    </>
  );
}
