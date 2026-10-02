"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function SubjectTabs({ subjectId }: { subjectId: string }) {
  const pathname = usePathname();
  const base = `/subjects/${subjectId}`;
  const tabs = [
    { href: base, label: "Aperçu", exact: true },
    { href: `${base}/documents`, label: "Documents" },
    { href: `${base}/summary`, label: "Fiches" },
    { href: `${base}/flashcards`, label: "Flashcards" },
    { href: `${base}/quiz`, label: "Quiz" },
    { href: `${base}/chat`, label: "Ask StudyOS" },
  ];
  return (
    <nav aria-label="Sections de la matière" className="-mx-4 mb-8 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex border-b-2 border-transparent px-3 pt-1 pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  active && "border-primary text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
