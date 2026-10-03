"use client";

import Link from "next/link";
import { BookOpenTextIcon, CalendarIcon, CheckIcon, LayersIcon, ListChecksIcon, MoreHorizontalIcon, PencilRulerIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { moveSessionAction, setSessionStatusAction } from "@/lib/actions/planner";
import { SESSION_KIND_LABELS, type SessionKind } from "@/lib/learning/planner";
import { sessionHref } from "@/lib/learning/session-links";
import { cn } from "@/lib/utils";

const ICONS: Record<SessionKind, typeof LayersIcon> = {
  flashcards: LayersIcon,
  review: BookOpenTextIcon,
  quiz: ListChecksIcon,
  exercise: PencilRulerIcon,
};

export interface PlannerSession {
  id: string;
  subjectId: string;
  subjectName: string;
  dotClass: string;
  kind: SessionKind;
  title: string;
  topicName: string | null;
  durationMinutes: number;
  status: "planned" | "done" | "skipped";
  date: string;
}

export function SessionItem({ session, today, tomorrow }: { session: PlannerSession; today: string; tomorrow: string }) {
  const [pending, start] = useTransition();
  const [moveOpen, setMoveOpen] = useState(false);
  const [date, setDate] = useState(session.date < today ? today : session.date);
  const Icon = ICONS[session.kind];
  const done = session.status === "done";
  const skipped = session.status === "skipped";

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    start(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error ?? "Une erreur est survenue.");
      else if (success) toast.success(success);
    });

  return (
    <li className={cn("flex items-center gap-3 rounded-lg border bg-card p-3", (done || skipped) && "opacity-60")}>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setSessionStatusAction({ id: session.id, status: done ? "planned" : "done" }), done ? undefined : "Session terminée, bravo !")}
        aria-label={done ? `Marquer « ${session.title} » comme à faire` : `Marquer « ${session.title} » comme terminée`}
        aria-pressed={done}
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
          done ? "border-success bg-success text-white" : "border-muted-foreground/40 hover:border-primary",
        )}
      >
        {done && <CheckIcon className="size-3.5" aria-hidden />}
      </button>
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <Link href={sessionHref(session.kind, session.subjectId, session.topicName)} className="min-w-0 flex-1 hover:underline">
        <p className={cn("truncate text-sm font-medium", done && "line-through")}>{session.title}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("size-2 rounded-full", session.dotClass)} aria-hidden />
          {session.subjectName} · {SESSION_KIND_LABELS[session.kind]} · {session.durationMinutes} min
          {skipped && " · passée"}
        </p>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={pending} aria-label={`Options de « ${session.title} »`}>
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {session.date !== today && (
            <DropdownMenuItem onSelect={() => run(() => moveSessionAction({ id: session.id, date: today }), "Session déplacée à aujourd'hui")}>
              Faire aujourd&apos;hui
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => run(() => moveSessionAction({ id: session.id, date: tomorrow }), "Session reportée à demain")}>
            Reporter à demain
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setMoveOpen(true)}>
            <CalendarIcon /> Choisir une date…
          </DropdownMenuItem>
          {!skipped && !done && (
            <DropdownMenuItem onSelect={() => run(() => setSessionStatusAction({ id: session.id, status: "skipped" }))}>
              Passer cette session
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Déplacer la session</DialogTitle>
            <DialogDescription>{session.title}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`move-${session.id}`}>Nouvelle date</Label>
            <Input id={`move-${session.id}`} type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              disabled={pending || !date}
              onClick={() => {
                setMoveOpen(false);
                run(() => moveSessionAction({ id: session.id, date }), "Session déplacée");
              }}
            >
              Déplacer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
