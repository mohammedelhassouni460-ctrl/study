import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

import { SubjectActions } from "@/components/subjects/subject-actions";
import { SubjectTabs } from "@/components/subjects/subject-tabs";
import { getSubject } from "@/lib/data/subjects";
import { formatFrenchDate } from "@/lib/learning/dates";
import { subjectColor } from "@/lib/subjects/colors";
import { cn } from "@/lib/utils";
import { uuidSchema } from "@/lib/validations/common";

export default async function SubjectLayout({ children, params }: LayoutProps<"/subjects/[id]">) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const subject = await getSubject(id);
  if (!subject) notFound();

  return (
    <>
      <Link href="/subjects" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeftIcon className="size-4" aria-hidden /> Matières
      </Link>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl text-xl font-semibold", subjectColor(subject.color).soft)} aria-hidden>
            {subject.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{subject.name}</h1>
            <p className="truncate text-sm text-muted-foreground">
              {subject.exam_date ? `Examen le ${formatFrenchDate(subject.exam_date)}` : "Pas de date d'examen"}
              {subject.target_grade !== null && ` · Objectif ${String(subject.target_grade).replace(".", ",")}/20`}
            </p>
          </div>
        </div>
        <SubjectActions
          subjectId={subject.id}
          values={{
            name: subject.name,
            description: subject.description ?? "",
            color: (subject.color as "indigo") ?? "indigo",
            examDate: subject.exam_date ?? "",
            targetGrade: subject.target_grade ?? "",
          }}
        />
      </div>
      <SubjectTabs subjectId={subject.id} />
      {children}
    </>
  );
}
